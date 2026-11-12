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

// Copy the tests set through `strings`, so they find controls by an accessible
// name they own rather than by the chat's default text.
const STRINGS = {
  feedback_positiveLabel: 'Contract thumbs up',
  feedback_negativeLabel: 'Contract thumbs down',
  feedback_submitLabel: 'Contract submit',
};
const PLACEHOLDER = 'Contract feedback text';

/** Every element under `root`, through open shadow roots. */
function* deepElements(root: ParentNode): Generator<Element> {
  for (const element of Array.from(root.querySelectorAll('*'))) {
    yield element;
    if (element.shadowRoot) {
      yield* deepElements(element.shadowRoot);
    }
  }
}

/** The text a node shows, following slots to what they show. */
function shownText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }
  if (!(node instanceof Element) || node.tagName === 'STYLE') {
    return '';
  }
  if (node instanceof HTMLSlotElement) {
    const assigned = node.assignedNodes({ flatten: true });
    return (assigned.length ? assigned : Array.from(node.childNodes))
      .map(shownText)
      .join('');
  }
  const children = node.shadowRoot
    ? node.shadowRoot.childNodes
    : node.childNodes;
  return Array.from(children).map(shownText).join('');
}

/** A simple accessible name: aria-label, then content, then placeholder. */
function accessibleName(element: Element): string {
  return (
    element.getAttribute('aria-label') ||
    shownText(element).replace(/\s+/g, ' ').trim() ||
    element.getAttribute('placeholder') ||
    ''
  );
}

function roleOf(element: Element): string | null {
  const explicit = element.getAttribute('role');
  if (explicit) {
    return explicit;
  }
  if (element instanceof HTMLButtonElement) {
    return 'button';
  }
  return element instanceof HTMLTextAreaElement ? 'textbox' : null;
}

/**
 * Every control with this role and accessible name, in document order,
 * searching shadow roots. Where a custom element and the native control inside
 * it both match, only the native one is kept, since that's what a user clicks.
 */
function allByRole(role: string, name: string): HTMLElement[] {
  const matches = [...deepElements(document)].filter(
    (element) => roleOf(element) === role && accessibleName(element) === name
  ) as HTMLElement[];
  return matches.filter(
    (element) =>
      !matches.some(
        (other) =>
          other !== element &&
          element.shadowRoot !== null &&
          [...deepElements(element.shadowRoot)].includes(other)
      )
  );
}

function firstByRole(role: string, name: string): HTMLElement {
  const [element] = allByRole(role, name);
  if (!element) {
    throw new Error(`no ${role} named "${name}"`);
  }
  return element;
}

/**
 * The chat renders both the positive and the negative details form. The
 * positive one comes first, so the first match is the positive form's control
 * and the last is the negative form's (both hold if only the open one is drawn).
 */
function lastByRole(role: string, name: string): HTMLElement {
  const element = allByRole(role, name).at(-1);
  if (!element) {
    throw new Error(`no ${role} named "${name}"`);
  }
  return element;
}

async function click(element: HTMLElement): Promise<void> {
  await act(async () => {
    element.click();
  });
}

/** Mounts a chat with the test strings and opens the main window. */
async function openChat(config: Partial<PublicConfig> = {}) {
  const mount = await contractChat({
    ...config,
    strings: STRINGS,
    messaging: { skipWelcome: true, ...config.messaging },
  });
  await act(() => mount.instance.changeView(ViewType.MAIN_WINDOW));
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
    const events = recordEvents(instance);
    await click(firstByRole('button', STRINGS.feedback_positiveLabel));
    expect(events.typesExcept(BusEventType.STATE_CHANGE)).toEqual(['feedback']);
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
    await click(firstByRole('button', STRINGS.feedback_negativeLabel));
    expect(feedbackEvents(events).map(summary)).toEqual([
      {
        interactionType: FeedbackInteractionType.SUBMITTED,
        isPositive: false,
        text: undefined,
        categories: undefined,
      },
    ]);
    await click(firstByRole('button', STRINGS.feedback_negativeLabel));
    await click(firstByRole('button', STRINGS.feedback_positiveLabel));
    expect(feedbackEvents(events)).toHaveLength(1);
  });

  it('fires DETAILS_OPENED for a thumbs down with details, then DETAILS_CLOSED when clicked again', async () => {
    const { instance } = await openChat();
    await addFeedbackResponse(instance, feedbackItem());
    const events = recordEvents(instance);
    await click(firstByRole('button', STRINGS.feedback_negativeLabel));
    await click(firstByRole('button', STRINGS.feedback_negativeLabel));
    expect(events.typesExcept(BusEventType.STATE_CHANGE)).toEqual([
      'feedback',
      'feedback',
    ]);
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
    await click(firstByRole('button', STRINGS.feedback_positiveLabel));
    await click(firstByRole('button', 'Clear'));
    await act(async () => {
      fireEvent.input(firstByRole('textbox', PLACEHOLDER), {
        target: { value: 'Great answer' },
      });
    });
    await click(firstByRole('button', STRINGS.feedback_submitLabel));
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
    await click(firstByRole('button', STRINGS.feedback_negativeLabel));
    await click(firstByRole('button', 'Wrong'));
    await click(lastByRole('button', STRINGS.feedback_submitLabel));
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
    await addFeedbackResponse(instance, feedbackItem({ categories: ['Fast'] }));
    const events = recordEvents(instance, [BusEventType.FEEDBACK]);
    await click(firstByRole('button', STRINGS.feedback_positiveLabel));
    await click(firstByRole('button', STRINGS.feedback_submitLabel));
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
      feedbackItem({ categories: ['Fast', 'Clear'] })
    );
    await click(firstByRole('button', STRINGS.feedback_positiveLabel));
    await click(firstByRole('button', 'Fast'));
    await act(async () => {
      fireEvent.input(firstByRole('textbox', PLACEHOLDER), {
        target: { value: 'Nice' },
      });
    });
    await click(firstByRole('button', STRINGS.feedback_submitLabel));
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
    await click(firstByRole('button', STRINGS.feedback_positiveLabel));
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
    const events = recordEvents(instance);
    await click(firstByRole('button', 'Contract custom'));
    expect(events.typesExcept(BusEventType.STATE_CHANGE)).toEqual([
      'messageItemCustom',
    ]);
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
    await click(firstByRole('button', 'Contract custom'));
    await click(firstByRole('button', 'Contract custom'));
    expect(events.types()).toEqual(['messageItemCustom', 'messageItemCustom']);
  });

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
    await click(firstByRole('button', 'Contract custom'));
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

  it('fires for each restored request after history:end on insertHistory, under a new slot name each time', async () => {
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
      BusEventType.HISTORY_BEGIN,
      BusEventType.HISTORY_END,
      BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
    ]);
    await act(() => instance.messaging.insertHistory(history()));
    await act(() => instance.messaging.insertHistory(history()));
    expect(events.types()).toEqual([
      'history:begin',
      'history:end',
      'customRequestFooterSlot',
      'history:begin',
      'history:end',
      'customRequestFooterSlot',
    ]);
    const [first, second] = footerEvents(events);
    expect(first.data.message.id).toBe('q1');
    expect(first.data.message.input.text).toBe('from before');
    expect(second.data.message.id).toBe('q1');
    expect(first.data.slotName).not.toBe(second.data.slotName);
  });
});
