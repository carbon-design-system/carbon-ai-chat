/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Framework-agnostic controller for the chat-input autocomplete overlay:
 * trigger-state tracking, async item resolution with stale-result protection,
 * dismissal, and selection routing back through the editor (mention/command
 * chip insertion, plain-text autocomplete, starter insert-and-send).
 *
 * Wrapped by [../../../react/hooks/useChatAutocomplete.tsx] (React hook) and
 * by the `<cds-aichat-autocomplete-controller>` element in
 * [./autocomplete-controller-element.ts] — same logic, two surfaces.
 *
 * This module stays free of `lit` and of custom-element registration. The
 * React hook imports the controller directly, so a Lit import here would hand
 * every React consumer a runtime and an element it never renders. A static
 * import check in [../../../react/__tests__/autocomplete-controller-imports.test.ts]
 * fails if either comes back.
 */

import { writeStarterStorage } from './tiptap/carbon-starter-trigger.js';
import { resolveShowTriggerInChip } from './tiptap/carbon-mention.js';
import { stripPresentationFields } from './tiptap/strip-presentation-fields.js';
import { resolveConfigItems } from './tiptap/resolve-config-items.js';
import { projectRawValue } from './tiptap/json-utils.js';
import { resetTriggerChangeState } from './tiptap/trigger-utils.js';
import type PromptLineElement from './prompt-line.js';
import type {
  AutocompleteConfig,
  BaseSuggestionConfig,
  CustomListProps,
  StartersConfig,
  SuggestionItem,
  SuggestionItemGroup,
  TriggerChangeEventDetail,
  TriggerSuggestionConfig,
} from './tiptap/types.js';

export interface AutocompleteControllerOptions {
  mention?: TriggerSuggestionConfig;
  command?: TriggerSuggestionConfig;
  autocomplete?: AutocompleteConfig;
  starters?: StartersConfig;
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
  /** Forwarded from the active trigger config's `disableDirectSend`. */
  disableDirectSend?: boolean;
}

