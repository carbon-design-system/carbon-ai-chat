/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { css, html, LitElement, unsafeCSS } from "lit";
import { property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import prefix from "../../../globals/settings.js";

import styles from "./input-shell.scss?lit";

/**
 * Layout-only composer chrome for the chat input. The shell defines five
 * named slots and the spacing/border treatment around them — it carries no
 * chat-domain logic, builds no Tiptap extensions, and forwards no editor
 * methods.
 *
 * Consumers compose:
 * - `editor` — a `<cds-aichat-prompt-line>` (or equivalent) the consumer
 *   owns directly; the shell does not render a fallback.
 * - `message-actions` — action icons to the left of the text area.
 * - `file-uploads` — visual list of files being uploaded.
 * - `autocomplete-content` — suggestion overlay above the input.
 * - `field-messaging` — inline error / status content beneath the
 *   autocomplete row (e.g. char-count exceeded message).
 * - `send-control` — send / stop-streaming button.
 *
 * @element cds-aichat-input-shell
 */
@carbonElement(`${prefix}-input-shell`)
class InputShellElement extends LitElement {
  static styles = css`
    ${unsafeCSS(styles)}
  `;

  /** Reflects to attribute so consumer CSS can target the rounded variant. */
  @property({ type: Boolean, reflect: true })
  rounded = false;

  @state()
  private _hasMessageActions = false;

  override render() {
    const containerClasses = {
      [`${prefix}--input-container`]: true,
      [`${prefix}--input-container--has-message-actions`]:
        this._hasMessageActions,
    };

    return html`
      <div class="${prefix}--input-shell">
        <div class=${classMap(containerClasses)}>
          <div class="${prefix}--input-uploads-and-autocomplete">
            <slot name="file-uploads"></slot>
            <slot name="autocomplete-content"></slot>
            <slot name="field-messaging"></slot>
          </div>
          <div class="${prefix}--input-field-container">
            <div class="${prefix}--input-text-and-actions">
              <slot
                name="message-actions"
                @slotchange=${this._handleMessageActionsSlotChange}
              ></slot>
              <div class="${prefix}--input-text-area">
                <slot name="editor"></slot>
              </div>
            </div>
          </div>
          <div class="${prefix}--input-send-control-container">
            <slot name="send-control"></slot>
          </div>
        </div>
      </div>
    `;
  }

  private _handleMessageActionsSlotChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement;
    this._hasMessageActions = slot.assignedElements().length > 0;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-input-shell": InputShellElement;
  }
}

export default InputShellElement;
