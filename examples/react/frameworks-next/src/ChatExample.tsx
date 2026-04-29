/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Next.js App Router (React)
 *
 * Demonstrates: embedding `ChatContainer` inside a Next.js 16 App Router
 * page using `next/dynamic` with `ssr: false` to defer the chat module to
 * the client. The "one thing" demonstrated by this example is the Next.js
 * integration, not a chat feature.
 *
 * APIs exercised:
 *   - `ChatContainer` (the chat surface — kept minimal so the framework
 *     glue is the focus)
 *   - `"use client"` directive
 *   - `next/dynamic` with `ssr: false` (see `app/page.tsx`)
 *
 * Start reading at: `app/page.tsx` for the dynamic import, then this file
 * for the client component.
 */

// ChatContainer interacts with browser APIs (window, custom elements), so force this module to run on the client.
"use client";

import { ChatContainer, PublicConfig } from "@carbon/ai-chat";
import React from "react";

import { customSendMessage } from "./customSendMessage";
import "@carbon/styles/css/styles.css";

const config: PublicConfig = {
  messaging: {
    // route every outbound message through the local mock so the example runs without a real backend; replace with your own `customSendMessage` in production.
    customSendMessage,
  },
};

export function ChatExample() {
  return <ChatContainer {...config} />;
}

export default ChatExample;
