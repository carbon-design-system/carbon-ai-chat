/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, fireEvent, waitFor } from '@testing-library/react';

import {
  BusEventCustomRequestFooterSlot,
  BusEventFeedback,
  BusEventMessageItemCustom,
  BusEventPreSend,
  BusEventType,
  ButtonItemType,
  ChatInstance,
  FeedbackInteractionType,
  GenericItem,
  MessageRequest,
  MessageResponse,
  MessageResponseTypes,
  PublicConfig,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  allByRole,
  byRole,
  changeView,
  click,
  contractChat,
  contractSetup,
  fakeBackend,
  flatParent,
  finishSend,
  instanceSender,
  recordEvents,
  responseOf,
  startSend,
  textItem,
} from '../../helpers';

// Copy the tests set through `strings`, so they find controls by an accessible
// name they own rather than by the chat's default text.
const STRINGS = {
  feedback_positiveLabel: 'Contract thumbs up',
  feedback_negativeLabel: 'Contract thumbs down',
  feedback_submitLabel: 'Contract submit',
};
const PLACEHOLDER = 'Contract feedback text';

/** A node's flat-tree ancestors, nearest first, starting with the node. */
function ancestors(node: Node): Node[] {
  const chain: Node[] = [];
  for (
    let current: Node | null = node;
    current;
    current = flatParent(current)
  ) {
    chain.push(current);
  }
  return chain;
}

/**
 * The control with this role and name in the same details form as the
 * category button `category`: of the matches, the one that shares the
 * nearest ancestor with it.
 *
 * The chat draws the positive and the negative details form at once, and in
 * jsdom nothing marks the closed one hidden (a stylesheet class hides it, and
 * the thumbs buttons' `aria-controls` is empty), so a test reaches a form
 * through a category name that only that form shows.
 */
function inFormWith(role: string, name: string, category: string): HTMLElement {
  const anchor = ancestors(byRole('button', category));
  const depth = (match: HTMLElement) =>
    anchor.length - anchor.findIndex((node) => ancestors(match).includes(node));
  const ranked = allByRole(role, name)
    .map((match) => ({ match, depth: depth(match) }))
    .sort((left, right) => right.depth - left.depth);
  if (!ranked.length || ranked[0].depth === ranked[1]?.depth) {
    throw new Error(`no single ${role} named "${name}" beside "${category}"`);
  }
  return ranked[0].match;
}

/** Mounts a chat with the test strings and opens the main window. */
async function openChat(config: Partial<PublicConfig> = {}) {
  const mount = await contractChat({
    ...config,
    strings: STRINGS,
    messaging: { skipWelcome: true, ...config.messaging },
  });
  await changeView(mount.instance, ViewType.MAIN_WINDOW);
  return mount;
}

/** A text item asking for feedback, with these options. */
function feedbackItem(options: Record<string, unknown> = {}): GenericItem {
  return {
    ...textItem('Rate this answer'),
    message_item_options: {
      feedback: {
        is_on: true,
        id: 'fb-1',
        placeholder: PLACEHOLDER,
        ...options,
      },
    },
  } as GenericItem;
}

/** Adds a response holding `item` and waits for the thumbs-up to show. */
async function addFeedbackResponse(
  instance: ChatInstance,
  item: GenericItem
): Promise<void> {
  await act(() => instance.messaging.addMessage(responseOf('r1', [item])));
  await waitFor(() =>
    expect(allByRole('button', STRINGS.feedback_positiveLabel)).toHaveLength(1)
  );
}

function feedbackEvents(
  events: ReturnType<typeof recordEvents>
): BusEventFeedback[] {
  return events.of<BusEventFeedback>(BusEventType.FEEDBACK);
}

/** The fields of a feedback event a host reads, without the message. */
function summary(event: BusEventFeedback) {
  return {
    interactionType: event.interactionType,
    isPositive: event.isPositive,
    text: event.text,
    categories: event.categories,
  };
}

function storedResponse(instance: ChatInstance, id: string): MessageResponse {
  return instance
    .getState()
    .messages.find((message) => message.id === id) as MessageResponse;
}

