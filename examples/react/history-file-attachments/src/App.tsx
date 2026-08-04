/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — History / File attachments
 *
 * Demonstrates: an uploaded file surviving a conversation reload. The restored
 * history includes a request whose `structured_data` carries a `file`-typed field,
 * and the chat renders it as a chip in that message's bubble — the same chip the
 * user saw when they sent it.
 *
 * Reload the page: the attachment is still there, because it lives on the message
 * rather than in any upload-specific storage.
 *
 * Note that `upload` is deliberately not configured here. This example is about the
 * restore, so the history is host-authored rather than produced by a live upload;
 * see the `prompt-line-file-upload` example for the upload flow itself.
 *
 * APIs exercised:
 *   - `ChatCustomElement` from `@carbon/ai-chat`
 *   - `PublicConfig.messaging.customLoadHistory` (see `./customLoadHistory.ts`)
 *   - `PublicConfig.messaging.customSendMessage` (see `./customSendMessage.ts`)
 *   - `PublicConfig.layout.showFrame`
 *   - `PublicConfig.openChatByDefault`
 *
 * Start reading at: `./customLoadHistory.ts`, which holds the attachment fixture,
 * then the `config` constant below.
 */

import { ChatCustomElement, PublicConfig } from '@carbon/ai-chat';
import React from 'react';
import { createRoot } from 'react-dom/client';

import { customLoadHistory } from './customLoadHistory';
import { customSendMessage } from './customSendMessage';
import '@carbon/styles/css/styles.css';

const config: PublicConfig = {
  messaging: {
    // Called once on boot. Whatever this returns becomes the transcript, so the
    // attachment chip is rendered straight from the restored message.
    customLoadHistory,
    customSendMessage,
  },
  layout: {
    // Hide the default chat frame so the custom element fills its host container.
    showFrame: false,
  },
  // Open on mount so the restored conversation is visible without clicking a
  // launcher first.
  openChatByDefault: true,
};

function App() {
  return <ChatCustomElement className="chat-custom-element" {...config} />;
}

const root = createRoot(document.querySelector('#root') as Element);

root.render(<App />);