export class AutocompleteController {
  private _mention?: TriggerSuggestionConfig;
  private _command?: TriggerSuggestionConfig;
  private _autocomplete?: AutocompleteConfig;
  private _starters?: StartersConfig;
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
        | 'mention'
        | 'command'
        | 'autocomplete'
        | 'starters'
        | 'isSendDisabled'
        | 'onStarterSelected'
      >
    >
  ): void {
    if ('mention' in next) {
      this._mention = next.mention;
    }
    if ('command' in next) {
      this._command = next.command;
    }
    if ('autocomplete' in next) {
      this._autocomplete = next.autocomplete;
    }
    if ('starters' in next) {
      const prevIsOn = this._starters?.isOn !== false;
      const isOn = next.starters?.isOn !== false;
      this._starters = next.starters;
      // isOn toggled: push the new value into the Tiptap extension storage.
      // onTransaction is gated on editor.isFocused, so re-evaluation happens
      // immediately when the editor is focused, and on the next focus otherwise.
      if (prevIsOn !== isOn) {
        writeStarterStorage(this._promptLine?.getEditor(), { isOn });
      }
    }
    if ('isSendDisabled' in next) {
      this._isSendDisabled = Boolean(next.isSendDisabled);
    }
    if ('onStarterSelected' in next) {
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
    // Reconcile the isOn flag into the newly attached prompt-line's storage.
    if (promptLine) {
      writeStarterStorage(promptLine.getEditor(), {
        isOn: this._starters?.isOn !== false,
      });
    }
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
    event: CustomEvent<TriggerChangeEventDetail | null>
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

  /**
   * Clear active trigger + items.
   *
   * @param keepCoalesced - When `true`, skip `resetTriggerChangeState` so the
   *   trigger-utils coalescing layer stays active. Use this when the dismissal
   *   is from a send action where the editor stays empty and focused — without
   *   it, the starter trigger would immediately re-fire on the next transaction.
   */
  dismiss(keepCoalesced = false): void {
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
    if (!keepCoalesced) {
      const editor = this._promptLine?.getEditor();
      if (editor) {
        resetTriggerChangeState(editor);
      }
    }
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

    if (trigger.type === 'starter') {
      const text = item.value ?? item.label;
      editor.commands.insertContent(text);
      this.dismiss();
      if (!this._isSendDisabled) {
        this._onStarterSelected?.(projectRawValue(editor));
      }
      return;
    }

    if (trigger.type === 'mention' || trigger.type === 'command') {
      const config = this._configForTrigger(trigger.type);
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
              trigger: resolveShowTriggerInChip(
                item,
                config ?? {},
                trigger.type === 'command'
              )
                ? config?.trigger
                : null,
              data: stripPresentationFields(item),
            },
          },
          { type: 'text', text: ' ' },
        ])
        .run();
      config?.onSelect?.(item);
    } else if (trigger.type === 'autocomplete') {
      const text = item.value ?? item.label;
      const range = {
        from: trigger.triggerOffset,
        to: editor.state.selection.from,
      };
      editor
        .chain()
        .focus()
        .insertContentAt(range, [{ type: 'text', text }])
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
      editorDom.addEventListener('keydown', this._handleEditorKeyDown, true);
      editorDom.addEventListener('focusout', this._handleEditorFocusOut);
      this._editorDomBound = editorDom;
    }
  }

  private _detachEditorKeyHandler(): void {
    if (this._editorDomBound) {
      this._editorDomBound.removeEventListener(
        'keydown',
        this._handleEditorKeyDown,
        true
      );
      this._editorDomBound.removeEventListener(
        'focusout',
        this._handleEditorFocusOut
      );
      this._editorDomBound = null;
    }
  }

  private _handleEditorKeyDown = (event: KeyboardEvent): void => {
    if (
      event.key !== 'ArrowUp' &&
      event.key !== 'ArrowDown' &&
      event.key !== 'Enter' &&
      event.key !== 'Escape'
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
      new KeyboardEvent('keydown', {
        key: event.key,
        bubbles: true,
        cancelable: true,
      })
    );
  };

  private _handleEditorFocusOut = (event: FocusEvent): void => {
    const relatedTarget = event.relatedTarget as Node | null;
    // If focus moved into the list element (or inside it), keep the overlay
    // open — the user is interacting with it.
    if (relatedTarget && this._listElement?.contains(relatedTarget)) {
      return;
    }
    this.dismiss();
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

  /**
   * The config backing a trigger type, or `undefined` for a type no config
   * covers. Single lookup for the class: a new trigger type is one case here,
   * not a hunt through every method that names the types.
   *
   * Callers reach the fields every config shares. The `mention`/`command`
   * overload returns the narrower type, which is what `select()` needs to read
   * `trigger` — a field `BaseSuggestionConfig` does not carry.
   */
  private _configForTrigger(
    type: 'mention' | 'command'
  ): TriggerSuggestionConfig | undefined;
  private _configForTrigger(type: string): BaseSuggestionConfig | undefined;
  private _configForTrigger(type: string): BaseSuggestionConfig | undefined {
    switch (type) {
      case 'starter':
        return this._starters;
      case 'mention':
        return this._mention;
      case 'command':
        return this._command;
      case 'autocomplete':
        return this._autocomplete;
      default:
        return undefined;
    }
  }

  private async _resolveItems(
    trigger: TriggerChangeEventDetail
  ): Promise<SuggestionItem[]> {
    // Starters are a fixed list shown on an empty editor, so they skip the
    // query gating and filtering every other trigger runs through.
    if (trigger.type === 'starter') {
      return this._starters?.items ?? [];
    }
    const config = this._configForTrigger(trigger.type);
    if (!config) {
      return [];
    }
    return resolveConfigItems(config, trigger.query);
  }

  private _resolveRenderCustomList():
    ((props: CustomListProps) => HTMLElement | unknown) | undefined {
    const trigger = this._trigger;
    if (!trigger) {
      return undefined;
    }
    return this._configForTrigger(trigger.type)?.renderCustomList;
  }

  private _resolveDisableDirectSend(): boolean | undefined {
    const trigger = this._trigger;

    if (!trigger) {
      return undefined;
    }

    // Mention and command always insert a chip rather than send, which is why
    // TriggerSuggestionConfig omits the field rather than defaulting it.
    if (trigger.type === 'mention' || trigger.type === 'command') {
      return true;
    }

    return this._configForTrigger(trigger.type)?.disableDirectSend;
  }

  private _emit(): void {
    this._onChange({
      trigger: this._trigger,
      items: this._items,
      renderCustomList: this._resolveRenderCustomList(),
      disableDirectSend: this._resolveDisableDirectSend(),
    });
  }
}

// ---------------------------------------------------------------------------
// Controller helpers
// ---------------------------------------------------------------------------

/** Walks an event's composedPath looking for a `cds-aichat-prompt-line`. */
function findPromptLineFromTarget(
  path: EventTarget[]
): PromptLineElement | null {
  for (const target of path) {
    if (
      target instanceof HTMLElement &&
      target.tagName === 'CDS-AICHAT-PROMPT-LINE'
    ) {
      return target as unknown as PromptLineElement;
    }
  }
  return null;
}

/**
 * Partition a flat `SuggestionItem[]` into ungrouped items and derived
 * `SuggestionItemGroup[]` for the `<cds-aichat-autocomplete>` element.
 * Items with no `groupId` go into `items`; items with a `groupId` are
 * bucketed into groups preserving first-occurrence order. The group title
 * is taken from the first item in the bucket that carries a `groupTitle`.
 */
export function itemsToGroups(flat: SuggestionItem[]): {
  items: SuggestionItem[];
  groups: SuggestionItemGroup[];
} {
  const items: SuggestionItem[] = [];
  const groupMap = new Map<string, SuggestionItemGroup>();
  const groupOrder: string[] = [];

  for (const item of flat) {
    if (!item.groupId) {
      items.push(item);
      continue;
    }
    let group = groupMap.get(item.groupId);
    if (!group) {
      group = {
        id: item.groupId,
        title: item.groupTitle ?? '',
        items: [],
      };
      groupMap.set(item.groupId, group);
      groupOrder.push(item.groupId);
    }
    group.items.push(item);
  }

  return {
    items,
    groups: groupOrder
      .map((id) => groupMap.get(id))
      .filter((g): g is SuggestionItemGroup => g !== undefined),
  };
}
