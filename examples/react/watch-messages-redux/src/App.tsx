/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Watch messages with Redux Toolkit.
 *
 * Demonstrates separate public-state selections that dispatch narrow Redux
 * actions. Start with `onBeforeRender`, then read `store.ts`.
 */

import {
  ChatContainer,
  ChatInstance,
  MessageResponseTypes,
  MessageState,
  PublicConfig,
} from '@carbon/ai-chat';
import React, { useCallback, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import { customSendMessage } from './customSendMessage';
import { SelectedChatPanel } from './SelectedChatPanel';
import {
  messagesChanged,
  selectedStateSeeded,
  statusChanged,
  store,
} from './store';
import '@carbon/styles/css/styles.css';

const config: PublicConfig = {
  messaging: { customSendMessage },
  header: { showRestartButton: true },
};

function App() {
  const chat = useRef<ChatInstance | null>(null);
  const finishResponse = useCallback(() => {
    const instance = chat.current;
    if (!instance) {
      return;
    }
    const snapshot = instance.state.get();
    if (snapshot?.status !== 'streaming' || !snapshot.activeResponseId) {
      return;
    }
    const id = snapshot.activeResponseId;
    void instance.messaging.upsertMessage(
      id,
      MessageState.COMPLETE,
      (previous) => ({
        ...previous,
        id,
        request_id: previous?.request_id,
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: 'The response is complete.',
            },
          ],
        },
      })
    );
  }, []);
  const stopSelections = useRef<(() => void)[]>([]);

  const onBeforeRender = useCallback((instance: ChatInstance) => {
    chat.current = instance;
    // Replacing a chat also replaces its subscriptions.
    stopSelections.current.forEach((stop) => stop());

    const snapshot = instance.state.get();
    store.dispatch(
      selectedStateSeeded({
        messages: snapshot.messages,
        status: snapshot.status,
      })
    );

    stopSelections.current = [
      instance.state.select(
        (state) => state.messages,
        (messages) => store.dispatch(messagesChanged(messages))
      ),
      instance.state.select(
        (state) => state.status,
        (status) => store.dispatch(statusChanged(status))
      ),
    ];
  }, []);

  useEffect(() => () => stopSelections.current.forEach((stop) => stop()), []);

  return (
    <Provider store={store}>
      <SelectedChatPanel onFinish={finishResponse} />
      <ChatContainer {...config} onBeforeRender={onBeforeRender} />
    </Provider>
  );
}

const root = createRoot(document.querySelector('#root') as Element);
root.render(<App />);
