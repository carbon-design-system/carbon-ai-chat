/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The headless SDK's entry. It's internal in 1.x: no package entry point
 * exports it, and `@carbon/ai-chat/sdk` publishes it in a 2.x minor release
 * (#1834).
 */

import type { ChatSDKConfig } from '../types/config/ChatSDKConfig';
import { createChatSDK as bootChatSDK } from './createChatSDK';
import type { ChatSDKHandle } from './handle';

/**
 * Starts a conversation with no interface. Takes no DOM element, touches no
 * DOM, and reads or writes no browser storage. Resolves once services are
 * built and history has loaded; rejects if either fails.
 *
 * A create on a namespace whose chat was released less than a grace window
 * ago resumes that conversation, with a new handle and this config applied as
 * a replacement. A create on a namespace whose chat another handle still
 * holds rejects. A missing namespace is a namespace like any other.
 */
export const createChatSDK: (
  config?: ChatSDKConfig
) => Promise<ChatSDKHandle> = (config) => bootChatSDK(config, { reuse: true });
export type { ChatSDKHandle } from './handle';
export type {
  ChatSDKEventType,
  ChatSDKHandlers,
  ChatSDKInstance,
} from '../types/instance/ChatSDKInstance';
export type {
  ChatSDKPendingUpload,
  ChatSDKState,
  ChatSDKStateAccess,
} from '../types/instance/ChatSDKState';
export type { ChatSDKConfig } from '../types/config/ChatSDKConfig';
export type { ChatSDKConfigMessaging } from '../types/config/ChatSDKConfigMessaging';
export type { ChatSDKErrorData } from '../types/config/ChatSDKErrorData';
export type {
  ChatSDKInstanceMessaging,
  FailTurnOptions,
} from '../types/config/ChatSDKInstanceMessaging';
export type { ChatSDKPersistedStateConfig } from '../types/config/ChatSDKPersistedStateConfig';
export type { ChatSDKServiceDeskConfig } from '../types/config/ChatSDKServiceDeskConfig';
export type { ChatSDKUploadConfig } from '../types/config/ChatSDKUploadConfig';
