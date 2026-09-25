/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { HumanAgentCallbacks } from '../../../src/chat/services/humanAgentCallbacks';
import type { ServiceManager } from '../../../src/chat/services/ServiceManager';

function setup() {
  const state = {
    persistedToBrowserStorage: { humanAgentState: { isConnected: false } },
  };
  const service = {
    endChat: jest.fn(),
    userTyping: jest.fn(),
    filesSelectedForUpload: jest.fn(),
  };
  const manager = {
    store: { getState: () => state },
    humanAgentService: service,
  } as unknown as ServiceManager;
  const focus = jest.fn();
  return {
    state,
    service,
    focus,
    controller: new HumanAgentCallbacks(manager, focus),
  };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('owns confirmation state and cancels deferred focus when disconnected', () => {
  const { controller, focus, service } = setup();
  const listener = jest.fn();
  const unsubscribe = controller.subscribe(listener);
  expect(controller.getSnapshot()).toBe(false);
  controller.showConfirmEndChat();
  controller.showConfirmEndChat();
  expect(controller.getSnapshot()).toBe(true);
  expect(listener).toHaveBeenCalledTimes(1);
  controller.confirmHumanAgentEndChat();
  expect(controller.getSnapshot()).toBe(false);
  expect(service.endChat).toHaveBeenCalledWith(true);
  expect(focus).not.toHaveBeenCalled();
  controller.disconnect();
  controller.disconnect();
  jest.runAllTimers();
  expect(focus).not.toHaveBeenCalled();
  controller.hideConfirmEndChat();
  jest.runAllTimers();
  expect(focus).toHaveBeenCalledTimes(1);
  unsubscribe();
  controller.showConfirmEndChat();
  expect(listener).toHaveBeenCalledTimes(2);
});

it('reads current connection state for typing and honors upload focus policy', () => {
  const { controller, state, service, focus } = setup();
  controller.onUserTyping(true);
  expect(service.userTyping).not.toHaveBeenCalled();
  state.persistedToBrowserStorage.humanAgentState.isConnected = true;
  controller.onUserTyping(false);
  expect(service.userTyping).toHaveBeenCalledWith(false);
  const uploads: Parameters<
    HumanAgentCallbacks['onFilesSelectedForUpload']
  >[0] = [];
  controller.onFilesSelectedForUpload(uploads, false, false, focus);
  expect(service.filesSelectedForUpload).not.toHaveBeenCalled();
  controller.onFilesSelectedForUpload(uploads, true, true, focus);
  expect(focus).not.toHaveBeenCalled();
  controller.onFilesSelectedForUpload(uploads, true, false, focus);
  expect(service.filesSelectedForUpload).toHaveBeenCalledWith(uploads);
  expect(focus).toHaveBeenCalledTimes(1);
});
