/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { EventBus } from '../../../src/sdk/events/EventBus';
import {
  dropSubscriptions,
  mountSubscriptions,
} from '../../../src/chat/utils/mountSubscriptions';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import type { TypeAndHandler } from '../../../src/types/instance/EventHandlers';
import {
  BusEvent,
  BusEventType,
} from '../../../src/types/events/eventBusTypes';

const type = BusEventType.VIEW_CHANGE;
const event = { type } as BusEvent;

function mount(bus: EventBus): ChatInstance {
  const state = {
    get: jest.fn(),
    subscribe: jest.fn(() => jest.fn()),
    select: jest.fn(() => jest.fn()),
  } as ChatInstance['state'];
  const instance = mountSubscriptions(
    bus,
    state,
    () => instance
  ) as ChatInstance;
  return instance;
}

function droppedEntries(bus: EventBus, instance: ChatInstance) {
  const off = jest.spyOn(bus, 'off');
  dropSubscriptions(instance);
  expect(off).toHaveBeenCalledTimes(1);
  return off.mock.calls[0][0] as TypeAndHandler[];
}

describe('mount subscription tracking', () => {
  afterEach(() => jest.restoreAllMocks());

  it('drops no cancelled once wrappers after repeated once and off calls', () => {
    const bus = new EventBus();
    const instance = mount(bus);
    const handler = jest.fn();
    const unrelated = jest.fn();
    bus.on({ type, handler: unrelated });
    for (let index = 0; index < 3; index++) {
      expect(instance.once({ type, handler })).toBe(instance);
      expect(instance.off({ type, handler })).toBe(instance);
    }
    expect(droppedEntries(bus, instance)).toEqual([]);
    bus.fireSync(event, instance);
    expect(handler).not.toHaveBeenCalled();
    expect(unrelated).toHaveBeenCalledTimes(1);
  });

  it('keeps one tracked wrapper after cancelling one duplicate once', () => {
    const bus = new EventBus();
    const instance = mount(bus);
    const handler = jest.fn();
    instance.once([
      { type, handler },
      { type, handler },
    ]);
    instance.off({ type, handler });
    const remaining = droppedEntries(bus, instance);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].type).toBe(type);
    expect(remaining[0].handler).not.toBe(handler);
    bus.fireSync(event, instance);
    expect(handler).not.toHaveBeenCalled();
  });

  it('prunes the live mount when a released instance cancels its once handler', () => {
    const bus = new EventBus();
    const first = mount(bus);
    const handler = jest.fn();
    first.once({ type, handler });
    dropSubscriptions(first);
    const second = mount(bus);
    second.once({ type, handler });
    first.off({ type, handler });
    expect(droppedEntries(bus, second)).toEqual([]);
    bus.fireSync(event, second);
    expect(handler).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    'removes a direct on handler before its once wrapper (on first: %s)',
    (onFirst) => {
      const bus = new EventBus();
      const instance = mount(bus);
      const handler = jest.fn();
      if (onFirst) {
        instance.on({ type, handler });
        instance.once({ type, handler });
      } else {
        instance.once({ type, handler });
        instance.on({ type, handler });
      }
      instance.off({ type, handler });
      bus.fireSync(event, instance);
      bus.fireSync(event, instance);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(droppedEntries(bus, instance)).toEqual([]);
    }
  );

  it.each(['type', 'all'])(
    'prunes once wrappers after the bus clears %s handlers',
    (scope) => {
      const bus = new EventBus();
      const instance = mount(bus);
      instance.once({ type, handler: jest.fn() });
      if (scope === 'type') {
        expect(bus.off({ type, handler: undefined })).toBe(bus);
      } else {
        expect(bus.clear()).toBe(bus);
      }
      expect(droppedEntries(bus, instance)).toEqual([]);
    }
  );
});
