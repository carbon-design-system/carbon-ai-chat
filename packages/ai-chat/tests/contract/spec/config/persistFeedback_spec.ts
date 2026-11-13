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
  BusEventFeedback,
  BusEventType,
  ChatInstance,
  GenericItem,
  PublicConfig,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  allByRole,
  changeView,
  click,
  contractChat,
  contractSetup,
  fakeBackend,
  finishSend,
  instanceSender,
  recordEvents,
  responseOf,
  startSend,
  textItem,
} from '../../helpers';

// Copy the tests set through `strings`, so they find the thumbs by names they own.
const STRINGS = { feedback_positiveLabel: 'Contract thumbs up' };

const thumbsUp = () => allByRole('button', STRINGS.feedback_positiveLabel);

/** Whether a control is disabled, natively or through ARIA. */
function isDisabled(element: HTMLElement): boolean {
  return (
    (element as HTMLButtonElement).disabled === true ||
    element.getAttribute('aria-disabled') === 'true'
  );
}

/** A text item asking for feedback; a thumbs up submits at once. */
function feedbackItem(text: string, feedbackID: string): GenericItem {
  return {
    ...textItem(text),
    message_item_options: {
      feedback: { is_on: true, id: feedbackID, show_positive_details: false },
    },
  } as GenericItem;
}

/** Mounts a chat with the test strings and opens the main window. */
async function openChat(config: Partial<PublicConfig> = {}) {
  const backend = fakeBackend();
  const mount = await contractChat({
    ...config,
    strings: STRINGS,
    messaging: {
      skipWelcome: true,
      customSendMessage: backend.customSendMessage,
    },
  });
  await changeView(mount.instance, ViewType.MAIN_WINDOW);
  return { ...mount, backend };
}

/** Adds a response asking for feedback, and waits for `thumbs` thumbs up. */
async function addFeedbackResponse(
  instance: ChatInstance,
  id: string,
  thumbs: number
): Promise<void> {
  await act(() =>
    instance.messaging.addMessage(
      responseOf(id, [feedbackItem(id, `fb-${id}`)])
    )
  );
  await waitFor(() => expect(thumbsUp()).toHaveLength(thumbs));
}

/** Clicks a thumbs up and returns the ID of the message its event names. */
async function rate(instance: ChatInstance, button: HTMLElement) {
  const events = recordEvents(instance, [BusEventType.FEEDBACK]);
  await click(button);
  events.stop();
  return events
    .of<BusEventFeedback>(BusEventType.FEEDBACK)
    .map((event) => event.message.id);
}

// @covers config.persistFeedback
describe('persistFeedback', () => {
  contractSetup();

  it.each([
    ['unset', {}],
    ['false', { persistFeedback: false }],
  ])(
    'when %s, offers feedback only on the latest message',
    async (_label, config) => {
      const { instance } = await openChat(config);
      await addFeedbackResponse(instance, 'r1', 1);
      await addFeedbackResponse(instance, 'r2', 1);
      expect(await rate(instance, thumbsUp()[0])).toEqual(['r2']);
    }
  );

  it('when unset, takes feedback off a response once the user sends a message after it', async () => {
    const { instance, backend } = await openChat();
    await addFeedbackResponse(instance, 'r1', 1);
    const started = await startSend(instanceSender(instance, backend), 'next');
    await waitFor(() => expect(thumbsUp()).toHaveLength(0));
    await finishSend(started);
  });

  it('when unset, keeps the thumbs of a response already rated, but disabled', async () => {
    const { instance } = await openChat();
    await addFeedbackResponse(instance, 'r1', 1);
    expect(await rate(instance, thumbsUp()[0])).toEqual(['r1']);
    await addFeedbackResponse(instance, 'r2', 2);
    expect(thumbsUp().map(isDisabled)).toEqual([true, false]);
    expect(await rate(instance, thumbsUp()[1])).toEqual(['r2']);
  });

  it('when true, offers feedback on every message, older ones included', async () => {
    const { instance } = await openChat({ persistFeedback: true });
    await addFeedbackResponse(instance, 'r1', 1);
    await addFeedbackResponse(instance, 'r2', 2);
    expect(thumbsUp().map(isDisabled)).toEqual([false, false]);
    expect(await rate(instance, thumbsUp()[0])).toEqual(['r1']);
  });

  it('when true, keeps feedback on a response after the user sends a message', async () => {
    const { instance, backend } = await openChat({ persistFeedback: true });
    await addFeedbackResponse(instance, 'r1', 1);
    const started = await startSend(instanceSender(instance, backend), 'next');
    await finishSend(started);
    expect(thumbsUp()).toHaveLength(1);
    expect(await rate(instance, thumbsUp()[0])).toEqual(['r1']);
  });
});
