/**
 *
 * IBM Confidential
 *
 * (C) Copyright IBM Corp. 2024
 *
 * The source code for this program is not published or otherwise
 * divested of its trade secrets, irrespective of what has been
 * deposited with the U. S. Copyright Office
 *
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 *
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
      any height. This is a property set by the parent application:
      ${this.valueFromParent}.
    </div> `;
  }
}

export default WriteableElementExample;
