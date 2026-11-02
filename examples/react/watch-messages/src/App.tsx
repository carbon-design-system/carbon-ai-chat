/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Watch messages.
 *
 * Demonstrates separate public-state selections for messages and status.
 * Start with `onBeforeRender`, then read the host panel in `App`.
 */

import {
  ChatContainer,
  ChatInstance,
  ConversationStatus,
  Message,
  MessageResponseTypes,
  MessageState,
  PublicConfig,
} from '@carbon/ai-chat';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { customSendMessage } from './customSendMessage';
import '@carbon/styles/css/styles.css';

const config: PublicConfig = {
  messaging: { customSendMessage },
  header: { showRestartButton: true },
};

function messageText(message: Readonly<Message>) {
  if ('input' in message) {
    return 'text' in message.input
      ? message.input.text || 'User message'
      : 'Chat event';
  }
  const item = message.output.generic?.find(
    (value) => value.response_type === MessageResponseTypes.TEXT
  );
  return item && 'text' in item ? item.text : 'Assistant message';
}

function appendStatus(
  statuses: readonly ConversationStatus[],
  status: ConversationStatus
) {
  return statuses[statuses.length - 1] === status
    ? statuses
    : [...statuses, status];
}

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
  const [messages, setMessages] = useState<readonly Readonly<Message>[]>([]);
  const [status, setStatus] = useState<ConversationStatus>('ready');
  const [observedStatuses, setObservedStatuses] = useState<
    readonly ConversationStatus[]
  >(['ready']);
  const stopSelections = useRef<(() => void)[]>([]);

  const onBeforeRender = useCallback((instance: ChatInstance) => {
    chat.current = instance;
    // Replacing a chat also replaces its subscriptions.
    stopSelections.current.forEach((stop) => stop());

    const snapshot = instance.state.get();
    setMessages(snapshot.messages);
    setStatus(snapshot.status);
    setObservedStatuses([snapshot.status]);

    stopSelections.current = [
      instance.state.select((state) => state.messages, setMessages),
      instance.state.select(
        (state) => state.status,
        (nextStatus) => {
          setStatus(nextStatus);
          setObservedStatuses((current) => appendStatus(current, nextStatus));
        }
      ),
    ];
  }, []);

  useEffect(() => () => stopSelections.current.forEach((stop) => stop()), []);

  return (
    <>
      <main className="watch-messages-host">
        <h1>Public chat messages</h1>
        {/* The chat announces the response; this host summary needs no live region. */}
        <p>
          Current status:{' '}
          <strong data-testid="conversation-status">{status}</strong>
        </p>
        <button
          type="button"
          aria-disabled={status !== 'streaming'}
          onClick={finishResponse}>
          Finish response
        </button>

        <h2>Observed status changes</h2>
        <ol data-testid="status-history">
          {observedStatuses.map((value, index) => (
            <li key={`${value}-${index}`}>{value}</li>
          ))}
        </ol>

        <h2>Selected messages</h2>
        <ol data-testid="selected-messages">
          {messages.map((message, index) => (
            <li key={message.id || `message-${index}`}>
              {messageText(message)}
            </li>
          ))}
        </ol>
      </main>
      <ChatContainer {...config} onBeforeRender={onBeforeRender} />
    </>
  );
}

const root = createRoot(document.querySelector('#root') as Element);
root.render(<App />);
