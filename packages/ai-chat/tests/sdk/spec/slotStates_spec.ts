/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createValueStore } from "../../../src/chat/sdk/valueStore";
import { attachSlotStateTracking } from "../../../src/chat/sdk/slotStates";
import { BusEventType } from "../../../src/types/events/eventBusTypes";

/**
 * Builds a fake ServiceManager whose `instance.on` records the registered handlers by event type
 * and counts registrations, so the reduction and idempotency can be exercised without a real boot.
 */
function makeFakeManager() {
  const handlers: Record<string | number, (event: any) => void> = {};
  let onCallCount = 0;
  const manager: any = {
    instance: {
      on: ({ type, handler }: any) => {
        onCallCount += 1;
        handlers[type] = handler;
      },
    },
  };
  return {
    manager,
    handlers,
    onCallCount: () => onCallCount,
  };
}

describe("valueStore", () => {
  it("returns the initial value from get()", () => {
    const store = createValueStore({ a: 1 });
    expect(store.get()).toEqual({ a: 1 });
  });

  it("notifies subscribers on a real change", () => {
    const store = createValueStore(0);
    const listener = jest.fn();
    store.subscribe(listener);

    store.set(1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.get()).toBe(1);
  });

  it("does not notify when the next value is Object.is-equal", () => {
    const same = { a: 1 };
    const store = createValueStore(same);
    const listener = jest.fn();
    store.subscribe(listener);

    store.set(same);
    expect(listener).not.toHaveBeenCalled();
  });

  it("supports updater functions and stops notifying after unsubscribe", () => {
    const store = createValueStore(1);
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);

    store.set((prev) => prev + 1);
    expect(store.get()).toBe(2);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.set(3);
    expect(store.get()).toBe(3);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("attachSlotStateTracking", () => {
  it("reduces the user-defined-response event family into userDefinedBySlot", () => {
    const { manager, handlers } = makeFakeManager();
    const { userDefinedBySlot } = attachSlotStateTracking(manager);

    handlers[BusEventType.USER_DEFINED_RESPONSE]({
      data: { slot: "s1", fullMessage: { id: "m1" }, message: { id: "i1" } },
    });
    expect(userDefinedBySlot.get().s1.fullMessage).toEqual({ id: "m1" });
    expect(userDefinedBySlot.get().s1.messageItem).toEqual({ id: "i1" });

    // Partial chunks accumulate.
    handlers[BusEventType.CHUNK_USER_DEFINED_RESPONSE]({
      data: { slot: "s1", chunk: { partial_item: { t: "p1" } } },
    });
    handlers[BusEventType.CHUNK_USER_DEFINED_RESPONSE]({
      data: { slot: "s1", chunk: { partial_item: { t: "p2" } } },
    });
    expect(userDefinedBySlot.get().s1.partialItems).toEqual([
      { t: "p1" },
      { t: "p2" },
    ]);

    // A complete item replaces the slot value.
    handlers[BusEventType.CHUNK_USER_DEFINED_RESPONSE]({
      data: { slot: "s1", chunk: { complete_item: { id: "i2" } } },
    });
    expect(userDefinedBySlot.get().s1).toEqual({ messageItem: { id: "i2" } });
  });

  it("reduces custom-footer-slot events into customFooterBySlot", () => {
    const { manager, handlers } = makeFakeManager();
    const { customFooterBySlot } = attachSlotStateTracking(manager);

    handlers[BusEventType.CUSTOM_FOOTER_SLOT]({
      data: {
        slotName: "footer1",
        message: { id: "msg1" },
        messageItem: { id: "item1", text: "Hello" },
        additionalData: { customKey: "customValue", count: 42 },
      },
    });

    expect(customFooterBySlot.get().footer1).toEqual({
      slotName: "footer1",
      message: { id: "msg1" },
      messageItem: { id: "item1", text: "Hello" },
      additionalData: { customKey: "customValue", count: 42 },
    });
    expect(Object.keys(customFooterBySlot.get())).toEqual(["footer1"]);
  });

  it("clears both stores on restart", () => {
    const { manager, handlers } = makeFakeManager();
    const { userDefinedBySlot, customFooterBySlot } =
      attachSlotStateTracking(manager);

    handlers[BusEventType.USER_DEFINED_RESPONSE]({
      data: { slot: "s1", fullMessage: { id: "m1" }, message: { id: "i1" } },
    });
    handlers[BusEventType.CUSTOM_FOOTER_SLOT]({
      data: { slotName: "footer1", message: {}, messageItem: {} },
    });

    handlers[BusEventType.RESTART_CONVERSATION]({});
    expect(userDefinedBySlot.get()).toEqual({});
    expect(customFooterBySlot.get()).toEqual({});
  });

  it("notifies subscribers when a slot event arrives", () => {
    const { manager, handlers } = makeFakeManager();
    const { userDefinedBySlot } = attachSlotStateTracking(manager);
    const listener = jest.fn();
    userDefinedBySlot.subscribe(listener);

    handlers[BusEventType.USER_DEFINED_RESPONSE]({
      data: { slot: "s1", fullMessage: {}, message: {} },
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("is idempotent: a second attach reuses the stores and registers no new handlers", () => {
    const { manager, onCallCount } = makeFakeManager();
    const first = attachSlotStateTracking(manager);
    const countAfterFirst = onCallCount();

    const second = attachSlotStateTracking(manager);
    expect(second).toBe(first);
    expect(onCallCount()).toBe(countAfterFirst);
  });
});
