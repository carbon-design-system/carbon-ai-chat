/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { waitFor } from '@testing-library/react';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from '../../../test_helpers';
import {
  MessageResponse,
  MessageResponseTypes,
} from '../../../../src/types/messaging/Messages';
import { MessageState } from '../../../../src/types/config/MessagingConfig';
import { BusEventType } from '../../../../src/types/events/eventBusTypes';
import { OnErrorType } from '../../../../src/types/config/ErrorConfig';
import {
  LOOSE,
  MALFORMED,
  MESSAGE_ID,
  chatText,
  failedItemCount,
  fixtureMessage,
  itemsOf,
  observeWrite,
  renderOpenChat,
  settle,
} from '../../../utils/itemDrawabilityFixtures';

describe('ChatInstance.messaging.upsertMessage item drawing', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  const draws = {
    rejects: false,
    shownItems: 1,
    reports: [] as string[],
    failedItems: 0,
    catastrophic: false,
  };

  describe.each([MessageState.STREAMING, MessageState.COMPLETE])(
    'as %s',
    (state) => {
      it.each(LOOSE)('draws "$name"', async (fixture) => {
        const outcome = await observeWrite((instance) =>
          instance.messaging.upsertMessage(MESSAGE_ID, state, () =>
            fixtureMessage(fixture)
          )
        );
        expect(outcome).toEqual(draws);
      });
    }
  );

  describe('user_defined items nested in a streamed container', () => {
    const nested = {
      response_type: MessageResponseTypes.USER_DEFINED,
      user_defined: { kind: 'nested' },
    };

    const streamNested = async (container: unknown) => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const handler = jest.fn();
      instance.on({ type: BusEventType.USER_DEFINED_RESPONSE, handler });

      await instance.messaging.upsertMessage(
        'nested-stream',
        MessageState.STREAMING,
        () =>
          ({
            id: 'nested-stream',
            output: { generic: [container] },
          }) as MessageResponse
      );

      const state = store.getState();
      const [shown] = state.assistantMessageState.localMessageIDs
        .map((id) => state.allMessageItemsByID[id])
        .filter((item) => item.fullMessageID === 'nested-stream');
      return { handler, shown };
    };

    it('fires one event for a user_defined item in a grid cell', async () => {
      const { handler, shown } = await streamNested({
        response_type: MessageResponseTypes.GRID,
        rows: [{ cells: [{ items: [nested] }] }],
      });

      expect(shown.ui_state.gridLocalMessageItemIDs[0][0]).toHaveLength(1);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].data.message).toEqual(nested);
      expect(handler.mock.calls[0][0].data.state).toBe(MessageState.STREAMING);
    });

    it('fires one event for a user_defined item in the body of a carousel card', async () => {
      const { handler, shown } = await streamNested({
        response_type: MessageResponseTypes.CAROUSEL,
        items: [{ response_type: MessageResponseTypes.CARD, body: [nested] }],
      });

      expect(shown.ui_state.itemsLocalMessageItemIDs).toHaveLength(1);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].data.message).toEqual(nested);
      expect(handler.mock.calls[0][0].data.state).toBe(MessageState.STREAMING);
    });
  });
});

