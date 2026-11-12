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

import viewActions from '../../../src/chat/state/actions';
import type { HistoryItem } from '../../../src/types/messaging/History';

import actions from '../../../src/sdk/store/actions';
import { addMessages } from '../../../src/sdk/services/haa/humanAgentUtils';
import type { LocalMessageItem } from '../../../src/types/messaging/LocalMessageItem';
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

// Records every announcement instead of speaking it.
const mockAnnounce = jest.fn();

jest.mock(
  '@carbon/ai-chat-components/es/globals/utils/aria-announcer-manager.js',
  () => ({
    ...jest.requireActual(
      '@carbon/ai-chat-components/es/globals/utils/aria-announcer-manager.js'
    ),
    mountAriaAnnouncer: () => ({
      announce: mockAnnounce,
      disconnect: jest.fn(),
    }),
  })
);

beforeEach(setupBeforeEach);
beforeEach(() => mockAnnounce.mockClear());
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

/** The choices the view's flags record, by item ID, without the other flags. */
const choicesOf = (chat: Chat) =>
  Object.fromEntries(
    Object.entries(chat.store.getState().view.messageItemFlags)
      .filter(([, flags]) => flags.optionSelected)
      .map(([itemID, { messageID, optionSelected }]) => [
        itemID,
        { messageID, optionSelected },
      ])
  );

