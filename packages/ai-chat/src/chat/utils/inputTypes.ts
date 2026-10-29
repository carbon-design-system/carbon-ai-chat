/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { Editor, JSONContent } from '@tiptap/core';
import type { FileUpload } from '@carbon/ai-chat-components/es/components/prompt-line/src/types.js';

/**
 * Private props shared by the built-in input and its React adapter.
 */
export interface InputProps {
  /**
   * Indicates if the input field should be disabled (the user cannot type anything).
   */
  disableInput: boolean;

  /**
   * Indicates if the input field should be hidden or visible.
   */
  isInputVisible: boolean;

  /**
   * Indicates if sending a message should be disabled.
   */
  disableSend: boolean;

  /**
   * The callback to call when the user enters some text into the field and it needs to be sent.
   * `displayContent` is the editor's JSONContent at send time when available — present for UI sends,
   * absent for programmatic ones.
   */
  onSendInput: (text: string, displayContent?: JSONContent) => void;

  onStopStreaming: (markPending: () => void) => Promise<void>;

  /**
   * An optional placeholder to display in the field.
   */
  placeholder?: string;

  /**
   * A callback to indicate when the user is typing.
   */
  onUserTyping?: (isTyping: boolean) => void;

  /**
   * Indicates if a button should be displayed that would allow a user to select a file to upload.
   */
  showUploadButton?: boolean;

  /**
   * Indicates if the file upload button should be disabled.
   */
  disableUploadButton?: boolean;

  /**
   * The filter to apply to choosing files for upload.
   */
  allowedFileUploadTypes?: string;

  /**
   * Indicates if the user should be allowed to choose multiple files to upload.
   */
  allowMultipleFileUploads?: boolean;

  /**
   * Maximum size in bytes for a single uploaded file. Files exceeding this are
   * rejected before upload. When undefined, there is no size limit.
   */
  maxFileSizeBytes?: number;

  /**
   * Maximum number of files that may be attached at once. When undefined, there
   * is no limit.
   */
  maxFiles?: number;

  /**
   * A list of pending file uploads to display in the input area.
   */
  pendingUploads?: FileUpload[];

  /**
   * The callback that is called when the user selects one or more files to be uploaded.
   */
  onFilesSelectedForUpload?: (files: FileUpload[]) => void;

  /**
   * Optional override for the remove-file action.
   */
  onRemoveFile?: (fileID: string) => void;

  /**
   * Determines if the "stop streaming" button should be visible.
   */
  isStopStreamingButtonVisible?: boolean;

  /**
   * Determines if the "stop streaming" button should be disabled.
   */
  isStopStreamingButtonDisabled?: boolean;

  /**
   * Maximum number of characters allowed to be typed into the input field.
   */
  maxInputChars?: number;

  /**
   * Indicates if this input should stay in sync with the global input state used for ChatInstance APIs.
   */
  trackInputState?: boolean;

  restoreDraft?: boolean;

  /**
   * Whether the input container should have rounded corners (at wider breakpoints).
   */
  rounded?: boolean;

  /**
   * Error configuration for displaying an error message in the input field.
   */
  error?: {
    /**
     * The error title to display.
     */
    title: string;
    /**
     * The error description to display.
     */
    description?: string;
    /**
     * Whether the error message container should be collapsible.
     */
    collapsible?: boolean;
  };

  /** Localized attachment errors replace `error`; the max-length error takes priority. */
  uploadErrors?: Array<{
    id: string;
    filename: string;
    title: string;
    description?: string;
  }>;
}

/**
 * Functions exposed by the Input component via ref.
 */
export interface InputFunctions {
  /**
   * Requests focus on the input field.
   */
  requestFocus: () => boolean;

  /**
   * Returns true if the input field currently has focus.
   */
  hasFocus: () => boolean;

  /**
   * Replace the entire input content. Throws if the editor is not currently
   * rendered.
   */
  setContent: (
    next: JSONContent | string | ((prev: JSONContent) => JSONContent)
  ) => void;

  /**
   * Insert content at the cursor or at `options.at` (a PM document offset).
   * Throws if the editor is not currently rendered.
   */
  insertContent: (
    content: JSONContent | string,
    options?: { at?: number }
  ) => void;

  /**
   * Probe-style access to the live Tiptap editor. Returns `null` when the
   * editor is not mounted. Never triggers a load.
   */
  getEditor: () => Editor | null;

  /**
   * Loads Tiptap on demand (upgrading the textarea in place), then resolves
   * with the live editor. Rejects when the input surface is not mounted.
   */
  ensureEditor: () => Promise<Editor>;
}
