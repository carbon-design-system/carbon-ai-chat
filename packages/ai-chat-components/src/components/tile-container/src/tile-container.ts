/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from "lit";
// @ts-ignore
import styles from "./tile-container.scss?lit";
import prefix from "../../../globals/settings.js";
import { carbonElement } from "../../../globals/decorators";

@carbonElement(`${prefix}-tile-container`)
class CDSAIChatTileContainer extends LitElement {
  static styles = styles;

  render() {
    return html`<slot></slot> <slot name="aichat-tile-decorator"></slot>`;
  }
}

export default CDSAIChatTileContainer;
