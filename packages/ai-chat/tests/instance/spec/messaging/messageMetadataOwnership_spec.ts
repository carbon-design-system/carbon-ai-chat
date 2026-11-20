/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';
import type { ServiceManager } from '../../../../src/chat/services/ServiceManager';
import { addMessages } from '../../../../src/chat/services/haa/humanAgentUtils';
import {
  mergeMessageHistoryFromView,
  setMessageOptionSelectedFromView,
} from '../../../../src/chat/utils/messageMetadataCommands';
import { resolvablePromise } from '../../../../src/chat/utils/resolvablePromise';
import { BusEventType } from '../../../../src/types/events/eventBusTypes';
import { MessageState } from '../../../../src/types/config/MessagingConfig';
import {
  MessageResponseTypes,
  type MessageRequest,
  type MessageResponse,
} from '../../../../src/types/messaging/Messages';
import type { LocalMessageItem } from '../../../../src/types/messaging/LocalMessageItem';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../../test_helpers';

beforeEach(setupBeforeEach);
afterEach(setupAfterEach);

it('restores captured HAA ownership through public history insertion after core takeover during its load', async () => {
  const { instance, store, serviceManager } =
    await renderChatAndGetInstanceWithStore({
      ...createBaseConfig(),
      messaging: { skipWelcome: true, customSendMessage: () => {} },
    });
  const manager = (serviceManager.messageCoordinator as any)
    .serviceManager as ServiceManager;
  const message: MessageResponse = {
    id: 'owned-history',
    history: {},
    output: {
      generic: [
        { response_type: MessageResponseTypes.TEXT, text: 'Agent answer' },
      ],
    },
  };
  const local: LocalMessageItem = {
    fullMessageID: message.id,
    item: message.output.generic[0],
    ui_state: { id: 'owned-history-local' },
  };
  await act(async () => {
    await addMessages(
      [{ originalMessage: message, localMessages: [local] }],
      true,
      manager
    );
  });
  const merge = jest.spyOn(manager.messageCoordinator, 'mergeMessageHistory');
  const select = jest.spyOn(
    manager.messageCoordinator,
    'setMessageOptionSelected'
  );
  const entered = resolvablePromise<void>();
  const release = resolvablePromise<void>();
  instance.on({
    type: BusEventType.HISTORY_BEGIN,
    handler: async () => {
      entered.doResolve();
      await release;
    },
  });
  const history = { feedback: { vote: { is_positive: true } } };
  const selected: MessageRequest = { input: { text: 'Chosen' } };
  let insertion: Promise<void>;
  try {
    act(() => {
      mergeMessageHistoryFromView(manager, message.id, history);
      setMessageOptionSelectedFromView(manager, local.ui_state.id, selected);
    });
    expect(merge).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
    expect(
      store.getState().allMessageItemsByID[local.ui_state.id].ui_state
        .optionSelected
    ).toBe(selected);

    await act(async () => {
      insertion = instance.messaging.insertHistory([
        {
          time: '2026-01-01T00:00:00.000Z',
          message: {
            id: 'older-history',
            output: {
              generic: [
                {
                  response_type: MessageResponseTypes.TEXT,
                  text: 'Older answer',
                },
              ],
            },
          },
        },
      ]);
      await entered;
      await instance.messaging.upsertMessage(
        message.id,
        MessageState.COMPLETE,
        () => ({
          id: message.id,
          output: {
            generic: [
              {
                response_type: MessageResponseTypes.TEXT,
                text: 'Core takeover',
              },
            ],
          },
        })
      );
    });
    act(() => mergeMessageHistoryFromView(manager, message.id, history));
    expect(merge).toHaveBeenCalledTimes(1);

    await act(async () => {
      release.doResolve();
      await insertion;
    });
    expect(
      (store.getState().allMessagesByID[message.id] as MessageResponse).output
        .generic[0]
    ).toMatchObject({ text: 'Agent answer' });
    expect(store.getState().allMessagesByID['older-history']).toBeDefined();
    act(() => {
      mergeMessageHistoryFromView(manager, message.id, history);
      setMessageOptionSelectedFromView(manager, local.ui_state.id, selected);
    });
    expect(merge).toHaveBeenCalledTimes(1);
    expect(select).not.toHaveBeenCalled();
    expect(
      store.getState().allMessageItemsByID[local.ui_state.id].ui_state
        .optionSelected
    ).toBe(selected);
  } finally {
    await act(async () => {
      release.doResolve();
      await insertion;
    });
    merge.mockRestore();
    select.mockRestore();
  }
});
