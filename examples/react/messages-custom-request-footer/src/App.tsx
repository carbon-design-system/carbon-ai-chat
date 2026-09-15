/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Custom request footer (React)
 *
 * Demonstrates: rendering your own content beneath a user message with the
 * `renderCustomRequestFooter` render prop. Here it is a copy button, so someone
 * can reuse or edit something they sent earlier.
 *
 * The mock backend (`./customSendMessage.ts`) sends nothing special. Outbound
 * footers need no wire field: the chat mints the slot for every message the
 * user sends, and passing this render prop is the whole opt-in.
 *
 * APIs exercised:
 *   - `ChatCustomElement` from `@carbon/ai-chat`
 *   - `RenderCustomRequestFooter` (the `renderCustomRequestFooter` render prop)
 *   - `PublicConfig.layout.showFrame`, `PublicConfig.openChatByDefault`
 *   - `PublicConfig.messaging.customSendMessage`
 *
 * Start reading at: the `config` constant, then `renderCustomRequestFooter`, then `App()`.
 */

import {
  ChatCustomElement,
  PublicConfig,
  RenderCustomRequestFooter,
} from '@carbon/ai-chat';
import React from 'react';
import { createRoot } from 'react-dom/client';

import { CopyRequestExample } from './CopyRequestExample';
import { customSendMessage } from './customSendMessage';
import '@carbon/styles/css/styles.css';
import './App.css';

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  layout: {
    // Fill the host element edge-to-edge instead of floating in the corner.
    showFrame: false,
  },
  openChatByDefault: true,
};

// Called on every render, once per user message that has a footer slot. Keep it
// a thin pass-through to a component so React owns the footer's render and
// lifecycle, and keep per-render work out of it.
//
// `message` is the message as the user submitted it, which is what the bubble
// above the footer shows. A `pre:send` handler runs later and can rewrite the
// text the assistant receives, so this is not always what was sent.
const renderCustomRequestFooter: RenderCustomRequestFooter = (
  _slotName,
  message,
  _instance
) => <CopyRequestExample message={message} />;

function App() {
  return (
    <ChatCustomElement
      className="chat-custom-element"
      renderCustomRequestFooter={renderCustomRequestFooter}
      {...config}
    />
  );
}

const root = createRoot(document.querySelector('#root') as Element);

root.render(<App />);
