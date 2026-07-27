/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { LitElement, html, nothing } from "lit";
import { property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import AiLaunch24 from "@carbon/icons/es/ai-launch/24.js";
import ChatLaunch24 from "@carbon/icons/es/chat--launch/24.js";
import "../../chat-button/index.js";
import { carbonElement } from "../../../globals/decorators/index.js";
import prefix from "../../../globals/settings.js";
import commonStyles from "../../../globals/scss/common.scss?lit";
import styles from "./launcher.scss?lit";
import {
  BUTTON_KIND,
  BUTTON_TOOLTIP_POSITION,
  BUTTON_TYPE,
} from "@carbon/web-components/es/components/button/defs.js";
import { isDirectionRTL } from "../../../globals/utils/rtl-utils.js";

/**
 * Launcher button — opens the AI Chat window.
 *
 * @element cds-aichat-launcher
 * @fires {CustomEvent} cds-aichat-launcher-toggle - Fired when the user clicks the launcher button.
 */
@carbonElement(`${prefix}-launcher`)
class CDSAIChatLauncher extends LitElement {
  static styles = [commonStyles, styles];

  /**
   * Hides the launcher and removes it from the tab order when `true`.
   */
  @property({ type: Boolean, attribute: "launcher-hidden" })
  launcherHidden = false;

  /**
   * Shows the unread indicator dot when `true` and `unreadMessageCount` is 0.
   */
  @property({ type: Boolean, attribute: "show-unread-indicator" })
  showUnreadIndicator = false;

  /**
   * Number of unread messages. Displays a count badge when greater than 0.
   */
  @property({ type: Number, attribute: "unread-message-count" })
  unreadMessageCount = 0;

  /**
   * Aria label shown when the chat window is closed (launcher is in its
   * "open chat" state).
   */
  @property({ attribute: "closed-label" })
  closedLabel = "";

  /**
   * Aria label shown when the chat window is open (launcher is in its
   * "close chat" state).
   */
  @property({ attribute: "open-label" })
  openLabel = "";

  /**
   * When `true`, renders the AI launch icon. When `false`, renders the
   * standard chat launch icon.
   */
  @property({ type: Boolean, attribute: "ai-enabled" })
  aiEnabled = false;

  /**
   * Optional URL for a custom avatar image. When provided, the avatar
   * replaces the default icon.
   */
  @property({ attribute: "launcher-avatar-url" })
  launcherAvatarUrl?: string;

  /**
   * Pre-formatted screen-reader label suffix for the unread message count
   * (e.g. "3 unread messages"). Appended to the button aria-label when set.
   */
  @property({ attribute: "unread-label" })
  unreadLabel?: string;

  /**
   * Value for the `data-testid` attribute on the inner button element.
   * @internal
   */
  @property({ attribute: "data-test-id" })
  dataTestId?: string;

  /**
   * Value for computed aria-label set on the element.
   * @internal
   */
  private get _ariaLabel(): string {
    return [
      this.launcherHidden ? this.openLabel : this.closedLabel,
      this.unreadLabel,
    ]
      .filter(Boolean)
      .join(". ");
  }

  private _renderIcon() {
    if (this.launcherAvatarUrl) {
      return html`<img
        class="cds-aichat--launcher__avatar"
        src=${this.launcherAvatarUrl}
        aria-hidden
        alt=""
      />`;
    } else if (this.aiEnabled) {
      return iconLoader(AiLaunch24);
    } else {
      return iconLoader(ChatLaunch24);
    }
  }

  private _renderBadge() {
    if (this.unreadMessageCount === 0 && !this.showUnreadIndicator) {
      return nothing;
    }

    return html`<div class="cds-aichat--count-indicator">
      ${this.unreadMessageCount > 0 ? this.unreadMessageCount : ""}
    </div>`;
  }

  private _handleToggle() {
    this.dispatchEvent(
      new CustomEvent(`${prefix}-launcher-toggle`, {
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Moves focus to the launcher button.
   */
  requestFocus() {
    const button = this.shadowRoot?.querySelector<HTMLElement>(
      'cds-aichat-button[tabindex="-1"]',
    );

    button?.focus();
  }

  render() {
    const tabIndex = this.launcherHidden ? -1 : undefined;
    const tooltipPosition = isDirectionRTL()
      ? BUTTON_TOOLTIP_POSITION.RIGHT
      : BUTTON_TOOLTIP_POSITION.LEFT;

    return html`<div
      class=${classMap({
        "cds-aichat-launcher": true,
        "cds-aichat-launcher--hidden": this.launcherHidden,
      })}
    >
      <cds-aichat-button
        data-testid=${this.dataTestId}
        aria-label=${this._ariaLabel}
        tooltip-text=${this._ariaLabel}
        tooltip-position=${tooltipPosition}
        kind=${BUTTON_KIND.PRIMARY}
        type=${BUTTON_TYPE.BUTTON}
        .tabIndex=${tabIndex}
        @click=${this._handleToggle}
      >
        <div class="cds-aichat--launcher__wrapper">
          <div class="cds-aichat--launcher__icon-holder">
            ${this._renderIcon()}
          </div>
        </div>
        ${this._renderBadge()}
      </cds-aichat-button>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-launcher": CDSAIChatLauncher;
  }
}

export { CDSAIChatLauncher };
export default CDSAIChatLauncher;
