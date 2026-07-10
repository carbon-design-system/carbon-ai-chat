/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";

import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import prefix from "../../../globals/settings.js";

import "../../autocomplete/src/autocomplete.js";
import { projectRawValue } from "./tiptap/json-utils.js";
import type PromptLineElement from "./prompt-line.js";
import type {
  AutocompleteConfig,
  CustomListProps,
  SuggestionItem,
  TriggerChangeEventDetail,
  TriggerSuggestionConfig,
} from "./tiptap/types.js";

// ---------------------------------------------------------------------------
// AutocompleteController — framework-agnostic class
// ---------------------------------------------------------------------------

/**
 * Framework-agnostic controller for the chat-input autocomplete overlay:
 * trigger-state tracking, async item resolution with stale-result protection,
 * dismissal, and selection routing back through the editor (mention/command
 * chip insertion, plain-text autocomplete, starter insert-and-send).
 *
 * Wrapped by [../../../react/hooks/useChatAutocomplete.tsx] (React hook) and
 * by the `<cds-aichat-autocomplete-controller>` element below — same logic,
 * two surfaces.
 */
export interface AutocompleteControllerOptions {
  mention?: TriggerSuggestionConfig;
  command?: TriggerSuggestionConfig;
  autocomplete?: AutocompleteConfig;
  starters?: SuggestionItem[];
  /** When true, starter selection inserts text without firing onStarterSelected. */
  isSendDisabled?: boolean;
  /** Called after a starter is selected and inserted; consumer triggers send. */
  onStarterSelected?: (text: string) => void;
  /** Notified whenever the overlay shape (trigger / items) changes. */
  onChange: (state: AutocompleteControllerState) => void;
}

export interface AutocompleteControllerState {
  trigger: TriggerChangeEventDetail | null;
  items: SuggestionItem[];
  /** Consumer's `renderCustomList`, if any — resolved from the active trigger. */
  renderCustomList?: (props: CustomListProps) => HTMLElement | unknown;
}

export class AutocompleteController {
  private _mention?: TriggerSuggestionConfig;
  private _command?: TriggerSuggestionConfig;
  private _autocomplete?: AutocompleteConfig;
  private _starters?: SuggestionItem[];
  private _isSendDisabled: boolean;
  private _onStarterSelected?: (text: string) => void;
  private _onChange: (state: AutocompleteControllerState) => void;

  private _trigger: TriggerChangeEventDetail | null = null;
  private _items: SuggestionItem[] = [];

  /**
   * Identifies the source prompt-line of the active trigger. Set from the
   * trigger event's target (when feeding via `handleTriggerChangeEvent`) or
   * via `setPromptLine` (e.g. by the React hook, which has a stable ref).
   */
  private _promptLine: PromptLineElement | null = null;

  /**
   * The active suggestion-list element. Surface wrappers (React hook, WC
   * element) register this so the controller can forward Arrow/Enter/Escape
   * key events from the prompt-line editor without the user having to Tab
   * to the list.
   */
  private _listElement: HTMLElement | null = null;

  /**
   * Editor DOM the key-forwarding handler is currently attached to, or null
   * if not attached. Tracked separately from `_promptLine` so we always
   * detach from the exact node we attached to (the editor view can be
   * recreated underneath us).
   */
  private _editorDomBound: HTMLElement | null = null;

  /**
   * Monotonic counter — incremented on every new trigger / dismiss so an
   * in-flight async resolve from an older trigger cannot clobber state.
   */
  private _resolveToken = 0;
  private _destroyed = false;

  constructor(options: AutocompleteControllerOptions) {
    this._mention = options.mention;
    this._command = options.command;
    this._autocomplete = options.autocomplete;
    this._starters = options.starters;
    this._isSendDisabled = Boolean(options.isSendDisabled);
    this._onStarterSelected = options.onStarterSelected;
    this._onChange = options.onChange;
  }

  // ---------------------------------------------------------------------
  // Config / prompt-line wiring
  // ---------------------------------------------------------------------

  /**
   * Update any subset of configs. The active trigger (if any) is re-resolved
   * against the new configs so the visible item list stays current.
   */
  setConfigs(
    next: Partial<
      Pick<
        AutocompleteControllerOptions,
        | "mention"
        | "command"
        | "autocomplete"
        | "starters"
        | "isSendDisabled"
        | "onStarterSelected"
      >
    >,
  ): void {
    if ("mention" in next) {
      this._mention = next.mention;
    }
    if ("command" in next) {
      this._command = next.command;
    }
    if ("autocomplete" in next) {
      this._autocomplete = next.autocomplete;
    }
    if ("starters" in next) {
      this._starters = next.starters;
    }
    if ("isSendDisabled" in next) {
      this._isSendDisabled = Boolean(next.isSendDisabled);
    }
    if ("onStarterSelected" in next) {
      this._onStarterSelected = next.onStarterSelected;
    }
    if (this._trigger) {
      // Re-resolve items against the new configs.
      this._kickoffResolve(this._trigger);
    }
  }

