/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { css, LitElement, unsafeCSS } from "lit";
import { property } from "lit/decorators.js";

import { carbonElement } from "@carbon/ai-chat-components/es/globals/decorators/index.js";
import styles from "./src/chatHeaderTitle.scss";
import { chatHeaderTitleTemplate } from "./src/chatHeaderTitle.template";

@carbonElement("cds-aichat-chat-header-title")
class ChatHeaderTitleElement extends LitElement {
  static styles = css`
    ${unsafeCSS(styles)}
  `;

  @property({ type: String })
  title: string;

  @property({ type: String })
  name?: string;

  render() {
    return chatHeaderTitleTemplate(this);
  }
}

export { ChatHeaderTitleElement };
