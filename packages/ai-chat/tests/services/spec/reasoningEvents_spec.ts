/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { coordinateReasoningEvents } from '../../../src/shared/services/messaging/coordinateReasoningEvents';
import { retainNativeMessageOrigin } from '../../../src/shared/services/messaging/nativeMessageEvents';
import { resolvablePromise } from '../../../src/shared/utils/resolvablePromise';
import {
  MessageResponse,
  MessageResponseTypes,
} from '../../../src/types/messaging/Messages';

function fixture() {
  const first = {
    response_type: MessageResponseTypes.USER_DEFINED,
    user_defined: { value: 'first' },
  };
  const second = {
    response_type: MessageResponseTypes.USER_DEFINED,
    user_defined: { value: 'second' },
  };
  const message: MessageResponse = {
    id: 'response',
    output: { generic: [] },
    message_options: { reasoning: { content: [first, second] } },
  };
  return { first, second, message };
}

it('marks one item at a time across a synchronous callback reentry', () => {
  const { message } = fixture();
  const session = new Set<string>();
  const trace: string[] = [];
  const deliver = (local: any) => {
    trace.push(local.item.user_defined.value);
    if (trace.length === 1) {
      expect(session.has('response-reasoning-intro-item-1')).toBe(false);
      coordinateReasoningEvents(session, message, deliver);
    }
    return Promise.resolve();
  };
  coordinateReasoningEvents(session, message, deliver);
  coordinateReasoningEvents(session, message, deliver);
  expect(trace).toEqual(['first', 'second']);
});

it('reads a later legacy item after an earlier detached callback edits it', () => {
  const { message, second } = fixture();
  const values: string[] = [];
  coordinateReasoningEvents(new Set(), message, (local: any, full) => {
    expect(full).toBe(message);
    values.push(local.item.user_defined.value);
    second.user_defined.value = 'edited';
    return new Promise(() => undefined);
  });
  expect(values).toEqual(['first', 'edited']);
});

it('keeps a failed detached delivery marked on later passes through the same session', async () => {
  const { message } = fixture();
  const session = new Set<string>();
  const pending = resolvablePromise<void>();
  const failure = new Error('reasoning callback failed');
  const rejected = expect(pending).rejects.toBe(failure);
  const values: string[] = [];
  const deliver = (local: any) => {
    const value = local.item.user_defined.value;
    values.push(value);
    return value === 'first' ? pending : Promise.resolve();
  };

  expect(coordinateReasoningEvents(session, message, deliver)).toBeUndefined();
  expect(values).toEqual(['first', 'second']);
  expect(session.has('response-reasoning-intro-item-0')).toBe(true);
  pending.doReject(failure);
  await rejected;

  coordinateReasoningEvents(session, message, deliver);
  expect(values).toEqual(['first', 'second']);
  (message.message_options.reasoning.content as any[]).push({
    response_type: MessageResponseTypes.USER_DEFINED,
    user_defined: { value: 'later' },
  });
  coordinateReasoningEvents(session, message, deliver);
  expect(values).toEqual(['first', 'second', 'later']);
});

it('retains native snapshots and message/item aliases at each delivery', () => {
  const { message, first } = fixture();
  retainNativeMessageOrigin(message);
  const delivered: unknown[] = [];
  coordinateReasoningEvents(new Set(), message, (local, full: any) => {
    expect(full).not.toBe(message);
    expect(Object.isFrozen(full)).toBe(true);
    expect(Object.isFrozen(local.item)).toBe(true);
    const index = delivered.length;
    expect(local.item).toBe(full.message_options.reasoning.content[index]);
    delivered.push(local.item);
    return Promise.resolve();
  });
  expect(delivered).toHaveLength(2);
  expect(delivered[0]).not.toBe(first);
});

it('can stop a retired headless session without changing mounted delivery', () => {
  const { message } = fixture();
  let active = true;
  const deliver = jest.fn(() => {
    active = false;
    return Promise.resolve();
  });
  coordinateReasoningEvents(new Set(), message, deliver, () => active);
  expect(deliver).toHaveBeenCalledTimes(1);
  deliver.mockClear();
  coordinateReasoningEvents(new Set(), message, deliver);
  expect(deliver).toHaveBeenCalledTimes(2);
});
