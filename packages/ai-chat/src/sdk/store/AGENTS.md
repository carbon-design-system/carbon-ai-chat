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
- Use the local `useSelector` from `src/chat/hooks/`; for object selections, use `shallowEqual` from `appStore.ts`.

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
- `valueStore.ts` — a standalone store for one value, with no imports and no reducer. The rules above are for the reducer store, not this one.

## Partitions

Another layer adds its own part of the state with `attachStorePartition` from `attachStorePartition.ts` in this folder. A partition's reducer runs after the store's own reducer on every action and receives the store state after it, so one dispatch updates both and notifies once. Attaching a key the store already has a partition for does nothing. A partition reducer returns the same object when nothing changed, or every dispatch notifies. If it throws, the whole dispatch fails.

Saved state is split the same way. The conversation saves `hasSentNonWelcomeMessage` and the agent connection; the SDK's `humanAgentState` config saves and restores only the connection (`humanAgentStatePersistence.ts`). The shell joins both halves for `persistedState` and session storage.

The prebuilt chat's view partition lives under `view` ([src/chat/state/](../../chat/state/)). These reducers never write view state: the view reacts to the conversation actions `conversationActions.ts` lists, in the same dispatch.

Config is typed the same way. The shell builds its whole `AppConfig` ([appConfig.ts](../../chat/utils/appConfig.ts)) and stores it in `config`. These reducers and conversation code read it as `ConversationAppConfig`, so a field they need that `ChatSDKConfig` lacks goes on `ConversationConfig`, with the type `PublicConfig` gives it.

## Adding a new state slice — checklist

1. Choose `reducers.ts` or the human-agent slice.
2. Extend `ConversationState` or the slice type in [src/types/state/](../../types/state/).
3. Add a pure reducer case.
4. Add a selector; components must not read the shape directly.
5. Add an action creator if dispatch is needed.
6. Wire side effects in `subscriptions.ts`, outside the reducer.
7. Test the reducer directly, without React, in [tests/store/spec/](../../../tests/store/spec/) (Jest, `*_spec.ts`).
