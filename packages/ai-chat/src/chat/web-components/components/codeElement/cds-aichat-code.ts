/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { css, html, LitElement, unsafeCSS } from "lit";
import { property } from "lit/decorators.js";
import throttle from "lodash-es/throttle.js";

import { carbonElement } from "../../decorators/customElement";
import styles from "./src/codeElement.scss";
import hljs from "highlight.js/lib/common";

@carbonElement(`cds-aichat-code`)
class CDSChatCodeElement extends LitElement {
  @property({ type: String }) language = "";
  @property({ type: String }) content = "";

  static styles = css`
    ${unsafeCSS(styles)}
  `;

  private throttledHighlight = throttle(async () => {
    try {
      const codeEl = this.renderRoot.querySelector("code");
      let content = "";
      if (this.language && hljs.getLanguage(this.language)) {
        content = hljs.highlight(this.content, {
          language: this.language,
        }).value;
      } else {
        content = hljs.highlightAuto(this.content).value;
      }
      if (codeEl) {
        codeEl.innerHTML = content;
      }
    } catch (error) {
      console.warn(`Language "${this.language}" could not be loaded.`);
    }
  }, 100); // adjust delay as needed

  updated() {
    this.throttledHighlight();
  }

  render() {
    return html`<pre><code class="language-${this.language}"></code></pre>`;
  }
}

export default CDSChatCodeElement;
