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

import { finishResponse } from './customSendMessage';
import {
  selectMessages,
  selectObservedStatuses,
  selectStatus,
  useAppSelector,
} from './store';

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

function SelectedChatPanel() {
  const messages = useAppSelector(selectMessages);
  const status = useAppSelector(selectStatus);
  const observedStatuses = useAppSelector(selectObservedStatuses);

  return (
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
          <li key={message.id || `message-${index}`}>{messageText(message)}</li>
        ))}
      </ol>
    </main>
  );
}

export { SelectedChatPanel };
