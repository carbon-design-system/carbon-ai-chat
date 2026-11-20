/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { StructuredData } from '../messaging/Messages';

/**
 * Upload settings for a conversation with no interface: the limits
 * {@link ChatSDKInstanceMessaging.addFile} checks, and the `onFileUpload` that transfers each file.
 * Setting `onFileUpload` turns uploads on. {@link UploadConfig} extends it with the prebuilt
 * chat's attach button.
 *
 * A `createChatSDK` function that starts a conversation with no interface arrives with the
 * `@carbon/ai-chat/sdk` entry point in a 2.x minor release.
 *
 * @category SDK
 */
export interface ChatSDKUploadConfig {
  /**
   * Accepted MIME types or file extensions, in the format of the HTML `accept` attribute, such as
   * `"image/*"` or `".pdf,.docx"`. All types are accepted when it's left out.
   */
  accept?: string;

  /** The largest file allowed, in bytes. Larger files are rejected before `onFileUpload` runs. */
  maxFileSizeBytes?: number;

  /** How many files one message can carry. No limit when it's left out. */
  maxFiles?: number;

  /**
   * Transfers one file and returns what it adds to the next message. Throw to reject the file; your
   * error's message becomes that file's `errorMessage` in `state.get().pendingUploads`. The signal
   * aborts when the file is removed before it finishes, or with
   * {@link CancellationReason.CHAT_REMOVED} when the chat is removed.
   */
  onFileUpload?: (
    file: File,
    abortSignal: AbortSignal
  ) => Promise<StructuredData>;
}
