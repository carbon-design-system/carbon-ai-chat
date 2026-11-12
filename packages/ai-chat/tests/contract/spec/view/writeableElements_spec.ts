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
  ChatContainerProps,
  ChatInstance,
  HistoryItem,
  MessageInputType,
  MessageRequest,
  PageObjectId,
  WriteableElementName,
} from '../../../../src/aiChatEntry';
import {
  byTestId,
  contractChat,
  contractSetup,
  fakeBackend,
  slotted,
  textResponse,
} from '../../helpers';

/**
 * What a user sees is the flat tree: a shadow host shows its shadow root, a
 * slot shows the nodes assigned to it (or its fallback), and anything else
 * shows its children. Writeable-element content that no rendered slot picks
 * up is not in it.
 */
function flatChildren(node: Node): Node[] {
  if (node instanceof Element && node.shadowRoot) {
    return Array.from(node.shadowRoot.childNodes);
  }
  if (node instanceof HTMLSlotElement) {
    const assigned = node.assignedNodes();
    return assigned.length ? assigned : Array.from(node.childNodes);
  }
  return Array.from(node.childNodes);
}

/** The public test IDs used as landmarks, with their subtree closed for regions. */
const POINTS = [
  PageObjectId.CLOSE_CHAT,
  PageObjectId.INPUT,
  PageObjectId.INPUT_SEND,
];
const REGIONS = [
  PageObjectId.CHAT_HEADER,
  PageObjectId.MAIN_PANEL,
  PageObjectId.HOME_SCREEN_PANEL,
];

/**
 * The order a user meets the tracked nodes in, walking the flat tree: each
 * landmark test ID, `/<id>` where a region ends, and the label of each tracked
 * node the host wrote.
 */
function layout(tracked: Map<Node, string>): string[] {
  const labels = new Map(tracked);
  for (const id of [...POINTS, ...REGIONS]) {
    const element = byTestId(id);
    if (element) {
      labels.set(element, id);
    }
  }
  const regions = new Set(
    REGIONS.map((id) => byTestId(id)).filter(Boolean) as Node[]
  );
  const seen: string[] = [];
  const visit = (node: Node) => {
    const label = labels.get(node);
    if (label) {
      seen.push(label);
    }
    flatChildren(node).forEach(visit);
    if (label && regions.has(node)) {
      seen.push(`/${label}`);
    }
  };
  visit(document.body);
  return seen;
}

/** The first text node in the flat tree that contains this text. */
function shownText(text: string): Node | null {
  let found: Node | null = null;
  const visit = (node: Node) => {
    if (found) {
      return;
    }
    if (node.nodeType === Node.TEXT_NODE && node.textContent.includes(text)) {
      found = node;
      return;
    }
    flatChildren(node).forEach(visit);
  };
  visit(document.body);
  return found;
}

/**
 * Writes a labeled span into each named element, the way a host would, and
 * returns the spans keyed for `layout`.
 */
function write(
  instance: ChatInstance,
  names: WriteableElementName[]
): Map<Node, string> {
  const tracked = new Map<Node, string>();
  for (const name of names) {
    const span = document.createElement('span');
    span.textContent = `${name} content`;
    instance.writeableElements[name].append(span);
    tracked.set(span, name);
  }
  return tracked;
}

/** Mounts open, writing into `names` from `onBeforeRender`. */
async function mountWith(
  names: WriteableElementName[],
  props: Partial<ChatContainerProps> = {}
) {
  let tracked = new Map<Node, string>();
  const mount = await contractChat({
    openChatByDefault: true,
    messaging: { customSendMessage: fakeBackend().customSendMessage },
    ...props,
    onBeforeRender: (handed) => {
      tracked = write(handed, names);
    },
  });
  return { ...mount, tracked };
}

/** Writes after the first render, inside `act` so presence checks re-run. */
async function writeLater(
  instance: ChatInstance,
  names: WriteableElementName[]
): Promise<Map<Node, string>> {
  let tracked: Map<Node, string>;
  await act(async () => {
    tracked = write(instance, names);
  });
  return tracked;
}

/** Removes host content after the first render, inside `act`. */
async function removeLater(tracked: Map<Node, string>): Promise<void> {
  await act(async () => {
    tracked.forEach((_label, node) => (node as ChildNode).remove());
  });
}

const N = WriteableElementName;

