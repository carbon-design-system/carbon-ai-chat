/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The view's per-item flags live in the view partition, keyed by public item
 * ID (`ChatSDKMessageItem.id`), and keep the lifetime they had on an item's
 * local copy. The first flag there is the choice an option, date, or
 * post-back button sent.
 */

import { act, waitFor } from '@testing-library/react';

import actions from '../../../src/sdk/store/actions';
import { setMessageOptionSelectedFromView } from '../../../src/sdk/utils/messageMetadataCommands';
import { MessageState } from '../../../src/types/config/MessagingConfig';
import type { PublicConfig } from '../../../src/types/config/PublicConfig';
import type { AppStore } from '../../../src/sdk/store/appStore';
import type { ServiceManager } from '../../../src/sdk/services/ServiceManager';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import type { AppState } from '../../../src/types/state/AppState';
import {
  ButtonItemType,
  type GenericItem,
  type MessageRequest,
  type MessageResponse,
  MessageResponseTypes,
} from '../../../src/types/messaging/Messages';
import {
  createBaseConfig,
  getChatShadowRoot,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

beforeEach(setupBeforeEach);
afterEach(setupAfterEach);

const config: PublicConfig = {
  ...createBaseConfig(),
  openChatByDefault: true,
  messaging: { skipWelcome: true, customSendMessage: () => {} },
};

function options(title: string): GenericItem {
  return {
    response_type: MessageResponseTypes.OPTION,
    title,
    options: [
      { label: 'Yes', value: { input: { text: 'yes' } } },
      { label: 'No', value: { input: { text: 'no' } } },
    ],
  } as GenericItem;
}

function cardWithPostBack(): GenericItem {
  return {
    response_type: MessageResponseTypes.CARD,
    body: [{ response_type: MessageResponseTypes.TEXT, text: 'Pick one' }],
    footer: [
      {
        response_type: MessageResponseTypes.BUTTON,
        button_type: ButtonItemType.POST_BACK,
        label: 'Go',
        value: { input: { text: 'go' } },
      },
    ],
  } as GenericItem;
}

function response(id: string, generic: GenericItem[]): MessageResponse {
  return { id, output: { generic } } as MessageResponse;
}

function choice(text: string, responseID: string): MessageRequest {
  return {
    input: { text },
    history: { label: text, related_message_id: responseID },
  } as MessageRequest;
}

/** The local item IDs the transcript shows for a message, in order. */
function localIDsOf(store: AppStore<AppState>, messageID: string) {
  const state = store.getState();
  return state.assistantMessageState.localMessageIDs.filter(
    (id) => state.allMessageItemsByID[id]?.fullMessageID === messageID
  );
}

interface Chat {
  instance: ChatInstance;
  store: AppStore<AppState>;
  serviceManager: ServiceManager;
}

async function chatWith(...messages: MessageResponse[]): Promise<Chat> {
  const chat = (await renderChatAndGetInstanceWithStore(config)) as Chat;
  for (const message of messages) {
    await act(() => chat.instance.messaging.addMessage(message));
  }
  return chat;
}

/** Records a choice the way the post-back button does. */
function choose(chat: Chat, localID: string, request: MessageRequest) {
  act(() =>
    setMessageOptionSelectedFromView(chat.serviceManager, localID, request)
  );
}

const flagsOf = (chat: Chat) => chat.store.getState().view.messageItemFlags;

describe('per-item view flags', () => {
  it('keeps an option chosen through a send under its public item ID, not on the local copy', async () => {
    const chat = await chatWith(response('r1', [options('Continue?')]));
    const [localID] = localIDsOf(chat.store, 'r1');
    const request = choice('yes', 'r1');

    await act(async () => {
      await chat.instance.send(request, {
        setValueSelectedForMessageID: localID,
      });
    });

    expect(flagsOf(chat)).toEqual({
      'r1:i:0': { messageID: 'r1', optionSelected: expect.anything() },
    });
    expect(flagsOf(chat)['r1:i:0'].optionSelected.input.text).toBe('yes');
    expect(
      'optionSelected' in
        chat.store.getState().allMessageItemsByID[localID].ui_state
    ).toBe(false);

    // The option list draws the choice from the view flags.
    await waitFor(() => {
      const buttons = Array.from(
        getChatShadowRoot()?.querySelectorAll<
          HTMLElement & { isSelected?: boolean }
        >('.cds-aichat--button-holder li > *') ?? []
      );
      expect(buttons.map((button) => Boolean(button.isSelected))).toEqual([
        true,
        false,
      ]);
    });
  });

  it('keys a nested post-back button by its nested item ID', async () => {
    const chat = await chatWith(response('r2', [cardWithPostBack()]));
    const [cardID] = localIDsOf(chat.store, 'r2');
    const [buttonID] =
      chat.store.getState().allMessageItemsByID[cardID].ui_state
        .footerLocalMessageItemIDs;
    const request = choice('go', 'r2');

    choose(chat, buttonID, request);

    expect(flagsOf(chat)).toEqual({
      'r2:i:0:f:0': { messageID: 'r2', optionSelected: request },
    });
  });

  it('keeps a choice while a write keeps the item, and drops it when a write builds a new copy, as before', async () => {
    const chat = await chatWith(response('r1', [options('Continue?')]));
    const [localID] = localIDsOf(chat.store, 'r1');
    const request = choice('yes', 'r1');
    choose(chat, localID, request);

    // An unchanged item keeps its local copy, so it keeps the choice.
    await act(() =>
      chat.instance.messaging.upsertMessage('r1', MessageState.COMPLETE, () =>
        response('r1', [options('Continue?')])
      )
    );
    expect(chat.store.getState().allMessageItemsByID[localID]).toBeDefined();
    expect(flagsOf(chat)['r1:i:0']?.optionSelected).toBe(request);

    // A changed item gets a new local copy, which used to start with no choice.
    await act(() =>
      chat.instance.messaging.upsertMessage('r1', MessageState.COMPLETE, () =>
        response('r1', [options('Continue now?')])
      )
    );
    expect(flagsOf(chat)['r1:i:0']).toBeUndefined();
  });

  it('keeps the choices of other messages when one message is written', async () => {
    const chat = await chatWith(
      response('r1', [options('First?')]),
      response('r2', [options('Second?')])
    );
    const request = choice('yes', 'r1');
    choose(chat, localIDsOf(chat.store, 'r1')[0], request);

    await act(() =>
      chat.instance.messaging.upsertMessage('r2', MessageState.COMPLETE, () =>
        response('r2', [options('Second, changed?')])
      )
    );

    expect(flagsOf(chat)['r1:i:0']?.optionSelected).toBe(request);
  });

  it('drops the choices of removed messages, and all of them on a restart', async () => {
    const chat = await chatWith(
      response('r1', [options('First?')]),
      response('r2', [options('Second?')])
    );
    choose(chat, localIDsOf(chat.store, 'r1')[0], choice('yes', 'r1'));
    const kept = choice('no', 'r2');
    choose(chat, localIDsOf(chat.store, 'r2')[0], kept);

    await act(() => chat.instance.messaging.removeMessages(['r1']));
    expect(flagsOf(chat)).toEqual({
      'r2:i:0': { messageID: 'r2', optionSelected: kept },
    });

    await act(() => chat.instance.messaging.restartConversation());
    expect(flagsOf(chat)).toEqual({});
  });

  it('loaded history replaces the choices with its own, and inserted history adds to them', async () => {
    const chat = await chatWith(
      response('r1', [options('First?')]),
      response('r2', [options('Second?')])
    );
    const [first] = localIDsOf(chat.store, 'r1');
    const [second] = localIDsOf(chat.store, 'r2');
    choose(chat, first, choice('yes', 'r1'));
    const state = chat.store.getState();
    const messageHistory = {
      allMessageItemsByID: state.allMessageItemsByID,
      allMessagesByID: state.allMessagesByID,
      assistantMessageState: state.assistantMessageState,
    };
    const fromHistory = choice('no', 'r2');

    act(() =>
      chat.store.dispatch(
        actions.hydrateMessageHistory(messageHistory, false, {
          [second]: fromHistory,
        })
      )
    );
    expect(flagsOf(chat)).toEqual({
      'r2:i:0': { messageID: 'r2', optionSelected: fromHistory },
    });

    const inserted = choice('yes', 'r1');
    act(() =>
      chat.store.dispatch(
        actions.hydrateMessageHistory(messageHistory, true, {
          [first]: inserted,
        })
      )
    );
    expect(flagsOf(chat)).toEqual({
      'r1:i:0': { messageID: 'r1', optionSelected: inserted },
      'r2:i:0': { messageID: 'r2', optionSelected: fromHistory },
    });
  });
});
