/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { css, html, LitElement, nothing, unsafeCSS } from "lit";
import { property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import prefix from "../../../globals/settings.js";
import { IS_PHONE } from "../../../globals/utils/browser-utils.js";

import "../../autocomplete/src/autocomplete.js";
import "./stop-streaming-button.js";

import styles from "./input-shell.scss?lit";

import {
  createAllPlugins,
  type PluginRefs,
  type PluginControllers,
} from "./prosemirror/plugin-factory.js";
import {
  triggerPluginKey,
  type TriggerPluginState,
} from "./prosemirror/trigger-plugin.js";

import type {
  SuggestionItem,
  SuggestionConfig,
  CustomListProps,
  SendEventDetail,
  TriggerChangeEventDetail,
} from "./types.js";

import { AutocompleteListManager } from "./autocomplete-list-manager.js";
import { EditorViewManager } from "./editor-view-manager.js";
import {
  insertAutocompleteItem,
  insertTokenWithRawValue,
} from "./autocomplete-insert.js";

/**
 * Input shell component for AI Chat — a composable orchestrator.
 *
 * Uses ProseMirror for the editor, with the editor element living in light DOM
 * (slotted into shadow DOM layout) so that custom token renderers and all
 * editor content remain styleable via page CSS.
 *
 * Consumers compose child components into named slots:
 * - `message-actions` — action icons to the left of the text area
 * - `file-uploads` — visual list of files being uploaded
 * - `send-control` — send button / stop streaming button
 * - `autocomplete-content` — suggestion overlay above input
 *
 * The editor element is created internally — consumers do NOT provide it.
 *
 * @element cds-aichat-input-shell
 */
@carbonElement(`${prefix}-input-shell`)
class InputShellElement extends LitElement {
  static styles = css`
    ${unsafeCSS(styles)}
  `;

  // -----------------------------------------------------------------------
  // Properties
  // -----------------------------------------------------------------------

  /** Disables editing and send. The editor remains mounted but non-editable. */
  @property({ type: Boolean, attribute: "disabled" })
  disabled = false;

  /** Placeholder text shown while the editor is empty. */
  @property({ type: String, attribute: "placeholder" })
  placeholder = "";

  /**
   * Canonical raw text value of the editor. Setting this externally (e.g. to
   * clear the editor after send) is mirrored into the PM document via the
   * ValueSync controller.
   */
  @property({ type: String, attribute: "raw-value" })
  rawValue = "";

  /**
   * Optional character cap. Typing and pasting past the limit is allowed, but
   * submission is blocked while the serialized length exceeds this value — see
   * `overMaxLength`. The character counter reveals itself within 10 characters
   * of the limit and stays visible while over.
   */
  @property({ type: Number, attribute: "max-length" })
  maxLength?: number;

  /**
   * Reflects as `over-max-length` on the host when `rawValue.length` exceeds
   * `maxLength`. Read-only contract: treat as output. Slotted components and
   * consumer CSS can key off this attribute; the built-in send-control
   * auto-disables itself by subscribing to the companion event below.
   *
   * @fires cds-aichat-input-over-max-change — detail `{ overMax: boolean }`,
   *   bubbles and composed, dispatched on every transition.
   */
  @property({ type: Boolean, reflect: true, attribute: "over-max-length" })
  overMaxLength = false;

  /** Items to render in the built-in autocomplete list. */
  @property({ type: Array, attribute: false })
  autocompleteItems: SuggestionItem[] = [];

  /** Optional custom renderer for the autocomplete list. */
  @property({ attribute: false })
  renderCustomList?: (props: CustomListProps) => HTMLElement | unknown;

  /** Suggestion configs that define trigger characters (e.g. `@`, `/`). */
  @property({ type: Array, attribute: false })
  suggestionConfigs: SuggestionConfig[] = [];

  /** Reflects to attribute so consumer CSS can target rounded variant. */
  @property({ type: Boolean, reflect: true })
  rounded = false;

  /** Accessible label applied to the editor's textbox role. */
  @property({ type: String, attribute: "aria-label" })
  ariaLabel = "Message";

  // -----------------------------------------------------------------------
  // Internal state
  // -----------------------------------------------------------------------

  /** Current active trigger (e.g. user just typed `@`). `null` when no trigger. */
  @state()
  private _triggerState: TriggerChangeEventDetail | null = null;

  /** Tracks whether the message-actions slot has content (for layout padding). */
  @state()
  private _hasMessageActions = false;

  /** Manages the EditorView lifecycle and its light-DOM container. */
  private _editorViewManager: EditorViewManager | null = null;

  /** Mutable refs consumed by PM plugins so we can push property updates. */
  private _pluginRefs: PluginRefs | null = null;

  /** Imperative controllers returned by plugins (value sync, typing reset, …). */
  private _pluginControllers: PluginControllers | null = null;

  /** Manages the autocomplete/custom list DOM outside the shadow root. */
  private _autocompleteListManager: AutocompleteListManager | null = null;

  // -----------------------------------------------------------------------
  // Computed
  // -----------------------------------------------------------------------

  /** True when there is at least one non-whitespace character to send. */
  get hasValidInput(): boolean {
    return Boolean(this.rawValue?.trim());
  }

  /**
   * True when the character counter should be visible — within 10 characters
   * of the cap, or already over it. Hidden otherwise to avoid drawing
   * attention at low counts.
   */
  private _shouldShowCharCount(): boolean {
    if (this.maxLength == null) {
      return false;
    }
    return this.rawValue.length >= this.maxLength;
  }

  // -----------------------------------------------------------------------
  // Lit lifecycle
  // -----------------------------------------------------------------------

  render() {
    const containerClasses = {
      [`${prefix}--input-container`]: true,
      [`${prefix}--input-container--has-message-actions`]:
        this._hasMessageActions,
    };

    const usePlaceholder = this.placeholder && !this.rawValue;

    return html`
      <div class="${prefix}--input-shell">
        <div class=${classMap(containerClasses)}>
          <div class="${prefix}--input-uploads-and-autocomplete">
            <!-- File uploads slot -->
            <slot name="file-uploads"></slot>
            <!-- Autocomplete slot (light DOM, positioned above input) -->
            <slot name="autocomplete-content"></slot>
          </div>
          <!-- Left container: message-actions + editor + file-uploads -->
          <div class="${prefix}--input-field-container">
            <div class="${prefix}--input-text-and-actions">
              <!-- Message actions slot (upload button, future overflow menu) -->
              <slot
                name="message-actions"
                @slotchange=${this._handleMessageActionsSlotChange}
              ></slot>

              <!-- Text area wrapper — editor is slotted from light DOM -->
              <div class="${prefix}--input-text-area">
                ${usePlaceholder
                  ? html`<div
                      class="${prefix}--input-placeholder"
                      aria-hidden="true"
                    >
                      ${this.placeholder}
                    </div>`
                  : nothing}
                <slot name="editor"></slot>
              </div>
            </div>
            <!-- Character counter: shown only when the user is at or greater than the limit.  -->
            ${this._shouldShowCharCount()
              ? html`
                  <div class="${prefix}--input-char-count">
                    ${this.rawValue.length} / ${this.maxLength}
                  </div>
                `
              : nothing}
          </div>

          <!-- Send control slot -->
          <div class="${prefix}--input-send-control-container">
            <slot
              name="send-control"
              @cds-aichat-input-send=${this._handleSendControlSend}
            ></slot>
          </div>
        </div>
      </div>
    `;
  }

  firstUpdated() {
    this._initProseMirror();
    this._initAutocompleteListManager();
  }

  updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);

    // Property sync: keep plugin refs, editor editable state, and doc contents
    // aligned with the latest reactive inputs. Each `if` is independent —
    // grouping them would only obscure which inputs drive which effect.
    const view = this._editorViewManager?.view;
    const refs = this._pluginRefs;

    if (refs && changedProperties.has("suggestionConfigs")) {
      refs.suggestionConfigs.current = this.suggestionConfigs;
    }

    if (changedProperties.has("disabled")) {
      this._editorViewManager?.setDisabled(this.disabled);
    }

    if (changedProperties.has("rawValue") && view) {
      this._pluginControllers?.valueSync.setExternalRawValue(
        view,
        this.rawValue,
      );
    }

    // Recompute over-max on any length-relevant input change and notify
    // listeners (e.g. the built-in send-control) on transitions.
    if (
      changedProperties.has("rawValue") ||
      changedProperties.has("maxLength")
    ) {
      const next =
        this.maxLength != null && this.rawValue.length > this.maxLength;
      if (next !== this.overMaxLength) {
        this.overMaxLength = next;
        this.dispatchEvent(
          new CustomEvent("cds-aichat-input-over-max-change", {
            detail: { overMax: next },
            bubbles: true,
            composed: true,
          }),
        );
      }
    }

    if (
      changedProperties.has("autocompleteItems") ||
      changedProperties.has("renderCustomList") ||
      changedProperties.has("_triggerState")
    ) {
      this._autocompleteListManager?.update(
        this,
        this._triggerState,
        this.autocompleteItems,
        this.renderCustomList,
      );
    }
  }

  connectedCallback() {
    super.connectedCallback();

    if (IS_PHONE) {
      this.setAttribute("phone", "");
    }

    // Re-initialize on re-adoption: a consumer may detach and reattach the
    // element (common in some React/portal setups). `disconnectedCallback`
    // tore down PM, so rebuild it — but only after the first `firstUpdated`
    // has already run, otherwise let the normal bootstrap path handle it.
    if (!this._editorViewManager && this.hasUpdated) {
      this._initProseMirror();
      this._initAutocompleteListManager();
    }

    this.addEventListener(
      "cds-aichat-autocomplete-select",
      this._handleAutocompleteSelect as EventListener,
    );
    this.addEventListener(
      "cds-aichat-autocomplete-dismiss",
      this._handleAutocompleteDismiss,
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this.removeEventListener(
      "cds-aichat-autocomplete-select",
      this._handleAutocompleteSelect as EventListener,
    );
    this.removeEventListener(
      "cds-aichat-autocomplete-dismiss",
      this._handleAutocompleteDismiss,
    );

    // Tear down PM before removing autocomplete DOM; the PM view's destructor
    // may still dispatch events that the autocomplete manager listens for.
    this._editorViewManager?.destroy();
    this._editorViewManager = null;

    this._autocompleteListManager?.disconnect();
  }

  // -----------------------------------------------------------------------
  // ProseMirror initialization
  // -----------------------------------------------------------------------

  private _initProseMirror() {
    const { plugins, refs, controllers } = createAllPlugins();

    // Seed mutable refs from current reactive properties so plugins observe
    // the right values on their very first tick.
    refs.suggestionConfigs.current = this.suggestionConfigs;
    refs.autocompleteKeyForwarder.current = (event: KeyboardEvent) => {
      this._forwardKeyToAutocomplete(event);
    };

    this._pluginRefs = refs;
    this._pluginControllers = controllers;

    const manager = new EditorViewManager({
      host: this,
      ariaLabel: this.ariaLabel,
      disabled: this.disabled,
      plugins,
      callbacks: {
        onFocus: () => {
          this.dispatchEvent(
            new CustomEvent("cds-aichat-input-focus", {
              bubbles: true,
              composed: true,
            }),
          );
        },
        onBlur: () => {
          this.dispatchEvent(
            new CustomEvent("cds-aichat-input-blur", {
              bubbles: true,
              composed: true,
            }),
          );
        },
        onKeydown: (event) => {
          // Re-emit keydown at the shell so consumers can wire global
          // shortcuts (F6, Escape, etc.) without reaching into the editor.
          this.dispatchEvent(
            new CustomEvent("cds-aichat-input-keydown", {
              detail: { originalEvent: event },
              bubbles: true,
              composed: true,
            }),
          );
        },
      },
    });
    manager.mount();
    this._editorViewManager = manager;

    // Forward PM-emitted events from the editor container up through the
    // shell's reactive state. These listeners are disposed with the manager.
    manager.addContainerEventListener("cds-aichat-input-change", (event) => {
      this.rawValue = (
        event as CustomEvent<{ rawValue: string }>
      ).detail.rawValue;
    });
    manager.addContainerEventListener("cds-aichat-trigger-change", (event) => {
      this._triggerState = (
        event as CustomEvent<TriggerPluginState | null>
      ).detail;
    });
    manager.addContainerEventListener("cds-aichat-input-send", (event) => {
      // PM emits a generic send; the shell decides whether the payload is
      // valid and re-emits with the shell's own event. Stop propagation so
      // the raw PM event never escapes the light-DOM container.
      event.stopPropagation();
      this._handleSend();
    });

    // If the consumer set `rawValue` before the editor mounted, push it in.
    if (this.rawValue && manager.view) {
      controllers.valueSync.setExternalRawValue(manager.view, this.rawValue);
    }
  }

  private _initAutocompleteListManager() {
    this._autocompleteListManager = new AutocompleteListManager({
      onAutocompleteSelect: (item) => {
        this._handleAutocompleteSelect({
          detail: { item },
        } as CustomEvent<{ item: SuggestionItem }>);
      },
      onAutocompleteDismiss: () => {
        this._handleAutocompleteDismiss();
      },
      onCustomListRender: (detail) => {
        this.dispatchEvent(
          new CustomEvent("cds-aichat-custom-list-render", {
            detail,
            bubbles: true,
            composed: true,
          }),
        );
      },
    });
  }

  // -----------------------------------------------------------------------
  // Keyboard forwarding for autocomplete
  // -----------------------------------------------------------------------

  private _forwardKeyToAutocomplete(event: KeyboardEvent) {
    // The autocomplete element lives in our light-DOM children; dispatch a
    // synthetic keydown so it can handle arrow navigation without stealing
    // focus from the editor.
    const autocompleteEl = this.querySelector("cds-aichat-autocomplete");
    if (autocompleteEl) {
      autocompleteEl.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: event.key,
          bubbles: true,
          cancelable: true,
        }),
      );
    }
  }

  // -----------------------------------------------------------------------
  // Slot observation
  // -----------------------------------------------------------------------

  private _handleMessageActionsSlotChange = (event: Event) => {
    const slot = event.target as HTMLSlotElement;
    this._hasMessageActions = slot.assignedElements().length > 0;
  };

  // -----------------------------------------------------------------------
  // Send
  // -----------------------------------------------------------------------

  private _handleSendControlSend = (event: Event) => {
    event.stopPropagation();
    this._handleSend();
  };

  private _handleSend = () => {
    if (this.disabled || !this._editorViewManager?.view) {
      return;
    }
    if (this.overMaxLength) {
      return;
    }
    const text = this.rawValue?.trim() ?? "";
    if (!text) {
      return;
    }

    this._pluginControllers?.typingIndicator.reset();

    this.dispatchEvent(
      new CustomEvent<SendEventDetail>("cds-aichat-input-send", {
        detail: { text },
        bubbles: true,
        composed: true,
      }),
    );
  };

  // -----------------------------------------------------------------------
  // Autocomplete
  // -----------------------------------------------------------------------

  private _handleAutocompleteSelect = (
    event: CustomEvent<{ item: SuggestionItem }>,
  ) => {
    const view = this._editorViewManager?.view;
    if (!view) {
      return;
    }
    insertAutocompleteItem(
      view,
      event.detail.item,
      this._triggerState,
      this.suggestionConfigs,
    );
  };

  private _handleAutocompleteDismiss = () => {
    this.dismissTrigger();
  };

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Dismiss the active trigger/autocomplete. */
  dismissTrigger() {
    const view = this._editorViewManager?.view;
    if (view) {
      view.dispatch(view.state.tr.setMeta(triggerPluginKey, { dismiss: true }));
    }
    this._triggerState = null;
  }

  /** Insert a token at the current cursor position. */
  insertToken(item: SuggestionItem, rawValue: string) {
    const view = this._editorViewManager?.view;
    if (!view) {
      return;
    }
    insertTokenWithRawValue(
      view,
      item,
      rawValue,
      this._triggerState,
      this.suggestionConfigs,
    );
  }

  /** Focus the editor input. Returns true if focus succeeded. */
  requestFocus(): boolean {
    return this._editorViewManager?.focus() ?? false;
  }

  /** Returns true if the editor currently has focus. */
  hasFocus(): boolean {
    return this.matches(":focus-within");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-input-shell": InputShellElement;
  }
}

export { InputShellElement };
export default InputShellElement;
