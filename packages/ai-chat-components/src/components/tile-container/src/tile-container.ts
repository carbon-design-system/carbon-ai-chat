/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from "lit";
import { query } from "lit/decorators.js";
// @ts-ignore
import styles from "./tile-container.scss?lit";
// @ts-ignore
import lightDomStyles from "./styles.scss?lit";
import prefix from "../../../globals/settings.js";
import { carbonElement } from "../../../globals/decorators";

@carbonElement(`${prefix}-tile-container`)
class CDSAIChatTileContainer extends LitElement {
  static styles = styles;

  @query("slot") private slotEl!: HTMLSlotElement;
  private mutationObserver?: MutationObserver;

  connectedCallback(): void {
    super.connectedCallback();

    const root = this.getRootNode();
    if (root instanceof Document || root instanceof ShadowRoot) {
      this.ensureLightDomStyles(root);
    } else {
      console.warn("Unsupported root node type:", root);
    }
  }

  private ensureLightDomStyles(root: Document | ShadowRoot): void {
    const styleId = `${prefix}-tile-container-light-dom-styles`;
    if (root.querySelector(`#${styleId}`)) {
      return;
    }

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = lightDomStyles;

    if (root instanceof ShadowRoot) {
      root.appendChild(style);
    } else {
      root.head.appendChild(style);
    }
  }

  firstUpdated(): void {
    const slotted = this.slotEl?.assignedElements() ?? [];
    const tile = slotted[0];
    if (!tile) {
      return;
    }

    tile.removeAttribute("ai-label");
    this.mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes") {
          tile.removeAttribute("ai-label");
          break;
        }
      }
    });

    this.mutationObserver.observe(tile, { attributes: true });
  }

  disconnectedCallback(): void {
    this.mutationObserver?.disconnect();
    super.disconnectedCallback();
  }

  render() {
    return html`<slot></slot>`;
  }
}

export default CDSAIChatTileContainer;
