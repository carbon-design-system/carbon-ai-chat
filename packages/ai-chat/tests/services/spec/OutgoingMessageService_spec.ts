/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { OutgoingMessageService } from '../../../src/sdk/services/messaging/outbound/OutgoingMessageService';
import {
  MessageInputType,
  MessageRequest,
  MessageResponseTypes,
} from '../../../src/types/messaging/Messages';

const outgoing = new OutgoingMessageService();

function frozenRequest(): MessageRequest {
  return Object.freeze({
    id: 'host-id',
    input: Object.freeze({
      text: 'host text',
      message_type: MessageInputType.TEXT,
      structured_data: Object.freeze({
        user_defined: Object.freeze({ nested: Object.freeze({ value: 1 }) }),
      }),
    }),
    history: Object.freeze({
      label: 'visible text',
      silent: true,
      timestamp: 7,
    }),
    ui_state_internal: Object.freeze({ from_history: true }),
  });
}

describe('OutgoingMessageService', () => {
  it('uses only the supplied defaults for a text request', () => {
    expect(
      outgoing.prepareTextRequest(
        'hello',
        'id',
        17,
        'main',
        MessageInputType.TEXT
      )
    ).toEqual({
      input: { text: 'hello', message_type: MessageInputType.TEXT },
      id: 'id',
      thread_id: 'main',
      history: { timestamp: 17 },
      ui_state_internal: { from_history: false },
    });
  });

  it('copies pending structured data only when the request has none', () => {
    const pending = frozenRequest().input.structured_data;
    const prepared = outgoing.prepareStructuredData(undefined, pending);
    expect(prepared.usedPendingData).toBe(true);
    prepared.structuredData.user_defined.nested.value = 2;
    expect(pending.user_defined.nested.value).toBe(1);
    expect(outgoing.prepareStructuredData({}, pending)).toEqual({
      usedPendingData: false,
      structuredData: undefined,
    });
    expect(
      outgoing.prepareStructuredData(undefined, undefined).usedPendingData
    ).toBe(false);
  });

  it('keeps the visible text and nested input aliases after accepting a new request ID', () => {
    const original = frozenRequest();
    const accepted = outgoing.copyRequest(original);
    const text = outgoing.originalText(original);
    accepted.id = 'accepted-id';
    accepted.input.text = 'transport text';
    const { localMessage: local } = outgoing.prepareLocalItem(
      accepted,
      text,
      'local-id',
      MessageResponseTypes.TEXT
    );
    expect(local.fullMessageID).toBe('accepted-id');
    expect(local.ui_state).toEqual({
      id: 'local-id',
      originalUserText: 'visible text',
    });
    expect(local.item).toMatchObject({ text: 'transport text' });
    expect(local.item).not.toBe(accepted.input);
    expect(local.item).toMatchObject({
      structured_data: accepted.input.structured_data,
    });
    expect(Reflect.get(local.item, 'structured_data')).toBe(
      accepted.input.structured_data
    );
    accepted.input.structured_data.user_defined.nested.value = 2;
    expect(local.item).toMatchObject({
      structured_data: { user_defined: { nested: { value: 2 } } },
    });
    expect(original.input.text).toBe('host text');
    expect(original.input.structured_data.user_defined.nested.value).toBe(1);
    expect(original.history).toEqual({
      label: 'visible text',
      silent: true,
      timestamp: 7,
    });
  });

  it('makes independent queue, stored, and transport copies', () => {
    const original = frozenRequest();
    const queued = outgoing.copyRequest(original);
    const stored = outgoing.copyRequest(queued);
    const transport = outgoing.copyRequest(stored);
    transport.input.structured_data.user_defined.nested.value = 9;
    transport.history.label = 'transport';
    expect(stored.input.structured_data.user_defined.nested.value).toBe(1);
    expect(queued.history.label).toBe('visible text');
    expect(original.history.label).toBe('visible text');
  });

  it('reads input fields before capturing the full message ID', () => {
    const reads: string[] = [];
    let messageID = 'before';
    const message: MessageRequest = {
      get id() {
        reads.push('id');
        return messageID;
      },
      get input() {
        reads.push('input');
        return {
          get text() {
            reads.push('text');
            messageID = 'after';
            return 'visible';
          },
        };
      },
    };

    const { localMessage } = outgoing.prepareLocalItem(
      message,
      'original',
      'local',
      MessageResponseTypes.TEXT
    );

    expect(localMessage.fullMessageID).toBe('after');
    expect(reads).toEqual(['input', 'text', 'id']);
  });

  it('prepares cancel and error data from supplied IDs, time, and locale text', () => {
    const cancelled = outgoing.prepareCancellation(
      'Cancelled',
      'cancel',
      8,
      'main',
      MessageResponseTypes.SYSTEM
    );
    expect(cancelled).toMatchObject({
      id: 'cancel',
      history: { timestamp: 8 },
      output: {
        generic: [
          { response_type: MessageResponseTypes.SYSTEM, title: 'Cancelled' },
        ],
      },
    });
    Object.freeze(cancelled.output.generic[0]);
    const local = outgoing.prepareResponseItem(
      cancelled.output.generic[0],
      cancelled,
      'local'
    );
    expect(local.ui_state).toEqual({ id: 'local' });
    expect(local.item).toBe(cancelled.output.generic[0]);
    const error = outgoing.prepareInlineError(
      'Failed',
      'error',
      9,
      'error-local',
      'main',
      MessageResponseTypes.INLINE_ERROR
    );
    expect(error.localMessage).toMatchObject({
      fullMessageID: 'error',
      ui_state: { id: 'error-local' },
      item: {
        response_type: MessageResponseTypes.INLINE_ERROR,
        text: 'Failed',
      },
    });
    expect(error.originalMessage.history.timestamp).toBe(9);
    expect(error.localMessage.item).toBe(
      error.originalMessage.output.generic[0]
    );
  });

  it('falls back from an empty history label and preserves silent history in copies', () => {
    const original = frozenRequest();
    const copied = outgoing.copyRequest(original);
    copied.history.label = '';
    expect(outgoing.originalText(copied)).toBe('host text');
    expect(copied.history.silent).toBe(true);
    expect(copied.history).not.toBe(original.history);
    copied.ui_state_internal.from_history = false;
    expect(original.ui_state_internal.from_history).toBe(true);
  });
});

