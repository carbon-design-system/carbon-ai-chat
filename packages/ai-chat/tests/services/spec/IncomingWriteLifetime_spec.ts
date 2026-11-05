/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { IncomingWriteLifetime } from '../../../src/chat/services/messaging/IncomingWriteLifetime';

it('keeps a released guard valid while a reveal lease retains the same entry', () => {
  let restartCount = 0;
  const lifetime = new IncomingWriteLifetime(() => restartCount);
  const outer = lifetime.trackWrite('response');
  const reveal = lifetime.trackWrite('response');
  outer.release();
  outer.release();
  expect(outer.isCurrent()).toBe(true);
  expect(lifetime.state.pendingWrites.get('response').count).toBe(1);
  reveal.release();
  expect(lifetime.state.pendingWrites.has('response')).toBe(false);
  expect(outer.isCurrent()).toBe(true);
  restartCount++;
  expect(outer.isCurrent()).toBe(false);
});

it('does not let an old lease erase a recreated message entry', () => {
  const lifetime = new IncomingWriteLifetime(() => 0);
  const old = lifetime.trackWrite('response');
  const removed = lifetime.state.pendingWrites.get('response');
  removed.valid = false;
  lifetime.state.pendingWrites.delete('response');
  const fresh = lifetime.trackWrite('response');
  old.release();
  expect(old.isCurrent()).toBe(false);
  expect(fresh.isCurrent()).toBe(true);
  expect(lifetime.state.pendingWrites.get('response').count).toBe(1);
  lifetime.state.generation++;
  expect(fresh.isCurrent()).toBe(false);
});

it('does not read restart state after an earlier guard has failed', () => {
  const readRestart = jest.fn(() => 0);
  const lifetime = new IncomingWriteLifetime(readRestart);
  const lease = lifetime.trackWrite('response');
  readRestart.mockClear();
  lifetime.state.generation++;
  expect(lease.isCurrent()).toBe(false);
  expect(readRestart).not.toHaveBeenCalled();
});

it('recovers the same ID after failure while another ID can run', async () => {
  const lifetime = new IncomingWriteLifetime(() => 0);
  let rejectFirst: (reason: Error) => void;
  const firstResult = new Promise<void>((_, reject) => {
    rejectFirst = reject;
  });
  const order: string[] = [];
  const first = lifetime.enqueue('a', () => firstResult);
  const observedFailure = first.catch((error) => error);
  const next = lifetime.enqueue('a', async () => {
    order.push('a');
  });
  await lifetime.enqueue('b', async () => {
    order.push('b');
  });
  expect(order).toEqual(['b']);
  const failure = new Error('first');
  rejectFirst(failure);
  expect(await observedFailure).toBe(failure);
  await next;
  expect(order).toEqual(['b', 'a']);
});

it('does not let a cleared tail delete a replacement chain', async () => {
  const lifetime = new IncomingWriteLifetime(() => 0);
  let finishOld: () => void;
  let finishNew: () => void;
  const oldResult = new Promise<void>((resolve) => {
    finishOld = resolve;
  });
  const newResult = new Promise<void>((resolve) => {
    finishNew = resolve;
  });
  const old = lifetime.enqueue('a', () => oldResult);
  lifetime.chainByID.delete('a');
  const next = lifetime.enqueue('a', () => newResult);
  finishOld();
  await old;
  expect(lifetime.chainByID.get('a')).toBe(next);
  finishNew();
  await next;
});

it('skips a queued worker after its upsert generation changes', async () => {
  const lifetime = new IncomingWriteLifetime(() => 0);
  const worker = jest.fn(async (): Promise<void> => undefined);
  const queued = lifetime.enqueue('a', worker);
  lifetime.state.generation++;
  await queued;
  expect(worker).not.toHaveBeenCalled();
});

it('keeps the state model free of runtime imports and effect capabilities', () => {
  const file = path.resolve(
    __dirname,
    '../../../src/chat/services/messaging/state/IncomingWriteState.ts'
  );
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true
  );
  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node)) {
      expect(node.importClause?.isTypeOnly).toBe(true);
      expect((node.moduleSpecifier as ts.StringLiteral).text).toBe(
        '../../../../types/config/MessagingConfig'
      );
      expect(node.importClause?.namedBindings?.getText(source)).toBe(
        '{ MessageState }'
      );
    }
    expect(ts.isImportTypeNode(node) || ts.isFunctionTypeNode(node)).toBe(
      false
    );
    if (ts.isIdentifier(node)) {
      expect([
        'Promise',
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
