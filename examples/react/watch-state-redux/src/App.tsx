/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Watch state with Redux Toolkit (React)
 *
 * Demonstrates: bridging `BusEventType.STATE_CHANGE` into a Redux Toolkit
 * store so any component can read mirrored chat state via `useSelector`.
 * The chat owns its state; this example mirrors it one-way into Redux.
 * `instance.getState()` seeds the store; the bus subscription keeps it in
 * sync. The Redux-backed status panel is the primary host surface — the
 * chat sits in the corner as a launcher so opening it produces observable
 * transitions in the panel.
 *
 * APIs exercised:
 *   - `ChatContainer`
 *   - `BusEventType.STATE_CHANGE`
 *   - `instance.getState()` for the initial Redux seed
 *   - `Provider` (`react-redux`) and the typed `useSelector` (see `store.ts`)
 *
 * Start reading at: `App()`, then the `onBeforeRender` bridge.
 */

import {
  BusEvent,
  BusEventStateChange,
  BusEventType,
  ChatContainer,
  ChatInstance,
  PublicConfig,
} from "@carbon/ai-chat";
import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";

import { customSendMessage } from "./customSendMessage";
import { HomescreenStatus } from "./HomescreenStatus";
import { chatStateSync, store } from "./store";
import "@carbon/styles/css/styles.css";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  // Enable the homescreen so toggling between it and the chat view produces the STATE_CHANGE traffic this example mirrors into Redux.
  homescreen: {
    isOn: true,
    greeting: "👋 Hello!\n\nWelcome to Carbon AI Chat.",
    starters: {
      isOn: true,
      buttons: [
        { label: "What can you help me with?" },
        { label: "How does the Redux bridge work?" },
        { label: "Why mirror state into Redux?" },
      ],
    },
  },
};

function onBeforeRender(instance: ChatInstance) {
  // Seed Redux from the chat's current snapshot before any STATE_CHANGE
  // events fire. Without this, useSelector would observe `null` until the
  // first transition.
  store.dispatch(chatStateSync(instance.getState()));

  // Mirror every STATE_CHANGE into the store. We dispatch unconditionally
  // because react-redux already gates re-renders: useSelector with narrow
  // selectors only re-renders consumers when the slice they read actually
  // changes (reference equality). Pre-gating in this handler would be
  // redundant work and risk drift between the bus payload and the store.
  //
  // store.dispatch is the framework-agnostic dispatch API and is safe to
  // call from outside React; we're not in hook-context here, and
  // onBeforeRender runs once per chat instance, not per render.
  instance.on({
    type: BusEventType.STATE_CHANGE,
    handler: (event: BusEvent) => {
      const { newState } = event as BusEventStateChange;
      store.dispatch(chatStateSync(newState));
    },
  });
}

function App() {
  return (
    // Provider scopes the store to the React tree; HomescreenStatus reads
    // from it via the typed useAppSelector. The chat itself doesn't need
    // the store — it owns its own state internally.
    <Provider store={store}>
      <div className="watch-state-host">
        <HomescreenStatus />
      </div>
      <ChatContainer {...config} onBeforeRender={onBeforeRender} />
    </Provider>
  );
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