it('keeps the outgoing runtime graph pure and its type inputs free of capabilities', () => {
  const sourceRoot = path.resolve(__dirname, '../../../src');
  const visited = new Set<string>();
  const allowedTypes = new Set([
    'types/messaging/Messages.ts',
    'types/messaging/LocalMessageItem.ts',
  ]);
  function visit(file: string) {
    if (visited.has(file)) {
      return;
    }
    visited.add(file);
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true
    );
    function inspect(node: ts.Node) {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        const specifier = node.moduleSpecifier;
        if (specifier && ts.isStringLiteral(specifier)) {
          const name = specifier.text;
          const typeOnly = ts.isImportDeclaration(node)
            ? node.importClause?.isTypeOnly
            : node.isTypeOnly;
          if (!name.startsWith('.')) {
            expect(name).toBe('lodash-es/cloneDeep.js');
          } else {
            const target = path.resolve(path.dirname(file), name) + '.ts';
            if (typeOnly) {
              expect(allowedTypes.has(path.relative(sourceRoot, target))).toBe(
                true
              );
            } else {
              expect(target).toMatch(
                /(?:OutgoingMessageService|inputItemData|outputItemData)\.ts$/
              );
              visit(target);
            }
          }
        }
      }
      if (ts.isIdentifier(node)) {
        expect([
          'ServiceManager',
          'Store',
          'Dispatch',
          'ChatInstance',
          'window',
          'document',
          'Date',
          'Math',
          'uuid',
          'fetch',
          'require',
        ]).not.toContain(node.text);
      }
      if (ts.isCallExpression(node)) {
        expect(node.expression.kind).not.toBe(ts.SyntaxKind.ImportKeyword);
      }
      ts.forEachChild(node, inspect);
    }
    inspect(source);
  }
  visit(
    path.join(
      sourceRoot,
      'sdk/services/messaging/outbound/OutgoingMessageService.ts'
    )
  );
  expect(visited.size).toBe(3);
});
