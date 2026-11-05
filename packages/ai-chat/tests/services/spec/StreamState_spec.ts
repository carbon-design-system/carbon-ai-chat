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
import {
  StreamState,
  type StreamControllerToken,
} from '../../../src/shared/services/messaging/state/StreamState';

it('retains the first owner and controller token while adding item aliases', () => {
  const state = new StreamState();
  const first = {} as StreamControllerToken;
  const second = {} as StreamControllerToken;
  const entry = state.track('response', 'first-request', first, 'first-item');
  expect(state.track('response', 'second-request', second, 'second-item')).toBe(
    entry
  );
  expect(entry.requestId).toBe('first-request');
  expect(entry.controllerToken).toBe(first);
  expect(state.resolveResponseId('second-item')).toBe('response');
  expect(state.clear('response')).toBe(entry);
  expect(state.resolveResponseId('first-item')).toBe('first-item');
  expect(state.resolveResponseId('second-item')).toBe('second-item');
});

it('fills missing owner/token values without replacing the metadata record', () => {
  const state = new StreamState();
  const entry = state.track('response');
  const token = {} as StreamControllerToken;
  state.track('response', 'request', token);
  expect(state.getMeta('response')).toBe(entry);
  expect(entry).toMatchObject({ requestId: 'request', controllerToken: token });
});

it('keeps the existing clear behavior when an item alias was reused', () => {
  const state = new StreamState();
  state.track('first', 'one', undefined, 'shared-item');
  state.track('second', 'two', undefined, 'shared-item');
  expect(state.resolveResponseId('shared-item')).toBe('second');
  state.clear('first');
  expect(state.resolveResponseId('shared-item')).toBe('shared-item');
  expect(state.getMeta('second').itemIds.has('shared-item')).toBe(true);
});

it('has no imports, controllers, or effect callbacks', () => {
  const file = path.resolve(
    __dirname,
    '../../../src/shared/services/messaging/state/StreamState.ts'
  );
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true
  );
  function visit(node: ts.Node) {
    expect(
      ts.isImportDeclaration(node) ||
        ts.isImportTypeNode(node) ||
        ts.isFunctionTypeNode(node)
    ).toBe(false);
    if (ts.isIdentifier(node)) {
      expect([
        'AbortController',
        'ServiceManager',
        'dispatch',
        'Date',
        'window',
        'document',
        'require',
      ]).not.toContain(node.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
});
