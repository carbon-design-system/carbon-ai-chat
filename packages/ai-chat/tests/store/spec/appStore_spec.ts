/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  createAppStore,
  UnknownAction,
} from "../../../src/chat/store/appStore";

interface CounterState {
  count: number;
}

type CounterAction =
  | (UnknownAction & { type: "increment" })
  | (UnknownAction & { type: "decrement" })
  | (UnknownAction & { type: "noop" });

const counterReducer = (
  state: CounterState,
  action: CounterAction,
): CounterState => {
  switch (action.type) {
    case "increment":
      return { ...state, count: state.count + 1 };
    case "decrement":
      return { ...state, count: state.count - 1 };
    case "noop":
    default:
      return state;
  }
};

describe("appStore", () => {
  it("dispatch, getState, and subscribe work and notify only on reference change", () => {
    const store = createAppStore<CounterState, CounterAction>(counterReducer, {
      count: 0,
    });
    expect(store.getState().count).toBe(0);

    let notificationCount = 0;
    const unsubscribe = store.subscribe(() => {
      notificationCount += 1;
    });

    store.dispatch({ type: "increment" } as CounterAction);
    expect(store.getState().count).toBe(1);
    expect(notificationCount).toBe(1);

    // No-op action should not notify
    store.dispatch({ type: "noop" } as CounterAction);
    expect(notificationCount).toBe(1);

    unsubscribe();
    store.dispatch({ type: "decrement" } as CounterAction);
    expect(store.getState().count).toBe(0);
    expect(notificationCount).toBe(1);
  });

  it("continues notifying other listeners when one throws", () => {
    const store = createAppStore<CounterState, CounterAction>(counterReducer, {
      count: 0,
    });

    let callsA = 0;
    let callsB = 0;

    store.subscribe(() => {
      callsA += 1;
      throw new Error("listener boom");
    });
    store.subscribe(() => {
      callsB += 1;
    });

    expect(() => {
      store.dispatch({ type: "increment" } as CounterAction);
    }).not.toThrow();

    expect(callsA).toBe(1);
    expect(callsB).toBe(1);
  });

  it("supports unsubscribing within a listener without breaking iteration", () => {
    const store = createAppStore<CounterState, CounterAction>(counterReducer, {
      count: 0,
    });

    let callsA = 0;
    let callsB = 0;

    const unsubscribeA = store.subscribe(() => {
      callsA += 1;
      unsubscribeA();
    });
    store.subscribe(() => {
      callsB += 1;
    });

    store.dispatch({ type: "increment" } as CounterAction);
    store.dispatch({ type: "increment" } as CounterAction);

    // A is called only once (after it unsubscribed itself), B sees both.
    expect(callsA).toBe(1);
    expect(callsB).toBe(2);
  });

  it("does not notify for repeated no-op dispatches (unchanged reference)", () => {
    const store = createAppStore<CounterState, CounterAction>(counterReducer, {
      count: 0,
    });

    let notifications = 0;
    store.subscribe(() => {
      notifications += 1;
    });

    // Dispatch many no-op actions; the reducer returns the same reference
    for (let i = 0; i < 50; i += 1) {
      store.dispatch({ type: "noop" } as CounterAction);
    }
    expect(store.getState().count).toBe(0);
    expect(notifications).toBe(0);

    // One real update should notify exactly once
    store.dispatch({ type: "increment" } as CounterAction);
    expect(store.getState().count).toBe(1);
    expect(notifications).toBe(1);

    // More no-op dispatches still should not notify further
    for (let i = 0; i < 50; i += 1) {
      store.dispatch({ type: "noop" } as CounterAction);
    }
    expect(notifications).toBe(1);
  });
});
