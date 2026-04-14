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
