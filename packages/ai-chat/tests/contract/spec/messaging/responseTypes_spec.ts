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
  BusEventReceive,
  BusEventType,
  BusEventUserDefinedResponse,
  ButtonItemType,
  GenericItem,
  MessageResponse,
  MessageResponseTypes,
  MessageState,
  OnErrorType,
  PageObjectId,
} from '../../../../src/aiChatEntry';
import {
  advance,
  byTestId,
  contractChat,
  contractSetup,
  describeShared,
  ids,
  recordEvents,
  responseOf,
  slotted,
} from '../../helpers';

/** A user_defined item, nested inside the container types below. */
const nestedUserDefined = (name: string): GenericItem =>
  ({
    response_type: MessageResponseTypes.USER_DEFINED,
    user_defined: { name },
  }) as GenericItem;

/** One valid item of each response type. */
const ITEMS: Record<MessageResponseTypes, GenericItem> = {
  [MessageResponseTypes.TEXT]: {
    response_type: MessageResponseTypes.TEXT,
    text: 'Hello',
  },
  [MessageResponseTypes.OPTION]: {
    response_type: MessageResponseTypes.OPTION,
    title: 'Pick one',
    options: [
      { label: 'Red', value: { input: { text: 'red' } } },
      { label: 'Blue', value: { input: { text: 'blue' } } },
    ],
  },
  [MessageResponseTypes.CONNECT_TO_HUMAN_AGENT]: {
    response_type: MessageResponseTypes.CONNECT_TO_HUMAN_AGENT,
    message_to_human_agent: 'The user needs help',
  },
  [MessageResponseTypes.IMAGE]: {
    response_type: MessageResponseTypes.IMAGE,
    source: 'https://example.com/image.png',
    alt_text: 'An image',
  },
  [MessageResponseTypes.PAUSE]: {
    response_type: MessageResponseTypes.PAUSE,
    time: 10,
  },
  [MessageResponseTypes.USER_DEFINED]: nestedUserDefined('top'),
  [MessageResponseTypes.IFRAME]: {
    response_type: MessageResponseTypes.IFRAME,
    source: 'https://example.com/embed',
    title: 'Embedded page',
  },
  [MessageResponseTypes.VIDEO]: {
    response_type: MessageResponseTypes.VIDEO,
    source: 'https://example.com/video.mp4',
    title: 'A video',
  },
  [MessageResponseTypes.AUDIO]: {
    response_type: MessageResponseTypes.AUDIO,
    source: 'https://example.com/audio.mp3',
    title: 'An audio clip',
  },
  [MessageResponseTypes.DATE]: {
    response_type: MessageResponseTypes.DATE,
  },
  [MessageResponseTypes.INLINE_ERROR]: {
    response_type: MessageResponseTypes.INLINE_ERROR,
    text: 'Something went wrong',
  },
  [MessageResponseTypes.CARD]: {
    response_type: MessageResponseTypes.CARD,
    body: [{ response_type: MessageResponseTypes.TEXT, text: 'In a card' }],
  },
  [MessageResponseTypes.CAROUSEL]: {
    response_type: MessageResponseTypes.CAROUSEL,
    items: [
      {
        response_type: MessageResponseTypes.CARD,
        body: [{ response_type: MessageResponseTypes.TEXT, text: 'Slide' }],
      },
    ],
  },
  [MessageResponseTypes.BUTTON]: {
    response_type: MessageResponseTypes.BUTTON,
    button_type: ButtonItemType.POST_BACK,
    label: 'Go',
    value: { input: { text: 'go' } },
  },
  [MessageResponseTypes.GRID]: {
    response_type: MessageResponseTypes.GRID,
    columns: [{ width: '1' }],
    rows: [
      {
        cells: [
          {
            items: [{ response_type: MessageResponseTypes.TEXT, text: 'Cell' }],
          },
        ],
      },
    ],
  },
  [MessageResponseTypes.CONVERSATIONAL_SEARCH]: {
    response_type: MessageResponseTypes.CONVERSATIONAL_SEARCH,
    text: 'An answer',
    citations: [{ url: 'https://example.com', title: 'Source' }],
  },
  [MessageResponseTypes.PREVIEW_CARD]: {
    response_type: MessageResponseTypes.PREVIEW_CARD,
    workspace_id: 'workspace-1',
    title: 'Preview',
  },
  [MessageResponseTypes.SYSTEM]: {
    response_type: MessageResponseTypes.SYSTEM,
    title: 'Processing',
  },
};

