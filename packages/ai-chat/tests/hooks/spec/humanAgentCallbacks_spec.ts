/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { HumanAgentCallbacks } from '../../../src/chat/services/humanAgentCallbacks';
import { ChatMountState } from '../../../src/chat/services/chatMountState';
import type { ServiceManager } from '../../../src/sdk/services/ServiceManager';
import { answerPrompt } from '../../../src/chat/state';
import { chatStore } from '../../../src/chat/services/attachChatView';
import { makeConfigStore } from '../../test_helpers';

function setup() {
  const state = { humanAgent: { isConnected: false } };
  const service = {
    endChat: jest.fn(),
    userTyping: jest.fn(),
    filesSelectedForUpload: jest.fn(),
  };
  const manager = {
    instance: { state: { get: () => state } },
    humanAgentService: service,
    store: makeConfigStore({}),
  } as unknown as ServiceManager;
  const focus = jest.fn();
  const viewState = new ChatMountState(manager, { width: 0, height: 0 });
  return {
    state,
    service,
    focus,
    viewState,
    manager,
    controller: new HumanAgentCallbacks(viewState),
  };
}

it("keeps the end-chat prompt in the chat's view state", () => {
  const { controller, service, manager } = setup();
  const store = chatStore(manager);
  const prompt = () => store.getState().view.prompt;
  const listener = jest.fn();
  const unsubscribe = store.subscribe(listener);
  expect(prompt()).toBeNull();
  controller.showConfirmEndChat();
  controller.showConfirmEndChat();
  expect(prompt()).toMatchObject({ kind: 'endChat' });
  expect(listener).toHaveBeenCalledTimes(1);
  answerPrompt(store, prompt().id, 'confirm');
  expect(prompt()).toBeNull();
  expect(service.endChat).toHaveBeenCalledWith(true);
  unsubscribe();
  controller.showConfirmEndChat();
  expect(listener).toHaveBeenCalledTimes(2);
});

it('ends the agent chat from a prompt answered after its mount left', () => {
  const { controller, service, manager, viewState } = setup();
  const store = chatStore(manager);
  controller.showConfirmEndChat();
  viewState.disconnect();

  answerPrompt(store, store.getState().view.prompt.id, 'confirm');

  expect(service.endChat).toHaveBeenCalledWith(true);
});

it('reads current connection state for typing and honors upload focus policy', () => {
  const { controller, state, service, focus } = setup();
  controller.onUserTyping(true);
  expect(service.userTyping).not.toHaveBeenCalled();
  state.humanAgent.isConnected = true;
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
