/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from "lit";
import { property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

// @ts-ignore
import styles from "./processing.scss?lit";
import { carbonElement } from "../../../globals/decorators";

@carbonElement("cds-aichat-processing")
class CDSAIChatProcessing extends LitElement {
  static styles = styles;

  /** Enables the linear looping animation variant. */
  @property({ type: Boolean, attribute: "loop" })
  loop = false;

  /** Enables the quick-load animation variant. */
  @property({ type: Boolean, attribute: "quick-load" })
  quickLoad = false;

  render() {
    const classes = classMap({
      [`quick-load`]: this.quickLoad === true,
      [`linear`]: this.loop === true,
      [`linear--no-loop`]: this.loop === false,
    });

    return html`<div class=${classes}>
      <svg class="dots" viewBox="0 0 32 32">
        <circle class="dot dot--left" cx="8" cy="16" />
        <circle class="dot dot--center" cx="16" cy="16" r="2" />
        <circle class="dot dot--right" cx="24" cy="16" r="2" />
      </svg>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-processing": CDSAIChatProcessing;
  }
}

export { CDSAIChatProcessing };
export default CDSAIChatProcessing;
