/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { css, html, LitElement, type PropertyValues, unsafeCSS } from "lit";
import { property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import prefix from "../../../globals/settings.js";

import styles from "./prompt-line-shell.scss?lit";

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
 * @element cds-aichat-prompt-line-shell
 */
@carbonElement(`${prefix}-prompt-line-shell`)
class PromptLineShellElement extends LitElement {
  static styles = css`
    ${unsafeCSS(styles)}
  `;

  /** Reflects to attribute so consumer CSS can target the rounded variant. */
  @property({ type: Boolean, reflect: true })
  rounded = false;

  /**
   * Expanded layout: the editor fills its own full-width row, with the
   * message actions and send control on a second row beneath it (actions to
   * the start, send to the end). Reflects so consumer CSS can target the
   * variant. The reflow is driven purely by a container class — the rendered
   * DOM is identical in both modes.
   */
  @property({ type: Boolean, reflect: true })
  expanded = false;

  /** Whether the prompt line is in an error state */
  @property({ type: Boolean, reflect: true, attribute: "has-error" })
  hasError = false;

  /** Whether the prompt-line shell is disabled. */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  @state()
  private _hasMessageActions = false;

  @state()
  private _hasFileUploads = false;

  @state()
  private _editorKeyboardFocus = false;

  /** Watches the slotted file-uploads element for `has-uploads` attribute changes. */
  private _fileUploadsObserver: MutationObserver | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener(
      "cds-aichat-prompt-focus",
      this._handlePromptFocus as EventListener,
    );
    this.addEventListener(
      "cds-aichat-prompt-blur",
      this._handlePromptBlur as EventListener,
    );
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener(
      "cds-aichat-prompt-focus",
      this._handlePromptFocus as EventListener,
    );
    this.removeEventListener(
      "cds-aichat-prompt-blur",
      this._handlePromptBlur as EventListener,
    );
    this._fileUploadsObserver?.disconnect();
  }

  override willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);
    // Derive `--has-message-actions` from the settled slot assignment on every
    // update. A bare `slotchange` snapshot can latch on a transient state: a
    // consumer projecting content asynchronously (web-component slotting) or
    // toggling writeable content at runtime can momentarily present the
    // prompt-line passthrough as real action content, and the settled assignment
    // may not emit a follow-up `slotchange`. Left stale, that keeps the reduced
    // start inset and strands the prompt line once the content is removed.
    // Deriving here (rather than snapshotting in the handler) re-reads the
    // settled assignment each render, so the occupancy can't latch.
    this._updateHasMessageActions();
    this._updateHasFileUploads();
  }

  override render() {
    const containerClasses = {
      [`${prefix}--input-container`]: true,
      [`${prefix}--input-container--has-message-actions`]:
        this._hasMessageActions,
      [`${prefix}--input-container--expanded`]: this.expanded,
    };

    const uploadsRowClasses = {
      [`${prefix}--input-uploads-and-autocomplete`]: true,
      [`${prefix}--input-uploads-and-autocomplete--has-uploads`]:
        this._hasFileUploads,
    };

    const textAreaClasses = {
      [`${prefix}--input-text-area`]: true,
      [`${prefix}--input-text-area--keyboard-focus`]: this._editorKeyboardFocus,
    };

    // In expanded mode, render text-area before message-actions to match visual order

    const textAreaContent = html`
      <div class=${classMap(textAreaClasses)}>
        <slot name="editor"></slot>
      </div>
    `;

    const messageActionsContent = html`
      <slot
        name="message-actions"
        @slotchange=${this._handleMessageActionsSlotChange}
      ></slot>
    `;

    return html`
      <div class="${prefix}--prompt-line-shell">
        <div class=${classMap(containerClasses)}>
          <div class=${classMap(uploadsRowClasses)}>
            <slot
              name="file-uploads"
              @slotchange=${this._handleFileUploadsSlotChange}
            ></slot>
            <slot name="autocomplete-content"></slot>
          </div>
          <div class="${prefix}--field-messaging-container">
            <slot name="field-messaging"></slot>
          </div>
          <div class="${prefix}--input-text-and-actions">
            ${this.expanded ? textAreaContent : messageActionsContent}
            ${this.expanded ? messageActionsContent : textAreaContent}
          </div>
          <div class="${prefix}--input-send-control-container">
            <slot name="send-control"></slot>
          </div>
        </div>
      </div>
    `;
  }

  private _handlePromptFocus = (event: CustomEvent): void => {
    // Both the textarea controller and the rich runtime pass `{ keyboard: true }`
    // in the event detail when focus arrived via keyboard navigation (no preceding
    // pointer/touch event).
    this._editorKeyboardFocus =
      (event.detail as { keyboard?: boolean })?.keyboard === true;
  };

  private _handlePromptBlur = (): void => {
    this._editorKeyboardFocus = false;
  };

  private _handleMessageActionsSlotChange = (): void => {
    // Request an update so `willUpdate()` re-derives occupancy from the settled
    // assignment. Deriving there (not here) avoids latching on a transient
    // assignment this event can fire on (see `willUpdate`).
    this.requestUpdate();
  };

  private _handleFileUploadsSlotChange = (): void => {
    // Reconnect the MutationObserver to whatever element is now slotted so we
    // re-render when its `has-uploads` attribute changes (which doesn't fire a
    // slotchange event).
    this._fileUploadsObserver?.disconnect();
    const slot = this.renderRoot?.querySelector(
      `slot[name="file-uploads"]`,
    ) as HTMLSlotElement | null;
    const el = slot?.assignedElements()[0];
    if (el) {
      if (!this._fileUploadsObserver) {
        this._fileUploadsObserver = new MutationObserver(() =>
          this.requestUpdate(),
        );
      }
      this._fileUploadsObserver.observe(el, {
        attributes: true,
        attributeFilter: ["has-uploads"],
      });
    }
    this.requestUpdate();
  };

  /**
   * Derives `_hasMessageActions` from the `message-actions` slot's current
   * occupancy. Consumers may project a writeable passthrough
   * (`data-prompt-line-slot`) into `message-actions`; it is always present even
   * when empty, so only real action content drives the `--has-message-actions`
   * padding treatment.
   */
  private _updateHasMessageActions(): void {
    const slot = this.renderRoot?.querySelector(
      `slot[name="message-actions"]`,
    ) as HTMLSlotElement | null;
    this._hasMessageActions = slot
      ? slot
          .assignedElements()
          .some((element) => !element.hasAttribute("data-prompt-line-slot"))
      : false;
  }

  private _updateHasFileUploads(): void {
    const slot = this.renderRoot?.querySelector(
      `slot[name="file-uploads"]`,
    ) as HTMLSlotElement | null;

    this._hasFileUploads = slot
      ? slot.assignedElements().some((el) => el.hasAttribute("has-uploads"))
      : false;

    this.toggleAttribute("has-file-uploads", this._hasFileUploads);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-prompt-line-shell": PromptLineShellElement;
  }
}

export default PromptLineShellElement;
