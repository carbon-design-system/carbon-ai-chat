/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The HTML attributes of the two `cds-aichat-*` elements. Each one is set as
 * a string, the way page markup sets it, and reaches the chat as the matching
 * config field. Booleans follow HTML presence (any value, `"false"` included,
 * turns one on), JSON attributes go through `JSON.parse`, and the rest are
 * taken as written. What each field does in depth is in the config specs;
 * attribute changes after mount are in `config/configUpdatesElement_spec.ts`.
 */

import { act, waitFor } from '@testing-library/react';

import {
  BusEventFeedback,
  BusEventType,
  ChatInstance,
  GenericItem,
  PageObjectId,
  PublicConfig,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  ContractElementTag,
  ELEMENT_TAGS,
  addConnect,
  allByRole,
  byTestId,
  changeView,
  click,
  contractElement,
  contractSetup,
  deepActiveElement,
  fakeBackend,
  fakeDesk,
  focusHostButton,
  focusIsInInput,
  getByTestId,
  headerTitle,
  imagesNamed,
  inputField,
  isShownWithin,
  mainPanelText,
  pause,
  recordEvents,
  responseOf,
  shownText,
  textItem,
  textResponse,
} from '../../helpers';

type Properties = Record<string, unknown> & Partial<PublicConfig>;

/**
 * Connects an element with these attributes. The properties set no welcome
 * request unless they bring their own `messaging`.
 */
function mount(
  tag: ContractElementTag,
  attributes: Record<string, string>,
  properties: Properties = {}
) {
  return contractElement(tag, {
    properties: { messaging: { skipWelcome: true }, ...properties },
    attributes,
  });
}

/** Connects an element with these attributes and opens its main window. */
async function mountOpen(
  tag: ContractElementTag,
  attributes: Record<string, string>,
  properties: Properties = {}
) {
  const mounted = await mount(tag, attributes, properties);
  await changeView(mounted.instance, ViewType.MAIN_WINDOW);
  return mounted;
}

/**
 * Connects an element the test built itself, and waits for its first render.
 * For attribute sequences `contractElement` can't express.
 */
async function connectAndRender(
  element: HTMLElement & Record<string, unknown>
): Promise<void> {
  const rendered = jest.fn();
  element.onAfterRender = rendered;
  await act(async () => {
    document.body.appendChild(element);
  });
  await waitFor(() => expect(rendered).toHaveBeenCalledTimes(1), {
    timeout: 10000,
  });
}

/** Adds a text reply and waits for `shown` (its text by default) to show. */
async function addReply(instance: ChatInstance, text = 'Hi', shown = text) {
  await act(() => instance.messaging.addMessage(textResponse(text, 'r1')));
  await waitFor(() => expect(mainPanelText()).toContain(shown));
}

/**
 * Mounts an open chat with a fake service desk, sends, adds a connect
 * response, and checks the agent chat starts with no connect card.
 */
async function expectConnectStartsAgentChat(
  tag: ContractElementTag,
  attributes: Record<string, string>,
  properties: Properties = {}
) {
  const desk = fakeDesk();
  const backend = fakeBackend({ autoResolve: true });
  const { instance } = await mountOpen(tag, attributes, {
    serviceDeskFactory: desk.factory,
    messaging: {
      skipWelcome: true,
      customSendMessage: backend.customSendMessage,
    },
    ...properties,
  });
  await act(() => instance.send('hello'));
  await addConnect(instance);
  await waitFor(() => expect(desk.desk.startChat).toHaveBeenCalledTimes(1));
}

/**
 * Mounts an open chat with a reply, focuses the input, and checks that F6
 * moves focus to the messages.
 */
async function expectF6MovesFocusToMessages(
  tag: ContractElementTag,
  attributes: Record<string, string>,
  properties: Properties = {}
) {
  const { instance } = await mountOpen(tag, attributes, {
    strings: { messages_assistantSaid: 'Reply from {assistantName}' },
    ...properties,
  });
  await addReply(instance);
  await act(async () => {
    instance.requestFocus();
  });
  await waitFor(() => expect(focusIsInInput()).toBe(true));
  await act(async () => {
    deepActiveElement().dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        composed: true,
        key: 'F6',
        code: 'F6',
      })
    );
  });
  await waitFor(() =>
    expect(
      isShownWithin(deepActiveElement(), getByTestId(PageObjectId.MAIN_PANEL))
    ).toBe(true)
  );
}

