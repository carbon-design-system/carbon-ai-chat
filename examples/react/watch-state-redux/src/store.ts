/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Redux Toolkit store for the Watch / State (Redux Toolkit) example.
 *
 * Demonstrates: a one-way mirror of one selected public state field. The chat
 * remains the source of truth; Redux holds only what the host panel uses.
 *
 * APIs exercised:
 *   - `configureStore`, `createSlice`, `PayloadAction` from `@reduxjs/toolkit`
 *   - `TypedUseSelectorHook`, `useSelector` from `react-redux`
 *
 * Start reading at: `chatStateSlice`.
 */

import {
  configureStore,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';
import { type TypedUseSelectorHook, useSelector } from 'react-redux';

interface ChatStateSlice {
  isHomeScreenOpen: boolean;
}

const initialState: ChatStateSlice = { isHomeScreenOpen: false };

const chatStateSlice = createSlice({
  name: 'chatState',
  initialState,
  reducers: {
    homescreenStateChanged(state, action: PayloadAction<boolean>) {
      state.isHomeScreenOpen = action.payload;
    },
  },
});

const { homescreenStateChanged } = chatStateSlice.actions;

const store = configureStore({
  reducer: { chat: chatStateSlice.reducer },
});

type RootState = ReturnType<typeof store.getState>;

// Components use this typed hook instead of holding a chat instance.
const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

const selectIsHomeScreenOpen = (state: RootState): boolean =>
  state.chat.isHomeScreenOpen;

export {
  type RootState,
  homescreenStateChanged,
  selectIsHomeScreenOpen,
  store,
  useAppSelector,
};
