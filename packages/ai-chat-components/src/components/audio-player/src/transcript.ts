/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { LitElement, html } from "lit";
import { property, state } from "lit/decorators.js";
import { carbonElement } from "../../../globals/decorators/index.js";
import commonStyles from "../../../globals/scss/common.scss?lit";
import styles from "./transcript.scss?lit";
import ChevronDown16 from "@carbon/icons/es/chevron--down/16.js";
import ChevronUp16 from "@carbon/icons/es/chevron--up/16.js";
import "../../../components/markdown/index.js";

/**
 * Transcript component for displaying text transcripts for audio/video content.
 * Renders as an expandable/collapsible section.
 *
 * @element cds-aichat-transcript
 * @fires cds-aichat-transcript-toggle - Fired when transcript is expanded or collapsed
 */
@carbonElement(`transcript`)
class Transcript extends LitElement {
  static styles = [commonStyles, styles];

  /**
   * The transcript text (supports markdown)
   */
  @property({ type: String })
  text = "";

  /**
   * Optional label for the transcript (defaults to "Transcript")
   */
  @property({ type: String })
  label = "";

  /**
   * Optional language code
   */
  @property({ type: String })
  language = "";

  /**
   * Internal state: expanded status
   */
  @state()
  private expanded = false;

  /**
   * Toggle transcript visibility
   */
  private handleToggle(): void {
    this.expanded = !this.expanded;

    this.dispatchEvent(
      new CustomEvent("cds-aichat-transcript-toggle", {
        bubbles: true,
        composed: true,
        detail: { expanded: this.expanded },
      }),
    );
  }

  /**
   * Render the component
   */
  render() {
    const displayLabel = this.label || "Transcript";
    const icon = this.expanded ? ChevronUp16 : ChevronDown16;

    return html`
      <div class="transcript">
        <button
          class="transcript__toggle"
          @click=${this.handleToggle}
          aria-expanded="${this.expanded}"
          type="button"
        >
          <span class="transcript__toggle-label">
            ${displayLabel}
            ${this.language
              ? html`<span class="transcript__language">
                  (${this.language})
                </span>`
              : ""}
          </span>
          ${icon({ class: `transcript__toggle-icon` })}
        </button>
        ${this.expanded
          ? html`
              <div class="transcript__content">
                <cds-aichat-markdown
                  markdown=${this.text}
                  sanitize-html
                ></cds-aichat-markdown>
              </div>
            `
          : ""}
      </div>
    `;
  }
}

export default Transcript;

// Made with Bob
