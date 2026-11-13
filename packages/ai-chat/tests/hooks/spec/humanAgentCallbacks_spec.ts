/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { HumanAgentCallbacks } from '../../../src/chat/services/humanAgentCallbacks';
import { ChatViewState } from '../../../src/chat/services/chatViewState';
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
  const viewState = new ChatViewState(manager, { width: 0, height: 0 });
  return {
    state,
    service,
    focus,
    viewState,
    controller: new HumanAgentCallbacks(viewState),
  };
}

it('keeps the end-chat prompt state in the view state', () => {
  const { controller, service, viewState } = setup();
  const isOpen = () => viewState.getSnapshot().endChatConfirmationOpen;
  const listener = jest.fn();
  const unsubscribe = viewState.subscribe(listener);
  expect(isOpen()).toBe(false);
  controller.showConfirmEndChat();
  controller.showConfirmEndChat();
  expect(isOpen()).toBe(true);
  expect(listener).toHaveBeenCalledTimes(1);
  controller.confirmHumanAgentEndChat();
  expect(isOpen()).toBe(false);
  expect(service.endChat).toHaveBeenCalledWith(true);
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
