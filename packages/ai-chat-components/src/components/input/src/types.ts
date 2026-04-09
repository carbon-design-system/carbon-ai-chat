/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { ComponentType } from "react";
import type { CarbonIcon } from "@carbon/web-components/es/globals/internal/icon-loader-utils.js";

/**
 * Possible status values for a file upload.
 */
export enum FileStatusValue {
  /** Upload has completed processing. */
  COMPLETE = "complete",
  /** File is in an editable state. */
  EDIT = "edit",
  /** File is currently being uploaded. */
  UPLOADING = "uploading",
  /** Upload finished successfully. */
  SUCCESS = "success",
}

/**
 * An interface that represents a file to upload and its current upload status.
 */
export interface FileUpload {
  /** A unique ID for the file. */
  id: string;
  /** The file to upload. */
  file: File;
  /** The current upload status. */
  status: FileStatusValue;
  /** Indicates if the file contains an error or failed to upload. */
  isError?: boolean;
  /** If the file failed to upload, this is an optional error message to display. */
  errorMessage?: string;
}

/**
 * Represents an individual item in the autocomplete suggestion list.
 */
export interface SuggestionItem {
  /** Unique identifier for the item */
  id: string;
  /** Display label shown in the autocomplete list */
  label: string;
  /** String value inserted into the message on selection. Defaults to `${trigger}${label}`. */
  value?: string;
  /** Optional description shown below the label */
  description?: string;
  /** Optional avatar URL for the item */
  avatar?: string;
  /**
   * Either an icon from `@carbon/icons` (CarbonIcon descriptor) or a React icon
   * component from `@carbon/icons-react`. React components are automatically
   * transformed to CarbonIcon format when rendered through the React wrapper.
   */
  icon?: CarbonIcon | ComponentType<any>;
  /** Whether the item is disabled and cannot be selected */
  disabled?: boolean;
}

/**
 * Props passed to the custom list renderer.
 */
export interface CustomListProps {
  /** Current filtered items to display */
  items: SuggestionItem[];
  /** Current query string (text after trigger) */
  query: string;
  /** Callback to invoke when user selects an item */
  onSelect: (item: SuggestionItem) => void;
  /** Callback to invoke when list should be dismissed */
  onDismiss: () => void;
}

/**
 * The category of a suggestion trigger, which determines rendering and insertion behavior.
 */
export enum SuggestionType {
  /** Inserts a styled mention token (e.g. @user). */
  MENTION = "mention",
  /** Inserts a styled command token (e.g. /search). */
  COMMAND = "command",
  /** Completes the typed text inline without creating a token. */
  AUTOCOMPLETE = "autocomplete",
}

/**
 * Configuration for a single suggestion trigger (mention, command, or autocomplete).
 */
export interface SuggestionConfig {
  /**
   * Drives default rendering and insertion behavior:
   * - "mention"      → inserts a styled mention token
   * - "command"      → inserts a styled command token
   * - "autocomplete" → completes the typed text (no token created)
   */
  type?: SuggestionType;

  /**
   * Character that activates this suggestion (e.g. "@", "/", "#").
   * Use an empty string for autocomplete (fires on all input text).
   */
  trigger: string;

  /**
   * Whether the trigger must appear at the start of the input/line,
   * or anywhere. Defaults to "anywhere".
   * Use "start" for command-style triggers.
   */
  triggerPosition?: "start" | "anywhere";

  /**
   * Static item list or async function called with the current query string.
   */
  items: SuggestionItem[] | ((query: string) => Promise<SuggestionItem[]>);

  /**
   * Items shown immediately when the trigger fires, before any query is typed.
   */
  initialItems?: SuggestionItem[];

  /**
   * Minimum characters typed after the trigger before items() is called. Defaults to 0.
   */
  minQueryLength?: number;

  /**
   * Debounce delay in ms for the async items function. Defaults to 200.
   */
  debounceMs?: number;

  /**
   * Called after the user selects an item and insertion is complete.
   * Use for side effects: updating structured data, analytics, navigation, etc.
   */
  onSelect?: (item: SuggestionItem) => void;

  /**
   * Replace the built-in suggestion list UI. Called on open and again whenever
   * items or query change. The library positions the result above the input,
   * replaces it on updates, and removes it on close.
   *
   * Return an HTMLElement (works everywhere) or a React element
   * (portaled automatically when using the React adapter).
   *
   * When omitted, the built-in list renders above the input.
   */
  renderCustomList?: (props: CustomListProps) => HTMLElement | unknown;

  /**
   * Replace the visual element rendered inside the token chip.
   * Return an HTMLElement (works everywhere) or a React element
   * (portaled automatically when using the React adapter).
   *
   * When omitted, the built-in styled chip renders.
   * Not used when type is "autocomplete".
   */
  renderCustomToken?: (
    item: SuggestionItem,
    type: SuggestionType,
  ) => HTMLElement | unknown;
}

/**
 * Detail payload for the input change event, emitted when the editor content changes.
 */
export interface InputChangeEventDetail {
  /** The serialized plain-text value of the editor, with tokens replaced by their raw values. */
  rawValue: string;
}

/**
 * Detail payload for the send event, emitted when the user submits a message.
 */
export interface SendEventDetail {
  /** The plain-text content of the submitted message. */
  text: string;
}

/**
 * Detail payload for the file select event, emitted when files are chosen for upload.
 */
export interface FileSelectEventDetail {
  /** The list of files selected by the user. */
  files: File[];
}

/**
 * Detail payload for the file remove event, emitted when a file is removed from the upload list.
 */
export interface FileRemoveEventDetail {
  /** The unique ID of the file that was removed. */
  fileId: string;
}

/**
 * Detail payload for the trigger change event, emitted when a suggestion trigger activates or updates.
 */
export interface TriggerChangeEventDetail {
  /** The suggestion type that fired (e.g. "mention", "command"). */
  type: string;
  /** The current query string typed after the trigger character. */
  query: string;
  /** The character offset of the trigger in the editor content. */
  triggerOffset: number;
}

/**
 * Detail payload for the typing event, emitted when the user starts or stops typing.
 */
export interface TypingEventDetail {
  /** Whether the user is currently typing. */
  isTyping: boolean;
}

/**
 * Internal callbacks used by the autocomplete list manager.
 */
export interface AutocompleteListCallbacks {
  /** Called when the user selects an autocomplete item. */
  onAutocompleteSelect: (item: SuggestionItem) => void;
  /** Called when the autocomplete list is dismissed. */
  onAutocompleteDismiss: () => void;
  /** Called when a custom list renderer produces a React node that needs portal rendering. */
  onCustomListRender: (detail: {
    reactNode: unknown;
    props: CustomListProps;
  }) => void;
}
