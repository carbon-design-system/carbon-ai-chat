/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from "lit";
import { property } from "lit/decorators.js";
import prefix from "../../../globals/settings.js";
import { carbonElement } from "../../../globals/decorators/carbon-element.js";

import "@carbon/web-components/es/components/search/search.js";
import "@carbon/web-components/es/components/icon-button/index.js";
import AddComment20 from "@carbon/icons/es/add-comment/20.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
// @ts-ignore
import styles from "./chat-history.scss?lit";

/**
 * Chat History Toolbar.
 *
 * @element cds-aichat-chat-history-toolbar
 *
 */
@carbonElement(`${prefix}-chat-history-toolbar`)
export class CDSChatHistoryToolbar extends LitElement {
  /**
   * Sets default slot value to toolbar
   */
  @property({ type: String, reflect: true })
  slot = "toolbar";

  /**
   * Label for new chat button.
   */
  @property({ type: String, attribute: "new-chat-label" })
  newChatLabel = "New chat";

  render() {
    const { newChatLabel } = this;

    return html` <cds-search></cds-search>
      <cds-icon-button>
        ${iconLoader(AddComment20, {
          slot: "icon",
        })}
        <span slot="tooltip-content">${newChatLabel}</span>
      </cds-icon-button>`;
  }

  static styles = styles;
}

export default CDSChatHistoryToolbar;
