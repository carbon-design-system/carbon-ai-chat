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
import { markdownTextTemplate } from "./markdown.template.js";
// @ts-ignore
import styles from "./markdown.scss?lit";

@carbonElement("cds-aichat-markdown-text")
class CDSChatMarkdownElement extends MarkdownElement {
  static styles = styles;

  render() {
    return markdownTextTemplate(this);
  }
}

export default CDSChatMarkdownElement;
