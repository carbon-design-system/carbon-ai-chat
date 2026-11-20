/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { cleanup } from '@testing-library/react';
import { OnErrorType } from '../../../src/types/config/ErrorConfig';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';
import { chatStore } from '../../../src/chat/services/attachChatView';

beforeEach(setupBeforeEach);
afterEach(async () => {
  jest.restoreAllMocks();
  await setupAfterEach();
});

const catastrophic = {
  errorType: OnErrorType.RENDER,
  message: 'A test failure',
  catastrophicErrorType: true,
};

async function boot() {
  const result = await renderChatAndGetInstanceWithStore(createBaseConfig());
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  return result;
}

// Conversation code changes the loading counters and raises the error screen
// only through the attached view's ports.
describe('view state that conversation code writes', () => {
  it('reaches the attached view', async () => {
    const { instance, serviceManager } = await boot();
    const { messageCoordinator, actions } = serviceManager;

    instance.updateIsMessageLoadingCounter('increase', 'Thinking');
    instance.updateIsChatLoadingCounter('increase');
    messageCoordinator.changeMessageLoadingCounter(1);
    actions.errorOccurred(catastrophic);

    const state = chatStore(serviceManager).getState();
    expect(state.view.isMessageLoadingCounter).toBe(2);
    expect(state.view.isMessageLoadingText).toBeUndefined();
    expect(state.view.isHydratingCounter).toBe(1);
    expect(state.view.catastrophicErrorType).toBe(true);
  });

  it('reaches the attached view through the agent and messaging ports', async () => {
    const { serviceManager } = await boot();
    const { humanAgent, messaging } = serviceManager.view.current;

    const view = () => chatStore(serviceManager).getState().view;

    humanAgent.changeMessageLoadingCounter(1);
    expect(view().isMessageLoadingCounter).toBe(1);

    humanAgent.announce({ messageID: 'fileSharing_uploadFailed' });
    expect(view().announceMessage).toEqual({
      messageID: 'fileSharing_uploadFailed',
    });

    messaging.announce({
      messageID: 'messages_streamingStart',
      messageValues: { sender: 'Bot' },
    });
    expect(view().announceMessage).toEqual({
      messageID: 'messages_streamingStart',
      messageValues: { sender: 'Bot' },
    });
  });

  it('does nothing, and does not throw, with no view attached', async () => {
    const { instance, serviceManager } = await boot();
    const { store, messageCoordinator, actions } = serviceManager;
    cleanup();
    await Promise.resolve();
    const before = store.getState();

    instance.updateIsMessageLoadingCounter('increase', 'Thinking');
    instance.updateIsMessageLoadingCounter('decrease');
    instance.updateIsMessageLoadingCounter(undefined, 'Still thinking');
    instance.updateIsMessageLoadingCounter('reset');
    instance.updateIsChatLoadingCounter('increase');
    messageCoordinator.changeMessageLoadingCounter(1);
    messageCoordinator.changeHydrationCounter(1);
    actions.errorOccurred(catastrophic);

    expect(store.getState()).toBe(before);
  });

  it('still reports a direction it does not know with no view attached', async () => {
    const { instance } = await boot();
    cleanup();
    await Promise.resolve();
    const error = console.error as jest.Mock;
    error.mockClear();

    instance.updateIsMessageLoadingCounter('sideways' as 'increase');
    instance.updateIsChatLoadingCounter('sideways' as 'increase');

    expect(error).toHaveBeenCalledTimes(2);
    expect(String(error.mock.calls[0])).toContain(
      '[updateIsMessageLoadingCounter] Invalid direction: sideways.'
    );
    expect(String(error.mock.calls[1])).toContain(
      '[updateIsChatLoadingCounter] Invalid direction: sideways.'
    );
  });
});