/** The elements a default conversation shows, before the AI label's popover content. */
const CONVERSATION = [
  N.AI_TOOLTIP_AFTER_DESCRIPTION_ELEMENT,
  N.EXPLAINABILITY_POPOVER_ACTIONS,
  N.HEADER_FIXED_ACTIONS_ELEMENT,
  N.HEADER_BOTTOM_ELEMENT,
  N.BEFORE_INPUT_ELEMENT,
  N.PROMPT_LINE_SEND_BUTTON_START,
  N.AFTER_INPUT_ELEMENT,
  N.FOOTER_ELEMENT,
];

/** Where `CONVERSATION` shows on `main`, with its landmarks. */
const CONVERSATION_LAYOUT = [
  PageObjectId.CHAT_HEADER,
  N.AI_TOOLTIP_AFTER_DESCRIPTION_ELEMENT,
  N.EXPLAINABILITY_POPOVER_ACTIONS,
  PageObjectId.CLOSE_CHAT,
  // The JSDoc puts the fixed actions "before close/minimize buttons"; on
  // `main` they render after the close button.
  N.HEADER_FIXED_ACTIONS_ELEMENT,
  `/${PageObjectId.CHAT_HEADER}`,
  N.HEADER_BOTTOM_ELEMENT,
  PageObjectId.MAIN_PANEL,
  `/${PageObjectId.MAIN_PANEL}`,
  N.BEFORE_INPUT_ELEMENT,
  PageObjectId.INPUT,
  N.PROMPT_LINE_SEND_BUTTON_START,
  PageObjectId.INPUT_SEND,
  N.AFTER_INPUT_ELEMENT,
  N.FOOTER_ELEMENT,
];

// @covers instance.writeableElements export.aiChatEntry.WriteableElementName
describe('instance.writeableElements', () => {
  contractSetup();

  it('holds one distinct element for each WriteableElementName', async () => {
    const { instance } = await contractChat();
    const { writeableElements } = instance;
    expect(Object.keys(writeableElements).sort()).toEqual(
      Object.values(WriteableElementName).sort()
    );
    const elements = Object.values(writeableElements);
    expect(elements.every((element) => element instanceof HTMLElement)).toBe(
      true
    );
    expect(new Set(elements).size).toBe(elements.length);
  });

  it('hands every element to onBeforeRender, and content written there shows at first render', async () => {
    let keysBeforeRender: string[] = [];
    let tracked: Map<Node, string>;
    await contractChat({
      openChatByDefault: true,
      onBeforeRender: (handed) => {
        keysBeforeRender = Object.keys(handed.writeableElements).sort();
        tracked = write(handed, [N.FOOTER_ELEMENT]);
      },
    });
    expect(keysBeforeRender).toEqual(
      Object.values(WriteableElementName).sort()
    );
    expect(layout(tracked)).toContain(N.FOOTER_ELEMENT);
  });

  it('shows content written after the first render', async () => {
    const { instance } = await mountWith([]);
    const tracked = await writeLater(instance, [N.FOOTER_ELEMENT]);
    expect(layout(tracked)).toContain(N.FOOTER_ELEMENT);
  });

  it('keeps written content shown when the host re-renders with new props', async () => {
    const props: Partial<ChatContainerProps> = { openChatByDefault: true };
    const { instance, rerender } = await contractChat(props);
    const tracked = await writeLater(instance, [
      N.FOOTER_ELEMENT,
      N.HEADER_BOTTOM_ELEMENT,
    ]);
    await rerender({ ...props, header: { title: 'Renamed' } });
    await rerender({ ...props, header: { title: 'Renamed again' } });
    expect(layout(tracked)).toEqual(
      expect.arrayContaining([N.HEADER_BOTTOM_ELEMENT, N.FOOTER_ELEMENT])
    );
  });

  it('puts each element on the host under a slot named after it', async () => {
    const { instance, host } = await contractChat({ openChatByDefault: true });
    for (const name of Object.values(WriteableElementName)) {
      expect(slotted(host, name)).toEqual([instance.writeableElements[name]]);
    }
    for (const name of CONVERSATION) {
      expect(instance.writeableElements[name].assignedSlot?.name).toBe(name);
    }
  });
});

