/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html, LitElement, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';

import { carbonElement } from '../../../globals/decorators/carbon-element.js';
import prefix from '../../../globals/settings.js';

import '../autocomplete/src/autocomplete.js';
import {
  AutocompleteController,
  itemsToGroups,
  type AutocompleteControllerState,
} from './autocomplete-controller.js';
import type {
  AutocompleteConfig,
  StartersConfig,
  SuggestionItem,
  TriggerSuggestionConfig,
} from './tiptap/types.js';

/**
 * `<cds-aichat-autocomplete-controller>` — drops the autocomplete overlay
 * lifecycle into a `<cds-aichat-prompt-line-shell>`'s `autocomplete-content` slot.
 *
 * Listens for `cds-aichat-trigger-change` events bubbling up from the
 * enclosing prompt-line-shell (the events are `composed: true, bubbles: true`, so
 * they reach here from inside the prompt-line's shadow root). Scoping the
 * listener to the shell — rather than `window` — keeps multiple
 * shell/controller pairs on the same page from cross-talking. Renders the
 * built-in `<cds-aichat-autocomplete>` or the active config's
 * `renderCustomList` output. Selection routes back into the originating
 * prompt-line.
 *
 * @element cds-aichat-autocomplete-controller
 * @fires cds-aichat-starter-selected — `{ text: string }` after a starter is
 *   inserted into the editor; consumer triggers send.
 * @fires cds-aichat-autocomplete-item-selected — `{ item: SuggestionItem }`
 *   after a suggestion item is selected. Fired in addition to type-specific callbacks.
 * @fires cds-aichat-autocomplete-item-send — `{ text: string }` when the
 *   per-item send button is clicked inside the suggestion list.
 */
@carbonElement(`${prefix}-autocomplete-controller`)
class AutocompleteControllerElement extends LitElement {
  /** `@`-style mention trigger config. */
  @property({ attribute: false })
  mention?: TriggerSuggestionConfig;

  /** `/`-style command trigger config. */
  @property({ attribute: false })
  command?: TriggerSuggestionConfig;

  /** Live-typeahead autocomplete config (no trigger character). */
  @property({ attribute: false })
  autocomplete?: AutocompleteConfig;

  /** Starter prompts shown when the editor is empty + focused + editable. */
  @property({ attribute: false })
  starters?: StartersConfig;

  /** When true, starter selection inserts text without firing the send event. */
  @property({ type: Boolean, attribute: 'is-send-disabled' })
  isSendDisabled = false;

  @state()
  private _state: AutocompleteControllerState = { trigger: null, items: [] };

  private _controller: AutocompleteController | null = null;
  /**
   * Ancestor we subscribed `cds-aichat-trigger-change` on. Scoping the
   * listener to the enclosing `<cds-aichat-prompt-line-shell>` (rather than
   * `window`) keeps a second shell/controller pair on the same page from
   * receiving each other's events.
   */
  private _eventSource: EventTarget | null = null;

  // Render in light DOM so consumers' page-level CSS / portals can reach
  // any custom list element they've slotted in via renderCustomList.
  protected override createRenderRoot(): this {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('mousedown', this._handleMousedown);
    this._controller = new AutocompleteController({
      mention: this.mention,
      command: this.command,
      autocomplete: this.autocomplete,
      starters: this.starters,
      isSendDisabled: this.isSendDisabled,
      onStarterSelected: (text) => {
        this.dispatchEvent(
          new CustomEvent('cds-aichat-starter-selected', {
            detail: { text },
            bubbles: true,
            composed: true,
          })
        );
      },
      onChange: (next) => {
        this._state = next;
      },
    });
    // Scope to the enclosing prompt-line-shell so multiple shell/controller pairs
    // on the same page don't cross-talk. Falls back to `this` if the
    // controller is used outside a shell — in that case the consumer
    // should make sure their prompt-line bubbles events into this element.
    this._eventSource = this.closest('cds-aichat-prompt-line-shell') ?? this;
    this._eventSource.addEventListener(
      'cds-aichat-trigger-change',
      this._handleTriggerChange as EventListener
    );
  }

