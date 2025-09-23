/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from "lit";
import { customElement, query } from "lit/decorators.js";
// @ts-ignore
import styles from "./tile-container.scss?lit";
// @ts-ignore
import lightDomStyles from "./styles.scss?lit";
import prefix from "../../../globals/settings.js";

@customElement(`${prefix}-tile-container`)
class CDSAIChatTileContainer extends LitElement {
  static styles = styles;
  @query("slot") private slotEl!: HTMLSlotElement;

  protected firstUpdated() {
    this.updateTileLabel();
    this.slotEl.addEventListener("slotchange", this.updateTileLabel);
  }

  private updateTileLabel = () => {
    const slotted = this.slotEl.assignedElements();
    const tile = slotted[0];
    const footer = slotted[1];

    if (footer) {
      requestAnimationFrame(() => {
        tile.removeAttribute("ai-label");
      });
    }
  };

  connectedCallback(): void {
    super.connectedCallback();
    // Add only once per document
    const styleId = `${prefix}-tile-container-light-dom-styles`;
    if (!document.getElementById(styleId)) {
      const style = Object.assign(document.createElement("style"), {
        innerHTML: lightDomStyles,
        id: styleId,
      });
      document.head.appendChild(style);
    }
  }

  render() {
    return html`<slot></slot>`;
  }
}

export default CDSAIChatTileContainer;
