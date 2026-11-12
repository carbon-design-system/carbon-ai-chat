/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { act, waitFor } from '@testing-library/react';

import {
  BusEventCustomFooterSlot,
  BusEventType,
  BusEventUserDefinedResponse,
  GenericItem,
  MessageResponse,
  MessageResponseTypes,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  ContractDriver,
  advance,
  contractChat,
  contractSetup,
  describeShared,
  recordEvents,
  responseOf,
  slotted,
  textItem,
  textResponse,
} from '../../helpers';

const userDefined = (
  fields: Record<string, unknown>,
  extra: Partial<GenericItem> = {}
): GenericItem =>
  ({
    response_type: MessageResponseTypes.USER_DEFINED,
    user_defined: fields,
    ...extra,
  }) as GenericItem;

const pause = (time: number, typing = false): GenericItem => ({
  response_type: MessageResponseTypes.PAUSE,
  time,
  typing,
});

/** Calls `addMessage` inside `act` and waits for it to settle. */
const add = (chat: ContractDriver, message: MessageResponse) =>
  act(() => chat.messaging.addMessage(message));

// @covers instance.messaging.addMessage event.userDefinedResponse event.receive response-type.pause state.messages
describeShared(
  'addMessage with paused and user_defined items',
  (makeDriver) => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('gives each user_defined item its own slot', async () => {
      const chat = await makeDriver();
      const events = recordEvents(chat, [BusEventType.USER_DEFINED_RESPONSE]);
      await add(
        chat,
        responseOf('r1', [userDefined({ n: 1 }), userDefined({ n: 2 })])
      );
      await waitFor(() =>
        expect(events.of(BusEventType.USER_DEFINED_RESPONSE)).toHaveLength(2)
      );
      const slots = events
        .of<BusEventUserDefinedResponse>(BusEventType.USER_DEFINED_RESPONSE)
        .map((event) => event.data.slot);
      expect(new Set(slots).size).toBe(2);
    });

    it('fires userDefinedResponse with no slot for a silent user_defined item, and keeps the item in messages', async () => {
      const chat = await makeDriver();
      const events = recordEvents(chat, [BusEventType.USER_DEFINED_RESPONSE]);
      const silent = userDefined({ silent: true });
      await add(chat, responseOf('r1', [silent, textItem('Visible')]));
      await waitFor(() =>
        expect(events.of(BusEventType.USER_DEFINED_RESPONSE)).toHaveLength(1)
      );
      const [event] = events.of<BusEventUserDefinedResponse>(
        BusEventType.USER_DEFINED_RESPONSE
      );
      expect(event.data.slot).toBeUndefined();
      expect(event.data.message).toEqual(silent);
      expect((chat.messages()[0] as MessageResponse).output.generic).toEqual([
        silent,
        textItem('Visible'),
      ]);
    });

    it('resolves and fires receive while a pause is pending, with every item already in messages', async () => {
      const chat = await makeDriver();
      jest.useFakeTimers();
      const events = recordEvents(chat, [
        BusEventType.RECEIVE,
        BusEventType.USER_DEFINED_RESPONSE,
      ]);
      const generic = [pause(60_000), userDefined({ kind: 'after the pause' })];
      await add(chat, responseOf('r1', generic));
      expect(events.types()).toEqual(['receive']);
      expect((chat.messages()[0] as MessageResponse).output.generic).toEqual(
        generic
      );
      await advance(59_999);
      expect(events.types()).toEqual(['receive']);
      await advance(1);
      expect(events.types()).toEqual(['receive', 'userDefinedResponse']);
    });
  }
);

