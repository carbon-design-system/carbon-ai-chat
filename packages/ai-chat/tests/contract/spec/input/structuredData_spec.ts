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
  ChatInstance,
  PageObjectId,
  StructuredData,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  FakeBackend,
  changeView,
  contractChat,
  contractSetup,
  fakeBackend,
  getByTestId,
} from '../../helpers';

/** Mounts a chat, opens its main window, and answers each send at once. */
async function openChat(): Promise<{
  instance: ChatInstance;
  backend: FakeBackend;
}> {
  const backend = fakeBackend({ autoResolve: true });
  const { instance } = await contractChat({
    messaging: {
      skipWelcome: true,
      customSendMessage: backend.customSendMessage,
    },
  });
  await changeView(instance, ViewType.MAIN_WINDOW);
  await waitFor(() => expect(instance.state.get().isHydratingCounter).toBe(0));
  return { instance, backend };
}

async function setData(
  instance: ChatInstance,
  updater: (previous: StructuredData | undefined) => StructuredData | undefined
): Promise<void> {
  await act(async () => {
    instance.input.updateStructuredData(updater);
  });
}

/** Types into the plain input field, then clicks its send button. */
async function sendFromInput(text: string): Promise<void> {
  const field = getByTestId(PageObjectId.INPUT) as HTMLTextAreaElement;
  await act(async () => {
    field.value = text;
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => {
    getByTestId(PageObjectId.INPUT_SEND).click();
  });
}

const RATING: StructuredData = { fields: [{ id: 'rating', value: 4 }] };

// @covers instance.input.updateStructuredData state.input.structuredData
// @covers state.input.structuredData.fields state.input.structuredData.user_defined
describe('input.updateStructuredData', () => {
  contractSetup();

  it('publishes the data, fields and user_defined as given', async () => {
    const { instance } = await openChat();
    const data: StructuredData = {
      fields: [
        { id: 'rating', value: 4 },
        { id: 'tags', value: ['billing', { nested: true }] },
      ],
      user_defined: { source: 'form', count: 2 },
    };
    await setData(instance, () => data);
    expect(instance.state.get().input.structuredData).toEqual(data);
  });

  it('gives the updater undefined first, then the current data', async () => {
    const { instance } = await openChat();
    const seen: (StructuredData | undefined)[] = [];
    await setData(instance, (previous) => {
      seen.push(previous);
      return RATING;
    });
    await setData(instance, (previous) => {
      seen.push(previous);
      return {
        ...previous,
        fields: [...previous.fields, { id: 'comment', value: 'fine' }],
      };
    });
    expect(seen).toEqual([undefined, RATING]);
    expect(instance.state.get().input.structuredData.fields).toEqual([
      { id: 'rating', value: 4 },
      { id: 'comment', value: 'fine' },
    ]);
  });

  it('clears the data when the updater returns undefined', async () => {
    const { instance } = await openChat();
    await setData(instance, () => RATING);
    await setData(instance, () => undefined);
    expect(instance.state.get().input.structuredData).toBeUndefined();
  });

  it('keeps no link to the object the updater returned', async () => {
    const { instance } = await openChat();
    const data = { fields: [{ id: 'rating', value: 4 }] };
    await setData(instance, () => data);
    data.fields[0].value = 99;
    expect(instance.state.get().input.structuredData).toEqual(RATING);
  });

  it('publishes a frozen snapshot', async () => {
    const { instance } = await openChat();
    await setData(instance, () => RATING);
    const { structuredData } = instance.state.get().input;
    expect(Object.isFrozen(structuredData)).toBe(true);
    expect(Object.isFrozen(structuredData.fields)).toBe(true);
  });

  it('keeps the data when the updater throws', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const { instance } = await openChat();
    await setData(instance, () => RATING);
    expect(() =>
      instance.input.updateStructuredData(() => {
        throw new Error('host updater failed');
      })
    ).not.toThrow();
    expect(instance.state.get().input.structuredData).toEqual(RATING);
    expect(consoleError).toHaveBeenCalled();
  });

  it('does not make an empty input sendable', async () => {
    const { instance, backend } = await openChat();
    await setData(instance, () => RATING);
    await act(async () => {
      getByTestId(PageObjectId.INPUT_SEND).click();
    });
    expect(backend.requests).toHaveLength(0);
    expect(instance.state.get().input.structuredData).toEqual(RATING);
  });
});

// @covers instance.input.updateStructuredData state.input.structuredData
describe('structured data on send', () => {
  contractSetup();

  it('goes out with a send from the input, and is cleared after', async () => {
    const { instance, backend } = await openChat();
    await setData(instance, () => RATING);
    await sendFromInput('rated');
    await waitFor(() => expect(backend.requests).toHaveLength(1));
    expect(backend.requests[0].request.input.text).toBe('rated');
    expect(backend.requests[0].request.input.structured_data).toEqual(RATING);
    expect(instance.state.get().input.structuredData).toBeUndefined();
  });

  it('goes out with instance.send of a string, and is cleared after', async () => {
    const { instance, backend } = await openChat();
    await setData(instance, () => RATING);
    await act(async () => {
      await instance.send('from code');
    });
    expect(backend.requests[0].request.input.structured_data).toEqual(RATING);
    expect(instance.state.get().input.structuredData).toBeUndefined();
  });

  it('goes out with an empty-text instance.send', async () => {
    const { instance, backend } = await openChat();
    await setData(instance, () => ({ user_defined: { only: true } }));
    await act(async () => {
      await instance.send('');
    });
    expect(backend.requests[0].request.input).toMatchObject({
      text: '',
      structured_data: { user_defined: { only: true } },
    });
  });

  it('yields to a request that brings its own, and is still cleared', async () => {
    const { instance, backend } = await openChat();
    await setData(instance, () => RATING);
    const own: StructuredData = { user_defined: { explicit: true } };
    await act(async () => {
      await instance.send({ input: { text: 'own', structured_data: own } });
    });
    expect(backend.requests[0].request.input.structured_data).toEqual(own);
    // On `main` the pending data is dropped, not kept for the next send.
    expect(instance.state.get().input.structuredData).toBeUndefined();
    await act(async () => {
      await instance.send('next');
    });
    expect(backend.requests[1].request.input.structured_data).toBeUndefined();
  });

  it('leaves structured_data off a send when none is pending', async () => {
    const { instance, backend } = await openChat();
    await act(async () => {
      await instance.send('plain');
    });
    expect(backend.requests[0].request.input).not.toHaveProperty(
      'structured_data'
    );
  });
});
