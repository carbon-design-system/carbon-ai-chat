/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Tiptap-shaped configs for the chat-input subsystem. The Carbon factories
 * (`carbonMention`, `carbonCommand`, `carbonAutocomplete`,
 * `carbonStarterTrigger`) and the shell consume these types directly.
 */

import type { ComponentType, ReactNode } from "react";
import type { CarbonIcon } from "@carbon/web-components/es/globals/internal/icon-loader-utils.js";

/**
 * Single list-item shape used by both the autocomplete-list-manager and the
 * starter list.
 */
export interface SuggestionItem {
  /** Unique identifier for the item. */
  id: string;
  /** Display label shown in the suggestion list. */
  label: string;
  /** String value inserted into the message on selection. Defaults to label. */
  value?: string;
  /** Optional description shown below the label. */
  description?: string;
  /** Optional avatar URL for the item. */
  avatar?: string;
  /**
   * Either an icon from `@carbon/icons` (CarbonIcon descriptor) or a React
   * icon component from `@carbon/icons-react`.
   */
  icon?: CarbonIcon | ComponentType<unknown>;
  /** Whether the item is disabled and cannot be selected. */
  disabled?: boolean;
}

/**
 * Props passed to the custom list renderer.
 */
export interface CustomListProps {
  /** Current filtered items to display. */
  items: SuggestionItem[];
  /** Current query string (text after trigger). */
  query: string;
  /** Callback to invoke when user selects an item. */
  onSelect: (item: SuggestionItem) => void;
  /** Callback to invoke when list should be dismissed. */
  onDismiss: () => void;
}

/**
 * Fields shared by every suggestion config.
 */
export interface BaseSuggestionConfig {
  /**
   * Static item list or async function called with the current query string.
   */
  items:
    | SuggestionItem[]
    | ((query: string) => Promise<SuggestionItem[]> | SuggestionItem[]);

  /** Minimum query length before items() is called. Defaults to 0. */
  minQueryLength?: number;

  /** Debounce delay in ms for the async items function. Defaults to 200. */
  debounceMs?: number;

  /** Called after the user selects an item and insertion is complete. */
  onSelect?: (item: SuggestionItem) => void;

  /** Replace the built-in suggestion list UI. */
  renderCustomList?: (props: CustomListProps) => HTMLElement | unknown;
}

/**
 * Trigger-character-driven suggestion config. Used by `carbonMention` and
 * `carbonCommand` (the carbon factories distinguish them only by their
 * default Tiptap node `name`).
 */
export interface TriggerSuggestionConfig extends BaseSuggestionConfig {
  /** Character that activates the suggestion (e.g. "@", "/"). */
  trigger: string;

  /** Whether the trigger must appear at the start of the input/line, or
   *  anywhere. Defaults to "anywhere". */
  triggerPosition?: "start" | "anywhere";

  /**
   * Override the schema-node name. Threaded through `Mention.extend({ name })`
   * inside the carbon factory to sidestep Tiptap's last-named-wins stacking
   * caveat when multiple triggers coexist.
   *
   * Defaults: `"mention"` (carbonMention) / `"command"` (carbonCommand).
   */
  name?: string;

  /** Replace the visual element rendered inside the token chip. */
  renderCustomToken?: (item: SuggestionItem) => HTMLElement | ReactNode;

  /**
   * Called when a previously-inserted token for this trigger is removed from
   * the input by a user edit (backspace, delete, cut, select-all, undo, ...).
   * The mirror of {@link BaseSuggestionConfig}'s `onSelect`: fires once per
   * removed node instance, so deleting one of two identical chips fires
   * exactly once. Use it to keep host-owned structured data in sync with the
   * editor.
   *
   * The item is reconstructed from the node's stored attributes (`id`,
   * `label`, `value`, plus any custom fields preserved in `data`);
   * presentation-only fields (`icon`, `avatar`, `description`, `disabled`) are
   * not retained on the node and are absent. Programmatic removals (via
   * `getEditor()`/`updateContent`) are host-origin and do NOT fire `onRemove`,
   * symmetric with `onSelect` not firing on programmatic inserts.
   */
  onRemove?: (item: SuggestionItem) => void;
}

/**
 * Live autocomplete config. Selection inserts plain text (no token chip).
 */
export interface AutocompleteConfig extends BaseSuggestionConfig {
  /** Override the suggestion plugin key name. Defaults to `"autocomplete"`. */
  name?: string;
}

/**
 * Detail payload for the trigger-change event emitted directly by each carbon
 * factory's suggestion-render lifecycle. The shape is shared with the legacy
 * `TriggerChangeEventDetail` (see `../types.ts`) so existing listeners keep
 * working unchanged across the wave.
 */
export interface TriggerChangeEventDetail {
  /** The trigger type that fired (`"mention"`/`"command"`/`"autocomplete"`/`"starter"`). */
  type: string;
  /** The current query string typed after the trigger character. */
  query: string;
  /** The character offset of the trigger in the editor content. */
  triggerOffset: number;
}
