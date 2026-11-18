/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';
import {
  ButtonItemType,
  GenericItem,
  MessageResponse,
  MessageResponseTypes,
  MessageState,
} from '../../../../src/aiChatEntry';
import { completeText, contractChat, contractSetup } from '../../helpers';

const text = (value: string): GenericItem => ({
  response_type: MessageResponseTypes.TEXT,
  text: value,
});
const button = (label: string): GenericItem => ({
  response_type: MessageResponseTypes.BUTTON,
  button_type: ButtonItemType.POST_BACK,
  label,
  value: { input: { text: label } },
});
const card = (): GenericItem => ({
  response_type: MessageResponseTypes.CARD,
  body: [button('Unsupported body button'), text('Kept body')],
});

/** Valid public items that their particular parent does not support. */
function nestedResponse(): MessageResponse {
  return {
    id: 'raw-nested',
    output: {
      generic: [
        card(),
        {
          response_type: MessageResponseTypes.CAROUSEL,
          items: [text('Unsupported slide'), card()],
        },
        {
          response_type: MessageResponseTypes.BUTTON,
          button_type: ButtonItemType.SHOW_PANEL,
          label: 'Outer panel',
          panel: {
            body: [],
            footer: [
              {
                response_type: MessageResponseTypes.BUTTON,
                button_type: ButtonItemType.SHOW_PANEL,
                label: 'Unsupported nested panel',
                panel: { title: 'Nested', body: [] },
              },
              {
                response_type: MessageResponseTypes.BUTTON,
                button_type: ButtonItemType.POST_BACK,
                label: 'Kept footer',
                value: { input: { text: 'Kept footer' } },
              },
            ],
          },
        },
        {
          response_type: MessageResponseTypes.GRID,
          columns: [{ width: '1' }],
          rows: [{ cells: [{ items: [card(), text('Kept cell')] }] }],
        },
      ],
    },
  };
}

function silentResponse(): MessageResponse {
  return {
    id: 'quiet',
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.USER_DEFINED,
          user_defined: { silent: true, token: 'top' },
        },
        {
          response_type: MessageResponseTypes.CARD,
          body: [
            {
              response_type: MessageResponseTypes.USER_DEFINED,
              user_defined: { silent: true, token: 'nested' },
            },
            text('Shown'),
          ],
        },
      ],
    },
  };
}

// @covers state.messageItems instance.getState instance.messaging.upsertMessage instance.messaging.insertHistory
describe('messageItems target contracts introduced with the drawn item model', () => {
  contractSetup();

  it.each(['history', 'live'])(
    'keeps raw positions after unsupported nested children in %s',
    async (origin) => {
      const { instance } = await contractChat();
      const message = nestedResponse();
      await act(async () => {
        if (origin === 'history') {
          await instance.messaging.insertHistory([
            { message, time: '2026-01-01T00:00:00.000Z' },
          ]);
        } else {
          await instance.messaging.upsertMessage(
            message.id,
            MessageState.COMPLETE,
            () => message
          );
        }
      });
      const entries = instance.getState().messageItems;
      expect(entries.map(({ id }) => id)).toEqual([
        'raw-nested:i:0',
        'raw-nested:i:0:i:1',
        'raw-nested:i:1',
        'raw-nested:i:1:i:1',
        'raw-nested:i:1:i:1:i:1',
        'raw-nested:i:2',
        'raw-nested:i:2:f:1',
        'raw-nested:i:3',
        'raw-nested:i:3:i:0.0.1',
      ]);
      expect(entries.every((entry) => entry.origin === origin)).toBe(true);
    }
  );

  it.each(['history', 'live'])(
    'omits silent top-level and nested items from the drawn model in %s',
    async (origin) => {
      const { instance } = await contractChat();
      const message = silentResponse();
      const output = JSON.parse(JSON.stringify(message.output));
      await act(async () => {
        if (origin === 'history') {
          await instance.messaging.insertHistory([
            { message, time: '2026-01-01T00:00:00.000Z' },
          ]);
        } else {
          await instance.messaging.upsertMessage(
            message.id,
            MessageState.COMPLETE,
            () => message
          );
        }
      });
      expect(instance.getState().messageItems.map(({ id }) => id)).toEqual([
        'quiet:i:1',
        'quiet:i:1:i:1',
      ]);
      expect(instance.getState().messages[0]).toMatchObject({
        id: 'quiet',
        output,
      });
    }
  );

  it.each(['message', 'chunk'])(
    'clears a native ERROR when the same item receives a later legacy %s write',
    async (route) => {
      const { instance } = await contractChat();
      const message: MessageResponse = {
        id: 'mixed-error',
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: 'Partial',
              streaming_metadata: { id: 'part' },
            },
          ],
        },
      };
      await act(() =>
        instance.messaging.upsertMessage(
          message.id,
          MessageState.ERROR,
          () => message
        )
      );
      const failed = instance.getState();
      expect(failed.messageItems[0].status).toBe('error');
      await act(async () => {
        if (route === 'message') {
          await instance.messaging.addMessage({
            id: message.id,
            output: {
              generic: [
                {
                  response_type: MessageResponseTypes.TEXT,
                  text: 'Recovered',
                  streaming_metadata: { id: 'part' },
                },
              ],
            },
          });
        } else {
          await instance.messaging.addMessageChunk(
            completeText(message.id, 'part', 'Recovered')
          );
        }
      });
      expect(instance.getState().messageItems).toHaveLength(1);
      expect(instance.getState().messageItems[0]).toMatchObject({
        id: 'mixed-error:s:part',
        status: 'complete',
        item: { text: 'Recovered' },
      });
      expect(failed.messageItems[0].status).toBe('error');
    }
  );

  it('projects ERROR status, clears it on later nonerror upserts, and retains older snapshots', async () => {
    const { instance } = await contractChat();
    const before = instance.getState();
    const message: MessageResponse = {
      id: 'error-item',
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.CARD,
            body: [text('Partial answer')],
          },
        ],
      },
    };
    await act(() =>
      instance.messaging.upsertMessage(
        message.id,
        MessageState.ERROR,
        () => message
      )
    );
    const failed = instance.getState();
    expect(failed.messageItems.map(({ id, status }) => [id, status])).toEqual([
      ['error-item:i:0', 'error'],
      ['error-item:i:0:i:0', 'error'],
    ]);
    expect(failed.status).toBe(before.status);
    expect(failed.error).toBe(before.error);
    expect(failed.messages[0]).not.toHaveProperty('state');
    expect(failed.messages[0]).not.toHaveProperty('history.error_state');
    await act(() =>
      instance.messaging.upsertMessage(
        message.id,
        MessageState.ERROR,
        (previous) => previous
      )
    );
    expect(instance.getState().messageItems).toBe(failed.messageItems);
    await act(() =>
      instance.messaging.upsertMessage(
        message.id,
        MessageState.COMPLETE,
        (previous) => previous
      )
    );
    expect(
      instance.getState().messageItems.map(({ status }) => status)
    ).toEqual(['complete', 'complete']);
    expect(failed.messageItems.map(({ status }) => status)).toEqual([
      'error',
      'error',
    ]);
    await act(() =>
      instance.messaging.upsertMessage(
        message.id,
        MessageState.ERROR,
        (previous) => previous
      )
    );
    await act(() =>
      instance.messaging.upsertMessage(
        message.id,
        MessageState.STREAMING,
        (previous) => previous
      )
    );
    expect(
      instance.getState().messageItems.map(({ status }) => status)
    ).toEqual(['streaming', 'streaming']);
  });
});