// @covers event.feedback
describe('feedback events', () => {
  contractSetup();

  it('fires one SUBMITTED event for a thumbs up with no details, with the item and message', async () => {
    const { instance } = await openChat();
    const item = feedbackItem({ show_positive_details: false });
    await addFeedbackResponse(instance, item);
    const events = recordEvents(instance, [BusEventType.FEEDBACK]);
    await click(byRole('button', STRINGS.feedback_positiveLabel));
    expect(feedbackEvents(events)).toHaveLength(1);
    const [event] = feedbackEvents(events);
    expect(summary(event)).toEqual({
      interactionType: FeedbackInteractionType.SUBMITTED,
      isPositive: true,
      text: undefined,
      categories: undefined,
    });
    expect(event.messageItem).toEqual(item);
    expect(event.message.id).toBe('r1');
    expect(event.message.output.generic).toEqual([item]);
  });

  it('fires nothing more once feedback is submitted', async () => {
    const { instance } = await openChat();
    await addFeedbackResponse(
      instance,
      feedbackItem({ show_negative_details: false })
    );
    const events = recordEvents(instance, [BusEventType.FEEDBACK]);
    await click(byRole('button', STRINGS.feedback_negativeLabel));
    expect(feedbackEvents(events).map(summary)).toEqual([
      {
        interactionType: FeedbackInteractionType.SUBMITTED,
        isPositive: false,
        text: undefined,
        categories: undefined,
      },
    ]);
    await click(byRole('button', STRINGS.feedback_negativeLabel));
    await click(byRole('button', STRINGS.feedback_positiveLabel));
    expect(feedbackEvents(events)).toHaveLength(1);
  });

  it('fires DETAILS_OPENED for a thumbs down with details, then DETAILS_CLOSED when clicked again', async () => {
    const { instance } = await openChat();
    await addFeedbackResponse(instance, feedbackItem());
    const events = recordEvents(instance, [BusEventType.FEEDBACK]);
    await click(byRole('button', STRINGS.feedback_negativeLabel));
    await click(byRole('button', STRINGS.feedback_negativeLabel));
    expect(feedbackEvents(events).map(summary)).toEqual([
      {
        interactionType: FeedbackInteractionType.DETAILS_OPENED,
        isPositive: false,
        text: undefined,
        categories: undefined,
      },
      {
        interactionType: FeedbackInteractionType.DETAILS_CLOSED,
        isPositive: false,
        text: undefined,
        categories: undefined,
      },
    ]);
  });

  it('fires SUBMITTED with the text and categories the user entered in the details form', async () => {
    const { instance } = await openChat();
    const item = feedbackItem({
      categories: { positive: ['Fast', 'Clear'], negative: ['Wrong'] },
    });
    await addFeedbackResponse(instance, item);
    const events = recordEvents(instance, [BusEventType.FEEDBACK]);
    await click(byRole('button', STRINGS.feedback_positiveLabel));
    await click(byRole('button', 'Clear'));
    await act(async () => {
      fireEvent.input(inFormWith('textbox', PLACEHOLDER, 'Clear'), {
        target: { value: 'Great answer' },
      });
    });
    await click(inFormWith('button', STRINGS.feedback_submitLabel, 'Clear'));
    expect(feedbackEvents(events).map(summary)).toEqual([
      {
        interactionType: FeedbackInteractionType.DETAILS_OPENED,
        isPositive: true,
        text: undefined,
        categories: undefined,
      },
      {
        interactionType: FeedbackInteractionType.SUBMITTED,
        isPositive: true,
        text: 'Great answer',
        categories: ['Clear'],
      },
    ]);
    const submitted = feedbackEvents(events)[1];
    expect(submitted.messageItem).toEqual(item);
    expect(submitted.message.id).toBe('r1');
  });

  it('submits negative feedback from the negative form, with its own categories', async () => {
    const { instance } = await openChat();
    await addFeedbackResponse(
      instance,
      feedbackItem({ categories: { positive: ['Fast'], negative: ['Wrong'] } })
    );
    const events = recordEvents(instance, [BusEventType.FEEDBACK]);
    await click(byRole('button', STRINGS.feedback_negativeLabel));
    await click(byRole('button', 'Wrong'));
    await click(inFormWith('button', STRINGS.feedback_submitLabel, 'Wrong'));
    expect(feedbackEvents(events).map(summary)).toEqual([
      {
        interactionType: FeedbackInteractionType.DETAILS_OPENED,
        isPositive: false,
        text: undefined,
        categories: undefined,
      },
      {
        interactionType: FeedbackInteractionType.SUBMITTED,
        isPositive: false,
        text: '',
        categories: ['Wrong'],
      },
    ]);
  });

  it('submits empty text and no categories when the user enters nothing', async () => {
    const { instance } = await openChat();
    await addFeedbackResponse(
      instance,
      feedbackItem({ categories: { positive: ['Fast'], negative: ['Slow'] } })
    );
    const events = recordEvents(instance, [BusEventType.FEEDBACK]);
    await click(byRole('button', STRINGS.feedback_positiveLabel));
    await click(inFormWith('button', STRINGS.feedback_submitLabel, 'Fast'));
    // `main` sends an empty string and an empty array, not `undefined`.
    expect(summary(feedbackEvents(events)[1])).toEqual({
      interactionType: FeedbackInteractionType.SUBMITTED,
      isPositive: true,
      text: '',
      categories: [],
    });
  });

  it('records submitted feedback in the message history under the feedback ID', async () => {
    const { instance } = await openChat();
    await addFeedbackResponse(
      instance,
      feedbackItem({
        categories: { positive: ['Fast', 'Clear'], negative: ['Slow'] },
      })
    );
    await click(byRole('button', STRINGS.feedback_positiveLabel));
    await click(byRole('button', 'Fast'));
    await act(async () => {
      fireEvent.input(inFormWith('textbox', PLACEHOLDER, 'Fast'), {
        target: { value: 'Nice' },
      });
    });
    await click(inFormWith('button', STRINGS.feedback_submitLabel, 'Fast'));
    await waitFor(() =>
      expect(storedResponse(instance, 'r1').history?.feedback).toEqual({
        'fb-1': { is_positive: true, text: 'Nice', categories: ['Fast'] },
      })
    );
  });

  it('fires feedback but records no history for feedback with no ID', async () => {
    const { instance } = await openChat();
    await addFeedbackResponse(
      instance,
      feedbackItem({ id: undefined, show_positive_details: false })
    );
    const events = recordEvents(instance, [BusEventType.FEEDBACK]);
    await click(byRole('button', STRINGS.feedback_positiveLabel));
    expect(feedbackEvents(events)).toHaveLength(1);
    expect(storedResponse(instance, 'r1').history?.feedback).toBeUndefined();
  });
});