  /** Set or clear the active prompt-line. */
  setPromptLine(promptLine: PromptLineElement | null): void {
    if (this._promptLine === promptLine) {
      return;
    }
    this._promptLine = promptLine;
    // Re-evaluate the key-forwarding handler — the editor DOM we were bound
    // to may now be gone, or a new one may need binding.
    this._refreshEditorKeyHandler();
  }

  /** Read the currently associated prompt-line. */
  getPromptLine(): PromptLineElement | null {
    return this._promptLine;
  }

  /**
   * Set the active suggestion-list element. When both this and an active
   * trigger are present, ArrowUp/ArrowDown/Enter/Escape on the prompt-line
   * editor are forwarded to the list as synthetic `keydown` events.
   */
  setListElement(el: HTMLElement | null): void {
    if (this._listElement === el) {
      return;
    }
    this._listElement = el;
    this._refreshEditorKeyHandler();
  }

  // ---------------------------------------------------------------------
  // Trigger handling
  // ---------------------------------------------------------------------

  /**
   * Feed a raw `cds-aichat-trigger-change` event. The event's `target` is the
   * originating prompt-line (since the event is `composed: true, bubbles:
   * true`), so we capture it here for later selection-routing.
   */
  handleTriggerChangeEvent(
    event: CustomEvent<TriggerChangeEventDetail | null>,
  ): void {
    const target = findPromptLineFromTarget(event.composedPath());
    if (target) {
      this._promptLine = target;
    }
    this.handleTriggerChange(event.detail ?? null);
  }

  /**
   * Feed a trigger-change detail directly. Use this when the caller already
   * has the detail object and a separate way to know which prompt-line it
   * belongs to (e.g. the React hook holds a ref).
   */
  handleTriggerChange(detail: TriggerChangeEventDetail | null): void {
    if (this._destroyed) {
      return;
    }
    this._trigger = detail;
    if (!detail) {
      this._items = [];
      this._resolveToken++;
      this._refreshEditorKeyHandler();
      this._emit();
      return;
    }
    this._kickoffResolve(detail);
    this._refreshEditorKeyHandler();
  }

  /** Clear active trigger + items. */
  dismiss(): void {
    if (this._destroyed) {
      return;
    }
    if (!this._trigger && this._items.length === 0) {
      return;
    }
    this._trigger = null;
    this._items = [];
    this._resolveToken++;
    this._refreshEditorKeyHandler();
    this._emit();
  }

  // ---------------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------------

  /**
   * Apply a user selection. Routes by trigger type:
   * - starter → insert text + (if not send-disabled) fire onStarterSelected
   * - mention / command → insert chip node at trigger range
   * - autocomplete → insert plain text at trigger range
   */
  select(item: SuggestionItem): void {
    if (this._destroyed) {
      return;
    }
    const trigger = this._trigger;
    const promptLine = this._promptLine;
    const editor = promptLine?.getEditor() ?? null;
    if (!trigger || !editor) {
      this.dismiss();
      return;
    }

    if (trigger.type === "starter") {
      const text = item.value ?? item.label;
      editor.commands.insertContent(text);
      this.dismiss();
      if (!this._isSendDisabled) {
        this._onStarterSelected?.(projectRawValue(editor));
      }
      return;
    }

    if (trigger.type === "mention" || trigger.type === "command") {
      const config = trigger.type === "mention" ? this._mention : this._command;
      const nodeName = trigger.type;
      const range = {
        from: trigger.triggerOffset,
        to: editor.state.selection.from,
      };
      editor
        .chain()
        .focus()
        .insertContentAt(range, [
          {
            type: nodeName,
            attrs: {
              id: item.id,
              label: item.label,
              value: item.value ?? item.label,
            },
          },
          { type: "text", text: " " },
        ])
        .run();
      config?.onSelect?.(item);
    } else if (trigger.type === "autocomplete") {
      const text = item.value ?? item.label;
      const range = {
        from: trigger.triggerOffset,
        to: editor.state.selection.from,
      };
      editor
        .chain()
        .focus()
        .insertContentAt(range, [{ type: "text", text }])
        .run();
      this._autocomplete?.onSelect?.(item);
    }

    this.dismiss();
  }

