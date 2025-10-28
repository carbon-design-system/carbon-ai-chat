/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import "@carbon/web-components/es/components/notification/inline-notification.js";
// @ts-ignore
import styles from "./workspace-shell.scss?lit";
import prefix from "../../../globals/settings.js";

/**
 * Workspace Shell Notification.
 *
 * @element cds-aichat-workspace-shell-notification
 *
 */
@customElement(`${prefix}-workspace-shell-notification`)
class CDSAIChatWorkspaceShellNotification extends LitElement {
  static styles = styles;

  /**
   * Sets default slot value to body
   */
  @property({ type: String, reflect: true })
  slot = "notification";
  /**
   * Sets default slot value to body
   */
  @property({ type: String, attribute: "title-text" })
  title;
  /**
   * Sets default slot value to body
   */
  @property({ type: String, reflect: true })
  subtitle;

  render() {
    const { title, subtitle } = this;
    return html`
      <cds-inline-notification
        slot="notification"
        .title="${title}"
        .subtitle="${subtitle}"
        kind="warning"
        low-contrast=""
        hide-close-button
      >
      </cds-inline-notification>
    `;
  }
}

export default CDSAIChatWorkspaceShellNotification;
