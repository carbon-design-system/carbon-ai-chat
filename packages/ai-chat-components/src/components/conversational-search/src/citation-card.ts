/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint jsdoc/check-tag-names: ["error", { "definedTags": ["element", "slot"] }] */

import { LitElement, html, nothing } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { Link16, Maximize16 } from '@carbon/icons';
import { iconLoader } from '@carbon/web-components/es/globals/internal/icon-loader.js';
import '../../card/src/card.js';
import { carbonElement } from '../../../globals/decorators/index.js';
import prefix from '../../../globals/settings.js';
import { citationHostname } from './citation-utils.js';
import styles from './citation-card.scss?lit';

const blockClass = `${prefix}-citation-card`;

/** The citation a card event refers to. */
export interface CitationCardEventDetail {
  /** The card's `index`. */
  index: number;
}

/**
 * Shows one source for a conversational search answer. With a `url`, the card
 * is a link. When it's `expandable`, or its text doesn't fit, it's a button
 * that asks the host to show the full source. Otherwise it's static.
 *
 * Place cards in the `citations` slot of
 * `cds-aichat-conversational-search-shell`, which marks the selected card.
 * The Carbon core card is expected to replace this element.
 *
 * @experimental
 * @element cds-aichat-citation-card
 * @slot title - The source title. Use a block element, such as a `div`.
 * @slot body - The cited text, clamped to five lines. Use a block element, such as a `div`. Keep links and buttons out of it, because the card's click target covers it.
 * @fires {CustomEvent<CitationCardEventDetail>} cds-aichat-citation-select - Fires when the link or button gets focus or is clicked.
 * @fires {CustomEvent<CitationCardEventDetail>} cds-aichat-citation-expand - Fires when an expandable card is clicked, before `cds-aichat-citation-select`.
 */
@carbonElement(`${prefix}-citation-card`)
class CitationCard extends LitElement {
  /** The card's position in the host's list of citations. Events report it. */
  @property({ type: Number })
  index = 0;

  /** The source URL. With it, the card opens the URL in a new tab. Pass only URLs you've validated. */
  @property()
  url?: string;

  /** Makes the card a button even when its text fits. Set it when the host has more of the source to show. */
  @property({ type: Boolean })
  expandable = false;

  /** Footer text. A link card defaults to the URL's hostname. An expandable card shows no text without it. */
  @property({ attribute: 'source-label' })
  sourceLabel?: string;

  /** Whether this is the selected citation. The conversational search shell sets it. */
  @property({ type: Boolean, reflect: true })
  selected = false;

  @state()
  private _overflowing = false;

  @query(`.${blockClass}__text`)
  private _text?: HTMLElement;

  private _resizeObserver?: ResizeObserver;

  private _frame?: number;

  connectedCallback() {
    super.connectedCallback();
    // The carousel moves its slides into a wrapper, which disconnects them.
    if (this.hasUpdated) {
      this._observe();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
    if (this._frame !== undefined) {
      cancelAnimationFrame(this._frame);
      this._frame = undefined;
    }
  }

  firstUpdated() {
    this._observe();
  }

  private _observe() {
    this._resizeObserver ??= new ResizeObserver(() => this._scheduleMeasure());
    this._resizeObserver.disconnect();
    const text = this._text;
    if (!text) {
      return;
    }
    this._resizeObserver.observe(text);
    const body =
      this.renderRoot.querySelector<HTMLSlotElement>('slot[name="body"]');
    for (const element of body?.assignedElements({ flatten: true }) ?? []) {
      this._resizeObserver.observe(element);
    }
  }

  private _scheduleMeasure() {
    if (this._frame !== undefined) {
      return;
    }
    this._frame = requestAnimationFrame(() => {
      this._frame = undefined;
      const text = this._text;
      if (text) {
        this._overflowing = text.scrollHeight > text.clientHeight;
      }
    });
  }

  private _eventInit(): CustomEventInit<CitationCardEventDetail> {
    return { detail: { index: this.index }, bubbles: true, composed: true };
  }

  private _handleSelect() {
    this.dispatchEvent(
      new CustomEvent(CitationCard.eventCitationSelect, this._eventInit())
    );
  }

  private _handleExpand() {
    this.dispatchEvent(
      new CustomEvent(CitationCard.eventCitationExpand, this._eventInit())
    );
    this._handleSelect();
  }

  // The link or button wraps only the title, so the title is its name. Its
  // ::after overlay stretches the click target over the whole card.
  private _renderTitle() {
    const title = html`<slot name="title"></slot>`;
    if (this.url) {
      return html`<a
        class="${blockClass}__action"
        href=${this.url}
        target="_blank"
        rel="noopener noreferrer"
        @focus=${this._handleSelect}
        @click=${this._handleSelect}
        >${title}</a
      >`;
    }
    if (this._isExpandable) {
      return html`<button
        type="button"
        class="${blockClass}__action"
        @focus=${this._handleSelect}
        @click=${this._handleExpand}>
        ${title}
      </button>`;
    }
    return title;
  }

  private get _isExpandable() {
    return !this.url && (this.expandable || this._overflowing);
  }

  private _renderFooter() {
    if (this.url) {
      return this._renderLabel(
        this.sourceLabel ?? citationHostname(this.url),
        Link16
      );
    }
    return this._isExpandable
      ? this._renderLabel(this.sourceLabel, Maximize16)
      : nothing;
  }

  private _renderLabel(label: string | undefined, icon: typeof Link16) {
    return html`
      <span class="${blockClass}__label">${label}</span>
      <span class="${blockClass}__icon">${iconLoader(icon)}</span>
    `;
  }

  render() {
    const interactive = Boolean(this.url) || this._isExpandable;
    return html`
      <div
        class="${blockClass}__frame ${
          interactive ? `${blockClass}__frame--interactive` : ''
        }">
        <cds-aichat-card class="${blockClass}__card">
          <div slot="body">
            <div class="${blockClass}__header">
              <div class="${blockClass}__title">${this._renderTitle()}</div>
              <div class="${blockClass}__text">
                <slot name="body" @slotchange=${this._observe}></slot>
              </div>
            </div>
            <div class="${blockClass}__footer">${this._renderFooter()}</div>
          </div>
        </cds-aichat-card>
      </div>
    `;
  }

  static get eventCitationSelect() {
    return `${prefix}-citation-select`;
  }

  static get eventCitationExpand() {
    return `${prefix}-citation-expand`;
  }

  static styles = styles;
}

export default CitationCard;
