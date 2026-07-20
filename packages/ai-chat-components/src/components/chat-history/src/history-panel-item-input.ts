/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from "lit";
import { property, query } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import prefix from "../../../globals/settings.js";

import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import FocusMixin from "@carbon/web-components/es/globals/mixins/focus.js";
import HostListener from "@carbon/web-components/es/globals/decorators/host-listener.js";
import HostListenerMixin from "@carbon/web-components/es/globals/mixins/host-listener.js";
import Checkmark16 from "@carbon/icons/es/checkmark/16.js";
import Close16 from "@carbon/icons/es/close/16.js";
import WarningFilled16 from "@carbon/icons/es/warning--filled/16.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";

import styles from "./chat-history.scss?lit";

type TooltipAlignment =
  | "top"
  | "top-left"
  | "top-right"
  | "bottom"
  | "bottom-left"
  | "bottom-right"
  | "left"
  | "right";

/**
 * Chat History panel item input.
 *
 * @element cds-aichat-history-panel-item-input
 * @fires history-panel-item-input-change
 *   The custom event fired when the input value is changed.
 * @fires history-panel-item-input-cancel
 *   The custom event fired after an input is canceled.
 * @fires history-panel-item-input-save
 *   The custom event fired after an input is saved.
 *
 */
@carbonElement(`${prefix}-history-panel-item-input`)
class CDSAIChatHistoryPanelItemInput extends HostListenerMixin(
  FocusMixin(LitElement),
) {
  /**
   * Label for cancel button
   */
  @property()
  cancelLabel = "Cancel";

  /**
   * Text that will be read by a screen reader when visiting this control
   */
  @property()
  labelText?: string;

  /**
   * label for save button
   */
  @property()
  saveLabel = "Save";

  /**
   * tooltipAlignment from the standard tooltip
   */
  @property()
  tooltipAlignment?: TooltipAlignment;

  /**
   * Input value
   */
  @property()
  value!: string;

  /**
   * Placeholder text for the input
   */
  @property()
  placeholder?: string;

  /**
   * `true` if the input is in an invalid state.
   */
  @property({ type: Boolean, attribute: "invalid" })
  invalid = false;

  /**
   * Error message text to display when the input is invalid.
   */
  @property({ type: String, attribute: "invalid-message" })
  invalidMessage = "";

  /**
   * id from the parent history panel item
   */
  @property({ type: String, attribute: "item-id" })
  itemId;

  @query("input") input!: HTMLInputElement;

  /**
   * Flag to track if an action has been triggered to prevent focusout from executing an additional action
   */
  private _actionTriggered = false;

  /**
   * Whether the value has changed from its initial value.
   */
  private _valueChanged = false;

  /**
   * Initial value of the input
   */
  private _initialValue = "";

  /**
   * `true` if the input value has changed from its initial value and is not invalid.
   * Evaluated at render time so it always reflects the current `invalid` state,
   * even when `invalid` is set imperatively after the input event fires.
   */
  private get _canSave() {
    return this._valueChanged && !this.invalid;
  }

  /**
   * Handles `oninput` event on the `input`.
   *
   * @param event The event.
   * @param event.target The event target.
   */
  private _handleInput({ target }: Event) {
    this.value = (target as HTMLInputElement).value;
    this._valueChanged = this.value !== this._initialValue;

    const inputChangeEvent = new CustomEvent(
      "history-panel-item-input-change",
      {
        bubbles: true,
        composed: true,
        detail: {
          value: this.value,
          itemId: this.itemId,
        },
      },
    );
    this.dispatchEvent(inputChangeEvent);
  }

  /**
   * Handler for cancel event
   */
  private _handleCancel() {
    this._actionTriggered = true;
    const init = {
      bubbles: true,
      composed: true,
    };
    const inputCancelEvent = new CustomEvent(
      "history-panel-item-input-cancel",
      init,
    );
    this.dispatchEvent(inputCancelEvent);
  }

  /**
   * Handler for save event
   */
  private _handleSave() {
    this._actionTriggered = true;
    const init = {
      bubbles: true,
      composed: true,
      detail: {
        newName: this.value,
        itemId: this.itemId,
      },
    };
    const inputSaveEvent = new CustomEvent(
      "history-panel-item-input-save",
      init,
    );
    this.dispatchEvent(inputSaveEvent);
  }

  /**
   * Handler for rename action button clicks
   */
  private _handleActionButtonClick = (event: Event) => {
    const target = event.currentTarget as HTMLElement;
    if (target.className === "rename-action--cancel") {
      this._handleCancel();
    } else if (target.className === "rename-action--save") {
      this._handleSave();
    }
  };

  /**
   * Handler for keydown event
   *
   * * @param event The event.
   */
  private _handleKeydown = (event: KeyboardEvent) => {
    switch (event.key) {
      case "Escape":
        this._handleCancel();
        break;
      case "Enter":
        if (this._canSave) {
          this._handleSave();
        } else {
          this._handleCancel();
        }
        break;
      default:
        break;
    }
  };

  /**
   * Handler for rename action button keydown event
   *
   * * @param event The event.
   */
  private _handleActionButtonKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      this._handleActionButtonClick(event);
    }
  };

  /**
   * Handles `blur` events.
   *
   * @param event The event.
   */
  @HostListener("focusout")
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment -- https://github.com/carbon-design-system/carbon/issues/20071
  // @ts-ignore: The decorator refers to this method but TS thinks this method is not referred to
  protected _handleFocusOut(event: FocusEvent) {
    if (!this.contains(event.relatedTarget as Node)) {
      if (this._actionTriggered) {
        this._actionTriggered = false;
        return;
      }

      if (this._canSave) {
        this._handleSave();
      } else {
        this._handleCancel();
      }
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this._initialValue = this.value;
    this.tooltipAlignment = this.tooltipAlignment ?? "top";
  }

  firstUpdated() {
    if (this.input) {
      requestAnimationFrame(() => {
        this.input.focus();
        this.input.select();
      });
    }
  }

  render() {
    const {
      cancelLabel,
      saveLabel,
      placeholder,
      labelText,
      tooltipAlignment,
      value,
      invalid,
      invalidMessage,
      _canSave: canSave,
      _handleInput: handleInput,
      _handleKeydown: handleKeydown,
      _handleActionButtonClick: handleActionButtonClick,
      _handleActionButtonKeyDown: handleActionButtonKeyDown,
    } = this;

    const wrapperClasses = classMap({
      [`${prefix}--history-panel-item--rename__input`]: true,
      [`${prefix}--history-panel-item--rename__input--invalid`]: invalid,
    });

    return html`
        <div class="${wrapperClasses}">
          <div class="${prefix}--history-panel-item--rename__input-row">
            <input type="text" placeholder="${placeholder}" value="${value}" @input="${handleInput}" @keydown=${handleKeydown} aria-label="${labelText}" ?data-invalid=${invalid}></input>
            <div class="${prefix}--history-panel-item--rename__actions">
              <cds-icon-button class="rename-action--cancel" align="${tooltipAlignment}" size="sm" kind="ghost" @click=${handleActionButtonClick} @keydown=${handleActionButtonKeyDown}>
                ${iconLoader(Close16, { slot: "icon" })}
                <span slot="tooltip-content">${cancelLabel}</span>
              </cds-icon-button>
              <cds-icon-button class="rename-action--save" align="${tooltipAlignment}" size="sm" kind="ghost" @click=${handleActionButtonClick} @keydown=${handleActionButtonKeyDown} ?disabled=${!canSave}>
                ${iconLoader(Checkmark16, { slot: "icon" })}
                <span slot="tooltip-content">${saveLabel}</span>
              </cds-icon-button>
            </div>
          </div>
          ${
            invalid && invalidMessage
              ? html`<div
                  class="${prefix}--history-panel-item-input__invalid-message-container"
                >
                  <div class="${prefix}__invalid-message-text">
                    ${invalidMessage}
                  </div>
                  <div class="${prefix}__warning-icon">
                    ${iconLoader(WarningFilled16)}
                  </div>
                </div>`
              : null
          }
        </div>`;
  }
  static styles = styles;
}

export { CDSAIChatHistoryPanelItemInput };
export default CDSAIChatHistoryPanelItemInput;