// @covers writeable-element.aiTooltipAfterDescriptionElement
// @covers writeable-element.explainabilityPopoverActions
// @covers writeable-element.headerFixedActionsElement
// @covers writeable-element.headerBottomElement
// @covers writeable-element.beforeInputElement
// @covers writeable-element.afterInputElement
// @covers writeable-element.promptLineSendButtonStart
// @covers writeable-element.footerElement
describe('writeable elements in a conversation', () => {
  contractSetup();

  it('shows each element in its region, in order', async () => {
    const { tracked } = await mountWith(CONVERSATION);
    expect(layout(tracked)).toEqual(CONVERSATION_LAYOUT);
  });

  it('shows none of the home-screen, welcome, or expanded-input elements', async () => {
    const { tracked } = await mountWith([
      N.HOME_SCREEN_HEADER_BOTTOM_ELEMENT,
      N.HOME_SCREEN_AFTER_STARTERS_ELEMENT,
      N.HOME_SCREEN_BEFORE_INPUT_ELEMENT,
      N.WELCOME_NODE_BEFORE_ELEMENT,
      N.PROMPT_LINE_ACTIONS_END,
    ]);
    expect(layout(tracked)).toEqual(
      CONVERSATION_LAYOUT.filter(
        (label) => !(CONVERSATION as string[]).includes(label)
      )
    );
  });
});

// @covers writeable-element.explainabilityPopoverContent
// @covers writeable-element.explainabilityPopoverActions
// @covers writeable-element.aiTooltipAfterDescriptionElement
// @covers writeable-element.headerFixedActionsElement config.header.showAiLabel
describe('AI label popover elements', () => {
  contractSetup();

  const LABEL = [
    N.EXPLAINABILITY_POPOVER_CONTENT,
    N.AI_TOOLTIP_AFTER_DESCRIPTION_ELEMENT,
    N.EXPLAINABILITY_POPOVER_ACTIONS,
  ];

  it('shows popover content in the header and hides aiTooltipAfterDescriptionElement', async () => {
    const { tracked } = await mountWith(LABEL);
    expect(layout(tracked)).toEqual([
      PageObjectId.CHAT_HEADER,
      N.EXPLAINABILITY_POPOVER_CONTENT,
      N.EXPLAINABILITY_POPOVER_ACTIONS,
      PageObjectId.CLOSE_CHAT,
      `/${PageObjectId.CHAT_HEADER}`,
      PageObjectId.MAIN_PANEL,
      `/${PageObjectId.MAIN_PANEL}`,
      PageObjectId.INPUT,
      PageObjectId.INPUT_SEND,
    ]);
  });

  it('hides and restores aiTooltipAfterDescriptionElement as popover content is written and removed after render', async () => {
    const { instance, tracked } = await mountWith([
      N.AI_TOOLTIP_AFTER_DESCRIPTION_ELEMENT,
    ]);
    const content = await writeLater(instance, [
      N.EXPLAINABILITY_POPOVER_CONTENT,
    ]);
    const both = new Map([...tracked, ...content]);
    await waitFor(() =>
      expect(layout(both)).not.toContain(N.AI_TOOLTIP_AFTER_DESCRIPTION_ELEMENT)
    );
    expect(layout(both)).toContain(N.EXPLAINABILITY_POPOVER_CONTENT);

    await removeLater(content);
    await waitFor(() =>
      expect(layout(both)).toContain(N.AI_TOOLTIP_AFTER_DESCRIPTION_ELEMENT)
    );
  });

  it('shows none of them with header.showAiLabel false; fixed actions stay', async () => {
    const { tracked } = await mountWith(
      [...LABEL, N.HEADER_FIXED_ACTIONS_ELEMENT],
      { header: { showAiLabel: false } }
    );
    expect(layout(tracked).filter((label) => !label.includes('panel'))).toEqual(
      [
        PageObjectId.CHAT_HEADER,
        PageObjectId.CLOSE_CHAT,
        N.HEADER_FIXED_ACTIONS_ELEMENT,
        `/${PageObjectId.CHAT_HEADER}`,
        PageObjectId.INPUT,
        PageObjectId.INPUT_SEND,
      ]
    );
  });
});

const T0 = '2026-01-01T00:00:00.000Z';
const T1 = '2026-01-01T00:00:01.000Z';

/** A welcome request and its reply, as history hands them back. */
function welcomeHistory(text: string): HistoryItem[] {
  const request: MessageRequest = {
    id: 'welcome-request',
    input: { message_type: MessageInputType.TEXT, text: '' },
    history: { is_welcome_request: true, silent: true },
  };
  return [
    { message: request, time: T0 },
    {
      message: textResponse(text, 'welcome-reply', {
        request_id: 'welcome-request',
      }),
      time: T1,
    },
  ];
}

