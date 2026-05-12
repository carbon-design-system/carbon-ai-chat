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

import InputShellElement from "../components/input/src/input-shell.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge.js";

/**
 * React wrapper for `<cds-aichat-input-shell>`. The shell is layout-only —
 * named slots plus the `rounded` flag — so this wrapper carries no event
 * mappings or prop transformations. Consumers compose `<PromptLine>`,
 * autocomplete content, file-uploads, send-control, etc. into the named
 * slots themselves.
 */
const InputShell = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-input-shell",
    elementClass: InputShellElement,
    react: React,
    events: {},
  }),
);

export default InputShell;
