/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("writeable-element-example")
class WriteableElementExample extends LitElement {
  static styles = css`
    .external {
      background: green;
      color: #fff;
      padding: 1rem;
    }
  `;

  @property({ type: String })
  accessor location: string = "";

  @property({ type: String })
  accessor valueFromParent: string = "";

  render() {
    return html`<div class="external">
      Location: ${this.location}. This is a writeable element with external
      styles. You can inject any custom content here. You are not constrained by
      any height.
      <br />
      Here is a property set by the parent application: ${this.valueFromParent}.
    </div> `;
  }
}

export default WriteableElementExample;
