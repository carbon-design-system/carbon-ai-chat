/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Public types for the input subsystem. Curated suggestion / item /
 * list-renderer types live in `tiptap/types.ts` and are re-exported here
 * so consumers see them at the package's public surface.
 */

import type { JSONContent } from "@tiptap/core";

export type {
  BaseSuggestionConfig,
  TriggerSuggestionConfig,
  AutocompleteConfig,
  SuggestionItem,
  CustomListProps,
  TriggerChangeEventDetail,
} from "./tiptap/types.js";

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
 * Detail payload for the input change event, emitted when the editor content
 * changes. Post-PR-3, `content` is Tiptap-native `JSONContent` (the
 * segment-array transport is gone).
 */
export interface InputChangeEventDetail {
  /** Plain-text projection (mention/command nodes contribute their `attrs.value || attrs.label`). */
  rawValue: string;
  /** Editor doc as Tiptap JSONContent. */
  content?: JSONContent;
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
 * Detail payload for the typing event, emitted when the user starts or stops typing.
 */
export interface TypingEventDetail {
  /** Whether the user is currently typing. */
  isTyping: boolean;
}
