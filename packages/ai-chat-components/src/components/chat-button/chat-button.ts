/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { customElement } from "lit/decorators.js";
import { property } from "lit/decorators.js";
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
  @property({ attribute: "is-quick-action", type: Boolean })
  isQuickAction = false;

  connectedCallback(): void {
    super.connectedCallback();

    const allowedSizes = [
      BUTTON_SIZE.SMALL,
      BUTTON_SIZE.MEDIUM,
      BUTTON_SIZE.LARGE,
    ];

    if (this.isQuickAction) {
      this.kind = BUTTON_KIND.GHOST;
      this.size = BUTTON_SIZE.SMALL;
    } else {
      // Do not allow size larger than `lg`
      this.size = allowedSizes.includes(this.size as BUTTON_SIZE)
        ? this.size
        : BUTTON_SIZE.LARGE;
    }
  }
}

export default ChatButton;