// @covers event.customFooterSlot instance.messaging.addMessage
describeShared('addMessage with custom footer slots', (makeDriver) => {
  it('fires customFooterSlot with the slot name, item, message, and additional data', async () => {
    const chat = await makeDriver();
    const events = recordEvents(chat, [BusEventType.CUSTOM_FOOTER_SLOT]);
    const item: GenericItem = {
      ...textItem('With a footer'),
      message_item_options: {
        custom_footer_slot: {
          slot_name: 'footer-a',
          additional_data: { key: 'value' },
        },
      },
    };
    await add(chat, responseOf('r1', [item]));
    await waitFor(() =>
      expect(events.of(BusEventType.CUSTOM_FOOTER_SLOT)).toHaveLength(1)
    );
    const [event] = events.of<BusEventCustomFooterSlot>(
      BusEventType.CUSTOM_FOOTER_SLOT
    );
    expect(event.data.slotName).toBe('footer-a');
    expect(event.data.messageItem).toEqual(item);
    expect(event.data.message.id).toBe('r1');
    expect(event.data.additionalData).toEqual({ key: 'value' });
  });

  it('fires nothing for a footer slot with is_on false', async () => {
    const chat = await makeDriver();
    const events = recordEvents(chat, [
      BusEventType.RECEIVE,
      BusEventType.USER_DEFINED_RESPONSE,
      BusEventType.CUSTOM_FOOTER_SLOT,
    ]);
    await add(
      chat,
      responseOf('r1', [
        {
          ...textItem('No footer'),
          message_item_options: {
            custom_footer_slot: { slot_name: 'footer-off', is_on: false },
          },
        },
        // The chat handles items in order, so this one's event shows the
        // footer item has been handled.
        userDefined({ kind: 'last' }),
      ])
    );
    await waitFor(() =>
      expect(events.types()).toEqual(['receive', 'userDefinedResponse'])
    );
  });

  it('fires userDefinedResponse before customFooterSlot for the same item, both after receive', async () => {
    const chat = await makeDriver();
    const events = recordEvents(chat, [
      BusEventType.RECEIVE,
      BusEventType.USER_DEFINED_RESPONSE,
      BusEventType.CUSTOM_FOOTER_SLOT,
    ]);
    await add(
      chat,
      responseOf('r1', [
        userDefined(
          { kind: 'widget' },
          {
            message_item_options: {
              custom_footer_slot: { slot_name: 'footer-ud' },
            },
          }
        ),
      ])
    );
    await waitFor(() =>
      expect(events.types()).toEqual([
        'receive',
        'userDefinedResponse',
        'customFooterSlot',
      ])
    );
  });
});

// @covers instance.messaging.addMessage state.homeScreenState state.homeScreenState.isHomeScreenOpen
describe('addMessage and the home screen', () => {
  contractSetup();

  it('closes an open home screen', async () => {
    const { instance } = await contractChat({ homescreen: { isOn: true } });
    await act(() => instance.changeView(ViewType.MAIN_WINDOW));
    await waitFor(() =>
      expect(instance.getState().homeScreenState.isHomeScreenOpen).toBe(true)
    );
    await act(() => instance.messaging.addMessage(textResponse('Hi', 'r1')));
    await waitFor(() =>
      expect(instance.getState().homeScreenState.isHomeScreenOpen).toBe(false)
    );
  });
});

// @covers react.ChatContainer.renderCustomMessageFooter event.customFooterSlot
describe('addMessage and renderCustomMessageFooter', () => {
  contractSetup();

  it('calls renderCustomMessageFooter with the slot, message, item, instance, and data, and slots its content', async () => {
    const renderFooter = jest.fn((slotName: string): React.ReactNode =>
      React.createElement('span', null, `footer ${slotName}`)
    );
    const { instance, host } = await contractChat({
      renderCustomMessageFooter: renderFooter,
    });
    const item: GenericItem = {
      ...textItem('With a footer'),
      message_item_options: {
        custom_footer_slot: {
          slot_name: 'footer-a',
          additional_data: { key: 'value' },
        },
      },
    };
    await act(() => instance.messaging.addMessage(responseOf('r1', [item])));
    await waitFor(() =>
      expect(
        slotted(host, 'footer-a').map((element) => element.textContent)
      ).toEqual(['footer footer-a'])
    );
    const [slotName, message, messageItem, handed, data] = renderFooter.mock
      .calls[0] as unknown as [
      string,
      MessageResponse,
      GenericItem,
      unknown,
      unknown,
    ];
    expect(slotName).toBe('footer-a');
    expect(message.id).toBe('r1');
    expect(messageItem).toEqual(item);
    expect(handed).toBe(instance);
    expect(data).toEqual({ key: 'value' });
  });
});

// @covers react.ChatContainer.renderUserDefinedResponse event.userDefinedResponse
describe('addMessage and renderUserDefinedResponse for a silent item', () => {
  contractSetup();

  // Suspected bug: a silent item gets no slot, yet the React host still calls
  // renderUserDefinedResponse for it, keyed under the slot name "undefined"
  // (src/chat/utils/chatBoot.ts:579). Its content has nowhere to show.
  it('still calls renderUserDefinedResponse once for a silent item', async () => {
    const render = jest.fn((): React.ReactNode => null);
    const { instance } = await contractChat({
      renderUserDefinedResponse: render,
    });
    const silent = userDefined({ silent: true });
    await act(() =>
      instance.messaging.addMessage(
        responseOf('r1', [silent, textItem('After')])
      )
    );
    await waitFor(() => expect(render).toHaveBeenCalledTimes(1));
    const [state] = render.mock.calls[0] as unknown as [
      { messageItem: GenericItem },
    ];
    expect(state.messageItem).toEqual(silent);
  });
});
