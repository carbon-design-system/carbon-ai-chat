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
import prefix from "../../../globals/settings.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
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
@carbonElement(`${prefix}-transcript`)
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
  label = "Transcript";

  /**
   * Optional language code
   */
  @property({ type: String })
  language = "";

  /**
   * Label for showing transcript
   */
  @property({ type: String, attribute: "show-label" })
  showLabel = "Show";

  /**
   * Label for hiding transcript
   */
  @property({ type: String, attribute: "hide-label" })
  hideLabel = "Hide";

  /**
   * Internal state: expanded status
   */
  @state()
  private expanded = false;

  /**
   * Unique ID for aria-controls relationship
   */
  private contentId = `transcript-content-${Math.random().toString(36).substr(2, 9)}`;

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
    const displayLabel = this.label;
    const icon = this.expanded ? ChevronUp16 : ChevronDown16;
    const actionLabel = this.expanded ? this.hideLabel : this.showLabel;
    const toggleLabel = `${actionLabel} ${displayLabel}`;

    return html`
      <div class="transcript">
        <button
          class="transcript__toggle"
          @click=${this.handleToggle}
          aria-expanded="${this.expanded}"
          aria-controls="${this.contentId}"
          aria-label="${toggleLabel}"
          type="button"
        >
          <span class="transcript__toggle-label" aria-hidden="true">
            ${displayLabel}
            ${this.language
              ? html`<span class="transcript__language">
                  (${this.language})
                </span>`
              : ""}
          </span>
          ${iconLoader(icon)}
        </button>
        ${this.expanded
          ? html`
              <div
                id="${this.contentId}"
                class="transcript__content"
                role="region"
                aria-label="${displayLabel}"
              >
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