describe('upsertMessage with an item the chat cannot draw', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  const ERROR_TEXT = 'There is an error with the message you just sent';
  const text = (value: string) => ({
    response_type: MessageResponseTypes.TEXT,
    text: value,
  });
  const rowlessGrid = { response_type: MessageResponseTypes.GRID };
  const gridOf = (...cells: unknown[]) => ({
    response_type: MessageResponseTypes.GRID,
    rows: [{ cells }],
  });
  const message = (id: string, generic: unknown[], extra = {}) =>
    ({ id, output: { generic }, ...extra }) as unknown as MessageResponse;

  describe.each([MessageState.STREAMING, MessageState.COMPLETE])(
    'as %s',
    (state) => {
      it.each(MALFORMED)('resolves for "$name"', async (fixture) => {
        const outcome = await observeWrite((instance) =>
          instance.messaging.upsertMessage(MESSAGE_ID, state, () =>
            fixtureMessage(fixture)
          )
        );

        const isComplete = state === MessageState.COMPLETE;
        expect(outcome).toEqual({
          rejects: false,
          shownItems: 1,
          reports: isComplete ? [expect.stringMatching(/^RENDER: /)] : [],
          failedItems: isComplete ? 1 : 0,
          catastrophic: false,
        });
      });
    }
  );

  it('resolves for a streamed text item whose text is not a string', async () => {
    const outcome = await observeWrite((instance) =>
      instance.messaging.upsertMessage(MESSAGE_ID, MessageState.STREAMING, () =>
        message(MESSAGE_ID, [
          { response_type: MessageResponseTypes.TEXT, text: 42 },
        ])
      )
    );

    expect(outcome.rejects).toBe(false);
  });

  it('keeps the last drawn grid while a streamed snapshot cannot draw', async () => {
    const { instance, store, onError } = await renderOpenChat();
    const handler = jest.fn();
    instance.on({ type: BusEventType.USER_DEFINED_RESPONSE, handler });
    const nested = {
      response_type: MessageResponseTypes.USER_DEFINED,
      user_defined: { kind: 'cell' },
    };
    const stream = (grid: unknown) =>
      instance.messaging.upsertMessage('lg', MessageState.STREAMING, () =>
        message('lg', [grid])
      );

    await stream(gridOf({ items: [text('Cell A'), nested] }));
    await settle();
    const [drawn] = itemsOf(store, 'lg');
    expect(handler).toHaveBeenCalledTimes(1);

    await stream(gridOf({ items: [text('Cell A'), nested] }, {}));
    await settle();
    expect(itemsOf(store, 'lg')[0]).toBe(drawn);
    await waitFor(() => expect(chatText()).toContain('Cell A'));
    expect(handler).toHaveBeenCalledTimes(1);

    await stream(
      gridOf({ items: [text('Cell A'), nested] }, { items: [text('Cell B')] })
    );
    await settle();
    expect(itemsOf(store, 'lg')[0]).not.toBe(drawn);
    await waitFor(() => expect(chatText()).toContain('Cell B'));
    expect(chatText()).not.toContain(ERROR_TEXT);
    expect(onError).not.toHaveBeenCalled();
  });

  it('hides a streamed item that never drew, and keeps its place', async () => {
    const { instance, store, onError } = await renderOpenChat();
    const handler = jest.fn();
    instance.on({ type: BusEventType.USER_DEFINED_RESPONSE, handler });

    await instance.messaging.upsertMessage('nd', MessageState.STREAMING, () =>
      message('nd', [
        { response_type: MessageResponseTypes.CAROUSEL },
        {
          response_type: MessageResponseTypes.USER_DEFINED,
          user_defined: { kind: 'after' },
        },
      ])
    );
    await settle();

    const items = itemsOf(store, 'nd');
    expect(items.map((item) => item.item.response_type)).toEqual([
      MessageResponseTypes.CAROUSEL,
      MessageResponseTypes.USER_DEFINED,
    ]);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].data.message.user_defined).toEqual({
      kind: 'after',
    });
    expect(failedItemCount()).toBe(0);
    expect(store.getState().catastrophicErrorType).toBeFalsy();
    expect(onError).not.toHaveBeenCalled();
  });

  describe.each([MessageState.COMPLETE, MessageState.ERROR])(
    'once the stream ends with %s',
    (endState) => {
      it('shows one error in the item’s place, and reports it once', async () => {
        const { instance, onError } = await renderOpenChat();

        await expect(
          instance.messaging.upsertMessage('ce', endState, () =>
            message('ce', [text('Before'), rowlessGrid, text('After')])
          )
        ).resolves.toBeUndefined();
        await settle();

        await waitFor(() => expect(chatText()).toContain('Before'));
        await waitFor(() => expect(chatText()).toContain('After'));
        expect(failedItemCount()).toBe(1);
        expect(onError).toHaveBeenCalledTimes(1);
        const [report] = onError.mock.calls[0];
        expect(report.errorType).toBe(OnErrorType.RENDER);
        expect(report.message).toContain('"grid"');
        expect(report.message).toContain('rows');
        expect(report.otherData).toEqual(
          expect.objectContaining({
            messageID: 'ce',
            responseType: MessageResponseTypes.GRID,
            missing: ['rows'],
          })
        );
      });
    }
  );

  it('shows nothing for the item while streaming, and the error once it completes', async () => {
    const { instance, onError } = await renderOpenChat();
    const write = (state: MessageState) =>
      instance.messaging.upsertMessage('sc', state, () =>
        message('sc', [text('Before'), rowlessGrid, text('After')])
      );

    await write(MessageState.STREAMING);
    await settle();
    await waitFor(() => expect(chatText()).toContain('Before'));
    await waitFor(() => expect(chatText()).toContain('After'));
    expect(failedItemCount()).toBe(0);
    expect(onError).not.toHaveBeenCalled();

    await write(MessageState.COMPLETE);
    await settle();
    expect(failedItemCount()).toBe(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('reports a repeated or errored write of the same item no more', async () => {
    const { instance, onError } = await renderOpenChat();
    const write = (state: MessageState) =>
      instance.messaging.upsertMessage('rp', state, () =>
        message('rp', [rowlessGrid])
      );

    await write(MessageState.COMPLETE);
    await write(MessageState.COMPLETE);
    await write(MessageState.ERROR);
    await settle();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(failedItemCount()).toBe(1);
  });

  it('shows the error without reporting when a stop ends the stream', async () => {
    const { instance, onError } = await renderOpenChat();

    await instance.messaging.upsertMessage('st', MessageState.STREAMING, () =>
      message('st', [rowlessGrid])
    );
    await settle();
    expect(failedItemCount()).toBe(0);

    await (
      instance as any
    ).serviceManager.messageService.cancelCurrentMessageRequest();
    await settle();

    expect(failedItemCount()).toBe(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('keeps the last drawn version, with no error, when a stop ends the stream', async () => {
    const { instance, onError } = await renderOpenChat();
    const stream = (grid: unknown) =>
      instance.messaging.upsertMessage('sk', MessageState.STREAMING, () =>
        message('sk', [grid])
      );

    await stream(gridOf({ items: [text('Kept')] }));
    await stream(gridOf({ items: [text('Kept')] }, {}));
    await (
      instance as any
    ).serviceManager.messageService.cancelCurrentMessageRequest();
    await settle();

    await waitFor(() => expect(chatText()).toContain('Kept'));
    expect(failedItemCount()).toBe(0);
    expect(onError).not.toHaveBeenCalled();
  });

  it('draws a later version that can draw, with no error', async () => {
    const { instance } = await renderOpenChat();
    const write = (grid: unknown) =>
      instance.messaging.upsertMessage('rc', MessageState.COMPLETE, () =>
        message('rc', [grid])
      );

    await write(rowlessGrid);
    await settle();
    expect(failedItemCount()).toBe(1);

    await write(gridOf({ items: [text('Fixed')] }));
    await settle();
    expect(failedItemCount()).toBe(0);
    await waitFor(() => expect(chatText()).toContain('Fixed'));
  });

  it('reports an item revealed after a pause once, when it shows', async () => {
    const { instance, onError } = await renderOpenChat();

    const written = instance.messaging.upsertMessage(
      'pz',
      MessageState.COMPLETE,
      () =>
        message('pz', [
          text('First'),
          { response_type: MessageResponseTypes.PAUSE, time: 50 },
          rowlessGrid,
        ])
    );
    await settle();
    expect(onError).not.toHaveBeenCalled();

    await written;
    await settle();
    expect(failedItemCount()).toBe(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('reports nothing for a silent message', async () => {
    const { instance, onError } = await renderOpenChat();

    await instance.messaging.upsertMessage('sl', MessageState.COMPLETE, () =>
      message('sl', [rowlessGrid], { history: { silent: true } })
    );
    await settle();

    expect(onError).not.toHaveBeenCalled();
  });

  it('reports only the shown item next to a silent one', async () => {
    const { instance, onError } = await renderOpenChat();

    await instance.messaging.upsertMessage('sn', MessageState.COMPLETE, () =>
      message('sn', [
        {
          response_type: MessageResponseTypes.USER_DEFINED,
          user_defined: { silent: true },
        },
        rowlessGrid,
      ])
    );
    await settle();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].otherData.responseType).toBe(
      MessageResponseTypes.GRID
    );
    expect(failedItemCount()).toBe(1);
  });
});
