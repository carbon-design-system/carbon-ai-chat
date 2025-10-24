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
import prefix from "../../../globals/settings.js";
import { carbonElement } from "../../../globals/decorators";

@carbonElement(`${prefix}-processing`)
class CDSAIChatProcessing extends LitElement {
  static styles = styles;

  @property({ type: Boolean })
  loop = false;

  @property({ type: Boolean })
  quickLoad = false;

  @property({ type: String })
  carbonTheme = "g10";

  render() {
    const classes = classMap({
      [`quick-load`]: this.quickLoad === true,
      [`linear`]: this.loop === true,
      [`linear--no-loop`]: this.loop === false,
    });

    return html`<div data-carbon-theme=${this.carbonTheme} class=${classes}>
      <svg class="dots" viewBox="0 0 32 32">
        <circle class="dot dot--left" cx="8" cy="16" />
        <circle class="dot dot--center" cx="16" cy="16" r="2" />
        <circle class="dot dot--right" cx="24" cy="16" r="2" />
      </svg>
    </div>`;
  }
}

export default CDSAIChatProcessing;