  // ---------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------

  destroy(): void {
    this._detachEditorKeyHandler();
    this._destroyed = true;
    this._resolveToken++;
    this._trigger = null;
    this._items = [];
    this._promptLine = null;
    this._listElement = null;
  }

  // ---------------------------------------------------------------------
  // Editor-DOM key forwarding
  // ---------------------------------------------------------------------

  /**
   * When a trigger and a list element are both active, bind a keydown
   * handler to the prompt-line editor DOM so ArrowUp / ArrowDown / Enter /
   * Escape pressed while typing get re-dispatched on the list — same effect
   * as if the list had focus, without taking focus from the editor.
   */
  private _refreshEditorKeyHandler(): void {
    if (this._destroyed) {
      this._detachEditorKeyHandler();
      return;
    }
    const editorDom =
      this._trigger && this._listElement
        ? ((this._promptLine?.getEditor()?.view.dom as HTMLElement) ?? null)
        : null;
    if (editorDom === this._editorDomBound) {
      return;
    }
    this._detachEditorKeyHandler();
    if (editorDom) {
      editorDom.addEventListener("keydown", this._handleEditorKeyDown, true);
      this._editorDomBound = editorDom;
    }
  }

  private _detachEditorKeyHandler(): void {
    if (this._editorDomBound) {
      this._editorDomBound.removeEventListener(
        "keydown",
        this._handleEditorKeyDown,
        true,
      );
      this._editorDomBound = null;
    }
  }

  private _handleEditorKeyDown = (event: KeyboardEvent): void => {
    if (
      event.key !== "ArrowUp" &&
      event.key !== "ArrowDown" &&
      event.key !== "Enter" &&
      event.key !== "Escape"
    ) {
      return;
    }
    const listEl = this._listElement;
    if (!listEl || !this._trigger) {
      return;
    }
    // Stop Tiptap and the editor from acting on the same key. `capture: true`
    // (when listening) plus stopPropagation here gets us in ahead of
    // ProseMirror's own keydown handler.
    event.preventDefault();
    event.stopPropagation();
    listEl.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: event.key,
        bubbles: true,
        cancelable: true,
      }),
    );
  };

  // ---------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------

  private _kickoffResolve(trigger: TriggerChangeEventDetail): void {
    const token = ++this._resolveToken;
    void (async () => {
      const items = await this._resolveItems(trigger);
      if (this._destroyed || this._resolveToken !== token) {
        return;
      }
      this._items = items;
      this._emit();
    })();
  }

  private async _resolveItems(
    trigger: TriggerChangeEventDetail,
  ): Promise<SuggestionItem[]> {
    if (trigger.type === "starter") {
      return this._starters ?? [];
    }
    const config =
      trigger.type === "mention"
        ? this._mention
        : trigger.type === "command"
          ? this._command
          : trigger.type === "autocomplete"
            ? this._autocomplete
            : undefined;
    if (!config) {
      return [];
    }
    return resolveConfigItems(config, trigger.query);
  }

  private _resolveRenderCustomList():
    | ((props: CustomListProps) => HTMLElement | unknown)
    | undefined {
    const trigger = this._trigger;
    if (!trigger || trigger.type === "starter") {
      return undefined;
    }
    const config =
      trigger.type === "mention"
        ? this._mention
        : trigger.type === "command"
          ? this._command
          : trigger.type === "autocomplete"
            ? this._autocomplete
            : undefined;
    return config?.renderCustomList;
  }

  private _emit(): void {
    this._onChange({
      trigger: this._trigger,
      items: this._items,
      renderCustomList: this._resolveRenderCustomList(),
    });
  }
}

// ---------------------------------------------------------------------------
// Controller helpers
// ---------------------------------------------------------------------------

/** Walks an event's composedPath looking for a `cds-aichat-prompt-line`. */
function findPromptLineFromTarget(
  path: EventTarget[],
): PromptLineElement | null {
  for (const target of path) {
    if (
      target instanceof HTMLElement &&
      target.tagName === "CDS-AICHAT-PROMPT-LINE"
    ) {
      return target as unknown as PromptLineElement;
    }
  }
  return null;
}

/**
 * Resolve a `BaseSuggestionConfig`'s `items` field (array or async resolver)
 * to a flat list, applying `minQueryLength` filtering.
 */
