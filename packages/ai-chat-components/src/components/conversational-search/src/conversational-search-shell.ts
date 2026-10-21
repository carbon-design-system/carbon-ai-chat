/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint jsdoc/check-tag-names: ["error", { "definedTags": ["element", "slot", "csspart"] }] */

import { LitElement, html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { ChevronDown16, ChevronUp16 } from '@carbon/icons';
import '@carbon/web-components/es/components/tag/tag.js';
import { iconLoader } from '@carbon/web-components/es/globals/internal/icon-loader.js';
import { carbonElement } from '../../../globals/decorators/index.js';
import prefix from '../../../globals/settings.js';
import styles from './conversational-search-shell.scss?lit';

const blockClass = `${prefix}-conversational-search-shell`;

/** The citation state requested by a toggle activation. */
export interface CitationToggleEventDetail {
  /** Whether the host should show the citations region. */
  open: boolean;
}

/**
 * Lays out a slotted answer, a citations toggle, and host-supplied citations.
 *
 * @experimental
 * @element cds-aichat-conversational-search-shell
 * @slot - The answer content, such as Markdown.
 * @slot answer-error - An optional answer error, after the toggle.
 * @slot citations - Citation content, including loading or error states.
 * @csspart answer - The answer and toggle container.
 * @fires {CustomEvent<CitationToggleEventDetail>} cds-aichat-citations-toggle - Requests a citation state change.
 */
@carbonElement(blockClass)
class ConversationalSearchShell extends LitElement {
  /** Host-controlled visibility of the citations region. */
  @property({ type: Boolean, attribute: 'citations-open' })
  citationsOpen = false;

  /** Show the citation toggle when citations are available. */
  @property({ type: Boolean, attribute: 'show-citations-toggle' })
  showCitationsToggle = false;

  /** Visible text on the citation toggle. */
  @property({ attribute: 'citations-label' })
  citationsLabel = 'Citations';

  /** Accessible name of the citation toggle. */
  @property({ attribute: 'toggle-label' })
  toggleLabel = 'Toggle citations';

  private _handleToggle() {
    const open = !this.citationsOpen;
    this.dispatchEvent(
      new CustomEvent<CitationToggleEventDetail>(
        ConversationalSearchShell.eventCitationsToggle,
        {
          detail: { open },
          bubbles: true,
          composed: true,
        }
      )
    );
  }

  render() {
    return html`
      <div part="answer">
        <slot></slot>
        ${
          this.showCitationsToggle
            ? html`
                <div class="${blockClass}__toggle-container">
                  <button
                    type="button"
                    class="${blockClass}__toggle"
                    aria-label=${this.toggleLabel}
                    aria-expanded=${String(this.citationsOpen)}
                    aria-controls="citations"
                    @click=${this._handleToggle}>
                    <cds-tag size="md" type="gray" .filter=${false}>
                      <span slot="icon" aria-hidden="true">
                        ${iconLoader(
                          this.citationsOpen ? ChevronUp16 : ChevronDown16
                        )}
                      </span>
                      ${this.citationsLabel}
                    </cds-tag>
                  </button>
                </div>
              `
            : nothing
        }
      </div>
      <slot name="answer-error"></slot>
      <div
        id="citations"
        class="${blockClass}__citations"
        ?hidden=${!this.citationsOpen}>
        <slot name="citations"></slot>
      </div>
    `;
  }

  static get eventCitationsToggle() {
    return `${prefix}-citations-toggle`;
  }

  static styles = styles;
}

export default ConversationalSearchShell;
