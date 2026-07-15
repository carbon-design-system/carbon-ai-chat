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

import PromptLineShellElement from "../components/prompt-line/src/prompt-line-shell.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge.js";

/**
 * React wrapper for `<cds-aichat-prompt-line-shell>`. The shell is layout-only —
 * named slots plus the `rounded` flag — so this wrapper carries no event
 * mappings or prop transformations. Consumers compose `<PromptLine>`,
 * autocomplete content, file-uploads, send-control, etc. into the named
 * slots themselves.
 */
const PromptLineShell = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-prompt-line-shell",
    elementClass: PromptLineShellElement,
    react: React,
    events: {},
  }),
);

export default PromptLineShell;
