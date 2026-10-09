/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Watch state with Redux Toolkit
 *
 * Demonstrates: selecting one public chat state field into a Redux Toolkit
 * store so any component can read it through `useSelector`.
 *
 * APIs exercised:
 *   - `ChatContainer`
 *   - `instance.state.get()` for the initial Redux seed
 *   - `instance.state.select()` for focused updates
 *   - `Provider` (`react-redux`) and the typed `useSelector` (see `store.ts`)
 *
 * Start reading at: `App()`, then the `onBeforeRender` bridge.
 */

import { ChatContainer, ChatInstance, PublicConfig } from '@carbon/ai-chat';
import React, { useCallback, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import { customSendMessage } from './customSendMessage';
import { HomescreenStatus } from './HomescreenStatus';
import { homescreenStateChanged, store } from './store';
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
        { label: 'How does the Redux bridge work?' },
        { label: 'Why mirror state into Redux?' },
      ],
    },
  },
};

function App() {
  const stopSelection = useRef<(() => void) | null>(null);

  const onBeforeRender = useCallback((instance: ChatInstance) => {
    // Stop an earlier instance before the host attaches a replacement.
    stopSelection.current?.();
    const selectHomescreen = (state: ReturnType<typeof instance.state.get>) =>
      state.homeScreenState.isHomeScreenOpen;

    store.dispatch(
      homescreenStateChanged(selectHomescreen(instance.state.get()))
    );
    stopSelection.current = instance.state.select(
      selectHomescreen,
      (isOpen) => {
        store.dispatch(homescreenStateChanged(isOpen));
      }
    );
  }, []);

  useEffect(() => () => stopSelection.current?.(), []);

  return (
    // Provider scopes the store to the React tree; HomescreenStatus reads
    // from it via the typed useAppSelector. The chat itself doesn't need
    // the store — it owns its own state internally.
    <Provider store={store}>
      <main className="watch-state-host">
        <HomescreenStatus />
      </main>
      <ChatContainer {...config} onBeforeRender={onBeforeRender} />
    </Provider>
  );
}

const root = createRoot(document.querySelector('#root') as Element);

root.render(<App />);
