/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import merge from 'lodash-es/merge.js';

import type { ChatSDKConfig } from '../types/config/ChatSDKConfig';
import type {
  ConversationAppConfig,
  ConversationConfig,
} from '../types/state/ConversationState';

/**
 * The config a chat starts from. The conversation reads `messaging` and
 * `serviceDesk` without checking them, so both always exist. The config is
 * merged into it field by field, and each service applies its own default for
 * a field left out, such as the message timeout.
 */
const DEFAULT_SDK_CONFIG: ChatSDKConfig = {
  messaging: {},
  serviceDesk: {},
};

/** Builds the config the store holds for a chat with no view. */
function createSDKAppConfig(config: ChatSDKConfig = {}): ConversationAppConfig {
  return {
    // The SDK's callbacks take `ChatSDKInstance`; the conversation code that
    // calls them passes the chat's instance, which is one.
    // Merging into a new object copies plain data and keeps functions and
    // class instances by reference (#1833).
    public: merge({}, DEFAULT_SDK_CONFIG, config) as ConversationConfig,
  };
}

export { createSDKAppConfig, DEFAULT_SDK_CONFIG };
