/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Watch state
 *
 * Demonstrates: selecting `homeScreenState.isHomeScreenOpen` from the public
 * chat state and reflecting it in host React state.
 *
 * APIs exercised:
 *   - `ChatContainer`
 *   - `instance.state.get()` for the initial snapshot
 *   - `instance.state.select()` for focused updates
 *   - `PublicConfig.homescreen` (drives view transitions used in the demo)
 *
 * Start reading at: `App()` then `onBeforeRender`.
 */

import { ChatContainer, ChatInstance, PublicConfig } from '@carbon/ai-chat';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { customSendMessage } from './customSendMessage';
import '@carbon/styles/css/styles.css';

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  // The homescreen gives the selected field a visible state change.
  homescreen: {
    isOn: true,
    greeting: '👋 Hello!\n\nWelcome to Carbon AI Chat.',
    starters: {
      isOn: true,
      buttons: [
        { label: 'What can you help me with?' },
        { label: 'Tell me about state management' },
        { label: 'How do I select public chat state?' },
      ],
    },
  },
};

function App() {
  const [isHomescreenVisible, setIsHomescreenVisible] = useState(false);
  const stopSelection = useRef<(() => void) | null>(null);

  const onBeforeRender = useCallback((instance: ChatInstance) => {
    // Stop an earlier instance before the host attaches a replacement.
    stopSelection.current?.();

    const selectHomescreen = (state: ReturnType<typeof instance.state.get>) =>
      state.homeScreenState.isHomeScreenOpen;

    setIsHomescreenVisible(selectHomescreen(instance.state.get()));
    stopSelection.current = instance.state.select(
      selectHomescreen,
      setIsHomescreenVisible
    );
  }, []);

  useEffect(() => () => stopSelection.current?.(), []);

  return (
    <>
      <main className="watch-state-host">
        <h1>Chat view state</h1>
        <p>{isHomescreenVisible ? 'Homescreen' : 'Chat View'}</p>
        <p>Selected with instance.state.select().</p>
      </main>
      <ChatContainer {...config} onBeforeRender={onBeforeRender} />
    </>
  );
}

const root = createRoot(document.querySelector('#root') as Element);

root.render(<App />);
