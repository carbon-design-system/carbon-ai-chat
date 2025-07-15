/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { RenderFunctionType } from "../../chat/shared/ChatInterface";

/**
 * This interface represents an object of additional parameters that are passed from loadWatsonAssistantChat to
 * Chat. Everything else passed from loadWAC is config info that should be kept separate, this object is
 * specifically info for our use that would not be specified in those configs.
 * This object only came into existence after the v2.3 Carbon AI chat release.
 */
interface AdditionalChatParameters {
  /**
   * This is a one-off listener for errors. This value may be provided in the initial page config as a hook for
   * customers to listen for errors.
   */
  onError?: (data: OnErrorData) => void;

  /**
   * Render function override.
   */
  render?: Promise<RenderFunctionType>;
}

export { AdditionalChatParameters };
