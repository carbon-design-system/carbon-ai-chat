/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * How a config change after mount behaves when a host sets new properties
 * (or attributes) on a connected `cds-aichat-*` element. What each field does
 * once changed is in `configUpdates_spec.ts`; this file covers what is
 * particular to the element path: properties, attributes, the base `config`
 * object under them, and equal values set again.
 */

import { act, waitFor } from '@testing-library/react';

import { PageObjectId, PublicConfig } from '../../../../src/aiChatEntry';
import {
  ELEMENT_TAGS,
  contractSetup,
  fakeBackend,
  finishSend,
  getByTestId,
  headerTitle,
  instanceSender,
  openElement,
  pause,
  recordEvents,
  startSend,
  textResponse,
} from '../../helpers';

/** Sets properties on the element the way a host would, inside `act`. */
async function setProperties(
  element: HTMLElement & Record<string, unknown>,
  properties: Record<string, unknown> & Partial<PublicConfig>
) {
  await act(async () => {
    Object.assign(element, properties);
  });
}

describe.each(ELEMENT_TAGS)('config updates on %s', (tag) => {
  contractSetup();

  // @covers config.header config.header.title state.messages state.viewState
  it('shows a header set as a new property, keeping messages and the open view', async () => {
    const { instance, element } = await openElement(tag, {
      header: { title: 'Before' },
    });
    await act(async () => {
      await instance.messaging.addMessage(textResponse('Kept', 'kept'));
    });
    const events = recordEvents(instance);
    const before = instance.getState();
    await setProperties(element, { header: { title: 'After' } });
    await waitFor(() => expect(headerTitle()).toBe('After'));
    expect(instance.getState().messages).toEqual(before.messages);
    expect(instance.getState().viewState).toEqual({
      launcher: false,
      mainWindow: true,
    });
    expect(events.types()).toEqual([]);
  });

  // @covers config.header config.messaging config.strings
  it('fires no events and changes no state when properties are set again to equal values', async () => {
    const send = jest.fn();
    const properties = () => ({
      header: { title: 'Same' },
      strings: { input_placeholder: 'Same placeholder' },
      messaging: { skipWelcome: true, customSendMessage: send },
    });
    const { instance, element } = await openElement(tag, properties());
    const events = recordEvents(instance);
    let stateChanges = 0;
    instance.state.subscribe(() => {
      stateChanges += 1;
    });
    const before = instance.getState();
    await setProperties(element, properties());
    await pause();
    expect(events.types()).toEqual([]);
    expect(stateChanges).toBe(0);
    expect(instance.getState()).toEqual(before);
  });

  // @covers config.header.title
  it('lets a flattened property win over the same field in config, and falls back to config once it is cleared', async () => {
    const { element } = await openElement(tag, {
      header: { title: 'From the property' },
    });
    await setProperties(element, {
      config: { header: { title: 'From config' } },
    });
    await pause();
    expect(headerTitle()).toBe('From the property');
    await setProperties(element, { header: undefined });
    await waitFor(() => expect(headerTitle()).toBe('From config'));
  });

  // @covers config.header.title
  it('applies a changed attribute over the property it replaces', async () => {
    const { element } = await openElement(tag, {
      header: { title: 'From the property' },
    });
    await act(async () => {
      element.setAttribute('header', '{"title":"From the attribute"}');
    });
    await waitFor(() => expect(headerTitle()).toBe('From the attribute'));
  });

  // @covers config.messaging.customSendMessage
  it('sends to a customSendMessage set as a new messaging property', async () => {
    const first = fakeBackend();
    const second = fakeBackend();
    const { instance, element } = await openElement(tag, {
      messaging: { customSendMessage: first.customSendMessage },
    });
    await setProperties(element, {
      messaging: {
        skipWelcome: true,
        customSendMessage: second.customSendMessage,
      },
    });
    await finishSend(
      await startSend(instanceSender(instance, second), 'to the second')
    );
    expect(first.texts()).toEqual([]);
    expect(second.texts()).toEqual(['to the second']);
  });

  // @covers config.input.isDisabled
  it('disables the input through a new input property', async () => {
    const { element } = await openElement(tag);
    const field = () => getByTestId(PageObjectId.INPUT) as HTMLTextAreaElement;
    expect(field().disabled).toBe(false);
    await setProperties(element, { input: { isDisabled: true } });
    await waitFor(() => expect(field().disabled).toBe(true));
  });
});
