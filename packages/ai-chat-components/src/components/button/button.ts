/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

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
import chatButton from "./src/button.template.js";
import { BUTTON_KIND } from "@carbon/web-components/es/components/button/button.js";
import prefix from "../../globals/settings.js";

/**
 * Component extending the @carbon/web-components' button
 */
//@ts-ignore
@customElement(`${prefix}-button`)
class ChatButton extends chatButton {
  /**
   * Specify whether the `ChatButton` should be rendered as a quick action button
   */
  @property({ attribute: "is-quick-action", type: Boolean })
  isQuickAction = false;

  connectedCallback(): void {
    super.connectedCallback();
    if (this.isQuickAction) {
      this.kind = BUTTON_KIND.GHOST;
    }
  }
}

export default ChatButton;
