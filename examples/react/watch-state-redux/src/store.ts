/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Redux Toolkit store + slice for the Watch state (Redux Toolkit) example.
 *
 * Demonstrates: a one-way mirror of `PublicChatState` into Redux. The chat
 * remains the source of truth for its own state; this store just holds the
 * latest snapshot delivered by `BusEventType.STATE_CHANGE` so React
 * components can read it through `useSelector` without holding a reference
 * to the `ChatInstance`.
 *
 * APIs exercised:
 *   - `configureStore`, `createSlice`, `PayloadAction` from `@reduxjs/toolkit`
 *   - `TypedUseSelectorHook`, `useDispatch`, `useSelector` from `react-redux`
 *   - `PublicChatState` from `@carbon/ai-chat`
 *
 * Start reading at: `chatStateSlice` and `selectIsHomeScreenOpen`.
 */

import type { PublicChatState } from "@carbon/ai-chat";
import {
  configureStore,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import {
  type TypedUseSelectorHook,
  useDispatch,
  useSelector,
} from "react-redux";

interface ChatStateSlice {
  // Holds the most recent PublicChatState snapshot, or null before the bridge
  // has run its initial seed in `onBeforeRender`.
  snapshot: PublicChatState | null;
}

const initialState: ChatStateSlice = { snapshot: null };

const chatStateSlice = createSlice({
  name: "chatState",
  initialState,
  reducers: {
    // STATE_CHANGE delivers full PublicChatState snapshots, not diffs, so the
    // reducer replaces the snapshot wholesale; deep-merging would add
    // complexity without correctness benefit. RTK + Immer handle the
    // replacement efficiently.
    chatStateSync(state, action: PayloadAction<PublicChatState>) {
      state.snapshot = action.payload;
    },
  },
});

const { chatStateSync } = chatStateSlice.actions;

const store = configureStore({
  reducer: { chat: chatStateSlice.reducer },
});

type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch;

// Pre-typed hooks per the RTK + react-redux TypeScript guide
// (https://redux-toolkit.js.org/usage/usage-with-typescript). Components
// import these instead of the raw hooks so RootState / AppDispatch flow
// through automatically.
const useAppDispatch = () => useDispatch<AppDispatch>();
const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Default to `true` when no snapshot has arrived yet so the host UI matches
// the chat's actual initial state (homescreen open) instead of flickering
// "Chat View" for one frame before the bridge seeds the store.
const selectIsHomeScreenOpen = (state: RootState): boolean =>
  state.chat.snapshot?.homeScreenState.isHomeScreenOpen ?? true;

export {
  type AppDispatch,
  type RootState,
  chatStateSync,
  selectIsHomeScreenOpen,
  store,
  useAppDispatch,
  useAppSelector,
};