/** Response types whose item an `addMessage` takes with no `onError`. */
const QUIET_TYPES = Object.values(MessageResponseTypes).filter(
  (type) => type !== MessageResponseTypes.CONNECT_TO_HUMAN_AGENT
);

// These tags record that each type is accepted, stored as given, fires
// receive once, and reports no error. What each type shows is pinned below in
// "response types in the main panel", one row per type.
// @covers response-type.text response-type.option response-type.image
// @covers response-type.pause response-type.user_defined response-type.iframe
// @covers response-type.video response-type.audio response-type.date
// @covers response-type.inline_error response-type.card response-type.carousel
// @covers response-type.button response-type.grid
// @covers response-type.conversational_search response-type.preview_card
// @covers response-type.system
describeShared('response types through addMessage', (makeDriver) => {
  it.each(QUIET_TYPES)(
    'stores a %s item as given, fires receive once, and reports no error',
    async (type) => {
      const onError = jest.fn();
      const chat = await makeDriver({ onError });
      const events = recordEvents(chat, [BusEventType.RECEIVE]);
      const item = ITEMS[type];
      await act(() =>
        chat.messaging.addMessage(responseOf(`r-${type}`, [item]))
      );
      const messages = chat.messages() as MessageResponse[];
      expect(ids(chat)).toEqual([`r-${type}`]);
      expect(messages[0].output.generic).toEqual([item]);
      expect(
        events.of<BusEventReceive>(BusEventType.RECEIVE).map((e) => e.data.id)
      ).toEqual([`r-${type}`]);
      expect(onError).not.toHaveBeenCalled();
    }
  );
});

/** Every element under `root`, through open shadow roots. */
function* walk(root: ParentNode): Generator<Element> {
  for (const element of Array.from(root.querySelectorAll('*'))) {
    yield element;
    if (element.shadowRoot) {
      yield* walk(element.shadowRoot);
    }
  }
}

/** The text a node shows, following shadow roots and slots. */
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

/** An element's accessible name, for the few ways the chat names one. */
function nameOf(element: Element): string {
  const root = element.getRootNode() as Document | ShadowRoot;
  const labelledBy = (element.getAttribute('aria-labelledby') ?? '')
    .split(/\s+/)
    .map((id) => id && root.getElementById(id))
    .filter(Boolean)
    .map((label) => shownText(label as Element))
    .join(' ');
  const labels = (element as HTMLInputElement).labels;
  const name =
    labelledBy ||
    element.getAttribute('aria-label') ||
    (labels?.length ? shownText(labels[0]) : shownText(element));
  return name.replace(/\s+/g, ' ').trim();
}

/**
 * What the main panel shows a user: its text, the accessible names of the
 * buttons, regions, and text boxes in it, and its images' alt text.
 */
function mainPanel() {
  const panel = byTestId(PageObjectId.MAIN_PANEL);
  const elements = [...walk(panel)];
  const named = (role: string, implicit: (element: Element) => boolean) =>
    elements
      .filter(
        (element) => element.getAttribute('role') === role || implicit(element)
      )
      .map(nameOf);
  return {
    text: shownText(panel).replace(/\s+/g, ' '),
    buttons: named('button', (element) => element instanceof HTMLButtonElement),
    regions: named('region', () => false),
    textboxes: named(
      'textbox',
      (element) =>
        element instanceof HTMLInputElement && element.type === 'text'
    ),
    images: elements
      .filter((element) => element instanceof HTMLImageElement)
      .map((element) => (element as HTMLImageElement).alt),
  };
}

/** The date picker's label, set through `strings`. */
const DATE_LABEL = 'Pick the day';

/**
 * What a user sees of each type's item from `ITEMS`, all of it content the
 * item (or `strings`) set. A pause shows nothing and a user_defined item shows
 * only what the host renders: "pause items" and "user_defined rendering"
 * below pin those two.
 */
const SHOWN: Partial<
  Record<MessageResponseTypes, (shown: ReturnType<typeof mainPanel>) => void>
