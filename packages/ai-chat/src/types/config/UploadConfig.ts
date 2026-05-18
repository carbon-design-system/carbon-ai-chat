/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { StructuredData } from "../messaging/Messages";

/**
 * Configuration for file upload behavior in the chat input.
 *
 * @experimental
 * @category Config
 */
export interface UploadConfig {
  /**
   * Whether file upload is enabled. When `true`, the chat renders a file attachment button
   * in the input area. Defaults to `false`.
   *
   * If `is_on` is `true` but `onFileUpload` is not provided, an error is logged and
   * file upload is disabled.
   */
  is_on: boolean;

  /**
   * Accepted MIME types or file extensions, in the same format as the HTML `accept` attribute.
   * Examples: `"image/*"`, `".pdf,.docx"`, `"application/pdf"`.
   * If omitted, all file types are accepted.
   */
  accept?: string;

  /**
   * Maximum file size in bytes. Files exceeding this limit are rejected client-side
   * before `onFileUpload` is called.
   */
  maxFileSizeBytes?: number;

  /**
   * Maximum number of files that can be attached at once. If omitted, there is no limit.
   */
  maxFiles?: number;

  /**
   * Called once per file when the user selects it.
   *
   * Return a {@link StructuredData} object representing this file's contribution to the
   * pending message. The widget merges the returned `StructuredData` into
   * `pendingStructuredData` and tracks it per-upload so that individual files can be
   * removed before the message is sent.
   *
   * On failure: throw or return a rejected `Promise` — the widget marks the file as
   * errored in the UI.
   *
   * @param file - The `File` object selected by the user.
   * @param abortSignal - Fires if the user removes the pending upload before it
   *   completes, or if the chat is destroyed.
   *
   * @experimental
   */
  onFileUpload?: (
    file: File,
    abortSignal: AbortSignal,
  ) => Promise<StructuredData>;
}
