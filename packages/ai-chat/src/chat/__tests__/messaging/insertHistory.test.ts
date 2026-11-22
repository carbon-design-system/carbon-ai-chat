/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';

import {
  getChatShadowRoot,
  createBaseConfig,
  itemFlagsFor,
  itemsWithOptionSelected,
  bootChat,
  renderChatAndGetInstanceWithStore,
  shutdownBootedChats,
  setupBeforeEach,
  setupAfterEach,
} from '../helpers/chat';
import {
  ButtonItemType,
  MessageRequest,
  MessageResponseTypes,
  OptionItemPreference,
  SelectionDisplay,
} from '../../../types/messaging/Messages';
import { HistoryItem } from '../../../types/messaging/History';
import type { LocalMessageItem } from '../../../types/messaging/LocalMessageItem';

async function expectRequestSender(text: string, sender: string) {
  await waitFor(() => {
    const message = Array.from(
      getChatShadowRoot().querySelectorAll('.cds-aichat--message--request')
    ).find((element) =>
      element
        .querySelector('cds-aichat-markdown')
        ?.shadowRoot?.textContent.includes(text)
    );
    expect(
      message?.querySelector('.cds-aichat--message__label').textContent
    ).toMatch(new RegExp(`^${sender} `));
  });
}

describe('ChatInstance.messaging.insertHistory', () => {
  beforeEach(setupBeforeEach);
  afterEach(async () => {
    await shutdownBootedChats();
    setupAfterEach();
  });

  it('preserves sender metadata through a stored history JSON round-trip', async () => {
    const profile = {
      id: 'jane',
      nickname: 'Jane Doe',
      profile_picture_url: 'https://example.com/jane.png',
    };
    const first = await renderChatAndGetInstanceWithStore(createBaseConfig());
    await first.instance.messaging.insertHistory([
      {
        message: {
          id: 'sender-round-trip',
          input: { text: 'Original request' },
          history: { user_profile: profile },
        },
        time: '2024-01-01T12:00:00.000Z',
      },
    ]);
    const stored = first.store.getState().allMessagesByID[
      'sender-round-trip'
    ] as MessageRequest;
    expect(stored.history.user_profile).toEqual(profile);
    const replay: HistoryItem[] = JSON.parse(
      JSON.stringify([{ message: stored, time: '2024-01-01T12:00:00.000Z' }])
    );
    setupAfterEach();
    const second = await renderChatAndGetInstanceWithStore(createBaseConfig());
    await act(async () => {
      await second.instance.messaging.insertHistory(replay);
    });
    const replayed = second.store.getState().allMessagesByID[
      'sender-round-trip'
    ] as MessageRequest;
    expect(replayed.history.user_profile).toEqual(profile);
    await expectRequestSender('Original request', 'Jane Doe');
  });

  it('supports repeated viewer normalization without changing canonical host sender records', async () => {
    const canonical: HistoryItem[] = ['jane', 'viewer'].map((id) => ({
      message: {
        id: `canonical-${id}`,
        input: { text: `Canonical ${id} request` },
        history: {
          user_profile: { id, nickname: id === 'jane' ? 'Jane Doe' : 'Viewer' },
        },
      },
      time: '2024-01-01T12:00:00.000Z',
    }));
    const original = JSON.parse(JSON.stringify(canonical));
    for (const viewerID of ['viewer', 'jane']) {
      setupAfterEach();
      const presentation = canonical.map((item) => {
        const message = item.message as MessageRequest;
        return {
          ...item,
          message: {
            ...message,
            history: {
              ...message.history,
              user_profile:
                message.history.user_profile.id === viewerID
                  ? undefined
                  : message.history.user_profile,
            },
          },
        };
      });
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      await act(async () => {
        await instance.messaging.insertHistory(presentation);
      });
      for (const senderID of ['jane', 'viewer']) {
        const stored = store.getState().allMessagesByID[
          `canonical-${senderID}`
        ] as MessageRequest;
        expect(stored.history.user_profile?.id).toBe(
          senderID === viewerID ? undefined : senderID
        );
        const actorName = { jane: 'Jane Doe', viewer: 'Viewer' }[senderID];
        await expectRequestSender(
          `Canonical ${senderID} request`,
          senderID === viewerID ? 'You' : actorName
        );
      }
      await act(async () => {
        await instance.send({
          id: `new-${viewerID}`,
          input: { text: 'New viewer request' },
        });
      });
      const fresh = store.getState().allMessagesByID[
        `new-${viewerID}`
      ] as MessageRequest;
      expect(fresh.history?.user_profile).toBeUndefined();
      await expectRequestSender('New viewer request', 'You');
    }
    expect(canonical).toEqual(original);
  });

  describe('choice selection restoration', () => {
    it.each([true, undefined])(
      'restores the matching option group with is_choice_request=%s',
      async (is_choice_request) => {
        const { instance, store } = await bootChat(createBaseConfig());
        const historyItems: HistoryItem[] = [
          {
            message: {
              id: 'choice-response',
              output: {
                generic: [
                  {
                    response_type: MessageResponseTypes.OPTION,
                    preference: OptionItemPreference.BUTTON,
                    options: [
                      { label: '', value: { input: { text: '' } } },
                      {
                        label: 'Same label',
                        value: { input: { text: 'first' } },
                      },
                    ],
                  },
                  {
                    response_type: MessageResponseTypes.OPTION,
                    preference: OptionItemPreference.DROPDOWN,
                    options: [
                      {
                        label: 'Different control text',
                        selection_display: SelectionDisplay.INPUT_TEXT,
                        value: { input: { text: 'second' } },
                      },
                    ],
                  },
                ],
              },
            },
            time: '2024-01-01T00:00:00.000Z',
          },
          {
            message: {
              id: 'choice-request',
              input: { text: 'second' },
              history: {
                label: 'second',
                related_message_id: 'choice-response',
                is_choice_request,
                silent: true,
              },
            },
            time: '2024-01-01T00:00:01.000Z',
          },
        ];

        await instance.messaging.insertHistory(
          JSON.parse(JSON.stringify(historyItems))
        );

        const groups = Object.values(
          store.getState().allMessageItemsByID
        ).filter(
          (item) =>
            item.fullMessageID === 'choice-response' &&
            item.item.response_type === MessageResponseTypes.OPTION
        );
        const optionSelected = (local: LocalMessageItem) =>
          itemFlagsFor(store.getState(), local.ui_state.id)?.optionSelected;
        expect(groups).toHaveLength(2);
        expect(optionSelected(groups[0])).toBeUndefined();
        expect(optionSelected(groups[1])?.id).toBe('choice-request');
        expect(optionSelected(groups[1])?.history.is_choice_request).toBe(
          is_choice_request
        );
        expect(itemsWithOptionSelected(store.getState())).toHaveLength(1);
      }
    );

    it('restores a legacy unmarked post-back from top-level, body, and footer choices', async () => {
      const { instance, store } = await bootChat(createBaseConfig());
      const postBack = (label: string, text: string) => ({
        response_type: MessageResponseTypes.BUTTON,
        button_type: ButtonItemType.POST_BACK,
        label,
        value: { input: { text } },
      });
      const historyItems: HistoryItem[] = [
        {
          message: {
            id: 'button-response',
            output: {
              generic: [
                postBack('Top level', 'top'),
                {
                  response_type: MessageResponseTypes.BUTTON,
                  button_type: ButtonItemType.SHOW_PANEL,
                  label: 'Open panel',
                  panel: {
                    body: [postBack('Body choice', 'body')],
                    footer: [postBack('Footer choice', 'footer')],
                  },
                },
              ],
            },
          },
          time: '2024-01-01T00:00:00.000Z',
        },
        {
          message: {
            id: 'button-request',
            input: { text: 'rewritten by pre-send' },
            history: {
              label: 'Footer choice',
              related_message_id: 'button-response',
            },
          },
          time: '2024-01-01T00:00:01.000Z',
        },
      ];

      await instance.messaging.insertHistory(historyItems);

      const selected = itemsWithOptionSelected(store.getState());
      expect(selected).toHaveLength(1);
      expect((selected[0].local.item as any).label).toBe('Footer choice');
      expect(selected[0].optionSelected?.id).toBe('button-request');
    });
  });
});
