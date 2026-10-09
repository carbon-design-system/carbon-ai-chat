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
  PublicConfig,
} from '@carbon/ai-chat';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { customSendMessage, finishResponse } from './customSendMessage';
import '@carbon/styles/css/styles.css';

const config: PublicConfig = { messaging: { customSendMessage } };

function messageText(message: Readonly<Message>) {
  if ('input' in message) {
    return message.input.text || 'User message';
  }

  return (
    message.output.generic?.find(
      (item) => item.response_type === MessageResponseTypes.TEXT
    )?.text || 'Assistant message'
  );
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
  const [messages, setMessages] = useState<readonly Readonly<Message>[]>([]);
  const [status, setStatus] = useState<ConversationStatus>('ready');
  const [observedStatuses, setObservedStatuses] = useState<
    readonly ConversationStatus[]
  >(['ready']);
  const stopSelections = useRef<(() => void)[]>([]);

  const onBeforeRender = useCallback((instance: ChatInstance) => {
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
        <p>
          Current status:{' '}
          <strong data-testid="conversation-status">{status}</strong>
        </p>
        <button
          type="button"
          disabled={status !== 'streaming'}
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
