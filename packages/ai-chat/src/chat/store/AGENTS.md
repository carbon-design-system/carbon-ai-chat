# AGENTS.md — Carbon AI Chat store

Read before editing this custom Redux-style store. Package rules: [ai-chat/AGENTS.md](../../../AGENTS.md).

## Do not add

- Middleware, enhancers, async thunk libraries, or DevTools integrations; dispatch is synchronous.
- State mutation from components, services, or hooks; changes go through reducers.
- Cross-slice reducer wiring; keep `humanAgentReducers.ts` separate.
- Imports from `redux` or `react-redux`; neither is a dependency.

## Always

- Keep reducers pure; pass in time values instead of calling `Date.now()`.
- Read through `selectors.ts`; dispatch through `serviceManager.store.dispatch` with an `actions.ts` creator.
- Put side effects in services or `subscriptions.ts` handlers.
- Use the local `useSelector` from `../hooks/`; for object selections, use `shallowEqual` from `appStore.ts`.

## Action conventions

- Export `SCREAMING_SNAKE_CASE` type constants by name for reducers.
- Put camelCase creators on the default `actions` export; named imports select constants.
- Use descriptive camelCase payload fields, such as `messageItem` and `addAfterID`.

## Directory structure

- `appStore.ts` — construction, dispatch, state reads, subscriptions.
- `reducers.ts` — main reducer tree.
- `humanAgentReducers.ts` — service-desk slice.
- `actions.ts` — synchronous action creators.
- `selectors.ts` — plain functions deriving state.
- `subscriptions.ts` — store-subscription side effects.

## Adding a new state slice — checklist

1. Choose `reducers.ts` or the human-agent slice.
2. Extend `AppState` or the slice type in [src/types/state/](../../types/state/).
3. Add a pure reducer case.
4. Add a selector; components must not read the shape directly.
5. Add an action creator if dispatch is needed.
6. Wire side effects in `subscriptions.ts`, outside the reducer.
7. Test the reducer directly, without React, in [tests/store/spec/](../../../tests/store/spec/) (Jest, `*_spec.ts`).
