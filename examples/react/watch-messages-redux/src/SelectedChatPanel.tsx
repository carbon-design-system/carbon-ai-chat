/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/** Host panel that reads the narrow Redux mirror through typed selectors. */

import { Message, MessageResponseTypes } from '@carbon/ai-chat';
import React from 'react';

import {
  selectMessages,
  selectObservedStatuses,
  selectStatus,
  useAppSelector,
} from './store';

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

function SelectedChatPanel({ onFinish }: { onFinish: () => void }) {
  const messages = useAppSelector(selectMessages);
  const status = useAppSelector(selectStatus);
  const observedStatuses = useAppSelector(selectObservedStatuses);

  return (
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
        onClick={onFinish}>
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
          <li key={message.id || `message-${index}`}>{messageText(message)}</li>
        ))}
      </ol>
    </main>
  );
}

export { SelectedChatPanel };
