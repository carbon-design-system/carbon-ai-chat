/*
 *  Copyright IBM Corp. 2025, 2026
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

  private _autocompleteDropdownValue(): string {
    const suggestions = this.config?.input?.suggestions;

    // Check if autocomplete is explicitly enabled
    if (suggestions && Array.isArray(suggestions)) {
      const hasAutocomplete = suggestions.some(
        (suggestion) =>
          suggestion.type === "autocomplete" &&
          suggestion.trigger === "" &&
          suggestion.triggerPosition === "start",
      );
      return hasAutocomplete ? DROPDOWN_TRUE : DROPDOWN_FALSE;
    }

    // Default is off (false)
    return DROPDOWN_FALSE;
  }

  private _handleAutocompleteDropdown(event: Event) {
    const customEvent = event as CustomEvent;
    const value = customEvent.detail.item.value as string;

    if (value === DROPDOWN_TRUE) {
      // Enable autocomplete - dispatch event to let parent handle it
      this.dispatchEvent(
        new CustomEvent("autocomplete-toggle", {
          detail: { enabled: true },
          bubbles: true,
          composed: true,
        }),
      );
    } else {
      // Disable autocomplete
      const newConfig = { ...this.config };

      if (newConfig.input?.suggestions) {
        // Remove autocomplete suggestions but keep other suggestions
        newConfig.input.suggestions = newConfig.input.suggestions.filter(
          (suggestion) =>
            !(
              suggestion.type === "autocomplete" &&
              suggestion.trigger === "" &&
              suggestion.triggerPosition === "start"
            ),
        );

        // If no suggestions left, remove the suggestions array
        if (newConfig.input.suggestions.length === 0) {
          delete newConfig.input.suggestions;
        }

        // If input config is empty, remove it
        if (Object.keys(newConfig.input).length === 0) {
          delete newConfig.input;
        }
      }

      this.dispatchEvent(
        new CustomEvent("config-changed", {
          detail: newConfig,
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  render() {
    const input = this.config?.input;

    return html`
      <div class="input-section">
        <cds-dropdown
          value="${this._uploadDropdownValue()}"
          title-text="File uploads"
          @cds-dropdown-selected=${this._handleUploadDropdown}
        >
          <cds-dropdown-item value="${DROPDOWN_DEFAULT}">
            Default
          </cds-dropdown-item>
          <cds-dropdown-item value="${DROPDOWN_TRUE}"
            >Enable file uploads</cds-dropdown-item
          >
          <cds-dropdown-item value="${DROPDOWN_FALSE}"
            >Disable file uploads</cds-dropdown-item
          >
        </cds-dropdown>
      </div>

      <div class="input-section">
        <cds-dropdown
          value="${this._booleanDropdownValue(input?.isVisible)}"
          title-text="Input field visibility"
          @cds-dropdown-selected=${(event: Event) =>
            this._handleBooleanDropdown(event, "isVisible")}
        >
          <cds-dropdown-item value="${DROPDOWN_DEFAULT}">
            Default
          </cds-dropdown-item>
          <cds-dropdown-item value="${DROPDOWN_TRUE}"
            >Show input field</cds-dropdown-item
          >
          <cds-dropdown-item value="${DROPDOWN_FALSE}"
            >Hide input field</cds-dropdown-item
          >
        </cds-dropdown>
      </div>

      <div class="input-section">
        <cds-dropdown
          value="${this._booleanDropdownValue(input?.isDisabled)}"
          title-text="Input field state"
          @cds-dropdown-selected=${(event: Event) =>
            this._handleBooleanDropdown(event, "isDisabled")}
        >
          <cds-dropdown-item value="${DROPDOWN_DEFAULT}">
            Default
          </cds-dropdown-item>
          <cds-dropdown-item value="${DROPDOWN_TRUE}"
            >Enable input field</cds-dropdown-item
          >
          <cds-dropdown-item value="${DROPDOWN_FALSE}"
            >Disable input field</cds-dropdown-item
          >
        </cds-dropdown>
      </div>

      <div class="input-section">
        <cds-dropdown
          value="${this._booleanDropdownValue(
            this.config?.shouldTakeFocusIfOpensAutomatically,
          )}"
          title-text="Auto focus"
          @cds-dropdown-selected=${this._handleFocusDropdown}
        >
          <cds-dropdown-item value="${DROPDOWN_DEFAULT}">
            Default
          </cds-dropdown-item>
          <cds-dropdown-item value="${DROPDOWN_TRUE}"
            >Enable auto focus</cds-dropdown-item
          >
          <cds-dropdown-item value="${DROPDOWN_FALSE}"
            >Disable auto focus</cds-dropdown-item
          >
        </cds-dropdown>
      </div>

      <div class="input-section">
        <cds-dropdown
          value="${this._autocompleteDropdownValue()}"
          title-text="Enable autocomplete suggestions"
          @cds-dropdown-selected=${this._handleAutocompleteDropdown}
        >
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