/** A button that fires `messageItemCustom` when clicked. */
function customEventButton(label: string): GenericItem {
  return {
    response_type: MessageResponseTypes.BUTTON,
    button_type: ButtonItemType.CUSTOM_EVENT,
    label,
    custom_event_name: 'contract-event',
    user_defined: { action: 'open-cart' },
  } as GenericItem;
}

// @covers event.messageItemCustom
describe('custom event buttons', () => {
  contractSetup();

  it('fires messageItemCustom with the button item and its full message, and sends nothing', async () => {
    const backend = fakeBackend({ autoResolve: true });
    const { instance } = await openChat({
      messaging: { customSendMessage: backend.customSendMessage },
    });
    const button = customEventButton('Contract custom');
    const generic = [textItem('Pick one'), button];
    await act(() => instance.messaging.addMessage(responseOf('r1', generic)));
    await waitFor(() =>
      expect(allByRole('button', 'Contract custom')).toHaveLength(1)
    );
    const events = recordEvents(instance, [
      BusEventType.MESSAGE_ITEM_CUSTOM,
      BusEventType.PRE_SEND,
      BusEventType.SEND,
    ]);
    await click(byRole('button', 'Contract custom'));
    expect(events.types()).toEqual(['messageItemCustom']);
    const [event] = events.of<BusEventMessageItemCustom>(
      BusEventType.MESSAGE_ITEM_CUSTOM
    );
    expect(event.messageItem).toEqual(button);
    expect(event.fullMessage.id).toBe('r1');
    expect(event.fullMessage.output.generic).toEqual(generic);
    expect(backend.requests).toHaveLength(0);
  });

  it('fires once per click, and the button stays enabled', async () => {
    const { instance } = await openChat();
    await act(() =>
      instance.messaging.addMessage(
        responseOf('r1', [customEventButton('Contract custom')])
      )
    );
    await waitFor(() =>
      expect(allByRole('button', 'Contract custom')).toHaveLength(1)
    );
    const events = recordEvents(instance, [BusEventType.MESSAGE_ITEM_CUSTOM]);
    await click(byRole('button', 'Contract custom'));
    await click(byRole('button', 'Contract custom'));
    expect(events.types()).toEqual(['messageItemCustom', 'messageItemCustom']);
  });

  // @covers config.isReadonly
  it('fires nothing while the chat is readonly', async () => {
    const { instance } = await openChat({ isReadonly: true });
    await act(() =>
      instance.messaging.addMessage(
        responseOf('r1', [customEventButton('Contract custom')])
      )
    );
    await waitFor(() =>
      expect(allByRole('button', 'Contract custom')).toHaveLength(1)
    );
    const events = recordEvents(instance, [BusEventType.MESSAGE_ITEM_CUSTOM]);
    await click(byRole('button', 'Contract custom'));
    expect(events.types()).toEqual([]);
  });
});

