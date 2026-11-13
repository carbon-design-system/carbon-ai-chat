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
 * exports it, and `@carbon/ai-chat/sdk` publishes it in a 2.x minor release (#1834). Until
 * `createChatSDK` lands (#1732), it re-exports the SDK types that the root
 * entry already exports, so the boundary and surface checks have a root.
 */

export type {
  ChatSDKEventType,
  ChatSDKHandlers,
  ChatSDKInstance,
} from '../types/instance/ChatSDKInstance';
export type {
  ChatSDKState,
  ChatSDKStateAccess,
} from '../types/instance/ChatSDKState';
export type { ChatSDKConfig } from '../types/config/ChatSDKConfig';
export type { ChatSDKConfigMessaging } from '../types/config/ChatSDKConfigMessaging';
export type { ChatSDKErrorData } from '../types/config/ChatSDKErrorData';
export type { ChatSDKInstanceMessaging } from '../types/config/ChatSDKInstanceMessaging';
export type { ChatSDKPersistedStateConfig } from '../types/config/ChatSDKPersistedStateConfig';
export type { ChatSDKServiceDeskConfig } from '../types/config/ChatSDKServiceDeskConfig';
