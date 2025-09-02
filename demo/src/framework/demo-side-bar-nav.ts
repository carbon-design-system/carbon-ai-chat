/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import RightPanelOpen16 from "@carbon/icons/es/right-panel--open/16.js";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
@customElement("demo-side-bar-nav")
class DemoSideBarNav extends LitElement {
  static styles = css`
    .demo-sidebar-nav {
      border-left: 1px solid #e0e0e0;
      position: fixed;
      right: 0;
      top: 0;
      height: 100vh;
      width: 40px;
      z-index: 9998;
    }
  `;

  @property({ type: Object })
  accessor openSideBar!: () => void;

  render() {
    return html`<div class="demo-sidebar-nav">
      <cds-icon-button kind="ghost" @click="${this.openSideBar}">
        ${iconLoader(RightPanelOpen16, { slot: "icon" })}
      </cds-icon-button>
    </div>`;
  }
}

export default DemoSideBarNav;
