/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from "lit";
import prefix from "../../../globals/settings.js";
import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import styles from "./chat-history.scss?lit";

/**
 * Chat History Shell.
 *
 * @element cds-aichat-history-shell
 * @slot header - Represents the header section, containing title, and actions.
 * @slot toolbar - Represents the toolbar area of the chat history component (includes search, new chat button, etc).
 * @slot content - List of the chat history items.
 *
 */
@carbonElement(`${prefix}-history-shell`)
export class CDSHistoryShell extends LitElement {
  render() {
    return html` <slot name="header"></slot>
      <slot name="toolbar"></slot>
      <slot name="content"></slot>`;
  }

  static styles = styles;
}

export default CDSHistoryShell;
