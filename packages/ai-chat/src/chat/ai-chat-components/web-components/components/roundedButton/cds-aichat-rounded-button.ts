/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import CDSButton from "@carbon/web-components/es/components/button/button.js";
import { css, unsafeCSS } from "lit";

import { carbonElement } from "../../decorators/customElement";

const ROUNDED_BUTTON_TAG_NAME = `cds-aichat-rounded-button`;

const styles = `
  .cds--btn {
    border-start-start-radius: var(--${ROUNDED_BUTTON_TAG_NAME}-top-left);
    border-start-end-radius: var(--${ROUNDED_BUTTON_TAG_NAME}-top-right);
    border-end-start-radius: var(--${ROUNDED_BUTTON_TAG_NAME}-bottom-left);
    border-end-end-radius: var(--${ROUNDED_BUTTON_TAG_NAME}-bottom-right);
    width: var(--${ROUNDED_BUTTON_TAG_NAME}-width);
    max-width: var(--${ROUNDED_BUTTON_TAG_NAME}-max-width);
  }`;

/**
 * This is an extension of the carbon button that allows us to round the corners.
 */
@carbonElement(ROUNDED_BUTTON_TAG_NAME)
class CDSRoundedButtonElement extends CDSButton {
  static styles = css`
    ${CDSButton.styles}
    ${unsafeCSS(styles)}
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-rounded-button": CDSRoundedButtonElement;
  }
}

export { ROUNDED_BUTTON_TAG_NAME, CDSRoundedButtonElement };
export default CDSRoundedButtonElement;
