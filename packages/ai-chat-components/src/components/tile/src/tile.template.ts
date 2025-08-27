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
// @ts-ignore
import styles from "./tile.scss?lit";

class Tile extends LitElement {
  static styles = styles;

  @property({ attribute: "layer-level", reflect: true })
  layerLevel?: number;

  render() {
    return this.layerLevel !== undefined
      ? html`
          <cds-layer level="${Number(this.layerLevel)}">
            <cds-tile>
              <slot></slot>
            </cds-tile>
          </cds-layer>
        `
      : html`
          <cds-tile>
            <slot></slot>
          </cds-tile>
        `;
  }
}

export default Tile;
