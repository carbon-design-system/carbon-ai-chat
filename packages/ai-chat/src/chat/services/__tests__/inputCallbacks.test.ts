/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { InputCallbacks } from '../inputCallbacks';

import type { ServiceManager } from '../../../sdk/services/ServiceManager';
import { BusEventType } from '../../../types/events/eventBusTypes';

function setup() {
  const state = {
    assistantInputState: {
      files: [{ id: 'assistant-file' }],
      pendingStructuredData: {},
    },
    humanAgentState: {
      inputState: { files: [{ id: 'agent-file' }], pendingStructuredData: {} },
    },
    persistedToBrowserStorage: {
      humanAgentState: { isConnected: false },
    },
    view: {
      persistedToBrowserStorage: {
        homeScreenState: { isHomeScreenOpen: true },
      },
    },
  };
  const order: string[] = [];
  const manager = {
    store: {
      getState: () => state,
      dispatch: vi.fn(() => {
        order.push('clear');
      }),
    },
    actions: {
      sendWithCatch: vi.fn(() => {
        order.push('send');
        return new Promise(() => {});
      }),
      restartConversation: vi.fn(),
      changeView: vi.fn(),
      handleFileSelectedForUpload: vi.fn(),
      removePendingUpload: vi.fn(),
    },
    humanAgentService: { sendMessageToAgent: vi.fn() },
    fire: vi.fn(),
  };
  const scroll = vi.fn();
  const controller = new InputCallbacks(
    manager as unknown as ServiceManager,
    scroll
  );
  return { state, manager, scroll, controller, order };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('cancels deferred scroll on disconnect and delegates navigation and disclaimer actions', async () => {
  const { controller, manager, scroll, state } = setup();
  controller.onToggleHomeScreen();
  expect(scroll).not.toHaveBeenCalled();
  controller.disconnect();
  vi.runAllTimers();
  expect(scroll).not.toHaveBeenCalled();
  controller.onToggleHomeScreen();
  vi.runAllTimers();
  expect(scroll).toHaveBeenCalledTimes(1);
  state.view.persistedToBrowserStorage.homeScreenState.isHomeScreenOpen = false;
  controller.onToggleHomeScreen();
  vi.runAllTimers();
  expect(scroll).toHaveBeenCalledTimes(1);
  await controller.onRestart();
  await controller.onClose();
  controller.onAcceptDisclaimer();
  expect(manager.actions.restartConversation).toHaveBeenCalledTimes(1);
  expect(manager.actions.changeView).toHaveBeenCalledWith('launcher', {
    viewChangeReason: 'main_window_minimized',
    mainWindowCloseReason: 'default_minimize',
  });
  expect(manager.fire).toHaveBeenCalledWith({
    type: BusEventType.DISCLAIMER_ACCEPTED,
  });
});