function footerEvents(
  events: ReturnType<typeof recordEvents>
): BusEventCustomRequestFooterSlot[] {
  return events.of<BusEventCustomRequestFooterSlot>(
    BusEventType.CUSTOM_REQUEST_FOOTER_SLOT
  );
}

// @covers event.customRequestFooterSlot
describe('customRequestFooterSlot', () => {
  contractSetup();

  async function mount() {
    const backend = fakeBackend();
    const { instance } = await contractChat({
      messaging: { customSendMessage: backend.customSendMessage },
    });
    return { instance, chat: instanceSender(instance, backend) };
  }

  it('fires once for a sent message, with a slot name and the message as sent', async () => {
    const { instance, chat } = await mount();
    const events = recordEvents(instance, [
      BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
    ]);
    const started = await startSend(chat, 'hello');
    await finishSend(started);
    expect(footerEvents(events)).toHaveLength(1);
    const [{ data }] = footerEvents(events);
    // The slot name is opaque (its JSDoc says so); only its type is contract.
    expect(typeof data.slotName).toBe('string');
    expect(data.slotName.length).toBeGreaterThan(0);
    expect(data.message.id).toBe(started.sent.request.id);
    expect(data.message.input.text).toBe('hello');
  });

  it('fires before pre:send, and keeps the text the user submitted when pre:send rewrites it', async () => {
    const { instance, chat } = await mount();
    instance.on({
      type: BusEventType.PRE_SEND,
      handler: (event: BusEventPreSend) => {
        event.data.input.text = 'rewritten';
      },
    });
    const events = recordEvents(instance, [
      BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
      BusEventType.PRE_SEND,
      BusEventType.SEND,
    ]);
    const started = await startSend(chat, 'hello');
    expect(events.types()).toEqual([
      'customRequestFooterSlot',
      'pre:send',
      'send',
    ]);
    expect(started.sent.request.input.text).toBe('rewritten');
    expect(footerEvents(events)[0].data.message.input.text).toBe('hello');
    await finishSend(started);
  });

  it('gives each message its own slot name', async () => {
    const { instance, chat } = await mount();
    const events = recordEvents(instance, [
      BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
    ]);
    await finishSend(await startSend(chat, 'one'));
    await finishSend(await startSend(chat, 'two'));
    const [first, second] = footerEvents(events);
    expect([
      first.data.message.input.text,
      second.data.message.input.text,
    ]).toEqual(['one', 'two']);
    expect(first.data.slotName).not.toBe(second.data.slotName);
  });

  it('fires nothing for a silent send', async () => {
    const { instance, chat } = await mount();
    const events = recordEvents(instance, [
      BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
      BusEventType.SEND,
    ]);
    await finishSend(await startSend(chat, 'quiet', { silent: true }));
    expect(events.types()).toEqual(['send']);
  });

  it('fires nothing for a request with no text', async () => {
    const { instance, chat } = await mount();
    const events = recordEvents(instance, [
      BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
      BusEventType.SEND,
    ]);
    await finishSend(await startSend(chat, { input: { text: '' } }));
    expect(events.types()).toEqual(['send']);
  });

  it('fires once per restored request on each insertHistory, under a new slot name each time', async () => {
    const { instance } = await mount();
    // Fresh objects each time: insertHistory freezes what it is given.
    const history = () => [
      {
        message: { id: 'q1', input: { text: 'from before' } } as MessageRequest,
        time: '2026-01-01T00:00:00.000Z',
      },
      {
        message: responseOf('r1', [textItem('answer')]),
        time: '2026-01-01T00:00:01.000Z',
      },
    ];
    const events = recordEvents(instance, [
      BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
    ]);
    await act(() => instance.messaging.insertHistory(history()));
    expect(footerEvents(events)).toHaveLength(1);
    await act(() => instance.messaging.insertHistory(history()));
    expect(footerEvents(events)).toHaveLength(2);
    const [first, second] = footerEvents(events);
    expect(first.data.message.id).toBe('q1');
    expect(first.data.message.input.text).toBe('from before');
    expect(second.data.message.id).toBe('q1');
    expect(first.data.slotName).not.toBe(second.data.slotName);
  });
});
