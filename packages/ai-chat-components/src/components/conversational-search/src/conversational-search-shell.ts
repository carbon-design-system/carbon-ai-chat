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
import { applyCitationSelection } from './citation-utils.js';
import styles from './conversational-search-shell.scss?lit';

const blockClass = `${prefix}-conversational-search-shell`;

/** The citation state requested by a toggle activation. */
export interface CitationToggleEventDetail {
  /** Whether the host should show the citations region. */
  open: boolean;
}

/** The citation a host should select. */
export interface CitationsSelectEventDetail {
  /** The citation's index, which the host passes back as `selectedCitationIndex`. */
  index: number;
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
 * @fires {CustomEvent<CitationsSelectEventDetail>} cds-aichat-citations-select - Requests a new selected citation when a slotted card is focused or clicked, or the slotted carousel changes slides.
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

  /**
   * Host-controlled index of the selected citation. The shell marks the
   * slotted `cds-aichat-citation-card` with this `index` as selected and shows
   * its slide in the slotted `cds-aichat-carousel`. Leave it unset to leave
   * slotted cards and carousels alone.
   */
  @property({ type: Number, attribute: 'selected-citation-index' })
  selectedCitationIndex?: number;

  // Cards can mount inside a slotted wrapper, which slotchange doesn't report.
  private _citationsObserver = new MutationObserver(() =>
    this._applySelection()
  );

  connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) {
      this._observeCitations();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._citationsObserver.disconnect();
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('selectedCitationIndex')) {
      this._applySelection();
    }
  }

  private get _citations() {
    return (
      this.renderRoot
        .querySelector<HTMLSlotElement>('slot[name="citations"]')
        ?.assignedElements({ flatten: true }) ?? []
    );
  }

  private _observeCitations() {
    this._citationsObserver.disconnect();
    for (const element of this._citations) {
      this._citationsObserver.observe(element, {
        childList: true,
        subtree: true,
      });
    }
    this._applySelection();
  }

  // Runs synchronously so a new carousel gets its index before it starts.
  private _applySelection() {
    if (this.selectedCitationIndex === undefined) {
      return;
    }
    applyCitationSelection(
      this._citations,
      this.selectedCitationIndex,
      `${prefix}-citation-card`,
      `${prefix}-carousel`
    );
  }

  private _requestSelect(index: number) {
    if (index === this.selectedCitationIndex) {
      return;
    }
    this.dispatchEvent(
      new CustomEvent<CitationsSelectEventDetail>(
        ConversationalSearchShell.eventCitationsSelect,
        {
          detail: { index },
          bubbles: true,
          composed: true,
        }
      )
    );
  }

  private _handleCardSelect(event: CustomEvent<{ index: number }>) {
    event.stopPropagation();
    this._requestSelect(event.detail.index);
  }

  private _handleSlideChange(event: CustomEvent<{ currentIndex: number }>) {
    this._requestSelect(event.detail.currentIndex);
  }

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
        ?hidden=${!this.citationsOpen}
        @cds-aichat-citation-select=${this._handleCardSelect}
        @cds-aichat-carousel-onchange=${this._handleSlideChange}>
        <slot name="citations" @slotchange=${this._observeCitations}></slot>
      </div>
    `;
  }

  static get eventCitationsToggle() {
    return `${prefix}-citations-toggle`;
  }

  static get eventCitationsSelect() {
    return `${prefix}-citations-select`;
  }

  static styles = styles;
}

export default ConversationalSearchShell;
