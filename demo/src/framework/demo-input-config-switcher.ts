/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es/components/dropdown/index.js";

import { InputConfig, PublicConfig } from "@carbon/ai-chat";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { mockOnFileUpload } from "../customSendMessage/doFileUpload";

const DROPDOWN_DEFAULT = "default";
const DROPDOWN_TRUE = "true";
const DROPDOWN_FALSE = "false";

@customElement("demo-input-config-switcher")
export class DemoInputConfigSwitcher extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .input-section {
      margin-bottom: 1rem;
    }

    .input-section:last-child {
      margin-bottom: 0;
    }
  `;

  @property({ type: Object })
  accessor config!: PublicConfig;

  private _updateInput(
    mutate: (input: InputConfig | undefined) => InputConfig | undefined,
  ) {
    const currentInput = this.config.input
      ? { ...this.config.input }
      : undefined;
    const nextInput = mutate(currentInput);

    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: {
          ...this.config,
          input: nextInput,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _normalizeInput(
    input: InputConfig | undefined,
  ): InputConfig | undefined {
    if (!input) {
      return undefined;
    }

    const cleaned: InputConfig = { ...input };

    (Object.keys(cleaned) as (keyof InputConfig)[]).forEach((key) => {
      if (cleaned[key] === undefined) {
        delete cleaned[key];
      }
    });

    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }

  private _booleanDropdownValue(value: boolean | undefined) {
    if (value === undefined) {
      return DROPDOWN_DEFAULT;
    }

    return value ? DROPDOWN_TRUE : DROPDOWN_FALSE;
  }

  private _handleUploadDropdown(event: Event) {
    const customEvent = event as CustomEvent;
    const value = customEvent.detail.item.value as string;

    if (value === DROPDOWN_TRUE) {
      this.dispatchEvent(
        new CustomEvent("config-changed", {
          detail: {
            ...this.config,
            upload: {
              is_on: true,
              onFileUpload: mockOnFileUpload,
            },
          },
          bubbles: true,
          composed: true,
        }),
      );
    } else {
      // Default or false — remove the upload config entirely.
      const next = { ...this.config };
      delete next.upload;
      this.dispatchEvent(
        new CustomEvent("config-changed", {
          detail: next,
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  private _handleBooleanDropdown(
    event: Event,
    key: "isVisible" | "isDisabled",
  ) {
    const customEvent = event as CustomEvent;
    const value = customEvent.detail.item.value as string;

    this._updateInput((input) => {
      const next = { ...(input ?? {}) };

      if (value === DROPDOWN_DEFAULT) {
        delete next[key];
      } else if (value === DROPDOWN_TRUE) {
        next[key] = true;
      } else if (value === DROPDOWN_FALSE) {
        next[key] = false;
      }

      return this._normalizeInput(next);
    });
  }

  private _handleFocusDropdown(event: Event) {
    const customEvent = event as CustomEvent;
    const value = customEvent.detail.item.value as string;

    let shouldTakeFocusIfOpensAutomatically: boolean | undefined;

    if (value === DROPDOWN_DEFAULT) {
      shouldTakeFocusIfOpensAutomatically = undefined;
    } else if (value === DROPDOWN_TRUE) {
      shouldTakeFocusIfOpensAutomatically = true;
    } else if (value === DROPDOWN_FALSE) {
      shouldTakeFocusIfOpensAutomatically = false;
    }

    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: {
          ...this.config,
          shouldTakeFocusIfOpensAutomatically,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _uploadDropdownValue(): string {
    const upload = this.config?.upload;
    if (!upload) {
      return DROPDOWN_DEFAULT;
    }
    return upload.is_on ? DROPDOWN_TRUE : DROPDOWN_FALSE;
  }

  render() {
    const input = this.config?.input;

    return html`
      <div class="input-section">
        <cds-dropdown
          value="${this._uploadDropdownValue()}"
          title-text="Enable file uploads"
          @cds-dropdown-selected=${this._handleUploadDropdown}
        >
          <cds-dropdown-item value="${DROPDOWN_DEFAULT}">
            Default
          </cds-dropdown-item>
          <cds-dropdown-item value="${DROPDOWN_TRUE}">True</cds-dropdown-item>
          <cds-dropdown-item value="${DROPDOWN_FALSE}">False</cds-dropdown-item>
        </cds-dropdown>
      </div>

      <div class="input-section">
        <cds-dropdown
          value="${this._booleanDropdownValue(input?.isVisible)}"
          title-text="Show input field"
          @cds-dropdown-selected=${(event: Event) =>
            this._handleBooleanDropdown(event, "isVisible")}
        >
          <cds-dropdown-item value="${DROPDOWN_DEFAULT}">
            Default
          </cds-dropdown-item>
          <cds-dropdown-item value="${DROPDOWN_TRUE}">True</cds-dropdown-item>
          <cds-dropdown-item value="${DROPDOWN_FALSE}">False</cds-dropdown-item>
        </cds-dropdown>
      </div>

      <div class="input-section">
        <cds-dropdown
          value="${this._booleanDropdownValue(input?.isDisabled)}"
          title-text="Disable input field"
          @cds-dropdown-selected=${(event: Event) =>
            this._handleBooleanDropdown(event, "isDisabled")}
        >
          <cds-dropdown-item value="${DROPDOWN_DEFAULT}">
            Default
          </cds-dropdown-item>
          <cds-dropdown-item value="${DROPDOWN_TRUE}">True</cds-dropdown-item>
          <cds-dropdown-item value="${DROPDOWN_FALSE}">False</cds-dropdown-item>
        </cds-dropdown>
      </div>

      <div class="input-section">
        <cds-dropdown
          value="${this._booleanDropdownValue(
            this.config?.shouldTakeFocusIfOpensAutomatically,
          )}"
          title-text="Take focus if opens automatically"
          @cds-dropdown-selected=${this._handleFocusDropdown}
        >
          <cds-dropdown-item value="${DROPDOWN_DEFAULT}">
            Default
          </cds-dropdown-item>
          <cds-dropdown-item value="${DROPDOWN_TRUE}">True</cds-dropdown-item>
          <cds-dropdown-item value="${DROPDOWN_FALSE}">False</cds-dropdown-item>
        </cds-dropdown>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-input-config-switcher": DemoInputConfigSwitcher;
  }
}
