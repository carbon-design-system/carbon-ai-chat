/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { css, unsafeCSS } from "lit";

import { carbonElement } from "../../decorators/customElement";
import MarkdownElement from "./src/MarkdownElement";
import { markdownTextTemplate } from "./src/markdownElement.template";
import styles from "./src/markdownText.scss";

@carbonElement("cds-aichat-markdown-text")
class CDSChatMarkdownElement extends MarkdownElement {
  static styles = css`
    ${unsafeCSS(styles)}
  `;

  render() {
    return markdownTextTemplate(this);
  }
}

export default CDSChatMarkdownElement;
