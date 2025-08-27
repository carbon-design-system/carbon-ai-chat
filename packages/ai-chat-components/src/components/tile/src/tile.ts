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
 * Copyright IBM Corp. 2023
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
// @ts-ignore
import styles from "./tile.scss?lit";
import prefix from "../../../globals/settings.js";

@customElement(`${prefix}-tile`)
class CDSAIChatTile extends LitElement {
  static styles = styles;

  @property({ attribute: "layer-level", reflect: true })
  layerLevel?: number;

  render() {
    return this.layerLevel !== undefined
      ? html`
          <cds-layer level="${Number(this.layerLevel)}">
            <slot></slot>
          </cds-layer>
        `
      : html` <slot></slot> `;
  }
}

export default CDSAIChatTile;
