/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { LitElement, html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { ChevronDown16, ChevronUp16 } from '@carbon/icons';
import '@carbon/web-components/es/components/tag/tag.js';
import { iconLoader } from '@carbon/web-components/es/globals/internal/icon-loader.js';
import { carbonElement } from '../../../globals/decorators/index.js';
import prefix from '../../../globals/settings.js';
import styles from './conversational-search-text.scss?lit';

const blockClass = `${prefix}-conversational-search-text`;

/** The citation state requested by a toggle activation. */
export interface CitationToggleEventDetail {
  /** Whether the host should open its citation list. */
  open: boolean;
}

/**
 * Displays a slotted answer and requests changes to a host-controlled citation list.
 *
 * @experimental
 * @element cds-aichat-conversational-search-text
 * @slot - The answer content, such as Markdown.
 * @fires {CustomEvent<CitationToggleEventDetail>} cds-aichat-citations-toggle - Requests a citation state change.
 * @fires {CustomEvent} cds-aichat-citations-scroll - Requests scrolling after an opening toggle request.
 */
@carbonElement(blockClass)
class ConversationalSearchText extends LitElement {
  /** The host-controlled open state of the citation list. */
  @property({ type: Boolean, attribute: 'citations-open' })
  citationsOpen = false;

  /** Show the citation toggle when citations are available. */
  @property({ type: Boolean, attribute: 'show-citations-toggle' })
  showCitationsToggle = false;

  /** Visible text on the citation toggle. */
  @property({ attribute: 'citations-label' })
  citationsLabel = 'Citations';

  /** Streaming metadata. The host must also update its slotted answer content. */
  @property({ type: Boolean })
  streaming = false;

  /** Accessible name of the citation toggle. */
  @property({ attribute: 'toggle-label' })
  toggleLabel = 'Toggle citations';

  /** Optional ID for the internal toggle button. Use a value unique on the page. */
  @property({ attribute: 'toggle-id' })
  toggleId = '';

  private _handleToggle() {
    const open = !this.citationsOpen;
    this.dispatchEvent(
      new CustomEvent<CitationToggleEventDetail>(
        ConversationalSearchText.eventCitationsToggle,
        {
          detail: { open },
          bubbles: true,
          composed: true,
        }
      )
    );
    if (open) {
      this.dispatchEvent(
        new CustomEvent(ConversationalSearchText.eventCitationsScroll, {
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  render() {
    return html`
      <slot></slot>
      ${
        this.showCitationsToggle
          ? html`
              <div class="${blockClass}__toggle-container">
                <button
                  type="button"
                  class="${blockClass}__toggle"
                  id=${ifDefined(this.toggleId || undefined)}
                  aria-label=${this.toggleLabel}
                  aria-expanded=${String(this.citationsOpen)}
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
    `;
  }

  static get eventCitationsToggle() {
    return `${prefix}-citations-toggle`;
  }

  static get eventCitationsScroll() {
    return `${prefix}-citations-scroll`;
  }

  static styles = styles;
}

export default ConversationalSearchText;
