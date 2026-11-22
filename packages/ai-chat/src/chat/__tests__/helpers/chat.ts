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
} from './render';
export { mockCustomSendMessage } from '../../../sdk/__tests__/helpers/config';
export { createBaseTestProps, createBaseConfig } from './config';
export {
  type TestChatContextOptions,
  createTestViewState,
  TestChatContext,
} from './context';
export {
  appRootReducer,
  makeConfigStore,
  withView,
  applyConfigChange,
} from './store';
export { withPublicState } from '../../../sdk/__tests__/helpers/store';
export { setupBeforeEach } from '../../../sdk/__tests__/helpers/setup';
export { slotSourceOf } from '../../../sdk/__tests__/helpers/slots';
export {
  itemFlagsFor,
  cannotDrawOf,
  itemsWithOptionSelected,
  needsAnnouncementOf,
} from './messageFlags';