  override disconnectedCallback(): void {
    this.removeEventListener('mousedown', this._handleMousedown);
    this._eventSource?.removeEventListener(
      'cds-aichat-trigger-change',
      this._handleTriggerChange as EventListener
    );
    this._eventSource = null;
    this._controller?.destroy();
    this._controller = null;
    super.disconnectedCallback();
  }

  override updated(changed: Map<string, unknown>): void {
    if (!this._controller) {
      return;
    }
    if (
      changed.has('mention') ||
      changed.has('command') ||
      changed.has('autocomplete') ||
      changed.has('starters') ||
      changed.has('isSendDisabled')
    ) {
      this._controller.setConfigs({
        mention: this.mention,
        command: this.command,
        autocomplete: this.autocomplete,
        starters: this.starters,
        isSendDisabled: this.isSendDisabled,
      });
    }
    // Register the currently-rendered list element with the controller so
    // arrow / Enter / Escape on the editor get forwarded into it.
    const listEl =
      this.querySelector<HTMLElement>('cds-aichat-autocomplete') ??
      (this.firstElementChild instanceof HTMLElement
        ? this.firstElementChild
        : null);
    this._controller.setListElement(listEl);

    // Pass the editor DOM as anchorElement so the autocomplete's outside-click
    // guard treats clicks on the editor as inside-clicks (not dismissals).
    const editorDom = this._controller.getPromptLine()?.getEditor()?.view
      .dom as Element | undefined;
    const autocompleteEl = this.querySelector<
      HTMLElement & { anchorElement?: Element | null }
    >('cds-aichat-autocomplete');
    if (autocompleteEl) {
      autocompleteEl.anchorElement = editorDom ?? null;
    }
  }

  override render() {
    const { trigger, items, renderCustomList, disableDirectSend } = this._state;
    if (!trigger || items.length === 0) {
      return nothing;
    }
    if (renderCustomList) {
      const result = renderCustomList({
        items,
        query: trigger.query,
        onDismiss: () => this._controller?.dismiss(),
        onSelect: (item) => this._selectItem(item),
        onSend: (text) => this._sendItem(text),
      });
      if (result instanceof HTMLElement) {
        return html`${result}`;
      }
      // Custom renderer returned something other than an HTMLElement (e.g.
      // a React node). Surface it on a side-channel event so React adapters
      // can portal it into place themselves.
      this.dispatchEvent(
        new CustomEvent('cds-aichat-custom-list-render', {
          detail: { reactNode: result },
          bubbles: true,
          composed: true,
        })
      );
      return nothing;
    }
    const { items: flatItems, groups } = itemsToGroups(items);
    return html`
      <cds-aichat-autocomplete
        .items=${flatItems}
        .groups=${groups}
        .disableDirectSend=${disableDirectSend}
        @cds-aichat-autocomplete-select=${(
          e: CustomEvent<{ item: SuggestionItem }>
        ) => this._selectItem(e.detail.item)}
        @cds-aichat-autocomplete-send=${(e: CustomEvent<{ text: string }>) =>
          this._sendItem(e.detail.text)}
        @cds-aichat-autocomplete-dismiss=${() => this._controller?.dismiss()}></cds-aichat-autocomplete>
    `;
  }

  private _selectItem(item: SuggestionItem): void {
    this._controller?.select(item);
    this.dispatchEvent(
      new CustomEvent('cds-aichat-autocomplete-item-selected', {
        detail: { item },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _sendItem(text: string): void {
    if (this.isSendDisabled) {
      return;
    }
    this._controller?.dismiss(true);
    this.dispatchEvent(
      new CustomEvent('cds-aichat-autocomplete-item-send', {
        detail: { text },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleMousedown = (event: MouseEvent): void => {
    // Prevent the autocomplete list from stealing focus from the editor.
    event.preventDefault();
  };

  private _handleTriggerChange = (event: Event): void => {
    this._controller?.handleTriggerChangeEvent(
      event as CustomEvent<
        Parameters<AutocompleteController['handleTriggerChange']>[0]
      >
    );
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'cds-aichat-autocomplete-controller': AutocompleteControllerElement;
  }
}

export default AutocompleteControllerElement;
