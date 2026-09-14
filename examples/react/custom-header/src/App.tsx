/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Custom header (React)
 *
 * Demonstrates: replacing the built-in chat header with your own content using
 * `WriteableElementName.CUSTOM_HEADER`. Supply a React element in
 * `renderWriteableElements` keyed by `CUSTOM_HEADER` and the framework header
 * is replaced on first paint — no flash.
 *
 * APIs exercised:
 *   - `ChatCustomElement` from `@carbon/ai-chat`
 *   - `WriteableElementName.CUSTOM_HEADER`
 *   - `renderWriteableElements` prop
 *   - `PublicConfig.header.isOn` (set to `false` to hide the area entirely)
 *   - `PublicConfig.layout.showFrame`, `PublicConfig.openChatByDefault`
 *   - `PublicConfig.messaging.customSendMessage` (see `./customSendMessage.ts`)
 *
 * Start reading at: the `renderWriteableElements` map, then `App()`.
 */

import {
  ChatCustomElement,
  PublicConfig,
  WriteableElementName,
} from '@carbon/ai-chat';
import React from 'react';
import { createRoot } from 'react-dom/client';

import { customSendMessage } from './customSendMessage';
import '@carbon/styles/css/styles.css';
import './App.css';

const config: PublicConfig = {
  messaging: {
    // Wire a client-side mock so the example runs with no backend; swap this
    // for a real handler that calls your service in production.
    customSendMessage,
  },
  layout: {
    // Fill the host element edge-to-edge — required for the fullscreen surface.
    showFrame: false,
  },
  // Auto-open so the chat is visible from first paint without a launcher click.
  openChatByDefault: true,
};

function App() {
  // Pass a React element for CUSTOM_HEADER to replace the built-in header.
  // The key is the enum value string; the value is any React subtree.
  const renderWriteableElements = {
    [WriteableElementName.CUSTOM_HEADER]: (
      <div className="custom-header" aria-label="Custom chat header">
        <span className="custom-header__title">Custom Header</span>
      </div>
    ),
  };

  return (
    <ChatCustomElement
      className="chat-custom-element"
      {...config}
      renderWriteableElements={renderWriteableElements}
    />
  );
}

const root = createRoot(document.querySelector('#root') as Element);

root.render(<App />);