> = {
  [MessageResponseTypes.TEXT]: ({ text }) => expect(text).toContain('Hello'),
  [MessageResponseTypes.OPTION]: ({ text, buttons }) => {
    expect(text).toContain('Pick one');
    expect(buttons).toEqual(expect.arrayContaining(['Red', 'Blue']));
  },
  [MessageResponseTypes.IMAGE]: ({ images }) =>
    expect(images).toContain('An image'),
  [MessageResponseTypes.IFRAME]: ({ text }) =>
    expect(text).toContain('Embedded page'),
  [MessageResponseTypes.VIDEO]: ({ regions }) =>
    expect(regions).toContain('A video'),
  [MessageResponseTypes.AUDIO]: ({ regions }) =>
    expect(regions).toContain('An audio clip'),
  [MessageResponseTypes.DATE]: ({ textboxes }) =>
    expect(textboxes).toContain(DATE_LABEL),
  [MessageResponseTypes.INLINE_ERROR]: ({ text }) =>
    expect(text).toContain('Something went wrong'),
  [MessageResponseTypes.CARD]: ({ text }) =>
    expect(text).toContain('In a card'),
  [MessageResponseTypes.CAROUSEL]: ({ text }) =>
    expect(text).toContain('Slide'),
  [MessageResponseTypes.BUTTON]: ({ buttons }) =>
    expect(buttons).toContain('Go'),
  [MessageResponseTypes.GRID]: ({ text }) => expect(text).toContain('Cell'),
  [MessageResponseTypes.CONVERSATIONAL_SEARCH]: ({ text }) =>
    expect(text).toContain('An answer'),
  [MessageResponseTypes.PREVIEW_CARD]: ({ text }) =>
    expect(text).toContain('Preview'),
  [MessageResponseTypes.SYSTEM]: ({ text }) =>
    expect(text).toContain('Processing'),
};

// @covers response-type.text response-type.option response-type.image
// @covers response-type.iframe response-type.video response-type.audio
// @covers response-type.date response-type.inline_error response-type.card
// @covers response-type.carousel response-type.button response-type.grid
// @covers response-type.conversational_search response-type.preview_card
// @covers response-type.system
describe('response types in the main panel', () => {
  contractSetup();

  it.each(Object.keys(SHOWN) as MessageResponseTypes[])(
    "shows a %s item's content",
    async (type) => {
      const { instance } = await contractChat({
        openChatByDefault: true,
        messaging: { skipWelcome: true },
        strings: { datePicker_chooseDate: DATE_LABEL },
      });
      await act(() =>
        instance.messaging.addMessage(responseOf(`r-${type}`, [ITEMS[type]]))
      );
      await waitFor(() => SHOWN[type](mainPanel()));
    }
  );
});

// @covers response-type.connect_to_agent
describeShared('connect_to_agent through addMessage', (makeDriver) => {
  it('stores the item, fires receive, and reports an integration error with no service desk', async () => {
    const onError = jest.fn();
    const chat = await makeDriver({ onError });
    const events = recordEvents(chat, [BusEventType.RECEIVE]);
    const item = ITEMS[MessageResponseTypes.CONNECT_TO_HUMAN_AGENT];
    await act(() => chat.messaging.addMessage(responseOf('r-agent', [item])));
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError.mock.calls[0][0].errorType).toBe(
      OnErrorType.INTEGRATION_ERROR
    );
    const messages = chat.messages() as MessageResponse[];
    expect(ids(chat)).toEqual(['r-agent']);
    expect(messages[0].output.generic).toEqual([item]);
    expect(events.of(BusEventType.RECEIVE)).toHaveLength(1);
  });
});

// @covers response-type.user_defined event.userDefinedResponse
describe('user_defined rendering', () => {
  contractSetup();

  it('fires userDefinedResponse with the item, the message, a slot, and the complete state', async () => {
    const { instance } = await contractChat();
    const events = recordEvents(instance, [BusEventType.USER_DEFINED_RESPONSE]);
    const item = nestedUserDefined('widget');
    await act(() => instance.messaging.addMessage(responseOf('r-ud', [item])));
    await waitFor(() =>
      expect(events.of(BusEventType.USER_DEFINED_RESPONSE)).toHaveLength(1)
    );
    const [event] = events.of<BusEventUserDefinedResponse>(
      BusEventType.USER_DEFINED_RESPONSE
    );
    expect(event.data.message).toEqual(item);
    expect(event.data.fullMessage.id).toBe('r-ud');
    expect(event.data.state).toBe(MessageState.COMPLETE);
    expect(typeof event.data.slot).toBe('string');
    expect(event.data.slot.length).toBeGreaterThan(0);
  });

  it('calls renderUserDefinedResponse and slots what it returns into the host under the event slot', async () => {
    const render = jest.fn(
      (state: { messageItem?: GenericItem }): React.ReactNode =>
        React.createElement(
          'span',
          null,
          `rendered ${(state.messageItem?.user_defined as { name: string }).name}`
        )
    );
    const { instance, host } = await contractChat({
      renderUserDefinedResponse: render,
    });
    const events = recordEvents(instance, [BusEventType.USER_DEFINED_RESPONSE]);
    const item = nestedUserDefined('widget');
    await act(() => instance.messaging.addMessage(responseOf('r-ud', [item])));
    await waitFor(() => expect(render).toHaveBeenCalled());
    const [event] = events.of<BusEventUserDefinedResponse>(
      BusEventType.USER_DEFINED_RESPONSE
    );
    const [state, handed] = render.mock.calls[0] as unknown as [
      Record<string, unknown>,
      unknown,
    ];
    expect(state).toMatchObject({
      messageItem: item,
      fullMessage: { id: 'r-ud' },
      state: MessageState.COMPLETE,
    });
    expect(handed).toBe(instance);
    await waitFor(() =>
      expect(
        slotted(host, event.data.slot).map((element) => element.textContent)
      ).toEqual(['rendered widget'])
    );
  });
});

