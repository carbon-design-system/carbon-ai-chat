/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The SDK's internal seam: what other layers of this package, such as the
 * view state, may use from the SDK besides its public entry. Nothing here is
 * exported from a package entry point.
 */

export { attachStorePartition } from './attachStorePartition';
export { conversationActions } from './conversationActions';
export type { PartitionReducer } from '../../shared/store/appStore';
export {
  extendPublicState,
  type PublicStateFieldDefinition,
} from './extendPublicState';
export {
  createChatSDK as bootChatSDK,
  type ChatSDKBootOptions,
} from '../createChatSDK';
export { chatOf } from '../handle';
