/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This file creates React bindings for the Markdown web component and registers the web component in the DOM.
 */

import { createComponent } from "@lit/react";
import React from "react";

import MarkdownElement from "../../../web-components/components/markdownText/cds-aichat-markdown-text";

const Markdown = createComponent({
  tagName: "cds-aichat-markdown-text",
  elementClass: MarkdownElement,
  react: React,
});

export { Markdown };
