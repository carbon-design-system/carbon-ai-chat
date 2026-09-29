/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { css, html, LitElement, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';

import { carbonElement } from '../../../globals/decorators/carbon-element.js';
import prefix from '../../../globals/settings.js';

import '@carbon/web-components/es/components/button/index.js';

import { iconLoader } from '@carbon/web-components/es/globals/internal/icon-loader.js';
import Send16 from '@carbon/icons/es/send/16.js';
import SendFilled16 from '@carbon/icons/es/send--filled/16.js';

import {
  BUTTON_KIND,
  BUTTON_SIZE,
  BUTTON_TYPE,
  BUTTON_TOOLTIP_ALIGNMENT,
  BUTTON_TOOLTIP_POSITION,
} from '@carbon/web-components/es/components/button/defs.js';

import './stop-streaming-button.js';

import styles from './send-control.scss?lit';

/**
 * Send control component — renders the send button or stop streaming button.
 *
 * @element cds-aichat-input-send-control
 * @fires {CustomEvent} cds-aichat-input-send - Fired when the send button is clicked
 * @fires {CustomEvent} cds-aichat-input-stop-streaming - Fired when the stop streaming button is clicked
 */
@carbonElement(`${prefix}-input-send-control`)
class InputSendControlElement extends LitElement {
  static styles = css`
    ${unsafeCSS(styles)}
  `;

  /** Whether the input has valid content that can be sent. */
  @property({ type: Boolean, attribute: 'has-valid-input' })
  hasValidInput = false;

  /** Whether the entire input is disabled. */
  @property({ type: Boolean, attribute: 'disabled' })
  disabled = false;

  /** Whether sending is disabled (separate from overall disabled state). */
  @property({ type: Boolean, attribute: 'disable-send' })
  disableSend = false;

  /** Show the stop streaming button instead of the send button. */
  @property({ type: Boolean, attribute: 'show-stop-streaming' })
  isStopStreamingButtonVisible = false;

  /** Whether the stop streaming button is disabled. */
  @property({ type: Boolean, attribute: 'disable-stop-streaming' })
  isStopStreamingButtonDisabled = false;

  /** Label for the send button tooltip. */
  @property({ type: String, attribute: 'button-label' })
  buttonLabel = 'Send';

  /** Label for the stop streaming button tooltip. */
  @property({ type: String, attribute: 'stop-response-label' })
  stopResponseLabel = 'Stop response';

  /** Test identifier. */
  @property({ type: String, attribute: 'test-id' })
  testId?: string;

  @state()
  private _autocompleteListNavigated = false;

  // Latches navigated state at gesture start; focusout can clear the live flag
  // before click fires, so this preserves the blocked state through click.
  private _navigatedAtPointerdown = false;

  // Autocomplete is a sibling; listen on the shared shell ancestor.
  private _autocompleteEventSource: EventTarget | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this._autocompleteEventSource =
      this.closest(`${prefix}-prompt-line-shell`) ?? this.parentElement;
    this._autocompleteEventSource?.addEventListener(
      'cds-aichat-autocomplete-navigated',
      this._handleAutocompleteNavigated as EventListener
    );
    // Capture phase: fires before focus-activation and before pointer-events:none
    // on the disabled button suppresses the event.
    document.addEventListener('pointerdown', this._handleDocumentPointerdown, {
      capture: true,
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._autocompleteEventSource?.removeEventListener(
      'cds-aichat-autocomplete-navigated',
      this._handleAutocompleteNavigated as EventListener
    );
    this._autocompleteEventSource = null;
    document.removeEventListener(
      'pointerdown',
      this._handleDocumentPointerdown,
      { capture: true }
    );
  }

  private _handleAutocompleteNavigated = (event: Event): void => {
    this._autocompleteListNavigated = (
      event as CustomEvent<{ navigated: boolean }>
    ).detail.navigated;
  };

  private _handleDocumentPointerdown = (event: PointerEvent): void => {
    if (!event.composedPath().includes(this)) {
      return;
    }
    const navigated = this._autocompleteListNavigated;
    // Sync on every gesture so a cancelled gesture doesn't leave a stale latch.
    this._navigatedAtPointerdown = navigated;
    if (navigated) {
      // Suppress focus-activation so the editor stays focused and the live flag
      // remains true through the subsequent click.
      event.preventDefault();
    }
  };

  private _handleSendClick = (event: MouseEvent) => {
    // detail === 0 for keyboard/assistive clicks — don't block those.
    const blocked =
      (event.detail > 0 && this._navigatedAtPointerdown) ||
      this._autocompleteListNavigated;
    this._navigatedAtPointerdown = false;
    if (this.disabled || this.disableSend || blocked || !this.hasValidInput) {
      return;
    }
    this.dispatchEvent(
      new CustomEvent('cds-aichat-input-send', {
        bubbles: true,
        composed: true,
      })
    );
  };

  private _handleStopStreamingClick = () => {
    this.dispatchEvent(
      new CustomEvent('cds-aichat-input-stop-streaming', {
        bubbles: true,
        composed: true,
      })
    );
  };

  render() {
    const isRTL =
      document.dir === 'rtl' || document.documentElement.dir === 'rtl';

    const showDisabledSend =
      !this.hasValidInput ||
      this.disabled ||
      this.disableSend ||
      this._autocompleteListNavigated;

    if (this.isStopStreamingButtonVisible) {
      return html`
        <cds-aichat-stop-streaming-button
          label="${this.stopResponseLabel}"
          ?disabled="${this.isStopStreamingButtonDisabled}"
          tooltip-alignment="${isRTL ? 'top-left' : 'top-right'}"
          @click="${this._handleStopStreamingClick}"></cds-aichat-stop-streaming-button>
      `;
    }

    return html`
      <cds-button
        class="${prefix}--input-send-button"
        kind="${BUTTON_KIND.GHOST}"
        size="${BUTTON_SIZE.SMALL}"
        type="${BUTTON_TYPE.BUTTON}"
        ?disabled="${showDisabledSend}"
        tooltip-text="${this.buttonLabel}"
        tooltip-alignment="${
          isRTL ? BUTTON_TOOLTIP_ALIGNMENT.START : BUTTON_TOOLTIP_ALIGNMENT.END
        }"
        tooltip-position="${BUTTON_TOOLTIP_POSITION.TOP}"
        @click="${this._handleSendClick}"
        aria-label="${this.buttonLabel}"
        data-testid="${ifDefined(this.testId)}">
        ${
          this.hasValidInput
            ? iconLoader(SendFilled16, { slot: 'icon' })
            : iconLoader(Send16, { slot: 'icon' })
        }
      </cds-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cds-aichat-input-send-control': InputSendControlElement;
  }
}

export default InputSendControlElement;
