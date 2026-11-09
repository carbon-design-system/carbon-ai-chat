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
import { EventBus } from '../../../src/shared/events/EventBus';
import type { ServiceManager } from '../../../src/shared/services/ServiceManager';
import {
  attachSlotTracking,
  type CustomFooterSlotState,
  type UserDefinedSlotState,
} from '../../../src/shared/services/slotTracking';
import type {
  RenderCustomMessageFooterState,
  RenderUserDefinedState,
} from '../../../src/types/component/ChatContainer';
import {
  BusEventType,
  type BusEvent,
} from '../../../src/types/events/eventBusTypes';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import { MessageState } from '../../../src/types/config/MessagingConfig';
import {
  MessageResponseTypes,
  type GenericItem,
  type MessageResponse,
} from '../../../src/types/messaging/Messages';

// Shared code can't import the public types (their module imports React), so
// the tracking restates them. Each pair must match exactly.
type Exactly<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
const userDefinedMatches: Exactly<
  UserDefinedSlotState,
  RenderUserDefinedState
> = true;
const footerMatches: Exactly<
  CustomFooterSlotState,
  RenderCustomMessageFooterState
> = true;

const item = (text: string): GenericItem => ({
  response_type: MessageResponseTypes.USER_DEFINED,
  user_defined: { text },
});

const message: MessageResponse = {
  id: 'response-1',
  output: { generic: [item('full')] },
};

function createChat() {
  const eventBus = new EventBus();
  const serviceManager = { eventBus } as unknown as ServiceManager;
  const instance = {} as ChatInstance;
  const fire = (event: BusEvent) => eventBus.fire(event, instance);
  return { serviceManager, eventBus, fire };
}

describe('attachSlotTracking', () => {
  it('restates the public slot-state types exactly', () => {
    expect([userDefinedMatches, footerMatches]).toEqual([true, true]);
  });

  it('makes a user-defined response readable from the response store (O10)', async () => {
    const { serviceManager, fire } = createChat();
    const stores = attachSlotTracking(serviceManager);
    const listener = jest.fn();
    stores.userDefinedResponse.subscribe(listener);

    await fire({
      type: BusEventType.USER_DEFINED_RESPONSE,
      data: {
        slot: 'slot-a',
        message: item('a'),
        fullMessage: message,
        state: MessageState.COMPLETE,
      },
    } as BusEvent);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(stores.userDefinedResponse.get()).toEqual({
      'slot-a': {
        fullMessage: message,
        messageItem: item('a'),
        state: MessageState.COMPLETE,
      },
    });
    expect(stores.customFooter.get()).toEqual({});
  });

  it('updates the same slot from chunked responses (O11)', async () => {
    const { serviceManager, fire } = createChat();
    const stores = attachSlotTracking(serviceManager);
    const chunk = (body: object) =>
      fire({
        type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
        data: { slot: 'slot-a', messageItem: {}, chunk: body },
      } as BusEvent);

    await chunk({ partial_item: { user_defined: { text: 'one' } } });
    await chunk({ partial_item: { user_defined: { text: 'two' } } });
    const partial = stores.userDefinedResponse.get();
    expect(partial['slot-a'].partialItems).toEqual([
      { user_defined: { text: 'one' } },
      { user_defined: { text: 'two' } },
    ]);

    await chunk({ complete_item: item('done') });
    expect(stores.userDefinedResponse.get()).toEqual({
      'slot-a': { messageItem: item('done') },
    });
    expect(stores.userDefinedResponse.get()).not.toBe(partial);
  });

  it('makes a custom footer readable from a separate footer store (O12)', async () => {
    const { serviceManager, fire } = createChat();
    const stores = attachSlotTracking(serviceManager);
    const responses = stores.userDefinedResponse.get();
    const responseListener = jest.fn();
    stores.userDefinedResponse.subscribe(responseListener);

    await fire({
      type: BusEventType.CUSTOM_FOOTER_SLOT,
      data: {
        slotName: 'footer-a',
        message,
        messageItem: item('a'),
        additionalData: { rating: true },
      },
    } as BusEvent);

    expect(stores.customFooter.get()).toEqual({
      'footer-a': {
        slotName: 'footer-a',
        message,
        messageItem: item('a'),
        additionalData: { rating: true },
      },
    });
    expect(responseListener).not.toHaveBeenCalled();
    expect(stores.userDefinedResponse.get()).toBe(responses);
  });

  it('empties both stores on a conversation restart (O13)', async () => {
    const { serviceManager, fire } = createChat();
    const stores = attachSlotTracking(serviceManager);
    const empty = stores.userDefinedResponse.get();
    await fire({
      type: BusEventType.USER_DEFINED_RESPONSE,
      data: { slot: 'slot-a', message: item('a'), fullMessage: message },
    } as BusEvent);
    await fire({
      type: BusEventType.CUSTOM_FOOTER_SLOT,
      data: { slotName: 'footer-a', message, messageItem: item('a') },
    } as BusEvent);

    await fire({ type: BusEventType.RESTART_CONVERSATION });

    expect(stores.userDefinedResponse.get()).toEqual({});
    expect(stores.customFooter.get()).toEqual({});
    expect(stores.userDefinedResponse.get()).toBe(empty);

    // A restart with nothing tracked changes nothing.
    const listener = jest.fn();
    stores.customFooter.subscribe(listener);
    await fire({ type: BusEventType.RESTART_CONVERSATION });
    expect(listener).not.toHaveBeenCalled();
  });

  it('adds one listener however often it is attached (O14)', async () => {
    const { serviceManager, fire } = createChat();
    const first = attachSlotTracking(serviceManager);
    const second = attachSlotTracking(serviceManager);
    const listener = jest.fn();
    first.userDefinedResponse.subscribe(listener);

    await fire({
      type: BusEventType.USER_DEFINED_RESPONSE,
      data: { slot: 'slot-a', message: item('a'), fullMessage: message },
    } as BusEvent);

    expect(second).toBe(first);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps each chat to its own stores', async () => {
    const one = createChat();
    const two = createChat();
    const stores = attachSlotTracking(one.serviceManager);
    attachSlotTracking(two.serviceManager);

    await two.fire({
      type: BusEventType.USER_DEFINED_RESPONSE,
      data: { slot: 'slot-a', message: item('a'), fullMessage: message },
    } as BusEvent);

    expect(stores.userDefinedResponse.get()).toEqual({});
  });

  it('gives readers no way to write', () => {
    const { serviceManager } = createChat();
    const stores = attachSlotTracking(serviceManager);
    expect(Object.keys(stores.userDefinedResponse).sort()).toEqual([
      'get',
      'subscribe',
    ]);
    expect(Object.isFrozen(stores)).toBe(true);
  });

  it('lands inert: only tests call it (O15)', () => {
    const src = path.resolve(__dirname, '../../../src');
    const callers = (function walk(dir: string): string[] {
      return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          return walk(file);
        }
        return /\.tsx?$/.test(file) &&
          fs.readFileSync(file, 'utf8').includes('attachSlotTracking')
          ? [path.relative(src, file)]
          : [];
      });
    })(src);
    expect(callers).toEqual(['shared/services/slotTracking.ts']);
  });
});
