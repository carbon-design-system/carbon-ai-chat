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
import { IncomingMessageService } from '../../../src/chat/services/messaging/inbound/IncomingMessageService';
import { MessageState } from '../../../src/types/config/MessagingConfig';
import {
  MessageResponse,
  MessageResponseTypes,
} from '../../../src/types/messaging/Messages';
import type { ReceivedLocalItems } from '../../../src/chat/store/messageWriteTypes';
import { outputItemData } from '../../../src/chat/schema/outputItemData';

const incoming = new IncomingMessageService();
function response(): MessageResponse {
  return {
    id: 'response',
    output: {
      generic: [{ response_type: MessageResponseTypes.TEXT, text: 'hello' }],
    },
  };
}

describe('IncomingMessageService', () => {
  it('retains a mutable native result without applying defaults or changing its ID', () => {
    const message = response();
    const before = { ...message };
    expect(incoming.prepareUpsertMessage(message)).toBe(message);
    expect(message).toEqual(before);
    expect(message.history).toBeUndefined();
  });

  it('copies a frozen native result without freezing or changing its nested data', () => {
    const message = Object.freeze(response());
    const prepared = incoming.prepareUpsertMessage(message);
    expect(prepared).toEqual(message);
    expect(prepared).not.toBe(message);
    expect(prepared.output).not.toBe(message.output);
    expect(Object.isFrozen(prepared)).toBe(false);
  });

  it.each([null, undefined])('retains nullish rejection for %s', (value) => {
    expect(() => incoming.prepareUpsertMessage(value)).toThrow(
      'upsertMessage: updater must return a MessageResponse, received null/undefined.'
    );
  });

  it.each([false, 0, 'text'])(
    'retains non-object rejection for %s',
    (value) => {
      expect(() =>
        incoming.prepareUpsertMessage(value as unknown as MessageResponse)
      ).toThrow('upsertMessage: updater must return a MessageResponse object.');
    }
  );

  it('leaves object shape and ID validation to the existing core phase', () => {
    const value = [] as unknown as MessageResponse;
    expect(incoming.prepareUpsertMessage(value)).toBe(value);
  });

  it('copies received data together to retain aliases across the message and local items', () => {
    const message = response();
    const localItem = outputItemData(
      message.output.generic[0],
      message,
      'local'
    );
    const received: ReceivedLocalItems = {
      localItem,
      nestedLocalItems: [],
      addAfterID: 'before',
    };
    const prepared = incoming.prepareReceivedMessage(message, received);
    expect(prepared.message).not.toBe(message);
    expect(prepared.received.localItem).not.toBe(localItem);
    expect(prepared.received.localItem.item).toBe(
      prepared.message.output.generic[0]
    );
    expect(prepared.received.addAfterID).toBe('before');
    expect(localItem.item).toBe(message.output.generic[0]);
  });

  it('copies native data at each requested write without losing internal aliases', () => {
    const message = response();
    message.output.generic.push(message.output.generic[0]);
    const prepared = incoming.copyNativeMessage(message);
    expect(prepared.output.generic[0]).toBe(prepared.output.generic[1]);
    expect(prepared.output.generic[0]).not.toBe(message.output.generic[0]);
  });

  it('preserves COMPLETE and ERROR transition facts without retaining state', () => {
    expect(incoming.transitionOf(undefined, MessageState.COMPLETE)).toEqual({
      willFireReceive: true,
      settlesMessage: true,
    });
    expect(
      incoming.transitionOf(MessageState.COMPLETE, MessageState.COMPLETE)
    ).toEqual({ willFireReceive: false, settlesMessage: false });
    expect(
      incoming.transitionOf(MessageState.STREAMING, MessageState.ERROR)
    ).toEqual({ willFireReceive: false, settlesMessage: true });
    expect(
      incoming.transitionOf(MessageState.ERROR, MessageState.ERROR)
    ).toEqual({ willFireReceive: false, settlesMessage: false });
  });
});

it('keeps incoming processors free of runtime effects and capability inputs', () => {
  const root = path.resolve(
    __dirname,
    '../../../src/chat/services/messaging/inbound'
  );
  const files = [
    'IncomingMessageService',
    'prepareReceivedMessage',
    'prepareUpsertMessage',
  ];
  const allowed = new Set([
    'lodash-es/cloneDeep.js',
    './prepareReceivedMessage',
    './prepareUpsertMessage',
    '../../../../types/config/MessagingConfig',
  ]);
  for (const name of files) {
    const text = fs.readFileSync(path.join(root, `${name}.ts`), 'utf8');
    const source = ts.createSourceFile(
      name,
      text,
      ts.ScriptTarget.Latest,
      true
    );
    function inspect(node: ts.Node) {
      if (ts.isIdentifier(node)) {
        expect([
          'ServiceManager',
          'Store',
          'Dispatch',
          'ChatInstance',
          'UpsertMessageUpdater',
          'Date',
          'Math',
          'uuid',
          'window',
          'document',
          'fetch',
          'require',
        ]).not.toContain(node.text);
      }
      ts.forEachChild(node, inspect);
    }
    inspect(source);
    const runtime = ts.createSourceFile(
      name,
      ts.transpileModule(text, {
        compilerOptions: { module: ts.ModuleKind.ESNext },
      }).outputText,
      ts.ScriptTarget.Latest,
      true
    );
    for (const statement of runtime.statements) {
      if (ts.isImportDeclaration(statement)) {
        expect(
          allowed.has((statement.moduleSpecifier as ts.StringLiteral).text)
        ).toBe(true);
      }
    }
  }
});
