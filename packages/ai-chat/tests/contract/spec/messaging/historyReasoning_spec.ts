/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import {
  BusEventHistoryEnd,
  BusEventType,
  BusEventUserDefinedResponse,
  GenericItem,
  Message,
  MessageResponse,
  MessageResponseTypes,
  MessageState,
} from '../../../../src/aiChatEntry';
import { contractChat, contractSetup } from '../../helpers';

const ID = 'history-reasoning';
const TIME = '2026-11-02T12:00:00.000Z';

const response = (
  values: string[],
  generic?: GenericItem[]
): MessageResponse => ({
  id: ID,
  output: {
    generic: generic ?? [
      { response_type: MessageResponseTypes.TEXT, text: 'Answer' },
    ],
  },
  message_options: {
    reasoning: {
      content: values.map((value) => ({
        response_type: MessageResponseTypes.USER_DEFINED,
        user_defined: { value },
      })),
    },
  },
});

function reasoningValues(message: Readonly<Message>) {
  if (!message || !('message_options' in message)) {
    return [];
  }
  const content = message.message_options?.reasoning?.content;
  return Array.isArray(content)
    ? content.map((item) => item.user_defined?.value)
    : [];
}

// @covers instance.messaging.insertHistory event.userDefinedResponse state.messages
describe('history reasoning callback ownership', () => {
  contractSetup();

  it.each(['upsert', 'startup'])(
    'commits writable duplicate reasoning edits after %s while retaining older snapshots',
    async (origin) => {
      const first = response(['first']);
      const initialReadonly: boolean[] = [];
      let edits = 0;
      const { instance } = await contractChat({
        openChatByDefault: true,
        messaging: {
          skipWelcome: true,
          ...(origin === 'startup'
            ? {
                customLoadHistory: async () => [{ message: first, time: TIME }],
              }
            : {}),
        },
        onBeforeRender: (handed) => {
          handed.on({
            type: BusEventType.USER_DEFINED_RESPONSE,
            handler: (event: BusEventUserDefinedResponse) => {
              if (event.data.message.user_defined.value === 'first') {
                initialReadonly.push(Object.isFrozen(event.data.fullMessage));
              }
              if (event.data.message.user_defined.value === 'append') {
                expect(Object.isFrozen(event.data.fullMessage)).toBe(false);
                event.data.message.user_defined.value = 'edited';
                event.data.fullMessage.context = { callback: 'edited' };
                edits += 1;
              }
            },
          });
        },
      });
      if (origin === 'upsert') {
        await act(() =>
          instance.messaging.upsertMessage(
            ID,
            MessageState.COMPLETE,
            () => first
          )
        );
      }
      await waitFor(() => expect(initialReadonly.length).toBeGreaterThan(0));
      expect(
        initialReadonly.every((value) => value === (origin === 'startup'))
      ).toBe(true);
      const before = instance.getState();
      const inserted = response(['replacement first', 'append']);
      await act(() =>
        instance.messaging.insertHistory([{ message: inserted, time: TIME }])
      );
      await waitFor(() => {
        expect(edits).toBeGreaterThan(0);
        expect(
          reasoningValues(
            instance.getState().messages.find(({ id }) => id === ID)
          )
        ).toEqual(['replacement first', 'edited']);
      });
      expect(
        instance.getState().messages.find(({ id }) => id === ID).context
      ).toEqual({ callback: 'edited' });
      expect(
        reasoningValues(before.messages.find(({ id }) => id === ID))
      ).toEqual(['first']);
      expect(reasoningValues(inserted)).toEqual([
        'replacement first',
        'append',
      ]);
      expect(inserted.context).toBeUndefined();
    }
  );

  it('keeps fresh history events readonly while committing writable rendered reasoning edits', async () => {
    let ordinary = 0;
    let end = 0;
    const { instance } = await contractChat({
      messaging: { skipWelcome: true },
      onBeforeRender: (handed) => {
        handed.on({
          type: BusEventType.HISTORY_END,
          handler: (event: BusEventHistoryEnd) => {
            expect(Object.isFrozen(event.messages[0])).toBe(true);
            end += 1;
          },
        });
        handed.on({
          type: BusEventType.USER_DEFINED_RESPONSE,
          handler: (event: BusEventUserDefinedResponse) => {
            if (event.data.message.user_defined.ordinary) {
              expect(Object.isFrozen(event.data.fullMessage)).toBe(true);
              expect(Object.isFrozen(event.data.message)).toBe(true);
              ordinary += 1;
            } else {
              expect(Object.isFrozen(event.data.message)).toBe(false);
              event.data.message.user_defined.value = 'fresh edited';
            }
          },
        });
      },
    });
    const inserted = response(
      ['fresh'],
      [
        {
          response_type: MessageResponseTypes.USER_DEFINED,
          user_defined: { ordinary: true },
        },
      ]
    );
    await act(() =>
      instance.messaging.insertHistory([{ message: inserted, time: TIME }])
    );
    await waitFor(() =>
      expect(
        reasoningValues(
          instance.getState().messages.find(({ id }) => id === ID)
        )
      ).toEqual(['fresh edited'])
    );
    expect(ordinary).toBeGreaterThan(0);
    expect(end).toBe(1);
    expect(reasoningValues(inserted)).toEqual(['fresh']);
  });

  it('replaces omitted fields and shorter arrays without reviving old content', async () => {
    const { instance } = await contractChat({
      messaging: { skipWelcome: true },
    });
    const old = response(
      [],
      ['one', 'two', 'three'].map((text) => ({
        response_type: MessageResponseTypes.TEXT,
        text,
      }))
    );
    old.context = { obsolete: true };
    await act(() =>
      instance.messaging.insertHistory([
        { message: old, time: TIME },
        { message: { id: 'anchor', input: { text: 'Anchor' } }, time: TIME },
      ])
    );
    const before = instance.getState();
    const replacement = response(
      [],
      [{ response_type: MessageResponseTypes.TEXT, text: 'Latest' }]
    );
    await act(() =>
      instance.messaging.insertHistory([{ message: replacement, time: TIME }])
    );
    const after = instance.getState();
    expect(after.messages.map(({ id }) => id)).toEqual([ID, 'anchor']);
    expect(after.messages[0]).not.toHaveProperty('context');
    expect(after.messages[0]).toMatchObject({
      output: { generic: [{ text: 'Latest' }] },
    });
    expect(
      'output' in after.messages[0] && after.messages[0].output.generic
    ).toHaveLength(1);
    expect(before.messages[0]).toMatchObject({ context: { obsolete: true } });
    expect(
      'output' in before.messages[0] && before.messages[0].output.generic
    ).toHaveLength(3);
  });

  it('preserves prototype context and readonly class callbacks when replacing history', async () => {
    class HostResponse implements MessageResponse {
      id = ID;
      output: MessageResponse['output'];
      message_options = response(['class item']).message_options;
      metadata: { source: string };

      constructor(text: string) {
        this.output = {
          generic: [{ response_type: MessageResponseTypes.TEXT, text }],
        };
        this.metadata = { source: text };
      }

      get context() {
        return this.metadata;
      }
    }
    const seen: unknown[] = [];
    const { instance } = await contractChat({
      messaging: { skipWelcome: true },
      onBeforeRender: (handed) => {
        handed.on({
          type: BusEventType.USER_DEFINED_RESPONSE,
          handler: (event: BusEventUserDefinedResponse) => {
            expect(Object.isFrozen(event.data.fullMessage)).toBe(true);
            expect(() => {
              event.data.message.user_defined.value = 'forbidden';
            }).toThrow(TypeError);
            seen.push(event.data.fullMessage.context);
          },
        });
      },
    });
    await act(() =>
      instance.messaging.insertHistory([
        { message: new HostResponse('First'), time: TIME },
      ])
    );
    await waitFor(() => expect(seen).toContainEqual({ source: 'First' }));
    const before = instance.getState();
    await act(() =>
      instance.messaging.insertHistory([
        { message: new HostResponse('Latest'), time: TIME },
      ])
    );
    expect(instance.getState().messages[0].context).toEqual({
      source: 'Latest',
    });
    await waitFor(() => expect(seen).toContainEqual({ source: 'Latest' }));
    expect(instance.getState().messages[0]).toMatchObject({
      output: { generic: [{ text: 'Latest' }] },
    });
    expect(before.messages[0].context).toEqual({ source: 'First' });
  });
});
