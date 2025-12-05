/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import MarkdownElement from "./markdown.js";
// @ts-ignore
import styles from "./markdown.scss?lit";

const MARKDOWN_COMPONENT_TAG_NAME = "cds-aichat-markdown";

@carbonElement("cds-aichat-markdown")
class CDSChatMarkdownElement extends MarkdownElement {
  static styles = styles;
}

declare global {
  interface HTMLElementTagNameMap {
    [MARKDOWN_COMPONENT_TAG_NAME]: CDSChatMarkdownElement;
  }
}

export { MARKDOWN_COMPONENT_TAG_NAME };
export default CDSChatMarkdownElement;