async function resolveConfigItems(
  config: {
    items:
      | SuggestionItem[]
      | ((query: string) => Promise<SuggestionItem[]> | SuggestionItem[]);
    minQueryLength?: number;
  },
  query: string,
): Promise<SuggestionItem[]> {
  const minQueryLength = config.minQueryLength ?? 0;
  if (query.length < minQueryLength) {
    return [];
  }
  if (typeof config.items === "function") {
    return await Promise.resolve(config.items(query));
  }
  if (!query) {
    return config.items;
  }
  const lower = query.toLowerCase();
  return config.items.filter((item) =>
    item.label.toLowerCase().includes(lower),
  );
}

// ---------------------------------------------------------------------------
// <cds-aichat-autocomplete-controller> — Lit element wrapping the class
// ---------------------------------------------------------------------------

/**
 * `<cds-aichat-autocomplete-controller>` — drops the autocomplete overlay
 * lifecycle into a `<cds-aichat-input-shell>`'s `autocomplete-content` slot.
 *
 * Listens for `cds-aichat-trigger-change` events bubbling up from the
 * enclosing input-shell (the events are `composed: true, bubbles: true`, so
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
  @property({ type: Array, attribute: false })
  starters?: SuggestionItem[];

  /** When true, starter selection inserts text without firing the send event. */
  @property({ type: Boolean, attribute: "is-send-disabled" })
  isSendDisabled = false;

  @state()
  private _state: AutocompleteControllerState = { trigger: null, items: [] };

  private _controller: AutocompleteController | null = null;
  /**
   * Ancestor we subscribed `cds-aichat-trigger-change` on. Scoping the
   * listener to the enclosing `<cds-aichat-input-shell>` (rather than
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
    this._controller = new AutocompleteController({
      mention: this.mention,
      command: this.command,
      autocomplete: this.autocomplete,
      starters: this.starters,
      isSendDisabled: this.isSendDisabled,
      onStarterSelected: (text) => {
        this.dispatchEvent(
          new CustomEvent("cds-aichat-starter-selected", {
            detail: { text },
            bubbles: true,
            composed: true,
          }),
        );
      },
      onChange: (next) => {
        this._state = next;
      },
    });
    // Scope to the enclosing input-shell so multiple shell/controller pairs
    // on the same page don't cross-talk. Falls back to `this` if the
    // controller is used outside a shell — in that case the consumer
    // should make sure their prompt-line bubbles events into this element.
    this._eventSource = this.closest("cds-aichat-input-shell") ?? this;
    this._eventSource.addEventListener(
      "cds-aichat-trigger-change",
      this._handleTriggerChange as EventListener,
    );
  }

  override disconnectedCallback(): void {
    this._eventSource?.removeEventListener(
      "cds-aichat-trigger-change",
      this._handleTriggerChange as EventListener,
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
      changed.has("mention") ||
      changed.has("command") ||
      changed.has("autocomplete") ||
      changed.has("starters") ||
      changed.has("isSendDisabled")
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
      this.querySelector<HTMLElement>("cds-aichat-autocomplete") ??
      (this.firstElementChild instanceof HTMLElement
        ? this.firstElementChild
        : null);
    this._controller.setListElement(listEl);
  }

  override render() {
    const { trigger, items, renderCustomList } = this._state;
    if (!trigger || items.length === 0) {
      return nothing;
    }
    if (renderCustomList) {
      const result = renderCustomList({
        items,
        query: trigger.query,
        onSelect: (item) => this._controller?.select(item),
        onDismiss: () => this._controller?.dismiss(),
      });
      if (result instanceof HTMLElement) {
        return html`${result}`;
      }
      // Custom renderer returned something other than an HTMLElement (e.g.
      // a React node). Surface it on a side-channel event so React adapters
      // can portal it into place themselves.
      this.dispatchEvent(
        new CustomEvent("cds-aichat-custom-list-render", {
          detail: { reactNode: result },
          bubbles: true,
          composed: true,
        }),
      );
      return nothing;
    }
    return html`
      <cds-aichat-autocomplete
        .items=${items}
        @cds-aichat-autocomplete-select=${(
          event: CustomEvent<{ item: SuggestionItem }>,
        ) => this._controller?.select(event.detail.item)}
        @cds-aichat-autocomplete-dismiss=${() => this._controller?.dismiss()}
      ></cds-aichat-autocomplete>
    `;
  }

  private _handleTriggerChange = (event: Event): void => {
    this._controller?.handleTriggerChangeEvent(
      event as CustomEvent<
        Parameters<AutocompleteController["handleTriggerChange"]>[0]
      >,
    );
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-autocomplete-controller": AutocompleteControllerElement;
  }
}

export default AutocompleteControllerElement;
