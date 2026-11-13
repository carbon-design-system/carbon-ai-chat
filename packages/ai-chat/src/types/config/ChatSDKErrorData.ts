/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { OnErrorType } from './ErrorConfig';

/**
 * Describes an error in a conversation with no interface. {@link OnErrorData} extends it with the
 * prebuilt chat's catastrophic-error flag.
 *
 * A `createChatSDK` function that starts a conversation with no interface arrives with the
 * `@carbon/ai-chat/sdk` entry point in a 2.x minor release.
 *
 * @category SDK
 */
export interface ChatSDKErrorData {
  /**
   * The type of error that occurred.
   */
  errorType: OnErrorType;

  /**
   * A message associated with the error.
   */
  message: string;

  /**
   * Extra data about the error, such as a stack trace for a thrown error.
   */
  otherData?: unknown;

  /**
   * The ID of the request whose turn failed, for a failure that sets `status` to `error`. Other
   * errors, such as a failed history load or an item the chat can't draw, leave it out.
   */
  messageID?: string;
}