// @covers writeable-element.welcomeNodeBeforeElement
describe('welcomeNodeBeforeElement', () => {
  contractSetup();

  it('shows in the messages, directly above a welcome reply loaded from history', async () => {
    const { tracked } = await mountWith([N.WELCOME_NODE_BEFORE_ELEMENT], {
      messaging: {
        customSendMessage: fakeBackend().customSendMessage,
        customLoadHistory: async () => welcomeHistory('Hello from history'),
      },
    });
    await waitFor(() => expect(shownText('Hello from history')).not.toBeNull());
    tracked.set(shownText('Hello from history'), 'welcome reply');
    expect(
      layout(tracked).filter((label) => !label.startsWith('input'))
    ).toEqual([
      PageObjectId.CHAT_HEADER,
      PageObjectId.CLOSE_CHAT,
      `/${PageObjectId.CHAT_HEADER}`,
      PageObjectId.MAIN_PANEL,
      N.WELCOME_NODE_BEFORE_ELEMENT,
      'welcome reply',
      `/${PageObjectId.MAIN_PANEL}`,
    ]);
  });

  it('does not show above a reply the host adds to the live welcome request', async () => {
    const backend = fakeBackend();
    const { instance, tracked } = await mountWith(
      [N.WELCOME_NODE_BEFORE_ELEMENT],
      { messaging: { customSendMessage: backend.customSendMessage } }
    );
    const sent = await backend.next();
    await act(() =>
      instance.messaging.addMessage(
        textResponse('Hello live', 'welcome-reply', {
          request_id: sent.request.id,
        })
      )
    );
    await act(async () => sent.resolve());
    await waitFor(() => expect(shownText('Hello live')).not.toBeNull());
    // The JSDoc says "directly above the welcome node"; on `main` a live reply
    // to the welcome request isn't one (INTENDED.md 08b3: only
    // `isLatestWelcomeNode` or history marks it).
    expect(layout(tracked)).not.toContain(N.WELCOME_NODE_BEFORE_ELEMENT);
  });
});

/** The home-screen elements, with the two they stand in for. */
const HOME = [
  N.HOME_SCREEN_HEADER_BOTTOM_ELEMENT,
  N.HOME_SCREEN_AFTER_STARTERS_ELEMENT,
  N.HOME_SCREEN_BEFORE_INPUT_ELEMENT,
  N.HEADER_BOTTOM_ELEMENT,
  N.BEFORE_INPUT_ELEMENT,
];

const HOME_SCREEN: Partial<ChatContainerProps> = {
  homescreen: {
    isOn: true,
    greeting: 'Home greeting',
    starters: { isOn: true, buttons: [{ label: 'Starter one' }] },
  },
};

// @covers writeable-element.homeScreenHeaderBottomElement
// @covers writeable-element.homeScreenAfterStartersElement
// @covers writeable-element.homeScreenBeforeInputElement
// @covers writeable-element.headerBottomElement writeable-element.beforeInputElement
describe('home-screen elements', () => {
  contractSetup();

  it('show on the home screen in place of headerBottomElement and beforeInputElement', async () => {
    const { tracked } = await mountWith(HOME, HOME_SCREEN);
    tracked.set(shownText('Home greeting'), 'greeting');
    tracked.set(shownText('Starter one'), 'starter');
    expect(layout(tracked)).toEqual([
      PageObjectId.CHAT_HEADER,
      PageObjectId.CLOSE_CHAT,
      `/${PageObjectId.CHAT_HEADER}`,
      N.HOME_SCREEN_HEADER_BOTTOM_ELEMENT,
      PageObjectId.MAIN_PANEL,
      PageObjectId.HOME_SCREEN_PANEL,
      'greeting',
      'starter',
      N.HOME_SCREEN_AFTER_STARTERS_ELEMENT,
      `/${PageObjectId.HOME_SCREEN_PANEL}`,
      `/${PageObjectId.MAIN_PANEL}`,
      N.HOME_SCREEN_BEFORE_INPUT_ELEMENT,
      PageObjectId.INPUT,
      PageObjectId.INPUT_SEND,
    ]);
  });

  it('give way to the conversation elements once a message is sent', async () => {
    const { instance, tracked } = await mountWith(HOME, {
      ...HOME_SCREEN,
      messaging: {
        customSendMessage: fakeBackend({ autoResolve: true }).customSendMessage,
      },
    });
    await act(() => instance.send('hello'));
    await waitFor(() =>
      expect(layout(tracked)).toEqual([
        PageObjectId.CHAT_HEADER,
        PageObjectId.CLOSE_CHAT,
        `/${PageObjectId.CHAT_HEADER}`,
        N.HEADER_BOTTOM_ELEMENT,
        PageObjectId.MAIN_PANEL,
        `/${PageObjectId.MAIN_PANEL}`,
        N.BEFORE_INPUT_ELEMENT,
        PageObjectId.INPUT,
        PageObjectId.INPUT_SEND,
      ])
    );
  });
});