/** Every element under `root` that matches `selector`, through shadow roots. */
function deepQueryAll(root: ParentNode, selector: string): Element[] {
  return Array.from(root.querySelectorAll('*')).flatMap((element) => [
    ...(element.matches(selector) ? [element] : []),
    ...(element.shadowRoot ? deepQueryAll(element.shadowRoot, selector) : []),
  ]);
}

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

    expect(choicesOf(chat)).toEqual({
      'r1:i:0': { messageID: 'r1', optionSelected: expect.anything() },
    });
    expect(choicesOf(chat)['r1:i:0'].optionSelected.input.text).toBe('yes');
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

    expect(choicesOf(chat)).toEqual({
      'r2:i:0:f:0': { messageID: 'r2', optionSelected: request },
    });

    // The button item reads the flag and passes it to the post-back button.
    await waitFor(() => {
      const pressed = deepQueryAll(document, '[aria-pressed]').filter(
        (element) => element.textContent?.includes('Go')
      );
      expect(pressed.length).toBeGreaterThan(0);
      expect(
        pressed.every(
          (element) => element.getAttribute('aria-pressed') === 'true'
        )
      ).toBe(true);
    });
  });

  it('moves a choice with its local copy when the copy is drawn under another ID', async () => {
    const chat = await chatWith(response('r1', [options('Continue?')]));
    const [localID] = localIDsOf(chat.store, 'r1');
    const request = choice('yes', 'r1');
    choose(chat, localID, request);

    // A hidden item in front shifts the item's index; the list keeps the copy.
    await act(() =>
      chat.instance.messaging.upsertMessage('r1', MessageState.COMPLETE, () =>
        response('r1', [
          {
            response_type: MessageResponseTypes.TEXT,
            text: 'hidden',
            user_defined: { silent: true },
          } as GenericItem,
          options('Continue?'),
        ])
      )
    );

    expect(localIDsOf(chat.store, 'r1')).toEqual([localID]);
    expect(choicesOf(chat)).toEqual({
      'r1:i:1': { messageID: 'r1', optionSelected: request },
    });
  });

  it('keeps a choice through a streamed chunk into its item, as the spread copy did', async () => {
    const chat = await chatWith();
    const stream = (chunk: Record<string, unknown>) =>
      act(() => chat.instance.messaging.addMessageChunk(chunk as any));
    await stream({
      streaming_metadata: { response_id: 'r3' },
      complete_item: {
        streaming_metadata: { id: 'opts' },
        ...options('Continue?'),
      },
    });
    const [localID] = localIDsOf(chat.store, 'r3');
    const request = choice('yes', 'r3');
    choose(chat, localID, request);

    await stream({
      streaming_metadata: { response_id: 'r3' },
      partial_item: {
        streaming_metadata: { id: 'opts' },
        response_type: MessageResponseTypes.OPTION,
      },
    });

    expect(chat.store.getState().allMessageItemsByID[localID]).toBeDefined();
    expect(choicesOf(chat)).toEqual({
      'r3:s:opts': { messageID: 'r3', optionSelected: request },
    });
  });

  it('drops a choice when addMessage replaces its message, as before', async () => {
    const chat = await chatWith(response('r1', [options('Continue?')]));
    choose(chat, localIDsOf(chat.store, 'r1')[0], choice('yes', 'r1'));

    await act(() =>
      chat.instance.messaging.addMessage(response('r1', [options('Continue?')]))
    );

    expect(localIDsOf(chat.store, 'r1')).toHaveLength(1);
    expect(choicesOf(chat)).toEqual({});
  });

  it('drops a choice when an added local item replaces its copy, as before', async () => {
    const chat = await chatWith();
    // Agent messages arrive as added local items.
    const manager = (chat.serviceManager.messageCoordinator as any)
      .serviceManager as ServiceManager;
    const message = {
      ...response('agent', [options('Continue?')]),
      history: {},
    };
    const add = () =>
      act(() =>
        addMessages(
          [
            {
              originalMessage: message,
              localMessages: [
                {
                  item: message.output.generic[0],
                  fullMessageID: message.id,
                  ui_state: { id: 'agent-options' },
                } as LocalMessageItem,
              ],
            },
          ],
          true,
          manager
        )
      );
    await add();
    choose(chat, 'agent-options', choice('yes', 'agent'));
    expect(Object.keys(choicesOf(chat))).toEqual(['agent:i:0']);

    await add();

    expect(localIDsOf(chat.store, 'agent')).toEqual(['agent-options']);
    expect(choicesOf(chat)).toEqual({});
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
    expect(choicesOf(chat)['r1:i:0']?.optionSelected).toBe(request);

    // A changed item gets a new local copy, which used to start with no choice.
    await act(() =>
      chat.instance.messaging.upsertMessage('r1', MessageState.COMPLETE, () =>
        response('r1', [options('Continue now?')])
      )
    );
    expect(choicesOf(chat)['r1:i:0']).toBeUndefined();
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

    expect(choicesOf(chat)['r1:i:0']?.optionSelected).toBe(request);
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
    expect(choicesOf(chat)).toEqual({
      'r2:i:0': { messageID: 'r2', optionSelected: kept },
    });

    await act(() => chat.instance.messaging.restartConversation());
    expect(choicesOf(chat)).toEqual({});
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
    expect(choicesOf(chat)).toEqual({
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
    expect(choicesOf(chat)).toEqual({
      'r1:i:0': { messageID: 'r1', optionSelected: inserted },
      'r2:i:0': { messageID: 'r2', optionSelected: fromHistory },
    });
  });
});

function text(value: string): GenericItem {
  return { response_type: MessageResponseTypes.TEXT, text: value };
}

/** How many times a screen reader announced text that contains `value`. */
function announcementsOf(value: string) {
  return mockAnnounce.mock.calls.filter(([announced]) =>
    String(announced).includes(value)
  ).length;
}

const flagsOf = (chat: Chat) => chat.store.getState().view.messageItemFlags;

