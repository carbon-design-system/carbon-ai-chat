/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { makeConfigStore } from '../../test_helpers';
import actions from '../../../src/shared/store/actions';
import { PublicStateService } from '../../../src/shared/services/PublicStateService';
import { MessageCoordinator } from '../../../src/shared/services/messaging/MessageCoordinator';
import { MessagePresentationAdapter } from '../../../src/chat/services/MessagePresentationAdapter';
import type { PublicChatState } from '../../../src/types/instance/PublicChatState';
import type { ServiceManager } from '../../../src/shared/services/ServiceManager';
import type { MessagePresentationPort } from '../../../src/shared/services/messaging/presentationPort';
import { PendingUploadStatus } from '../../../src/types/state/AppState';
import type { MessageRequest } from '../../../src/types/messaging/Messages';
import { MessageSendSource } from '../../../src/types/events/eventBusTypes';
import { resolvablePromise } from '../../../src/shared/utils/resolvablePromise';
import { withMessagingView } from '../helpers/viewBindings';
import { viewActions } from '../../../src/view/state';
import { chatStore } from '../../../src/chat/services/attachChatView';

function harness(
  presentation?:
    | MessagePresentationPort
    | ((manager: ServiceManager) => MessagePresentationPort)
) {
  const store = makeConfigStore({ messaging: {} });
  const hydration = resolvablePromise<void>();
  const transport = resolvablePromise<void>();
  const footer = resolvablePromise<void>();
  const send = jest.fn((_message: MessageRequest): Promise<void> => transport);
  const manager = {
    store,
    hydrationService: { hydrationPromise: hydration },
    messageCoordinator: { enqueueMessage: send },
  } as unknown as ServiceManager;
  const sender = new MessageCoordinator(
    withMessagingView(
      manager,
      typeof presentation === 'function' ? presentation(manager) : presentation
    )
  );
  manager.messageCoordinator = sender;
  jest.spyOn(sender, 'enqueueMessage').mockImplementation(send);
  jest
    .spyOn(sender, 'handleCustomRequestFooterSlot')
    .mockImplementation(() => footer);
  return { store, hydration, transport, footer, send, sender, manager };
}

it('admits without a view, keeps the hydration wait, and does not wait for the footer', async () => {
  const { store, hydration, transport, send, sender } = harness();
  store.dispatch(actions.setActiveResponseId('old-response'));
  store.dispatch(
    actions.updateStructuredData({ user_defined: { value: 1 } }, false)
  );
  const message = { input: { text: 'headless' } };
  let settled = false;
  const result = sender
    .send(message, MessageSendSource.MESSAGE_INPUT)
    .then(() => {
      settled = true;
    });
  expect(store.getState().assistantMessageState.activeResponseId).toBeNull();
  expect(send).not.toHaveBeenCalled();
  hydration.doResolve();
  await Promise.resolve();
  expect(send).toHaveBeenCalledTimes(1);
  const queued = send.mock.calls[0][0];
  expect(queued.input.structured_data).toEqual({ user_defined: { value: 1 } });
  expect(queued).not.toBe(message);
  expect(Object.isFrozen(message)).toBe(true);
  expect(settled).toBe(false);
  transport.doResolve();
  await result;
  expect(settled).toBe(true);
});

it('blocks an upload that starts during hydration before queue admission', async () => {
  const { store, hydration, send, sender } = harness();
  const result = sender.send('blocked', MessageSendSource.MESSAGE_INPUT);
  store.dispatch(
    actions.addPendingUpload(
      {
        id: 'upload',
        file: new File(['data'], 'test.txt'),
        status: PendingUploadStatus.UPLOADING,
      },
      false
    )
  );
  hydration.doResolve();
  await expect(result).rejects.toThrow(
    'Cannot send while a file upload is in progress.'
  );
  expect(send).not.toHaveBeenCalled();
});