/** Runs `run` with `console.warn` stubbed, and returns each warning as text. */
async function warningsDuring(run: () => Promise<unknown>): Promise<string[]> {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  try {
    await run();
    return warn.mock.calls.map((args) => args.map(String).join(' '));
  } finally {
    warn.mockRestore();
  }
}

describe.each(ELEMENT_TAGS)('boolean attributes on %s', (tag) => {
  contractSetup();

  // @covers attribute.open-chat-by-default
  it.each([[''], ['false']])(
    'open-chat-by-default="%s" opens the main window at mount',
    async (value) => {
      const { instance } = await mount(tag, { 'open-chat-by-default': value });
      expect(instance.getState().viewState).toEqual({
        launcher: false,
        mainWindow: true,
      });
    }
  );

  // @covers attribute.is-readonly
  it.each([[''], ['false']])(
    'is-readonly="%s" disables the input',
    async (value) => {
      await mountOpen(tag, { 'is-readonly': value });
      expect(inputField().disabled).toBe(true);
    }
  );

  // @covers attribute.is-readonly
  it('turns is-readonly off once the attribute is removed, over config.isReadonly', async () => {
    // A removed boolean attribute reads as `false`, not unset, so it replaces
    // the base config's value instead of falling back to it.
    const { element } = await mountOpen(
      tag,
      { 'is-readonly': '' },
      { config: { isReadonly: true } }
    );
    expect(inputField().disabled).toBe(true);
    await act(async () => {
      element.removeAttribute('is-readonly');
    });
    await waitFor(() => expect(inputField().disabled).toBe(false));
  });

  // @covers attribute.should-take-focus-if-opens-automatically
  it('turns should-take-focus-if-opens-automatically off when the attribute is removed before connect', async () => {
    // The flag is on by default, so only a removal (which reads as `false`)
    // changes anything through the attribute.
    const element = document.createElement(tag) as HTMLElement &
      Record<string, unknown>;
    element.setAttribute('should-take-focus-if-opens-automatically', '');
    element.removeAttribute('should-take-focus-if-opens-automatically');
    element.setAttribute('open-chat-by-default', '');
    element.messaging = { skipWelcome: true };
    const button = focusHostButton();
    await connectAndRender(element);
    await pause(100);
    expect(deepActiveElement()).toBe(button);
  });

  // @covers attribute.debug
  it('debug turns on console logging for host calls', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      const { instance } = await mount(tag, { debug: '' });
      log.mockClear();
      await changeView(instance, ViewType.MAIN_WINDOW);
      // The log lines are diagnostics, not copy; only that some appear is
      // pinned.
      expect(log.mock.calls.length).toBeGreaterThan(0);
    } finally {
      log.mockRestore();
    }
  });

  // @covers attribute.should-sanitize-html
  it('should-sanitize-html strips a javascript: link from a reply', async () => {
    const { instance } = await mountOpen(tag, { 'should-sanitize-html': '' });
    await addReply(
      instance,
      'Before <a href="javascript:void(0)">Contract raw link</a> after',
      'after'
    );
    expect(mainPanelText()).toContain('Before Contract raw link after');
    expect(allByRole('link', 'Contract raw link')).toHaveLength(0);
  });

  // @covers attribute.persist-feedback
  it('persist-feedback keeps feedback on older replies', async () => {
    const STRINGS = { feedback_positiveLabel: 'Contract thumbs up' };
    const feedbackItem = (id: string): GenericItem =>
      ({
        ...textItem(id),
        message_item_options: {
          feedback: {
            is_on: true,
            id: `fb-${id}`,
            show_positive_details: false,
          },
        },
      }) as GenericItem;
    const { instance } = await mountOpen(
      tag,
      { 'persist-feedback': '' },
      { strings: STRINGS }
    );
    const thumbs = () => allByRole('button', STRINGS.feedback_positiveLabel);
    for (const [id, count] of [
      ['r1', 1],
      ['r2', 2],
    ] as const) {
      await act(() =>
        instance.messaging.addMessage(responseOf(id, [feedbackItem(id)]))
      );
      await waitFor(() => expect(thumbs()).toHaveLength(count));
    }
    const events = recordEvents(instance, [BusEventType.FEEDBACK]);
    await click(thumbs()[0]);
    expect(
      events
        .of<BusEventFeedback>(BusEventType.FEEDBACK)
        .map((event) => event.message.id)
    ).toEqual(['r1']);
  });

  // @covers attribute.hide-avatar attribute.assistantavatarurl
  it('hide-avatar hides the avatar assistantavatarurl sets', async () => {
    const STRINGS = { agent_ariaGenericAssistantAvatar: 'Contract avatar' };
    const { instance } = await mountOpen(
      tag,
      {
        'hide-avatar': '',
        assistantavatarurl: 'https://example.test/avatar.png',
      },
      { strings: STRINGS }
    );
    await addReply(instance);
    expect(imagesNamed(STRINGS.agent_ariaGenericAssistantAvatar)).toEqual([]);
  });
});

