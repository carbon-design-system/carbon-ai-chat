/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
// @ts-ignore
import styles from "./tile-container.scss?lit";
import prefix from "../../../globals/settings.js";

@customElement(`${prefix}-tile-container`)
class CDSAIChatTileContainer extends LitElement {
  static styles = styles;

  render() {
    return html`<slot></slot>`;
  }
}

export default CDSAIChatTileContainer;
