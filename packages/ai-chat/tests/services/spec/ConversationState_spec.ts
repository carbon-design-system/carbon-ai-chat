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
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { ConversationState } from '../../../src/chat/services/messaging/state/ConversationState';

describe('ConversationState', () => {
  let service: ConversationState;

  beforeEach(() => {
    service = new ConversationState();
  });

  it('clears active responses and stopped requests when restarting', () => {
    const previousGeneration = service.currentGeneration;
    service.responseStreaming('response', previousGeneration, 'active-request');
    service.requestStopped('stopped-request');

    const generation = service.restart(true);

    expect(generation).toBe(previousGeneration + 1);
    expect(service.currentGeneration).toBe(generation);
    expect(service.isCurrent(previousGeneration)).toBe(false);
    expect(service.isCurrent(generation)).toBe(true);
    expect(service.responseRequestID('response')).toBeUndefined();
    expect(service.isRequestStopped('stopped-request')).toBe(false);

    service.responseStreaming('response', generation, 'stopped-request');
    expect(service.requestStopped('stopped-request')).toEqual(['response']);
  });

  it('ignores writes, finishes, and stops from a previous generation', () => {
    const previousGeneration = service.currentGeneration;
    const generation = service.restart(true);
    service.responseStreaming('response', generation, 'request');

    service.responseStreaming('stale-response', previousGeneration, 'request');
    service.responseFinished('response', previousGeneration);

    expect(
      service.requestStopped('request', previousGeneration)
    ).toBeUndefined();
    expect(service.isRequestStopped('request')).toBe(false);
    expect(service.responseRequestID('response')).toBe('request');
    expect(service.responseRequestID('stale-response')).toBeUndefined();
    expect(service.requestStopped('request', generation)).toEqual(['response']);
  });

  it('stops only the responses owned by the request and rejects late writes', () => {
    const generation = service.currentGeneration;
    service.responseStreaming('first-response', generation, 'request');
    service.responseStreaming('second-response', generation, 'request');
    service.responseStreaming('other-response', generation, 'other-request');

    expect(service.requestStopped('request')).toEqual([
      'first-response',
      'second-response',
    ]);
    expect(service.isRequestStopped('request')).toBe(true);
    expect(service.isRequestStopped('other-request')).toBe(false);
    expect(service.responseRequestID('first-response')).toBe('request');
    expect(service.responseRequestID('second-response')).toBe('request');
    expect(service.responseRequestID('other-response')).toBe('other-request');

    service.responseStreaming('first-response', generation, 'request');
    service.responseStreaming('late-response', generation, 'request');

    expect(service.responseRequestID('first-response')).toBe('request');
    expect(service.requestStopped('request')).toEqual([]);
    expect(service.requestStopped('other-request')).toEqual(['other-response']);
  });

  it('retains the original owner when later writes name another request', () => {
    const generation = service.currentGeneration;
    service.responseStreaming('response', generation, 'original-request');
    service.responseStreaming('response', generation, 'other-request');

    expect(service.responseRequestID('response')).toBe('original-request');
    expect(service.requestStopped('other-request')).toEqual([]);
    expect(service.requestStopped('original-request')).toEqual(['response']);
  });

  it('blocks responses when a request stops before its first response arrives', () => {
    expect(service.requestStopped('request')).toEqual([]);

    service.responseStreaming('response', service.currentGeneration, 'request');

    expect(service.isRequestStopped('request')).toBe(true);
    expect(service.getStatus()).toBe('ready');
    expect(service.requestStopped('request')).toEqual([]);
  });

  it('keeps an unowned response unowned when later writes name a request', () => {
    service.responseStreaming('response');
    service.responseStreaming('response', service.currentGeneration, 'request');

    expect(service.responseRequestID('response')).toBeUndefined();
    expect(service.requestStopped('request')).toEqual([]);
  });

  it('finishes only the named response and retains its ownership until removal', () => {
    const generation = service.currentGeneration;
    service.responseStreaming('response', generation, 'request');
    service.responseStreaming('other-response', generation, 'request');

    service.responseFinished('response');
    service.responseFinished('response');

    expect(service.responseRequestID('response')).toBe('request');
    expect(service.responseRequestID('other-response')).toBe('request');
    expect(service.isRequestStopped('request')).toBe(false);

    service.responseStreaming('response', generation, 'next-request');

    expect(service.responseRequestID('response')).toBe('request');
    expect(service.requestStopped('next-request')).toEqual([]);
    service.responseRemoved('response');
    service.responseStreaming('response', generation, 'fresh-request');

    expect(service.responseRequestID('response')).toBe('fresh-request');
    expect(service.requestStopped('request')).toEqual(['other-response']);
    expect(service.requestStopped('fresh-request')).toEqual(['response']);
  });

  it('allows a removed response ID under a new request without reviving its stopped owner', () => {
    service.responseStreaming('response', service.currentGeneration, 'request');
    expect(service.requestStopped('request')).toEqual(['response']);
    expect(service.getStatus()).toBe('ready');

    service.responseRemoved('response');
    expect(service.responseRequestID('response')).toBeUndefined();
    expect(service.isRequestStopped('request')).toBe(true);
    service.responseStreaming(
      'response',
      service.currentGeneration,
      'next-request'
    );

    expect(service.getStatus()).toBe('streaming');
    expect(service.responseRequestID('response')).toBe('next-request');
    expect(service.requestStopped('request')).toEqual([]);
    expect(service.requestStopped('next-request')).toEqual(['response']);
  });

  it('stops responses through a request ID changed by pre:send', () => {
    const request = { id: 'original' };
    service.requestStarted('original', service.currentGeneration, request);
    request.id = 'alias';
    service.responseStreaming('response', service.currentGeneration, 'alias');

    expect(service.requestStopped('alias')).toEqual(['response']);
    expect(service.isRequestStopped('original')).toBe(true);
    expect(service.isRequestStopped('alias')).toBe(true);
    expect(service.responseRequestID('response')).toBe('original');
    expect(service.getStatus()).toBe('ready');
  });

  it('ignores an empty response ID', () => {
    service.responseStreaming('', service.currentGeneration, 'request');

    expect(service.requestStopped('request')).toEqual([]);
  });

  it('derives status with error, loading, streaming, submitted, and ready precedence', () => {
    service.requestStarted('request');
    expect(service.getStatus()).toBe('submitted');
    service.responseStreaming('response');
    expect(service.getStatus()).toBe('streaming');
    service.hydrationStarted();
    expect(service.getStatus()).toBe('loading');
    const failure = service.fail({});
    expect(service.getStatus()).toBe('error');
    service.clearFailure(failure);
    expect(service.getStatus()).toBe('loading');
    service.hydrationFinished(service.currentGeneration);
    expect(service.getStatus()).toBe('streaming');
    service.responseFinished('response');
    expect(service.getStatus()).toBe('submitted');
    service.requestFinished('request');
    expect(service.getStatus()).toBe('ready');
  });

  it('retains streaming status for a responded request after its response finishes', () => {
    service.requestStarted('request');
    service.responseStreaming('response', service.currentGeneration, 'request');
    service.responseFinished('response');
    expect(service.getStatus()).toBe('streaming');
    service.requestFinished('request');
    expect(service.getStatus()).toBe('ready');
  });

  it('requires the exact current failure token and generation', () => {
    const first = service.fail({ messageID: 'first' });
    const current = service.fail({ messageID: 'current' });
    expect(service.clearFailure(first)).toBe(false);
    expect(service.clearFailure({ ...current })).toBe(false);
    expect(service.hasFailureForRequest('current')).toBe(true);
    expect(service.clearFailure(current)).toBe(true);
    expect(service.getStatus()).toBe('ready');
    const previous = service.fail({ messageID: 'previous' });
    const generation = service.currentGeneration;
    service.restart(true);
    service.fail({ messageID: 'new' });
    expect(service.clearFailure(previous)).toBe(false);
    expect(service.fail({ messageID: 'stale' }, generation)).toBeNull();
    expect(service.hasFailureForRequest('new')).toBe(true);
  });

  it('remembers a changed request ID after the request leaves the active set', () => {
    const request = { id: 'original' };
    service.requestStarted('original', service.currentGeneration, request);
    request.id = 'edited';
    service.responseReceived('response', service.currentGeneration, 'edited');
    service.requestFinished('edited');
    service.fail({ messageID: 'edited' });
    expect(service.hasFailureForRequest('original')).toBe(true);
    expect(service.isResponseOwnedByRequest('response', 'edited')).toBe(true);
  });
});

