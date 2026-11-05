/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { RequestQueue } from '../../../src/shared/services/messaging/state/RequestQueue';
import { MessageCoordinator } from '../../../src/shared/services/messaging/MessageCoordinator';
import type { ServiceManager } from '../../../src/shared/services/ServiceManager';
import type { PendingMessageRequest } from '../../../src/shared/services/messaging/pendingRequestTypes';

it('keeps opaque operations in FIFO order until the current operation releases', () => {
  const queue = new RequestQueue();
  const first = Object.freeze({ identity: Symbol('same') });
  const second = Object.freeze({ identity: Symbol('same') });
  const third = Object.freeze({ identity: Symbol('third') });
  queue.enqueue(first);
  queue.enqueue(second);
  queue.enqueue(third);
  expect(queue.takeNext()).toBe(first);
  expect(queue.takeNext()).toBeNull();
  expect(queue.getWaitingCount()).toBe(2);
  queue.removeWaiting(third);
  expect(queue.getCurrent()).toBe(first);
  expect(queue.getWaitingAt(0)).toBe(second);
  queue.clearCurrent();
  expect(queue.takeNext()).toBe(second);
  queue.clearCurrent();
  expect(queue.takeNext()).toBeNull();
  expect(queue.getWaitingCount()).toBe(0);
});

it('keeps record identity separate from mutable message IDs and queue membership', () => {
  const coordinator = new MessageCoordinator({
    store: { subscribe: jest.fn(() => jest.fn()) },
  } as unknown as ServiceManager);
  const first = {
    message: { id: 'same' },
    isProcessed: false,
  } as PendingMessageRequest;
  const second = {
    message: { id: 'same' },
    isProcessed: false,
  } as PendingMessageRequest;
  const third = {
    message: { id: 'third' },
    isProcessed: false,
  } as PendingMessageRequest;
  coordinator.enqueueRequest(first);
  coordinator.enqueueRequest(second);
  coordinator.enqueueRequest(third);
  expect(coordinator.takeNextRequest()).toBe(first);
  first.message.id = 'accepted-id';
  expect(coordinator.getCurrentRequest()).toBe(first);
  second.message.id = 'edited-waiting-id';
  expect(coordinator.removeWaitingRequest('same')).toBeUndefined();
  expect(coordinator.removeWaitingRequest('edited-waiting-id')).toBe(second);
  coordinator.clearCurrentRequest();
  expect(coordinator.takeNextRequest()).toBe(third);
  first.isProcessed = true;
  expect(first.message.id).toBe('accepted-id');
  expect(coordinator.getCurrentRequest()).toBe(third);
  expect(third.isProcessed).toBe(false);
});
