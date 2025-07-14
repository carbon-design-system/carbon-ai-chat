/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";

@customElement("user-defined-response-example")
class UserDefinedResponseExample extends LitElement {
  static styles = css`
    .external {
      background: green;
      color: #fff;
      margin-top: 1rem;
      padding: 1rem;
    }
  `;

  @property({ type: String })
  accessor text = "";

  @property({ type: String })
  accessor valueFromParent: string = "";

  @state()
  accessor timestamp = 0;

  connectedCallback() {
    super.connectedCallback();
    this._startTimer();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._timer);
  }

  private _timer!: ReturnType<typeof setInterval>;

  private _startTimer() {
    this._timer = setInterval(() => {
      this.timestamp = Date.now();
    }, 1000);
  }

  render() {
    return html`
      <div class="external">
        <p>This is a user_defined response type with external styles.</p>
        <p>
          The following is some text passed along for use by the back-end in the
          response: ${this.text}.
        </p>
        <p>And here is a value being set by local state: ${this.timestamp}.</p>
        <p>
          And here is a value being set by the parent application state:
          ${this.valueFromParent}
        </p>
      </div>
    `;
  }
}

export default UserDefinedResponseExample;
