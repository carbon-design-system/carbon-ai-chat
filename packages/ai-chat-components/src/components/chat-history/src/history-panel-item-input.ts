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
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";

import styles from "./chat-history.scss?lit";
import { KeyboardEvent } from "react";

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
 * @fires cds-aichat-history-panel-item-input-cancel
 *   The custom event fired after an input is canceled.
 * @fires cds-aichat-history-panel-item-input-save
 *   The custom event fired after an input is saved.
 */
@carbonElement(`${prefix}-history-panel-item-input`)
export class CDSHistoryPanelItemInput extends HostListenerMixin(
  FocusMixin(LitElement)
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

  @query("input") input!: HTMLInputElement;

  /**
   * Flag to track if an action has been triggered to prevent focusout from executing an additional action
   */
  private _actionTriggered = false;

  /**
   * Whether save is disabled
   */
  private _canSave = false;

  /**
   * Initial value of the input
   */
  private _initialValue = "";

  /**
   * Handles `oninput` event on the `input`.
   *
   * @param event The event.
   * @param event.target The event target.
   */
  private _handleInput({ target }: Event) {
    this.value = (target as HTMLInputElement).value;
    this._canSave = this.value !== this._initialValue;
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
      `${prefix}-history-panel-item-input-cancel`,
      init
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
        newTitle: this.value,
      },
    };
    const inputSaveEvent = new CustomEvent(
      `${prefix}-history-panel-item-input-save`,
      init
    );
    this.dispatchEvent(inputSaveEvent);
  }

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
   * Handles `blur` event handler on the document this element is in.
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
      _canSave: canSave,
      _handleInput: handleInput,
      _handleSave: handleSave,
      _handleCancel: handleCancel,
      _handleKeydown: handleKeydown,
    } = this;
    const classes = classMap({
      [`${prefix}--history-panel-item--rename`]: true,
    });

    return html`
      <div class="${classes}">
        <div class="${prefix}--history-panel-item--rename__input">
          <input type="text" placeholder="${placeholder}" value="${value}" @input="${handleInput}"  @keydown=${handleKeydown} aria-label="${labelText}"></input>
          <div class="${prefix}--history-panel-item--rename__actions">
            <cds-icon-button align="${tooltipAlignment}" size="sm" kind="ghost" @click=${handleCancel}>
              ${iconLoader(Close16, {
                slot: "icon",
              })}
              <span slot="tooltip-content">${cancelLabel}</span>
            </cds-icon-button>
            <cds-icon-button align="${tooltipAlignment}" size="sm" kind="ghost" @click=${handleSave} ?disabled=${!canSave}>
              ${iconLoader(Checkmark16, {
                slot: "icon",
              })}
              <span slot="tooltip-content">${saveLabel}</span>
            </cds-icon-button>
          </div>
        </div>
      </div>`;
  }
  static styles = styles;
}

export default CDSHistoryPanelItemInput;
