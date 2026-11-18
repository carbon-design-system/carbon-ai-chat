/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, PropertyValues, html } from 'lit';
import { property, state } from 'lit/decorators.js';
import { carbonElement } from '../../../globals/decorators/index.js';
import prefix from '../../../globals/settings.js';
import commonStyles from '../../../globals/scss/common.scss?lit';
import styles from './message-item-shell.scss?lit';

const blockClass = `${prefix}-message-item-shell`;

/**
 * Whether a row is sent by the user or received from the assistant.
 */
export type MessageItemShellRowType = 'request' | 'response';

/**
 * The frame for one message row. It provides slots for the byline, content,
 * attachments, and footer. It knows nothing about message data or response
 * types. Request and response rows use the same shell; the `row-type`
 * attribute controls the layout.
 *
 * @experimental
 * @element cds-aichat-message-item-shell
 *
 * @slot byline - The byline area. Slot a `cds-aichat-message-byline` here.
 * @slot - default slot. The message content.
 * @slot attachment - File upload chips or other attachments. The shell adds no announcements; the slotted content decides what screen readers hear.
 * @slot footer - Footer content from the host.
 *
 * The `byline`, `attachment`, and `footer` areas take no space while their
 * slot is empty. A slot is empty when it holds no element and no non-blank
 * text, including a forwarded `<slot>` with nothing assigned.
 *
 * ### CSS custom properties
 *
 * - `--cds-aichat-message-item-shell-inset-start` sets the start padding of
 *   the row body. A response ignores it when `hide-avatar` is set.
 * - `--cds-aichat-message-item-shell-gap-block-start` sets the space between a
 *   response's byline and its content. It only applies with a byline present.
 */
@carbonElement(blockClass)
class CDSAIChatMessageItemShell extends LitElement {
  static styles = [commonStyles, styles];

  /**
   * Whether the row is a request (outbound) or a response (inbound).
   * Controls the layout direction.
   */
  @property({ attribute: 'row-type', reflect: true })
  rowType?: MessageItemShellRowType;

  /**
   * Breaks the content out of the inset column.
   */
  @property({ type: Boolean, attribute: 'full-width', reflect: true })
  fullWidth = false;

  /**
   * Hides the avatar within the byline slot. The label and timestamp remain
   * visible. Applies to both row types.
   *
   * The shell sets `hidden` on the `slot="avatar"` child of the slotted
   * `cds-aichat-message-byline`, and the byline then renders no avatar box.
   * An avatar nested deeper is not hidden.
   */
  @property({ type: Boolean, attribute: 'hide-avatar', reflect: true })
  hideAvatar = false;

  /**
   * Whether each slot holds content. A wrapper with an empty slot is hidden.
   */
  @state()
  private _hasByline = false;

  @state()
  private _hasAttachment = false;

  @state()
  private _hasFooter = false;

  /**
   * Watches the slotted byline for an avatar added, removed, or re-slotted
   * after the byline itself was slotted. `slotchange` does not report those.
   */
  private _bylineObserver = new MutationObserver(() => this._syncAvatar());

  connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) {
      this._observeByline();
    }
  }

  disconnectedCallback() {
    this._bylineObserver.disconnect();
    super.disconnectedCallback();
  }

  protected firstUpdated() {
    this._observeByline();
    this._syncAvatar();
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has('hideAvatar')) {
      this._syncAvatar();
    }
  }

  private _getByline(): Element | undefined {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>(
      'slot[name="byline"]'
    );
    return slot
      ?.assignedElements({ flatten: true })
      .find((el) => el.localName === `${prefix}-message-byline`);
  }

  /**
   * Sets `hidden` on the byline's avatar to match `hideAvatar`.
   */
  private _syncAvatar = (): void => {
    const avatar = this._getByline()?.querySelector<HTMLElement>(
      ':scope > [slot="avatar"]'
    );
    if (avatar) {
      avatar.hidden = this.hideAvatar;
    }
  };

  /**
   * Whether the slot holds an element or non-blank text once forwarded slots
   * are flattened.
   */
  private _slotHasContent(event: Event): boolean {
    return (event.target as HTMLSlotElement)
      .assignedNodes({ flatten: true })
      .some(
        (node) =>
          node.nodeType === Node.ELEMENT_NODE ||
          (node.nodeType === Node.TEXT_NODE && !!node.textContent?.trim())
      );
  }

  /**
   * Re-targets the observer at the current byline, then syncs the avatar.
   */
  private _handleBylineSlotChange = (event: Event): void => {
    this._hasByline = this._slotHasContent(event);
    this._observeByline();
    this._syncAvatar();
  };

  private _handleAttachmentSlotChange = (event: Event): void => {
    this._hasAttachment = this._slotHasContent(event);
  };

  private _handleFooterSlotChange = (event: Event): void => {
    this._hasFooter = this._slotHasContent(event);
  };

  private _observeByline(): void {
    this._bylineObserver.disconnect();
    const byline = this._getByline();
    if (byline) {
      this._bylineObserver.observe(byline, {
        childList: true,
        attributes: true,
        attributeFilter: ['slot'],
        subtree: true,
      });
    }
  }

  render() {
    return html`
      <div class="${blockClass}__byline" ?hidden=${!this._hasByline}>
        <slot name="byline" @slotchange=${this._handleBylineSlotChange}></slot>
      </div>
      <div
        class="${blockClass}__body ${
          this._hasByline ? `${blockClass}__body--has-byline` : ''
        }">
        <div class="${blockClass}__content">
          <slot></slot>
        </div>
        <div class="${blockClass}__attachment" ?hidden=${!this._hasAttachment}>
          <slot
            name="attachment"
            @slotchange=${this._handleAttachmentSlotChange}></slot>
        </div>
        <div class="${blockClass}__footer" ?hidden=${!this._hasFooter}>
          <slot
            name="footer"
            @slotchange=${this._handleFooterSlotChange}></slot>
        </div>
      </div>
    `;
  }
}

export { CDSAIChatMessageItemShell };
export default CDSAIChatMessageItemShell;

declare global {
  interface HTMLElementTagNameMap {
    'cds-aichat-message-item-shell': CDSAIChatMessageItemShell;
  }
}
