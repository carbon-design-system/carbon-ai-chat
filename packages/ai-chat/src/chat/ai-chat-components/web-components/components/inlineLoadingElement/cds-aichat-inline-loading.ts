/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { css, html, LitElement, unsafeCSS } from "lit";
import { property } from "lit/decorators.js";

import { carbonElement } from "../../decorators/customElement";
import { prefix } from "../../settings";
import styles from "./src/styles.scss";

const INLINE_LOADING_TAG_NAME = `${prefix}-inline-loading`;

@carbonElement(INLINE_LOADING_TAG_NAME)
class CDSInlineLoadingElement extends LitElement {
  static styles = css`
    ${unsafeCSS(styles)}
  `;

  @property({ type: Boolean })
  bounce = false;

  @property({ type: Boolean })
  loop = false;

  @property({ type: Boolean })
  quickLoad = false;

  @property({ type: String })
  carbonTheme = "g10";

  getAnimationEffect() {
    const classNames = [];
    if (this.quickLoad === true) {
      classNames.push("quick-load");
    }
    if (this.bounce === true && this.loop === true) {
      classNames.push("vertical");
    }
    if (this.bounce === false && this.loop === true) {
      classNames.push("linear");
    }
    if (this.bounce === true && this.loop === false) {
      classNames.push("vertical--no-loop");
    }

    if (classNames.length) {
      return classNames.join(" ");
    }
    return "linear--no-loop";
  }

  render() {
    return html`<div
      data-carbon-theme=${this.carbonTheme}
      class=${this.getAnimationEffect()}
    >
      <svg class="dots" viewBox="0 0 32 32">
        <circle class="dot dot--left" cx="8" cy="16" />
        <circle class="dot dot--center" cx="16" cy="16" r="2" />
        <circle class="dot dot--right" cx="24" cy="16" r="2" />
      </svg>
    </div>`;
  }
}

export { INLINE_LOADING_TAG_NAME, CDSInlineLoadingElement };
