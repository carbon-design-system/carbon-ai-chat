/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es/components/dropdown/index.js";
import "@carbon/web-components/es/components/checkbox/index.js";

import { InputConfig, PublicConfig, ToolbarAction } from "@carbon/ai-chat";
import Document16 from "@carbon/icons/es/document/16.js";
import Language16 from "@carbon/icons/es/language/16.js";
import Idea16 from "@carbon/icons/es/idea/16.js";
import Edit16 from "@carbon/icons/es/edit/16.js";
import MagicWand16 from "@carbon/icons/es/magic-wand/16.js";
import Code16 from "@carbon/icons/es/code/16.js";
import Image16 from "@carbon/icons/es/image/16.js";
import Search16 from "@carbon/icons/es/search/16.js";
import Microphone16 from "@carbon/icons/es/microphone/16.js";
import Chat16 from "@carbon/icons/es/chat/16.js";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { mockOnFileUpload } from "../customSendMessage/doFileUpload";

const DEMO_MENU_OPTIONS: ToolbarAction[] = [
  {
    text: "Summarize conversation",
    icon: Document16,
    onClick: () => window.alert("Summarize conversation"),
  },
  {
    text: "Translate last message",
    icon: Language16,
    onClick: () => window.alert("Translate last message"),
  },
  {
    text: "Brainstorm ideas",
    icon: Idea16,
    onClick: () => window.alert("Brainstorm ideas"),
  },
  {
    text: "Refine my writing",
    icon: Edit16,
    onClick: () => window.alert("Refine my writing"),
  },
  {
    text: "Suggest a follow-up",
    icon: MagicWand16,
    onClick: () => window.alert("Suggest a follow-up"),
  },
  {
    text: "Explain this code",
    icon: Code16,
    onClick: () => window.alert("Explain this code"),
  },
  {
    text: "Describe an image",
    icon: Image16,
    onClick: () => window.alert("Describe an image"),
  },
  {
    text: "Search the web",
    icon: Search16,
    onClick: () => window.alert("Search the web"),
  },
  {
    text: "Dictate a message",
    icon: Microphone16,
    onClick: () => window.alert("Dictate a message"),
  },
  {
    text: "Start a new chat",
    icon: Chat16,
    onClick: () => window.alert("Start a new chat"),
  },
];

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
    key: "isVisible" | "isDisabled" | "expanded",
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

  private _menuOptionsDropdownValue(): string {
    const actions = this.config?.input?.actions;
    if (actions === undefined) {
      return DROPDOWN_DEFAULT;
    }
    return actions.length > 0 ? DROPDOWN_TRUE : DROPDOWN_FALSE;
  }

  private _handleMenuOptionsDropdown(event: Event) {
    const customEvent = event as CustomEvent;
    const value = customEvent.detail.item.value as string;

    this._updateInput((input) => {
      const next: InputConfig = { ...(input ?? {}) };

      if (value === DROPDOWN_TRUE) {
        next.actions = DEMO_MENU_OPTIONS;
      } else if (value === DROPDOWN_FALSE) {
        next.actions = [];
      } else {
        delete next.actions;
      }

      return this._normalizeInput(next);
    });
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

  private _handleErrorCheckbox(event: Event) {
    const customEvent = event as CustomEvent;
    const checked = customEvent.detail.checked as boolean;

    this._updateInput((input) => {
      const next: InputConfig = { ...(input ?? {}) };

      if (checked) {
        next.error = {
          title: "Error: title goes here",
          description: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
            tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
            quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
            consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse
            cillum dolore eu fugiat nulla pariatur.`,
          collapsible: true,
        };
      } else {
        delete next.error;
      }

      return this._normalizeInput(next);
    });
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
          <cds-dropdown-item value="${DROPDOWN_FALSE}"
            >Enable input field</cds-dropdown-item
          >
          <cds-dropdown-item value="${DROPDOWN_TRUE}"
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

      <div class="input-section">
        <cds-dropdown
          value="${this._menuOptionsDropdownValue()}"
          title-text="Additional actions menu"
          @cds-dropdown-selected=${this._handleMenuOptionsDropdown}
        >
          <cds-dropdown-item value="${DROPDOWN_DEFAULT}">
            Default
          </cds-dropdown-item>
          <cds-dropdown-item value="${DROPDOWN_TRUE}"
            >Enable dummy menu options</cds-dropdown-item
          >
          <cds-dropdown-item value="${DROPDOWN_FALSE}"
            >Disable menu options</cds-dropdown-item
          >
        </cds-dropdown>
      </div>

      <div class="input-section">
        <cds-dropdown
          value="${this._booleanDropdownValue(input?.expanded)}"
          title-text="Expanded layout"
          @cds-dropdown-selected=${(event: Event) =>
            this._handleBooleanDropdown(event, "expanded")}
        >
          <cds-dropdown-item value="${DROPDOWN_DEFAULT}">
            Default
          </cds-dropdown-item>
          <cds-dropdown-item value="${DROPDOWN_TRUE}"
            >Enable expanded layout</cds-dropdown-item
          >
          <cds-dropdown-item value="${DROPDOWN_FALSE}"
            >Disable expanded layout</cds-dropdown-item
          >
        </cds-dropdown>
      </div>

      <div class="input-section">
        <cds-checkbox
          ?checked="${this.config?.input?.error !== undefined}"
          label-text="Show prompt line error"
          @cds-checkbox-changed=${this._handleErrorCheckbox}
        ></cds-checkbox>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-input-config-switcher": DemoInputConfigSwitcher;
  }
}
