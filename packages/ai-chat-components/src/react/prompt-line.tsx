/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from "@lit/react";
import React from "react";

import PromptLineElement from "../components/input/src/prompt-line.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge.js";

/**
 * React wrapper for `<cds-aichat-prompt-line>`. Mirrors the WC's prompt-line
 * surface verbatim — no host-side prop transformation required (the prompt-
 * line takes Tiptap extensions directly; chat-domain config layering happens
 * one level up at the shell). Imperative methods are reachable via ref.
 *
 * Wrapped in `withWebComponentBridge` so testId / extensions / content props
 * land on the underlying custom element in happy-dom / jsdom, where
 * `@lit/react` doesn't reliably flush properties on its own.
 *
 * @experimental
 */
const PromptLine = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-prompt-line",
    elementClass: PromptLineElement,
    react: React,
    events: {
      onChange: "cds-aichat-prompt-change",
      onFocus: "cds-aichat-prompt-focus",
      onBlur: "cds-aichat-prompt-blur",
      onTyping: "cds-aichat-prompt-typing",
      onKeyDown: "cds-aichat-prompt-keydown",
      onSendIntent: "cds-aichat-prompt-send-intent",
      onTriggerChange: "cds-aichat-trigger-change",
      onLightDomPortal: "cds-aichat-light-dom-portal",
    },
  }),
);

export default PromptLine;
