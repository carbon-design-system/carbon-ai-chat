/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/** Redux store for the selected public messages and conversation status. */

import type {
  ConversationStatus,
  Message,
  PublicChatState,
} from '@carbon/ai-chat';
import {
  configureStore,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';
import { type TypedUseSelectorHook, useSelector } from 'react-redux';

interface SelectedChatState {
  messages: readonly Readonly<Message>[];
  status: ConversationStatus;
  observedStatuses: readonly ConversationStatus[];
}

const initialState: SelectedChatState = {
  messages: [],
  status: 'ready',
  observedStatuses: ['ready'],
};

const selectedChatSlice = createSlice({
  name: 'selectedChat',
  initialState,
  reducers: {
    selectedStateSeeded(
      state,
      action: PayloadAction<Pick<PublicChatState, 'messages' | 'status'>>
    ) {
      state.messages = action.payload.messages;
      state.status = action.payload.status;
      state.observedStatuses = [action.payload.status];
    },
    messagesChanged(
      state,
      action: PayloadAction<readonly Readonly<Message>[]>
    ) {
      state.messages = action.payload;
    },
    statusChanged(state, action: PayloadAction<ConversationStatus>) {
      state.status = action.payload;
      if (
        state.observedStatuses[state.observedStatuses.length - 1] !==
        action.payload
      ) {
        state.observedStatuses.push(action.payload);
      }
    },
  },
});

const { messagesChanged, selectedStateSeeded, statusChanged } =
  selectedChatSlice.actions;

const store = configureStore({
  reducer: { selectedChat: selectedChatSlice.reducer },
});

type RootState = ReturnType<typeof store.getState>;
const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
const selectMessages = (state: RootState) => state.selectedChat.messages;
const selectStatus = (state: RootState) => state.selectedChat.status;
const selectObservedStatuses = (state: RootState) =>
  state.selectedChat.observedStatuses;

export {
  messagesChanged,
  selectMessages,
  selectObservedStatuses,
  selectedStateSeeded,
  selectStatus,
  statusChanged,
  store,
  useAppSelector,
};