describe('announcement flags', () => {
  it('keeps an announcement under the public item ID, not on the local copy, and announces once', async () => {
    const chat = await chatWith(response('r1', [text('Hello there')]));
    const [localID] = localIDsOf(chat.store, 'r1');

    await waitFor(() => expect(announcementsOf('Hello there')).toBe(1));
    expect(flagsOf(chat)).toEqual({
      'r1:i:0': { messageID: 'r1', wasAnnounced: true },
    });
    const { ui_state } = chat.store.getState().allMessageItemsByID[localID];
    expect('needsAnnouncement' in ui_state).toBe(false);
    expect('wasAnnounced' in ui_state).toBe(false);

    // A repeat of the view's record changes nothing.
    const before = flagsOf(chat);
    act(() =>
      chat.store.dispatch(viewActions.setMessageItemAnnounced(localID))
    );
    expect(flagsOf(chat)).toBe(before);
  });

  it('asks for no announcement for a request, a streamed chunk, or loaded history, even rewritten', async () => {
    const chat = await chatWith();

    await act(() => chat.instance.send('A question'));
    await act(() =>
      chat.instance.messaging.addMessageChunk({
        streaming_metadata: { response_id: 'r2' },
        partial_item: {
          streaming_metadata: { id: 'a' },
          ...text('Streaming '),
        },
      } as any)
    );
    await act(() =>
      chat.instance.messaging.insertHistory([
        {
          message: response('h1', [text('From history')]),
          time: '2024-01-01T12:00:00.000Z',
        },
      ] as HistoryItem[])
    );

    // An upsert that builds a new copy of a loaded item keeps it unannounced.
    await act(() =>
      chat.instance.messaging.upsertMessage('h1', MessageState.COMPLETE, () =>
        response('h1', [text('Edited history')])
      )
    );

    expect(localIDsOf(chat.store, 'r2')).toHaveLength(1);
    expect(localIDsOf(chat.store, 'h1')).toHaveLength(1);
    expect(flagsOf(chat)).toEqual({});
    expect(announcementsOf('A question')).toBe(0);
    expect(announcementsOf('From history')).toBe(0);
    expect(announcementsOf('Edited history')).toBe(0);
  });

  it('carries wasAnnounced through an upsert that builds a new copy, and starts over when addMessage replaces it', async () => {
    const chat = await chatWith();
    const upsert = (value: string) =>
      act(() =>
        chat.instance.messaging.upsertMessage('r3', MessageState.COMPLETE, () =>
          response('r3', [text(value)])
        )
      );

    await upsert('First version');
    await waitFor(() => expect(announcementsOf('First version')).toBe(1));
    const [localID] = localIDsOf(chat.store, 'r3');
    const copy = chat.store.getState().allMessageItemsByID[localID];

    await upsert('Second version');
    expect(chat.store.getState().allMessageItemsByID[localID]).not.toBe(copy);
    expect(flagsOf(chat)).toEqual({
      'r3:i:0': { messageID: 'r3', wasAnnounced: true },
    });

    await act(() =>
      chat.instance.messaging.addMessage(
        response('r3', [text('Third version')])
      )
    );
    await waitFor(() => expect(announcementsOf('Third version')).toBe(1));
    expect(announcementsOf('Second version')).toBe(0);
    expect(flagsOf(chat)).toEqual({
      'r3:i:0': { messageID: 'r3', wasAnnounced: true },
    });
  });

  it('moves the flags with a kept copy drawn under another ID, and drops them with the message', async () => {
    const chat = await chatWith(
      response('r1', [text('Kept text')]),
      response('r2', [text('Other text')])
    );
    await waitFor(() => expect(announcementsOf('Other text')).toBe(1));

    // A hidden item in front shifts the item's index; the list keeps the copy.
    await act(() =>
      chat.instance.messaging.upsertMessage('r1', MessageState.COMPLETE, () =>
        response('r1', [
          { ...text('hidden'), user_defined: { silent: true } } as GenericItem,
          text('Kept text'),
        ])
      )
    );
    expect(flagsOf(chat)).toEqual({
      'r1:i:1': { messageID: 'r1', wasAnnounced: true },
      'r2:i:0': { messageID: 'r2', wasAnnounced: true },
    });
    expect(announcementsOf('Kept text')).toBe(1);

    await act(() => chat.instance.messaging.removeMessages(['r1']));
    expect(flagsOf(chat)).toEqual({
      'r2:i:0': { messageID: 'r2', wasAnnounced: true },
    });
    await act(() => chat.instance.messaging.restartConversation());
    expect(flagsOf(chat)).toEqual({});
  });
});
