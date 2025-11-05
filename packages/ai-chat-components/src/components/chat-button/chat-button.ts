/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { customElement, property } from "lit/decorators.js";
import { PropertyValues } from "lit";
import chatButton from "./src/chat-button.template.js";
import {
  BUTTON_KIND,
  BUTTON_SIZE,
} from "@carbon/web-components/es/components/button/button.js";
import prefix from "../../globals/settings.js";

/**
 * Component extending the @carbon/web-components' button
 */
@customElement(`${prefix}-button`)
class ChatButton extends chatButton {
  /**
   * Specify whether the `ChatButton` should be rendered as a quick action button
   */
  @property({ type: Boolean, attribute: "is-quick-action" })
  isQuickAction = false;

  private readonly allowedSizes: BUTTON_SIZE[] = [
    BUTTON_SIZE.SMALL,
    BUTTON_SIZE.MEDIUM,
    BUTTON_SIZE.LARGE,
  ];

  protected willUpdate(changedProps: PropertyValues<this>): void {
    if (changedProps.has("isQuickAction") || changedProps.has("size")) {
      this._normalizeButtonState();
    }
  }

  private _normalizeButtonState(): void {
    if (this.isQuickAction) {
      this.kind = BUTTON_KIND.GHOST;
      this.size = BUTTON_SIZE.SMALL;
      return;
    }
    // Do not allow size larger than `lg`
    if (!this.allowedSizes.includes(this.size as BUTTON_SIZE)) {
      this.size = BUTTON_SIZE.LARGE;
    }

    if (!Object.values(BUTTON_KIND).includes(this.kind as BUTTON_KIND)) {
      this.kind = BUTTON_KIND.PRIMARY;
    }
  }
}

export default ChatButton;
