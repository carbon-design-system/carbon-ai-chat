/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChunkWorkflow } from '../../../src/shared/services/messaging/ChunkWorkflow';
import { MessageCoordinator } from '../../../src/shared/services/messaging/MessageCoordinator';
import type { MessagePresentationPort } from '../../../src/shared/services/messaging/presentationPort';
import type { ServiceManager } from '../../../src/shared/services/ServiceManager';
import type {
  PauseItem,
  StreamChunk,
} from '../../../src/types/messaging/Messages';
import { resolvablePromise } from '../../../src/shared/utils/resolvablePromise';
import { withMessagingView } from '../helpers/viewBindings';

it('returns the original chunk and pause promises from the core', () => {
  const manager = {} as ServiceManager;
  const core = new MessageCoordinator(
    withMessagingView(manager, {} as MessagePresentationPort)
  );
  manager.messageCoordinator = core;
  const chunkResult = resolvablePromise<void>();
  const pauseResult = resolvablePromise<void>();
  const receive = jest
    .spyOn(ChunkWorkflow.prototype, 'receiveChunk')
    .mockReturnValue(chunkResult);
  const pause = jest
    .spyOn(ChunkWorkflow.prototype, 'waitForPause')
    .mockReturnValue(pauseResult);
  try {
    const chunk = {} as StreamChunk;
    const item = {} as PauseItem;
    const options = {};
    expect(core.receiveChunk(chunk, 'response', options)).toBe(chunkResult);
    expect(core.waitForPause(item, 7)).toBe(pauseResult);
    expect(receive).toHaveBeenCalledWith(chunk, 'response', options);
    expect(pause).toHaveBeenCalledWith(item, 7);
    expect(receive.mock.instances[0]).toBe(pause.mock.instances[0]);
  } finally {
    receive.mockRestore();
    pause.mockRestore();
    chunkResult.doResolve();
    pauseResult.doResolve();
  }
});

it('retains captured error sets when the same request ID gets new tracking', () => {
  const manager = {} as ServiceManager;
  const core = new MessageCoordinator(
    withMessagingView(manager, {} as MessagePresentationPort)
  );
  manager.messageCoordinator = core;
  const firstController = new AbortController();
  const secondController = new AbortController();
  const first = core.trackChunkRequestErrors(
    'same-request',
    firstController.signal
  );
  core.bumpChunkRestartGeneration();
  const second = core.trackChunkRequestErrors(
    'same-request',
    secondController.signal
  );
  const workflow = (core as any).chunkWorkflow;
  const records = workflow.pendingSendErrors as Map<string, typeof first>;
  const originalError = new Error('original');
  first.formattingErrors.add(originalError);
  firstController.abort();
  expect(records.get('same-request')?.formattingErrors).toBe(
    second.formattingErrors
  );
  expect(first.formattingErrors.has(originalError)).toBe(true);
  expect(second.formattingErrors.size).toBe(0);
  expect(second.restartGeneration).toBe(first.restartGeneration + 1);
  second.finish();
  expect(records.has('same-request')).toBe(false);
});

it.each([false, true])(
  'shifts before settlement and starts the next chunk inline (failure %p)',
  (fails) => {
    const workflow = new ChunkWorkflow({} as ServiceManager) as any;
    const order: string[] = [];
    const next = { chunk: 'next' };
    const error = new Error('same failure');
    const settled = () => {
      expect(workflow.chunkQueue).toEqual([next]);
      order.push('settled');
    };
    const deferred = {
      doResolve: jest.fn(settled),
      doReject: jest.fn((received) => {
        expect(received).toBe(error);
        settled();
      }),
    };
    workflow.chunkQueue = [{ chunk: 'first' }, next];
    workflow.processChunkQueue = jest.fn(() => order.push('next'));
    workflow.advanceChunkQueue(deferred, fails ? { error } : undefined);
    order.push('returned');
    expect(order).toEqual(['settled', 'next', 'returned']);
    expect(deferred.doResolve).toHaveBeenCalledTimes(fails ? 0 : 1);
    expect(deferred.doReject).toHaveBeenCalledTimes(fails ? 1 : 0);
  }
);