describe.each(ELEMENT_TAGS)('string attributes on %s', (tag) => {
  contractSetup();

  // @covers attribute.namespace attribute.strings
  it('namespace and strings name the chat region', async () => {
    await mount(tag, {
      namespace: 'north',
      strings: JSON.stringify({
        window_ariaChatRegionNamespace: 'Contract region {namespace}',
      }),
    });
    expect(allByRole('region', 'Contract region north')).toHaveLength(1);
  });

  // @covers attribute.assistant-name
  it('assistant-name names the assistant in reply labels', async () => {
    const { instance } = await mountOpen(
      tag,
      { 'assistant-name': 'Contract bot' },
      {
        strings: { message_labelAssistant: 'From {actorName} at {timestamp}|' },
      }
    );
    await addReply(instance);
    expect(mainPanelText().match(/From [^|]*\|/g)).toEqual([
      expect.stringMatching(/^From Contract bot at /),
    ]);
  });

  // Lit derives the attribute name from the property, so this one has no
  // dashes, unlike most of the others (MAIN-NOTES M109).
  const AVATAR_STRINGS = {
    agent_ariaGenericAssistantAvatar: 'Contract avatar',
  };

  // @covers attribute.assistantavatarurl
  it('assistantavatarurl, all lowercase, sets the reply avatar', async () => {
    const URL = 'https://example.test/contract-avatar.png';
    const { instance } = await mountOpen(
      tag,
      { assistantavatarurl: URL },
      { strings: AVATAR_STRINGS }
    );
    await addReply(instance);
    expect(
      imagesNamed(AVATAR_STRINGS.agent_ariaGenericAssistantAvatar).map(
        (image) => image.getAttribute('src')
      )
    ).toEqual([URL]);
  });

  // @covers attribute.assistantavatarurl
  it('assistant-avatar-url, with dashes, sets no avatar', async () => {
    const { instance } = await mountOpen(
      tag,
      { 'assistant-avatar-url': 'https://example.test/dashed.png' },
      { strings: AVATAR_STRINGS }
    );
    await addReply(instance);
    expect(
      imagesNamed(AVATAR_STRINGS.agent_ariaGenericAssistantAvatar)
    ).toEqual([]);
  });

  // @covers attribute.locale
  it('locale formats reply times', async () => {
    const { instance } = await mountOpen(
      tag,
      { locale: 'fr' },
      { strings: { message_labelAssistant: 'Said at {timestamp}|' } }
    );
    await addReply(instance);
    const match = /Said at ([^|]+)\|/.exec(mainPanelText());
    expect(match?.[1].trim()).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe.each(ELEMENT_TAGS)('JSON attributes on %s', (tag) => {
  contractSetup();

  // @covers attribute.header
  it('header shows its title', async () => {
    await mountOpen(tag, { header: '{"title":"Contract title"}' });
    expect(headerTitle()).toBe('Contract title');
  });

  // @covers attribute.disclaimer
  it('disclaimer shows its HTML in the disclaimer panel', async () => {
    await mount(tag, {
      'open-chat-by-default': '',
      disclaimer: JSON.stringify({
        isOn: true,
        disclaimerHTML: '<p>Contract terms of use</p>',
      }),
    });
    await waitFor(() =>
      expect(shownText(getByTestId(PageObjectId.DISCLAIMER_PANEL))).toContain(
        'Contract terms of use'
      )
    );
  });

  // @covers attribute.homescreen
  it('homescreen shows its greeting on the home screen', async () => {
    const { instance } = await mountOpen(tag, {
      homescreen: '{"isOn":true,"greeting":"Contract greeting"}',
    });
    await waitFor(() =>
      expect(instance.getState().homeScreenState.isHomeScreenOpen).toBe(true)
    );
    expect(shownText(getByTestId(PageObjectId.HOME_SCREEN_PANEL))).toContain(
      'Contract greeting'
    );
  });

  // @covers attribute.launcher
  it('launcher with isOn false draws no launcher', async () => {
    const { instance } = await mount(tag, { launcher: '{"isOn":false}' });
    expect(instance.getState().viewState.launcher).toBe(true);
    expect(byTestId(PageObjectId.LAUNCHER)).toBeNull();
  });

  // @covers attribute.input
  it('input with isDisabled disables the field', async () => {
    await mountOpen(tag, { input: '{"isDisabled":true}' });
    expect(inputField().disabled).toBe(true);
  });

  // @covers attribute.messaging
  it('messaging with skipWelcome sends no welcome request', async () => {
    // No `messaging` property here, so only the attribute can skip it.
    const { instance } = await contractElement(tag, {
      attributes: {
        'open-chat-by-default': '',
        messaging: '{"skipWelcome":true}',
      },
    });
    await pause();
    expect(instance.getState().messages).toEqual([]);
  });

  // @covers attribute.history
  it('history with isOn offers the history menu items', async () => {
    const STRINGS = {
      history_new_chat: 'Contract new chat',
      history_view_chats: 'Contract view chats',
    };
    await mount(
      tag,
      { 'open-chat-by-default': '', history: '{"isOn":true}' },
      { strings: STRINGS }
    );
    expect(allByRole('menuitem', STRINGS.history_new_chat)).toHaveLength(1);
    expect(allByRole('menuitem', STRINGS.history_view_chats)).toHaveLength(1);
  });

  // @covers attribute.layout
  it('layout customProperties are checked, warning for a bad Carbon token', async () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    try {
      await mount(tag, {
        layout: '{"customProperties":{"$button-primary":"red"}}',
      });
      expect(
        warn.mock.calls.filter((args) =>
          args.some((arg: unknown) => String(arg).includes('$button-primary'))
        ).length
      ).toBeGreaterThan(0);
    } finally {
      warn.mockRestore();
    }
  });

  // @covers attribute.service-desk
  it('service-desk with skipConnectHumanAgentCard starts the agent chat on a connect response', async () => {
    await expectConnectStartsAgentChat(tag, {
      'service-desk': '{"skipConnectHumanAgentCard":true}',
    });
  });

  // @covers attribute.keyboardshortcuts
  it('keyboardshortcuts turns on the message focus toggle', async () => {
    await expectF6MovesFocusToMessages(tag, {
      keyboardshortcuts: '{"messageFocusToggle":{"isOn":true}}',
    });
  });
});

/** Every attribute that takes JSON. */
const JSON_ATTRIBUTES = [
  'disclaimer',
  'service-desk',
  'header',
  'history',
  'layout',
  'messaging',
  'homescreen',
  'launcher',
  'input',
  'strings',
  'keyboardshortcuts',
];

const INVALID_JSON = '{not json';

const RETAINED_JSON_PROPERTIES: Record<string, object> = {
  disclaimer: { isOn: false, disclaimerHTML: 'Retained disclaimer' },
  history: { isOn: true },
  messaging: { skipWelcome: true },
  homescreen: { isOn: false, greeting: 'Retained greeting' },
  input: { maxInputCharacters: 73 },
  strings: { input_placeholder: 'Retained input text' },
};

describe.each(ELEMENT_TAGS)('invalid JSON attributes on %s', (tag) => {
  contractSetup();

  // @covers attribute.disclaimer attribute.service-desk attribute.header attribute.history attribute.layout attribute.messaging attribute.homescreen attribute.launcher attribute.input attribute.strings attribute.keyboardshortcuts
  it.each(JSON_ATTRIBUTES)(
    'ignores invalid %s JSON, warning with the attribute name',
    async (attribute) => {
      const onError = jest.fn();
      // The attribute sets the same field as the `messaging` property, so the
      // welcome request is skipped through config instead.
      const retained = RETAINED_JSON_PROPERTIES[attribute];
      let element: Awaited<ReturnType<typeof mountOpen>>['element'];
      const warnings = await warningsDuring(async () => {
        if (retained) {
          ({ element } = await mountOpen(
            tag,
            {},
            {
              [attribute]: retained,
              onError,
              config: { messaging: { skipWelcome: true } },
            }
          ));
          expect(element[attribute]).toEqual(retained);
          await act(async () => {
            element.setAttribute(attribute, INVALID_JSON);
          });
          await pause();
        } else {
          ({ element } = await mountOpen(
            tag,
            { [attribute]: INVALID_JSON },
            {
              onError,
              config: { messaging: { skipWelcome: true } },
            }
          ));
        }
      });
      expect(getByTestId(PageObjectId.MAIN_PANEL)).not.toBeNull();
      expect(onError).not.toHaveBeenCalled();
      if (retained) {
        expect(element[attribute]).toEqual(retained);
      }
      expect(warnings.filter((text) => text.includes(attribute))).toHaveLength(
        1
      );
    }
  );

  // @covers attribute.header element.cds-aichat-container.config element.cds-aichat-custom-element.config
  it('falls back to config.header for invalid header JSON', async () => {
    await mountOpen(
      tag,
      { header: INVALID_JSON },
      { config: { header: { title: 'From config' } } }
    );
    expect(headerTitle()).toBe('From config');
  });

  // @covers attribute.input element.cds-aichat-container.config element.cds-aichat-custom-element.config
  it('falls back to config.input for invalid input JSON', async () => {
    await mountOpen(
      tag,
      { input: INVALID_JSON },
      { config: { input: { isDisabled: true } } }
    );
    expect(inputField().disabled).toBe(true);
  });

  // @covers attribute.strings element.cds-aichat-container.config element.cds-aichat-custom-element.config
  it('falls back to config.strings for invalid strings JSON', async () => {
    await mountOpen(
      tag,
      { strings: INVALID_JSON },
      { config: { strings: { window_ariaChatRegion: 'From config' } } }
    );
    expect(allByRole('region', 'From config')).toHaveLength(1);
  });

  // @covers attribute.launcher element.cds-aichat-container.config element.cds-aichat-custom-element.config
  it('falls back to config.launcher for invalid launcher JSON', async () => {
    const { instance } = await mount(
      tag,
      { launcher: INVALID_JSON },
      { config: { launcher: { isOn: false } } }
    );
    expect(instance.getState().viewState.launcher).toBe(true);
    expect(byTestId(PageObjectId.LAUNCHER)).toBeNull();
  });

  // @covers attribute.disclaimer element.cds-aichat-container.config element.cds-aichat-custom-element.config
  it('falls back to config.disclaimer for invalid disclaimer JSON', async () => {
    await mount(
      tag,
      { 'open-chat-by-default': '', disclaimer: INVALID_JSON },
      {
        config: {
          disclaimer: { isOn: true, disclaimerHTML: '<p>From config</p>' },
        },
      }
    );
    await waitFor(() =>
      expect(shownText(getByTestId(PageObjectId.DISCLAIMER_PANEL))).toContain(
        'From config'
      )
    );
  });

  // @covers attribute.homescreen element.cds-aichat-container.config element.cds-aichat-custom-element.config
  it('falls back to config.homescreen for invalid homescreen JSON', async () => {
    const { instance } = await mountOpen(
      tag,
      { homescreen: INVALID_JSON },
      { config: { homescreen: { isOn: true, greeting: 'From config' } } }
    );
    await waitFor(() =>
      expect(instance.getState().homeScreenState.isHomeScreenOpen).toBe(true)
    );
    expect(shownText(getByTestId(PageObjectId.HOME_SCREEN_PANEL))).toContain(
      'From config'
    );
  });

  // @covers attribute.messaging element.cds-aichat-container.config element.cds-aichat-custom-element.config
  it('falls back to config.messaging for invalid messaging JSON', async () => {
    // No `messaging` property here, so only config can skip the welcome.
    const { instance } = await contractElement(tag, {
      attributes: { 'open-chat-by-default': '', messaging: INVALID_JSON },
      properties: { config: { messaging: { skipWelcome: true } } },
    });
    await pause();
    expect(instance.getState().messages).toEqual([]);
  });

  // @covers attribute.history element.cds-aichat-container.config element.cds-aichat-custom-element.config
  it('falls back to config.history for invalid history JSON', async () => {
    const STRINGS = {
      history_new_chat: 'Contract new chat',
      history_view_chats: 'Contract view chats',
    };
    await mount(
      tag,
      { 'open-chat-by-default': '', history: INVALID_JSON },
      { strings: STRINGS, config: { history: { isOn: true } } }
    );
    expect(allByRole('menuitem', STRINGS.history_new_chat)).toHaveLength(1);
    expect(allByRole('menuitem', STRINGS.history_view_chats)).toHaveLength(1);
  });

  // @covers attribute.layout element.cds-aichat-container.config element.cds-aichat-custom-element.config
  it('falls back to config.layout for invalid layout JSON', async () => {
    // The warning is the only effect of layout a host can see here. jsdom
    // computes none of the custom properties layout sets, and its other
    // fields reach only internal elements' attributes and classes.
    const layout = {
      customProperties: { '$button-primary': 'red' },
    } as unknown as PublicConfig['layout'];
    const warnings = await warningsDuring(() =>
      mount(tag, { layout: INVALID_JSON }, { config: { layout } })
    );
    expect(
      warnings.filter((text) => text.includes('$button-primary')).length
    ).toBeGreaterThan(0);
  });

  // @covers attribute.keyboardshortcuts element.cds-aichat-container.config element.cds-aichat-custom-element.config
  it('falls back to config.keyboardShortcuts for invalid keyboardshortcuts JSON', async () => {
    await expectF6MovesFocusToMessages(
      tag,
      { keyboardshortcuts: INVALID_JSON },
      { config: { keyboardShortcuts: { messageFocusToggle: { isOn: true } } } }
    );
  });

  // @covers attribute.service-desk element.cds-aichat-container.config element.cds-aichat-custom-element.config
  it('falls back to config.serviceDesk for invalid service-desk JSON', async () => {
    await expectConnectStartsAgentChat(
      tag,
      { 'service-desk': INVALID_JSON },
      { config: { serviceDesk: { skipConnectHumanAgentCard: true } } }
    );
  });

  // @covers attribute.header
  it('keeps a header set from script when a later header attribute is invalid JSON', async () => {
    const { element } = await mountOpen(
      tag,
      {},
      {
        header: { title: 'From the property' },
      }
    );
    const warnings = await warningsDuring(async () => {
      await act(async () => {
        element.setAttribute('header', INVALID_JSON);
      });
      await pause();
    });
    expect(warnings.filter((text) => text.includes('header'))).toHaveLength(1);
    expect(element.header).toEqual({ title: 'From the property' });
    expect(headerTitle()).toBe('From the property');
  });

  // @covers attribute.header
  it('keeps a valid header attribute when a later one is invalid JSON', async () => {
    const { element } = await mountOpen(tag, {
      header: '{"title":"From the attribute"}',
    });
    const warnings = await warningsDuring(async () => {
      await act(async () => {
        element.setAttribute('header', INVALID_JSON);
      });
      await pause();
    });
    expect(warnings.filter((text) => text.includes('header'))).toHaveLength(1);
    expect(element.header).toEqual({ title: 'From the attribute' });
    expect(headerTitle()).toBe('From the attribute');
  });
});

describe.each(ELEMENT_TAGS)('attribute precedence on %s', (tag) => {
  contractSetup();

  // @covers attribute.header element.cds-aichat-container.config element.cds-aichat-custom-element.config
  it('lets an attribute win over the same field in config', async () => {
    await mountOpen(
      tag,
      { header: '{"title":"From the attribute"}' },
      { config: { header: { title: 'From config' } } }
    );
    expect(headerTitle()).toBe('From the attribute');
  });

  // @covers attribute.header
  it('lets a property set after the attribute win', async () => {
    const { element } = await mountOpen(tag, {
      header: '{"title":"From the attribute"}',
    });
    await act(async () => {
      element.header = { title: 'From the property' };
    });
    await waitFor(() => expect(headerTitle()).toBe('From the property'));
    // The attribute stays as written; the property doesn't reflect.
    expect(element.getAttribute('header')).toBe(
      '{"title":"From the attribute"}'
    );
  });
});