// @covers response-type.card response-type.carousel response-type.grid event.userDefinedResponse
describe('user_defined items nested in containers', () => {
  contractSetup();

  it.each([
    [
      MessageResponseTypes.CARD,
      {
        response_type: MessageResponseTypes.CARD,
        body: [nestedUserDefined('nested')],
      },
    ],
    [
      MessageResponseTypes.CAROUSEL,
      {
        response_type: MessageResponseTypes.CAROUSEL,
        items: [
          {
            response_type: MessageResponseTypes.CARD,
            body: [nestedUserDefined('nested')],
          },
        ],
      },
    ],
    [
      MessageResponseTypes.GRID,
      {
        response_type: MessageResponseTypes.GRID,
        columns: [{ width: '1' }],
        rows: [{ cells: [{ items: [nestedUserDefined('nested')] }] }],
      },
    ],
  ] as [string, GenericItem][])(
    'fires userDefinedResponse with a slot for a user_defined item inside a %s',
    async (_type, container) => {
      const { instance } = await contractChat();
      const events = recordEvents(instance, [
        BusEventType.USER_DEFINED_RESPONSE,
      ]);
      await act(() =>
        instance.messaging.addMessage(responseOf('r-nested', [container]))
      );
      await waitFor(() =>
        expect(events.of(BusEventType.USER_DEFINED_RESPONSE)).toHaveLength(1)
      );
      const [event] = events.of<BusEventUserDefinedResponse>(
        BusEventType.USER_DEFINED_RESPONSE
      );
      expect(event.data.message).toEqual(nestedUserDefined('nested'));
      expect(event.data.fullMessage.id).toBe('r-nested');
      expect(typeof event.data.slot).toBe('string');
    }
  );
});

// @covers response-type.pause state.isMessageLoadingCounter
describe('pause items', () => {
  contractSetup();

  it('raises isMessageLoadingCounter during a typing pause and lowers it after', async () => {
    const { instance } = await contractChat();
    jest.useFakeTimers();
    expect(instance.getState().isMessageLoadingCounter).toBe(0);
    await act(() =>
      instance.messaging.addMessage(
        responseOf('r-pause', [
          {
            response_type: MessageResponseTypes.PAUSE,
            time: 60_000,
            typing: true,
          },
          { response_type: MessageResponseTypes.TEXT, text: 'after' },
        ])
      )
    );
    expect(instance.getState().isMessageLoadingCounter).toBe(1);
    await advance(59_999);
    expect(instance.getState().isMessageLoadingCounter).toBe(1);
    await advance(1);
    expect(instance.getState().isMessageLoadingCounter).toBe(0);
  });

  it('leaves isMessageLoadingCounter at zero during a pause without typing', async () => {
    const { instance } = await contractChat();
    jest.useFakeTimers();
    const counts: number[] = [];
    instance.on({
      type: BusEventType.STATE_CHANGE,
      handler: () => {
        counts.push(instance.getState().isMessageLoadingCounter);
      },
    });
    // The item after the pause fires its event once the pause is over.
    const events = recordEvents(instance, [BusEventType.USER_DEFINED_RESPONSE]);
    await act(() =>
      instance.messaging.addMessage(
        responseOf('r-quiet-pause', [
          { response_type: MessageResponseTypes.PAUSE, time: 60_000 },
          nestedUserDefined('after'),
        ])
      )
    );
    expect(events.events).toHaveLength(0);
    await advance(60_000);
    expect(events.events).toHaveLength(1);
    expect(counts.length).toBeGreaterThan(0);
    expect(counts.every((count) => count === 0)).toBe(true);
  });
});
