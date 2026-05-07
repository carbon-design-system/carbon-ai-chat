/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — React 17 (legacy ReactDOM.render)
 *
 * Demonstrates: that `@carbon/ai-chat` runs on React 17 using the legacy
 * `ReactDOM.render` API (not `createRoot`). The "one thing" demonstrated
 * by this example is React 17 compatibility, not a chat feature.
 *
 * APIs exercised:
 *   - `ChatContainer` (the chat surface — kept minimal so the framework
 *     glue is the focus)
 *   - `ReactDOM.render` from `react-dom`
 *
 * Start reading at: the `ReactDOM.render` call at the bottom of this file.
 */

import { ChatContainer, PublicConfig } from "@carbon/ai-chat";
import React from "react";
import ReactDOM from "react-dom";

import { customSendMessage } from "./customSendMessage";
import "@carbon/styles/css/styles.css";

const config: PublicConfig = {
  // route outbound messages through a local mock so the example runs without a backend; the React 17 mount path is the focus, not the messaging surface.
  messaging: {
    customSendMessage,
  },
};

function App() {
  return <ChatContainer {...config} />;
}

// React 17 ships `ReactDOM.render` as the supported mount API; the lint rule flags it as deprecated against React 18+ types, but this example exists specifically to prove React 17 compatibility, so we suppress the rule here rather than migrate to `createRoot`.
// eslint-disable-next-line react/no-deprecated -- this example intentionally demonstrates React 17's legacy render API
ReactDOM.render(<App />, document.querySelector("#root"));
