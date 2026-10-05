/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * ChatContainer fixture for Vitest with happy-dom.
 *
 * Mounts the chat with PublicConfig and a mock customSendMessage handler.
 * Start with __tests__/ChatContainer.test.tsx for the test cases and
 * vitest.setup.ts for the DOM shims and snapshot serializer.
 */

import { ChatContainer, PublicConfig } from '@carbon/ai-chat';
import React from 'react';

import { customSendMessage } from './customSendMessage';
import '@carbon/styles/css/styles.css';

const config: PublicConfig = {
  // a `customSendMessage` keeps the example self-contained — Vite's dev
  // server can serve the page without a backend, and Vitest can drive the
  // same component tree without mocking network calls.
  messaging: {
    customSendMessage,
  },
};

function App() {
  return <ChatContainer {...config} />;
}

export { App };
