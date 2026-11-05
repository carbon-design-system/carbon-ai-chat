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
 * `@carbon/ai-chat/sdk` entry point in 2.0.0.
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
   * An extra blob of data associated with the error. This may be a stack trace for thrown errors. For a
   * {@link OnErrorType.RENDER} report about an upserted item the chat can't draw, it names the item and the fields
   * it's missing.
   */
  otherData?: unknown;
}
