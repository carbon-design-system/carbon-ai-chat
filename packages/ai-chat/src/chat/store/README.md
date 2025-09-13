# Carbon AI Chat Store

This folder contains a lightweight, Redux‑like store used internally by Carbon AI Chat. It replaces the `redux` and `react-redux` dependencies with a minimal, strictly‑typed implementation while preserving familiar APIs and ergonomics.

The audience for this document is assumed to be familiar with Redux, React‑Redux, and Redux Toolkit.

## Overview

Think "Redux store core" without middleware, enhancers, or DevTools:

- Dispatch is synchronous; no middleware pipeline. Middleware (e.g., thunks), should be handled in services or component code.
- The store calls a single reducer and compares object identity to decide whether to notify subscribers.
- React integration is through a tiny compat layer that mirrors the subset of `react-redux` we use.

This keeps the bundle small and removes external peer dependencies (which come with a lot of worrying about React and Redux versioning differences) while retaining the Redux + react-redux patterns the codebase already uses.

## Key differences vs Redux/RTK

- No middleware/enhancers: there’s no `applyMiddleware`, `compose`, or DevTools integration.
- Single reducer function: we don't expose `combineReducers`. Instead, `doCreateStore.ts` wires a single `reducerFunction` that delegates to sub‑reducers in `reducers.ts`, matching our existing pattern.
- Synchronous only: dispatch is synchronous; async work should live in services (e.g., `MessageService`, `HumanAgentService`).
- Shallow equality: selector equality uses `Object.is` shallow comparison, like `react-redux`’s `shallowEqual`.

## React integration

Use the React integration utilities:

- Provider: `src/chat/providers/StoreProvider.tsx`
- Hooks: `src/chat/hooks/useSelector.tsx`, `src/chat/hooks/useDispatch.tsx`, `src/chat/hooks/useStore.tsx`

- `StoreProvider` — the replacement for React‑Redux’s `Provider`.
- `useSelector` — identical signature, subscribes via `useSyncExternalStore` semantics.
- `useDispatch` — returns the store’s `dispatch`.
- `connect` — minimal HOC supporting our usage (state mapping and optional `forwardRef`).

The Provider is mounted in `ChatAppEntry.tsx`, so most components only need `useSelector`/`useDispatch`.

### Example: adding a component selector

```tsx
import React from "react";
import { useSelector } from "../../hooks/useSelector";
import type { AppState } from "../../types/state/AppState";

export function MyCounter() {
  const count = useSelector<AppState, number>(
    (state) => state.botMessageState.isLoadingCounter,
  );
  return <div data-testid="loading-count">{count}</div>;
}
```

### Example: dispatching an action

```tsx
import React from "react";
import { useDispatch } from "../../hooks/useDispatch";
import actions from "../store/actions";

export function Incrementer() {
  const dispatch = useDispatch();
  return (
    <button
      type="button"
      onClick={() => dispatch(actions.addIsLoadingCounter(1))}
    >
      Increment
    </button>
  );
}
```

### Class components

This project still includes a few class components. Since hooks cannot be used directly in class components, wrap the class in a simple functional component that reads from the store using hooks and passes state as props. See `MainWindow.tsx` and `MessagesComponent.tsx` for examples:

```tsx
// Functional wrapper to inject AppState into a class component
const MainWindowStateInjector = React.forwardRef<
  MainWindow,
  MainWindowOwnProps
>((props, ref) => {
  const state = useSelector<AppState, AppState>((s) => s);
  return <MainWindow {...props} {...state} ref={ref} />;
});
```

## References & licenses

This store mimics a small part of the API surface of these projects (both MIT):

- Redux — https://github.com/reduxjs/redux — License: https://github.com/reduxjs/redux/blob/master/LICENSE.md
- React‑Redux — https://github.com/reduxjs/react-redux — License: https://github.com/reduxjs/react-redux/blob/master/LICENSE.md