describe('conversation state boundary', () => {
  const file = path.resolve(
    __dirname,
    '../../../src/chat/services/messaging/state/ConversationState.ts'
  );
  const text = fs.readFileSync(file, 'utf8');

  it('accepts only the public status type as an imported capability', () => {
    const source = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true
    );
    const imports = source.statements.filter(ts.isImportDeclaration);
    expect(
      imports.map((node) => ({
        typeOnly: node.importClause?.isTypeOnly,
        source: (node.moduleSpecifier as ts.StringLiteral).text,
        bindings: node.importClause?.namedBindings?.getText(source),
      }))
    ).toEqual([
      {
        typeOnly: true,
        source: '../../../../types/instance/PublicChatState',
        bindings: '{ ConversationStatus }',
      },
    ]);
    const inlineImports: string[] = [];
    function visit(node: ts.Node) {
      if (
        ts.isImportTypeNode(node) ||
        (ts.isCallExpression(node) &&
          (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
            (ts.isIdentifier(node.expression) &&
              node.expression.text === 'require')))
      ) {
        inlineImports.push(node.getText(source));
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    expect(inlineImports).toEqual([]);
  });

  it('runs transitions without browser globals, a store, or runtime imports', () => {
    const { outputText } = ts.transpileModule(text, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    });
    const context = {
      exports: {} as { ConversationState: typeof ConversationState },
    };
    runInNewContext(outputText, context);
    const state = new context.exports.ConversationState();
    state.requestStarted('request');
    state.responseStreaming('response', state.currentGeneration, 'request');
    expect(state.getStatus()).toBe('streaming');
    expect(state.requestStopped('request')).toEqual(['response']);
    expect(state.getStatus()).toBe('ready');
    const generation = state.restart(false);
    expect(state.getStatus()).toBe('loading');
    state.hydrationFinished(generation);
    expect(state.getStatus()).toBe('ready');
  });
});