it('captures custom input before hydration and reads panels after earlier writes', async () => {
  let custom = true;
  let homeOpen = false;
  let responseOpen = false;
  const order: string[] = [];
  const presentation: MessagePresentationPort = {
    hasCustomPromptLine: () => custom,
    announceSending: () => {
      order.push('announce');
    },
    requestComposerFocus: () => {
      order.push('focus');
    },
    closeHomeScreenIfOpen: () => {
      expect(homeOpen).toBe(true);
      order.push('home');
      responseOpen = true;
    },
    closeResponsePanelIfOpen: () => {
      expect(responseOpen).toBe(true);
      order.push('response');
    },
    closeHomeScreen: jest.fn(),
  };
  const { store, hydration, transport, send, sender } = harness(presentation);
  store.dispatch(actions.setActiveResponseId('old-response'));
  store.dispatch(
    actions.updateStructuredData({ user_defined: { value: 1 } }, false)
  );
  const unsubscribe = store.subscribe(() => {
    if (store.getState().assistantMessageState.activeResponseId === null) {
      homeOpen = true;
      order.push('active-cleared');
    }
  });
  const result = sender.send('custom', MessageSendSource.MESSAGE_INPUT);
  unsubscribe();
  expect(order).toEqual([
    'announce',
    'focus',
    'active-cleared',
    'home',
    'response',
  ]);
  custom = false;
  hydration.doResolve();
  await Promise.resolve();
  expect(send.mock.calls[0][0].input.structured_data).toBeUndefined();
  expect(store.getState().assistantInputState.pendingStructuredData).toEqual({
    user_defined: { value: 1 },
  });
  transport.doResolve();
  await result;
});

it('publishes the same conversation states with an adapter or without a view', async () => {
  async function run(withAdapter: boolean) {
    const announce = jest.fn();
    const focus = jest.fn(() => false);
    const makeAdapter = (manager: ServiceManager) =>
      new MessagePresentationAdapter({
        hasCustomPromptLine: () => false,
        announceSending: announce,
        requestComposerFocus: focus,
        isHomeScreenOpen: () =>
          chatStore(manager).getState().view.persistedToBrowserStorage
            .homeScreenState.isHomeScreenOpen,
        closeHomeScreen: () =>
          manager.store.dispatch(viewActions.setHomeScreenIsOpen(false)),
        isResponsePanelOpen: () =>
          chatStore(manager).getState().view.responsePanelState.isOpen,
        closeResponsePanel: () =>
          manager.store.dispatch(viewActions.setResponsePanelIsOpen(false)),
      });
    const { store, hydration, transport, footer, send, manager, sender } =
      harness(withAdapter ? makeAdapter : undefined);
    manager.eventBus = {
      hasListeners: () => false,
    } as unknown as ServiceManager['eventBus'];
    const coordinator = sender;
    store.dispatch(viewActions.setHomeScreenIsOpen(false));
    store.dispatch(actions.setActiveResponseId('existing-response'));
    store.dispatch(
      actions.updateStructuredData({ user_defined: { value: 1 } }, false)
    );
    const generation = coordinator.hydrationStarted();
    const publicState = new PublicStateService(manager);
    const trace: PublicChatState[] = [publicState.get()];
    const unsubscribe = publicState.subscribe(() => {
      trace.push(publicState.get());
    });
    send.mockImplementation(async (message) => {
      coordinator.requestStarted(message.id, generation, message);
      await transport;
      coordinator.requestFinished(message.id, generation);
    });
    const message = {
      id: 'same-request',
      input: { text: 'same input' },
      history: { timestamp: 1 },
    };
    let settled = false;
    let footerSettled = false;
    void footer.then(() => {
      footerSettled = true;
    });
    const result = sender
      .send(message, MessageSendSource.MESSAGE_INPUT)
      .then(() => {
        settled = true;
      });
    try {
      expect(trace[0].activeResponseId).toBe('existing-response');
      expect(publicState.get().activeResponseId).toBeNull();
      expect(publicState.get().status).toBe('loading');
      expect(send).not.toHaveBeenCalled();
      coordinator.hydrationFinished(generation);
      hydration.doResolve();
      await Promise.resolve();
      expect(send).toHaveBeenCalledTimes(1);
      expect(send.mock.calls[0][0].input.structured_data).toEqual({
        user_defined: { value: 1 },
      });
      expect(publicState.get().input.structuredData).toBeUndefined();
      expect(publicState.get().status).toBe('submitted');
      expect(settled).toBe(false);
      transport.doResolve();
      await result;
      expect(publicState.get().status).toBe('ready');
      expect(publicState.get().messages).toEqual([
        expect.objectContaining({ id: 'same-request' }),
      ]);
      expect(footerSettled).toBe(false);
      expect(
        manager.messageCoordinator.handleCustomRequestFooterSlot
      ).toHaveBeenCalledTimes(1);
      expect(announce).toHaveBeenCalledTimes(withAdapter ? 1 : 0);
      expect(focus).toHaveBeenCalledTimes(withAdapter ? 1 : 0);
      return trace;
    } finally {
      unsubscribe();
      publicState.destroy();
    }
  }
  const withAdapter = await run(true);
  const withoutAdapter = await run(false);
  expect(withAdapter).toEqual(withoutAdapter);
  expect([...new Set(withAdapter.map((state) => state.status))]).toEqual([
    'loading',
    'ready',
    'submitted',
  ]);
});
