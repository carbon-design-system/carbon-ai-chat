/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  InputCallbacks,
  isUploadButtonDisabled,
  shouldDisableInput,
  shouldDisableSend,
} from '../../../src/chat/services/inputCallbacks';
import { createAssistantUploadCallbacks } from '../../../src/chat/utils/assistantUploadCallbacks';
import { createPanelCallbacks } from '../../../src/chat/utils/panelCallbacks';
import { selectInputConfig } from '../../../src/chat/utils/inputConfig';
import { shallowEqual } from '../../../src/chat/store/appStore';
import type { AppState } from '../../../src/types/state/AppState';
import type { ServiceManager } from '../../../src/chat/services/ServiceManager';
import {
  MessageSendSource,
  BusEventType,
} from '../../../src/types/events/eventBusTypes';

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
      homeScreenState: { isHomeScreenOpen: true },
    },
  };
  const order: string[] = [];
  const manager = {
    store: {
      getState: () => state,
      dispatch: jest.fn(() => {
        order.push('clear');
      }),
    },
    actions: {
      sendWithCatch: jest.fn(() => {
        order.push('send');
        return new Promise(() => {});
      }),
      restartConversation: jest.fn(),
      changeView: jest.fn(),
      handleFileSelectedForUpload: jest.fn(),
      removePendingUpload: jest.fn(),
    },
    humanAgentService: { sendMessageToAgent: jest.fn() },
    fire: jest.fn(),
  };
  const scroll = jest.fn();
  const controller = new InputCallbacks(
    manager as unknown as ServiceManager,
    scroll
  );
  return { state, manager, scroll, controller, order };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('sends before clearing files without waiting and reads the current route at invocation', async () => {
  const { controller, state, manager, order } = setup();
  await controller.onSendInput('', MessageSendSource.MESSAGE_INPUT);
  expect(order).toEqual(['send', 'clear']);
  expect(manager.actions.sendWithCatch).toHaveBeenNthCalledWith(
    1,
    expect.anything(),
    MessageSendSource.MESSAGE_INPUT,
    { silent: true }
  );
  await controller.onSendInput('', MessageSendSource.MESSAGE_INPUT, {
    silent: false,
  });
  expect(manager.actions.sendWithCatch).toHaveBeenNthCalledWith(
    2,
    expect.anything(),
    MessageSendSource.MESSAGE_INPUT,
    { silent: false }
  );
  state.persistedToBrowserStorage.humanAgentState.isConnected = true;
  const displayContent = { type: 'doc' };
  await controller.onSendInput(
    'agent',
    MessageSendSource.MESSAGE_INPUT,
    undefined,
    displayContent
  );
  expect(manager.humanAgentService.sendMessageToAgent).toHaveBeenCalledWith(
    'agent',
    state.humanAgentState.inputState.files,
    displayContent
  );
  expect(manager.actions.sendWithCatch).toHaveBeenCalledTimes(2);
});

it('cancels deferred scroll on disconnect and delegates navigation and disclaimer actions', async () => {
  const { controller, manager, scroll, state } = setup();
  controller.onToggleHomeScreen();
  expect(scroll).not.toHaveBeenCalled();
  controller.disconnect();
  jest.runAllTimers();
  expect(scroll).not.toHaveBeenCalled();
  controller.onToggleHomeScreen();
  jest.runAllTimers();
  expect(scroll).toHaveBeenCalledTimes(1);
  state.persistedToBrowserStorage.homeScreenState.isHomeScreenOpen = false;
  controller.onToggleHomeScreen();
  jest.runAllTimers();
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

it('delegates each assistant upload and focuses only on panel completion', () => {
  const { manager } = setup();
  const uploads = createAssistantUploadCallbacks(
    manager as unknown as ServiceManager
  );
  const file = new File(['contents'], 'test.txt');
  uploads.onAssistantFilesSelectedForUpload([{ file } as any, { file } as any]);
  uploads.onRemoveAssistantUpload('upload');
  expect(manager.actions.handleFileSelectedForUpload).toHaveBeenCalledTimes(2);
  expect(manager.actions.handleFileSelectedForUpload).toHaveBeenCalledWith(
    file
  );
  expect(manager.actions.removePendingUpload).toHaveBeenCalledWith('upload');
  const focus = jest.fn();
  const panel = createPanelCallbacks(focus);
  panel.onPanelOpenStart();
  panel.onPanelCloseStart();
  expect(focus).not.toHaveBeenCalled();
  panel.onPanelOpenEnd();
  panel.onPanelCloseEnd();
  expect(focus).toHaveBeenCalledTimes(2);
});

it('projects config references and derives input availability', () => {
  const input: AppState['config']['public']['input'] = {
    mention: { trigger: '@', items: [] },
    tiptap: { extensions: [] },
    expanded: true,
  };
  const state = { config: { public: { input } } } as unknown as AppState;
  const first = selectInputConfig(state);
  expect(first.mention).toBe(input.mention);
  expect(first.hostExtensions).toBe(input.tiptap.extensions);
  expect(first.expanded).toBe(true);
  expect(first.isSendDisabledFromConfig).toBe(false);
  expect(shallowEqual(first, selectInputConfig(state))).toBe(true);
  expect(shouldDisableInput(false, false, true)).toBe(true);
  expect(shouldDisableInput(false, false, false)).toBe(false);
  expect(shouldDisableSend(false, false)).toBe(true);
  expect(isUploadButtonDisabled(0, true, false)).toBe(true);
  expect(isUploadButtonDisabled(1, false, true)).toBe(false);
});
