/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This file creates React bindings for the MarkdownText web component and registers the web component in the DOM.
 */

import { createComponent } from "@lit/react";
import React from "react";

import MarkdownTextElement from "../../../web-components/components/markdownText/cds-aichat-markdown-text";

const MarkdownText = createComponent({
  tagName: "cds-aichat-markdown-text",
  elementClass: MarkdownTextElement,
  react: React,
});

export { MarkdownText };
