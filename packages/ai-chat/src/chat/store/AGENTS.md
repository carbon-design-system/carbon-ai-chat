# AGENTS.md — Carbon AI Chat store

Editing rules for the store. See parent [packages/ai-chat/AGENTS.md](../../../AGENTS.md) for context — this is a custom Redux-style store reimplemented to drop `redux` / `react-redux` as deps.

## Do not add

- **Middleware, enhancers, async thunk libraries, DevTools integrations.** Dispatch is synchronous-only.
- **Direct mutation of state** from components, services, or hooks. Every change goes through a reducer.
- **Cross-slice reducer wiring**: keep `humanAgentReducers.ts` separate from the main reducer.
- **Imports from `redux` / `react-redux`** — those packages are intentionally not deps. Use the local `useSelector` / `useDispatch`.

## Always

- Reducers are pure: `(state, action) => nextState`, no I/O, no `Date.now()` unless the value is passed in the action.
- Read state through selectors (`selectors.ts`); dispatch through action creators (`actions.ts`).
- Side effects live in services, or in thunk-style flows in `actions.ts` / `subscriptions.ts`.

## Action Naming Conventions

### Action Type Constants

Action type strings are defined as **private module-level constants** in `SCREAMING_SNAKE_CASE`:

```typescript
// In actions.ts
const CHANGE_STATE = "CHANGE_STATE";
const SET_VIEW_STATE = "SET_VIEW_STATE";
const UPDATE_THEME_STATE = "UPDATE_THEME_STATE";
```

These constants are **not exported**. They are implementation details of the action creators.

### Action Creators

Public dispatch helpers are **camelCase methods** on the exported `actions` object:

```typescript
export const actions = {
  changeState(partialState: Partial<AppState>) {
    return { type: CHANGE_STATE, partialState };
  },

  setViewState(viewState: ViewState) {
    return { type: SET_VIEW_STATE, viewState };
  },
};
```

### Payload Fields

Action payload fields use **descriptive camelCase names**:

```typescript
{
  type: ADD_MESSAGE,
  messageItem: item,        // not 'msg' or 'data'
  addAfterID: previousId,   // not 'after' or 'id'
}
```

### Thunk-Style Flows

Complex flows that dispatch multiple actions live in `actions.ts` or `subscriptions.ts`, but are **plain functions**, not Redux thunk middleware:

```typescript
// In actions.ts
export function sendMessageFlow(text: string) {
  return (serviceManager: ServiceManager) => {
    // Dispatch multiple actions
    serviceManager.store.dispatch(actions.addMessage(text));
    serviceManager.store.dispatch(actions.setInputState({ value: "" }));

    // Trigger side effects
    serviceManager.messageService.send(text);
  };
}
```

**Note**: The store itself does **not** support middleware or async thunk dispatch objects. These are imperative orchestration helpers, not thunks in the Redux sense.

### Examples from Codebase

See [`actions.ts`](actions.ts:47) for:

- Action type constants: `CHANGE_STATE`, `SET_VIEW_STATE`, `UPDATE_THEME_STATE`
- Action creators: `changeState()`, `setViewState()`, `updateThemeState()`
- Payload fields: `partialState`, `messageItem`, `addAfterID`

## Selector Patterns

### No Reselect Library

This codebase **does not use `reselect`** or `createSelector()`. Selectors are plain functions that derive state:

```typescript
// In selectors.ts
export function selectInputState(state: AppState) {
  return state.inputState;
}

export function selectHasOpenPanel(state: AppState) {
  return state.panels.some((p) => p.isOpen);
}
```

### Memoization Strategy

Rerender control happens at the **hook level**, not in selectors:

**Primitive selections** (strings, numbers, booleans) automatically avoid rerenders when unchanged:

```typescript
const isOpen = useSelector((state) => state.isOpen);
// Component only rerenders if isOpen value changes
```

**Object selections** need an equality function to avoid rerenders on every state change:

```typescript
import { shallowEqual } from "../utils/equality";

const inputState = useSelector(
  (state) => state.inputState,
  shallowEqual, // Compare object properties, not reference
);
```

**Custom equality** for complex comparisons:

```typescript
const messages = useSelector(
  (state) => state.messages,
  (prev, next) => prev.length === next.length, // Only rerender if count changes
);
```

### When to Use Each Pattern

**Simple selector** (most common):

- Returns primitive value
- Returns stable object reference
- Used in one place

**Composed selector**:

- Derives from multiple state slices
- Used in multiple components
- Still returns primitive or uses equality function at call site

**Equality function at hook**:

- Selector returns fresh object
- Object properties are what matter, not reference
- Use `shallowEqual` for simple objects, custom function for complex logic

### Examples from Tests

See [`reactReduxShim_spec.tsx`](../../tests/store/spec/reactReduxShim_spec.tsx:41) for:

- Primitive selection avoiding rerenders: line 90
- Object selection with `shallowEqual`: line 128
- Custom equality function: line 156

## Directory structure

- `appStore.ts` — store construction + `dispatch` / `getState` / `subscribe`.
- `reducers.ts` — main reducer tree.
- `humanAgentReducers.ts` — separate slice for human-agent (service desk) state.
- `actions.ts` — action creators, including thunk-style async flows that dispatch multiple actions.
- `selectors.ts` — memoized reads. All component reads go through here.
- `subscriptions.ts` — store-subscription side effects (replaces middleware).

`useSelector` and `useDispatch` hooks live one level up in `../hooks/` and are what components import.

## Adding a new state slice — checklist

1. Choose: main reducer (`reducers.ts`) or human-agent slice (`humanAgentReducers.ts`).
2. Extend the `AppState` (or equivalent slice type) in [`src/types/state/`](../../types/state/).
3. Add the reducer case. Keep it pure.
4. Add a selector in `selectors.ts` — never let components read the shape directly.
5. Add an action creator in `actions.ts` if components or services need to dispatch it.
6. If the change needs side effects (service calls, storage writes), wire a handler in `subscriptions.ts` — not inside the reducer.
7. Add a reducer test under [`packages/ai-chat/tests/store/spec/`](../../../tests/store/spec/) (Jest, `*_spec.ts`). Reducer tests exercise the pure function directly — no React.

## Related Guidance

- **Parent guidance**: [packages/ai-chat/AGENTS.md](../../../AGENTS.md)
- **Type conventions**: [../../types/AGENTS.md](../../types/AGENTS.md) - For action/state type definitions
- **Testing**: [packages/ai-chat/AGENTS.md](../../../AGENTS.md#testing-strategy) - Store testing patterns
