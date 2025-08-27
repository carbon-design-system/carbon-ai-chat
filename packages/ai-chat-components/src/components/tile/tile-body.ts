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
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { customElement } from "lit/decorators.js";
import prefix from "../../globals/settings.js";
import { LitElement, html } from "lit";
// @ts-ignore
import styles from "./src/tile.scss?lit";

/**
 * Component extending the @carbon/web-components' tile
 */
// @ts-ignore
@customElement(`${prefix}-tile-body`)
class CDSAIChatTileBody extends LitElement {
  static styles = styles;

  render() {
    return html`<slot></slot>`;
  }
}

export default CDSAIChatTileBody;