// @covers writeable-element.promptLineActionsEnd
// @covers writeable-element.promptLineSendButtonStart config.input.expanded
describe('promptLineActionsEnd', () => {
  contractSetup();

  it('shows after the input field and before the send-button content with input.expanded', async () => {
    const { tracked } = await mountWith(
      [N.PROMPT_LINE_ACTIONS_END, N.PROMPT_LINE_SEND_BUTTON_START],
      { input: { expanded: true } }
    );
    expect(layout(tracked).filter((label) => !label.includes('panel'))).toEqual(
      [
        PageObjectId.CHAT_HEADER,
        PageObjectId.CLOSE_CHAT,
        `/${PageObjectId.CHAT_HEADER}`,
        PageObjectId.INPUT,
        N.PROMPT_LINE_ACTIONS_END,
        N.PROMPT_LINE_SEND_BUTTON_START,
        PageObjectId.INPUT_SEND,
      ]
    );
  });

  it('does not show in the default compact input', async () => {
    const { tracked } = await mountWith([N.PROMPT_LINE_ACTIONS_END]);
    expect(layout(tracked)).not.toContain(N.PROMPT_LINE_ACTIONS_END);
  });
});

/** The input's neighbors and its nested slot, around a custom prompt line. */
const AROUND_INPUT = [
  N.BEFORE_INPUT_ELEMENT,
  N.CUSTOM_PROMPT_LINE,
  N.PROMPT_LINE_SEND_BUTTON_START,
  N.AFTER_INPUT_ELEMENT,
];

/** The labels from the main panel on, the input area. */
const inputArea = (tracked: Map<Node, string>) => {
  const seen = layout(tracked);
  return seen.slice(seen.indexOf(`/${PageObjectId.MAIN_PANEL}`) + 1);
};

const BUILT_IN_INPUT = [
  N.BEFORE_INPUT_ELEMENT,
  PageObjectId.INPUT,
  N.PROMPT_LINE_SEND_BUTTON_START,
  PageObjectId.INPUT_SEND,
  N.AFTER_INPUT_ELEMENT,
];

// @covers writeable-element.customPromptLine writeable-element.beforeInputElement
// @covers writeable-element.afterInputElement writeable-element.promptLineSendButtonStart
// @covers config.input.isVisible instance.updateInputFieldVisibility
describe('customPromptLine', () => {
  contractSetup();

  it('replaces the built-in input and its nested slots, between the before- and after-input elements', async () => {
    const { tracked } = await mountWith(AROUND_INPUT);
    expect(inputArea(tracked)).toEqual([
      N.BEFORE_INPUT_ELEMENT,
      N.CUSTOM_PROMPT_LINE,
      N.AFTER_INPUT_ELEMENT,
    ]);
  });

  it('replaces the input when written after render, and restores it when removed', async () => {
    const { instance, tracked } = await mountWith([
      N.BEFORE_INPUT_ELEMENT,
      N.PROMPT_LINE_SEND_BUTTON_START,
      N.AFTER_INPUT_ELEMENT,
    ]);
    const custom = await writeLater(instance, [N.CUSTOM_PROMPT_LINE]);
    const all = new Map([...tracked, ...custom]);
    await waitFor(() =>
      expect(inputArea(all)).toEqual([
        N.BEFORE_INPUT_ELEMENT,
        N.CUSTOM_PROMPT_LINE,
        N.AFTER_INPUT_ELEMENT,
      ])
    );

    await removeLater(custom);
    await waitFor(() => expect(inputArea(all)).toEqual(BUILT_IN_INPUT));
  });

  it('keeps the built-in input for whitespace or a comment', async () => {
    const { instance, tracked } = await mountWith([
      N.BEFORE_INPUT_ELEMENT,
      N.PROMPT_LINE_SEND_BUTTON_START,
      N.AFTER_INPUT_ELEMENT,
    ]);
    await act(async () => {
      instance.writeableElements.customPromptLine.append(
        document.createTextNode('   '),
        document.createComment('host note')
      );
    });
    // A short wait to show the input isn't swapped out.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(inputArea(tracked)).toEqual(BUILT_IN_INPUT);
  });

  it('shows on the home screen in place of the input', async () => {
    const { tracked } = await mountWith(
      [N.HOME_SCREEN_BEFORE_INPUT_ELEMENT, N.CUSTOM_PROMPT_LINE],
      HOME_SCREEN
    );
    expect(inputArea(tracked)).toEqual([
      N.HOME_SCREEN_BEFORE_INPUT_ELEMENT,
      N.CUSTOM_PROMPT_LINE,
    ]);
  });

  it('hides with input.isVisible false, and shows again on updateInputFieldVisibility(true)', async () => {
    const { instance, tracked } = await mountWith(AROUND_INPUT, {
      input: { isVisible: false },
    });
    expect(inputArea(tracked)).toEqual([
      N.BEFORE_INPUT_ELEMENT,
      N.AFTER_INPUT_ELEMENT,
    ]);

    await act(async () => {
      instance.updateInputFieldVisibility(true);
    });
    await waitFor(() =>
      expect(inputArea(tracked)).toEqual([
        N.BEFORE_INPUT_ELEMENT,
        N.CUSTOM_PROMPT_LINE,
        N.AFTER_INPUT_ELEMENT,
      ])
    );
  });
});

