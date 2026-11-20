/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

export {
  addUserDefinedResponse,
  getChatHost,
  getChatShadowRoot,
  type ChatInstanceWithStore,
  renderChatAndGetInstance,
  renderChatAndGetInstanceWithStore,
  unmountKeepingServices,
  setupAfterEach,
} from '../src/chat/__tests__/helpers/render';
export { mockCustomSendMessage } from '../src/sdk/__tests__/helpers/config';
export {
  createBaseTestProps,
  createBaseConfig,
} from '../src/chat/__tests__/helpers/config';
export {
  type TestChatContextOptions,
  createTestViewState,
  TestChatContext,
} from '../src/chat/__tests__/helpers/context';
export {
  appRootReducer,
  makeConfigStore,
  withView,
  applyConfigChange,
} from '../src/chat/__tests__/helpers/store';
export { withPublicState } from '../src/sdk/__tests__/helpers/store';
export { setupBeforeEach } from '../src/sdk/__tests__/helpers/setup';
export { slotSourceOf } from '../src/sdk/__tests__/helpers/slots';
export {
  itemFlagsFor,
  cannotDrawOf,
  itemsWithOptionSelected,
  needsAnnouncementOf,
} from '../src/chat/__tests__/helpers/messageFlags';
