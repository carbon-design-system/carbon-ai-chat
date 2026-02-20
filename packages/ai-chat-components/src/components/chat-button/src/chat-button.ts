/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { property } from "lit/decorators.js";
import { PropertyValues } from "lit";
import { CHAT_BUTTON_SIZE } from "../defs";
import {
  BUTTON_KIND as CHAT_BUTTON_KIND,
  BUTTON_TYPE as CHAT_BUTTON_TYPE,
  BUTTON_TYPE as CHAT_BUTTON_TOOLTIP_ALIGNMENT,
  BUTTON_TYPE as CHAT_BUTTON_TOOLTIP_POSITION,
} from "@carbon/web-components/es/components/button/button.js";
import CDSButton from "@carbon/web-components/es/components/button/button.js";
import { carbonElement } from "../../../globals/decorators/index.js";
import prefix from "../../../globals/settings.js";
import styles from "./chat-button.scss?lit";

export {
  CHAT_BUTTON_KIND,
  CHAT_BUTTON_TYPE,
  CHAT_BUTTON_SIZE,
  CHAT_BUTTON_TOOLTIP_ALIGNMENT,
  CHAT_BUTTON_TOOLTIP_POSITION,
};

type ChatButtonSize =
  | CHAT_BUTTON_SIZE.SMALL
  | CHAT_BUTTON_SIZE.MEDIUM
  | CHAT_BUTTON_SIZE.LARGE;

/**
 * Component extending the @carbon/web-components' button
 *
 * @element cds-aichat-button
 */
@carbonElement(`${prefix}-button`)
class CDSAIChatButton extends CDSButton {
  static styles = styles;

  /**
   * Specify whether the `ChatButton` should be rendered as a quick action button
   */
  @property({ type: Boolean, attribute: "is-quick-action" })
  isQuickAction = false;

  /**
   * Button size.
   * Options: "sm", "md", "lg".
   */
  @property({ reflect: true, attribute: "size" })
  declare size: ChatButtonSize;

  /**
   * @internal
   */
  private readonly allowedSizes: CHAT_BUTTON_SIZE[] = [
    CHAT_BUTTON_SIZE.SMALL,
    CHAT_BUTTON_SIZE.MEDIUM,
    CHAT_BUTTON_SIZE.LARGE,
  ];

  protected willUpdate(changedProps: PropertyValues<this>): void {
    if (changedProps.has("isQuickAction") || changedProps.has("size")) {
      this._normalizeButtonState();
    }
  }

  private _normalizeButtonState(): void {
    if (this.isQuickAction) {
      this.kind = CHAT_BUTTON_KIND.GHOST;
      this.size = CHAT_BUTTON_SIZE.SMALL;
      return;
    }
    // Do not allow size larger than `lg`
    if (!this.allowedSizes.includes(this.size as CHAT_BUTTON_SIZE)) {
      this.size = CHAT_BUTTON_SIZE.LARGE;
    }

    if (
      !Object.values(CHAT_BUTTON_KIND).includes(this.kind as CHAT_BUTTON_KIND)
    ) {
      this.kind = CHAT_BUTTON_KIND.PRIMARY;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-button": CDSAIChatButton;
  }
}

export { CDSAIChatButton };
export default CDSAIChatButton;