/** The labels before the main panel: the header area. */
const headerArea = (tracked: Map<Node, string>) => {
  const seen = layout(tracked);
  const end = seen.findIndex(
    (label) =>
      label === PageObjectId.MAIN_PANEL ||
      label === N.HOME_SCREEN_HEADER_BOTTOM_ELEMENT
  );
  return seen.slice(0, seen[end] === PageObjectId.MAIN_PANEL ? end : end + 1);
};

const HEADER_PARTS = [
  N.CUSTOM_HEADER,
  N.HEADER_FIXED_ACTIONS_ELEMENT,
  N.HEADER_BOTTOM_ELEMENT,
];

const DEFAULT_HEADER = [
  PageObjectId.CHAT_HEADER,
  PageObjectId.CLOSE_CHAT,
  N.HEADER_FIXED_ACTIONS_ELEMENT,
  `/${PageObjectId.CHAT_HEADER}`,
  N.HEADER_BOTTOM_ELEMENT,
];

// @covers writeable-element.customHeader writeable-element.headerFixedActionsElement
// @covers writeable-element.headerBottomElement writeable-element.homeScreenHeaderBottomElement
// @covers config.header.isOn
describe('customHeader', () => {
  contractSetup();

  it('replaces the chat header and its fixed actions; headerBottomElement stays below it', async () => {
    const { tracked } = await mountWith(HEADER_PARTS);
    expect(headerArea(tracked)).toEqual([
      N.CUSTOM_HEADER,
      N.HEADER_BOTTOM_ELEMENT,
    ]);
  });

  it('replaces the header when written after render, and restores it when removed', async () => {
    const { instance, tracked } = await mountWith([
      N.HEADER_FIXED_ACTIONS_ELEMENT,
      N.HEADER_BOTTOM_ELEMENT,
    ]);
    expect(headerArea(tracked)).toEqual(DEFAULT_HEADER);

    const custom = await writeLater(instance, [N.CUSTOM_HEADER]);
    const all = new Map([...tracked, ...custom]);
    await waitFor(() =>
      expect(headerArea(all)).toEqual([
        N.CUSTOM_HEADER,
        N.HEADER_BOTTOM_ELEMENT,
      ])
    );

    await removeLater(custom);
    await waitFor(() => expect(headerArea(all)).toEqual(DEFAULT_HEADER));
  });

  it('shows neither host content nor a header with header.isOn false', async () => {
    const { tracked } = await mountWith(HEADER_PARTS, {
      header: { isOn: false },
    });
    expect(headerArea(tracked)).toEqual([N.HEADER_BOTTOM_ELEMENT]);
  });

  it('leaves homeScreenHeaderBottomElement below it on the home screen', async () => {
    const { tracked } = await mountWith(
      [N.CUSTOM_HEADER, N.HOME_SCREEN_HEADER_BOTTOM_ELEMENT],
      HOME_SCREEN
    );
    expect(headerArea(tracked)).toEqual([
      N.CUSTOM_HEADER,
      N.HOME_SCREEN_HEADER_BOTTOM_ELEMENT,
    ]);
  });
});
