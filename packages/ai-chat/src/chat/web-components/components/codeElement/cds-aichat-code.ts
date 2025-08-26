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

@carbonElement(`cds-aichat-code`)
class CDSChatCodeElement extends LitElement {
  @property({ type: String }) language = "";
  @property({ type: String }) content = "";
  @property({ type: Boolean }) dark = false;

  static styles = css`
    ${unsafeCSS(styles)}
  `;

  updated() {
    this.throttledHighlight();
  }

  private throttledHighlight = throttle(async () => {
    try {
      // Dynamically import highlight.js only when needed
      const hljsModule = await import("highlight.js/lib/common");
      // highlight.js exports as default in ESM, but some bundlers might expose it directly
      const hljs = "default" in hljsModule ? hljsModule.default : hljsModule;

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
  }, 150); // adjust delay as needed

  render() {
    const themeClass = this.dark
      ? "cds-aichat-code--dark"
      : "cds-aichat-code--light";
    return html`<pre class="${themeClass}"><code class="language-${this
      .language}"></code></pre>`;
  }
}

export default CDSChatCodeElement;
