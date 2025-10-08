/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { ReactElement } from "react";
import { render, screen, act } from "@testing-library/react";
import { StoreProvider } from "../../../src/chat/providers/StoreProvider";
import { useSelector } from "../../../src/chat/hooks/useSelector";

import {
  createAppStore,
  UnknownAction,
  shallowEqual,
} from "../../../src/chat/store/appStore";

interface State {
  count: number;
  other: number;
}

type Action =
  | (UnknownAction & { type: "inc" })
  | (UnknownAction & { type: "setOther"; value: number });

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "inc":
      return { ...state, count: state.count + 1 };
    case "setOther":
      return { ...state, other: action.value };
    default:
      return state;
  }
};

describe("react-redux polyfill", () => {
  it("useSelector reads updates from the store", () => {
    const store = createAppStore<State, Action>(reducer, {
      count: 0,
      other: 0,
    });

    function Counter(): ReactElement {
      const count = useSelector<State, number>((s) => s.count);
      return <div data-testid="count">{String(count)}</div>;
    }

    render(
      <StoreProvider store={store}>
        <Counter />
      </StoreProvider>,
    );

    expect(screen.getByTestId("count").textContent).toBe("0");
    act(() => {
      store.dispatch({ type: "inc" } as Action);
    });
    expect(screen.getByTestId("count").textContent).toBe("1");
  });

  it("functional component using useSelector re-renders on store updates", () => {
    const store = createAppStore<State, Action>(reducer, {
      count: 0,
      other: 0,
    });

    function View(): ReactElement {
      const value = useSelector<State, number>((s) => s.count);
      return <div data-testid="value">{String(value)}</div>;
    }

    render(
      <StoreProvider store={store}>
        <View />
      </StoreProvider>,
    );

    expect(screen.getByTestId("value").textContent).toBe("0");
    act(() => {
      store.dispatch({ type: "inc" } as Action);
    });
    expect(screen.getByTestId("value").textContent).toBe("1");
  });

  it("does not re-render when unrelated state changes (primitive selection)", () => {
    const store = createAppStore<State, Action>(reducer, {
      count: 0,
      other: 0,
    });

    let renders = 0;
    function View(): ReactElement {
      // Select a primitive
      const value = useSelector<State, number>((s) => s.count);
      renders += 1;
      return <div data-testid="value-primitive">{String(value)}</div>;
    }

    render(
      <StoreProvider store={store}>
        <View />
      </StoreProvider>,
    );

    expect(renders).toBe(1);
    act(() => {
      store.dispatch({ type: "setOther", value: 123 } as Action);
    });
    // Should not re-render because selected value (count) didn't change
    expect(renders).toBe(1);
    expect(screen.getByTestId("value-primitive").textContent).toBe("0");
  });

  it("reuses snapshot reference with equalityFn for object selections", () => {
    const store = createAppStore<State, Action>(reducer, {
      count: 0,
      other: 0,
    });

    let renders = 0;
    function View(): ReactElement {
      // Return a fresh object each time; shallowEqual should prevent re-renders
      const selected = useSelector<State, { c: number }>(
        (s) => ({ c: s.count }),
        shallowEqual,
      );
      renders += 1;
      return <div data-testid="value-object">{String(selected.c)}</div>;
    }

    render(
      <StoreProvider store={store}>
        <View />
      </StoreProvider>,
    );

    expect(renders).toBe(1);
    act(() => {
      store.dispatch({ type: "setOther", value: 1 } as Action);
    });
    // Object recreated but equal by shallowEqual => no re-render
    expect(renders).toBe(1);
    act(() => {
      store.dispatch({ type: "inc" } as Action);
    });
    // Now the selected content changed => re-render
    expect(renders).toBe(2);
    expect(screen.getByTestId("value-object").textContent).toBe("1");
  });

  it("custom equalityFn can control update frequency (bucketing example)", () => {
    const store = createAppStore<State, Action>(reducer, {
      count: 0,
      other: 0,
    });

    let renders = 0;
    function View(): ReactElement {
      const count = useSelector<State, number>(
        (s) => s.count,
        (a, b) => Math.floor(a / 2) === Math.floor(b / 2),
      );
      renders += 1;
      return <div data-testid="bucket">{String(Math.floor(count / 2))}</div>;
    }

    render(
      <StoreProvider store={store}>
        <View />
      </StoreProvider>,
    );

    expect(renders).toBe(1);
    act(() => {
      store.dispatch({ type: "inc" } as Action); // 1 -> same bucket as 0
    });
    expect(renders).toBe(1);
    act(() => {
      store.dispatch({ type: "inc" } as Action); // 2 -> new bucket
    });
    expect(renders).toBe(2);
  });

  it("handles falsy selections (undefined) without extra renders", () => {
    type S = { count?: number; other: number };
    type A = UnknownAction &
      ({ type: "inc" } | { type: "setOther"; value: number });
    const r = (state: S, action: A): S => {
      switch (action.type) {
        case "inc":
          return { ...state, count: (state.count ?? 0) + 1 };
        case "setOther":
          return { ...state, other: action.value };
        default:
          return state;
      }
    };

    const store = createAppStore<S, A>(r, { other: 0 });

    let renders = 0;
    function View(): ReactElement {
      const value = useSelector<S, number | undefined>((s) => s.count);
      renders += 1;
      return <div data-testid="maybe-count">{String(value)}</div>;
    }

    render(
      <StoreProvider store={store}>
        <View />
      </StoreProvider>,
    );

    expect(renders).toBe(1);
    act(() => {
      store.dispatch({ type: "setOther", value: 42 } as A);
    });
    // Selected remains undefined; snapshot is stable; no extra render
    expect(renders).toBe(1);
    act(() => {
      store.dispatch({ type: "inc" } as A);
    });
    // Selected becomes 1; should re-render
    expect(renders).toBe(2);
    expect(screen.getByTestId("maybe-count").textContent).toBe("1");
  });
});
