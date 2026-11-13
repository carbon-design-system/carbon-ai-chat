/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * How a config change after mount behaves when a host renders `ChatContainer`
 * again with new props. Each block says whether the change takes effect, and
 * what it leaves alone. The element path (new properties on a connected
 * `cds-aichat-*` element) is in `configUpdatesElement_spec.ts`.
 *
 * The customSendMessage scenarios change config through a rerender, which no
 * driver verb does, so they use a plain mount rather than `describeShared`.
 */

import { act, waitFor } from '@testing-library/react';

import {
  CancellationReason,
  ChatContainerProps,
  ChatInstance,
  HistoryItem,
  PageObjectId,
  StructuredData,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  byRole,
  byTestId,
  changeView,
  click,
  contractChat,
  contractSetup,
  countChatReady,
  fakeBackend,
  finishSend,
  getByTestId,
  instanceSender,
  pause,
  recordEvents,
  shownText,
  startSend,
  textResponse,
  advance,
} from '../../helpers';

type Props = Partial<ChatContainerProps>;

/**
 * Props for a chat that opens at mount with no welcome request, with the
 * test's own props laid over them. A rerender replaces every prop, so each
 * rerender in this file passes the whole set again.
 */
function openProps(extra: Props = {}): Props {
  return {
    ...extra,
    openChatByDefault: true,
    messaging: { skipWelcome: true, ...extra.messaging },
  };
}

/** Adds a complete text reply the way a host would, inside `act`. */
async function addReply(instance: ChatInstance, text: string, id: string) {
  await act(async () => {
    await instance.messaging.addMessage(textResponse(text, id));
  });
}

/** Sets the input's text the way a host would, inside `act`. */
async function typeDraft(instance: ChatInstance, text: string) {
  await act(async () => {
    instance.input.updateRawValue(() => text);
  });
}

/** Counts calls to a `state.subscribe` listener. */
function countStateChanges(instance: ChatInstance) {
  let calls = 0;
  instance.state.subscribe(() => {
    calls += 1;
  });
  return () => calls;
}

/** The text the main panel shows, with whitespace collapsed. */
function mainPanelText(): string {
  return shownText(getByTestId(PageObjectId.MAIN_PANEL)).replace(/\s+/g, ' ');
}

/** The input field (a text control). */
function inputField(): HTMLTextAreaElement {
  return getByTestId(PageObjectId.INPUT) as HTMLTextAreaElement;
}

/**
 * A response label the test sets through `strings`, so its copy is the
 * test's own. `|` marks where each label ends.
 */
const LABEL_STRINGS = {
  message_labelAssistant: 'From {actorName} at {timestamp}|',
};

/** Every response label the main panel shows, in order. */
function responseLabels(): string[] {
  return mainPanelText().match(/From [^|]*\|/g) ?? [];
}

// @covers config.messaging config.header config.strings config.input
describe('a rerender with an equal config', () => {
  contractSetup();

  function sameProps(customSendMessage: () => void): Props {
    return openProps({
      header: { title: 'Same title' },
      strings: { input_placeholder: 'Same placeholder' },
      input: { isDisabled: false },
      messaging: { customSendMessage },
    });
  }

  it('fires no events and changes no state when every object is new but equal', async () => {
    const send = jest.fn();
    const chat = await contractChat(sameProps(send));
    await addReply(chat.instance, 'Kept', 'kept');
    const events = recordEvents(chat.instance);
    const stateChanges = countStateChanges(chat.instance);
    const before = chat.instance.getState();
    await chat.rerender(sameProps(send));
    await chat.rerender(sameProps(send));
    await pause();
    expect(events.types()).toEqual([]);
    expect(stateChanges()).toBe(0);
    expect(chat.instance.getState()).toEqual(before);
  });

  it('fires no events and changes no state for a new customSendMessage function', async () => {
    const chat = await contractChat(sameProps(() => undefined));
    const events = recordEvents(chat.instance);
    const stateChanges = countStateChanges(chat.instance);
    const before = chat.instance.getState();
    await chat.rerender(sameProps(() => undefined));
    await pause();
    expect(events.types()).toEqual([]);
    expect(stateChanges()).toBe(0);
    expect(chat.instance.getState()).toEqual(before);
  });
});

// @covers config.header.title config.strings config.assistantName
describe('a config change leaves the conversation alone', () => {
  contractSetup();

  it('keeps messages, the open view, and the input text, and fires no events', async () => {
    const chat = await contractChat(openProps({ header: { title: 'Before' } }));
    await addReply(chat.instance, 'Kept reply', 'kept');
    await typeDraft(chat.instance, 'my draft');
    const events = recordEvents(chat.instance);
    const before = chat.instance.getState();
    await chat.rerender(
      openProps({
        header: { title: 'After' },
        assistantName: 'Renamed',
        strings: { input_placeholder: 'New placeholder' },
      })
    );
    await waitFor(() =>
      expect(shownText(getByTestId(PageObjectId.HEADER_TITLE))).toBe('After')
    );
    const after = chat.instance.getState();
    expect(after.messages).toEqual(before.messages);
    expect(after.viewState).toEqual({ launcher: false, mainWindow: true });
    expect(after.input.rawValue).toBe('my draft');
    expect(after.status).toBe('ready');
    expect(events.types()).toEqual([]);
  });

  it('runs neither render callback again, and fires no second chat:ready', async () => {
    const ready = countChatReady();
    const onBeforeRender = jest.fn(ready.onBeforeRender);
    const onAfterRender = jest.fn();
    const props = (title: string) =>
      openProps({ header: { title }, onBeforeRender, onAfterRender });
    const chat = await contractChat(props('One'));
    await waitFor(() => expect(ready.count()).toBe(1));
    await chat.rerender(props('Two'));
    await chat.rerender(props('Three'));
    await pause();
    expect(onBeforeRender).toHaveBeenCalledTimes(1);
    expect(onAfterRender).toHaveBeenCalledTimes(1);
    expect(ready.count()).toBe(1);
  });
});

// @covers config.header config.header.title config.header.name config.header.hideMinimizeButton
describe('header updates', () => {
  contractSetup();

  it('shows a new title and name', async () => {
    const chat = await contractChat(
      openProps({ header: { title: 'Title one', name: 'Name one' } })
    );
    await chat.rerender(
      openProps({ header: { title: 'Title two', name: 'Name two' } })
    );
    await waitFor(() =>
      expect(shownText(getByTestId(PageObjectId.HEADER_TITLE))).toBe(
        'Title two'
      )
    );
    expect(shownText(getByTestId(PageObjectId.HEADER_NAME))).toBe('Name two');
  });

  it('drops a field the new header leaves out, rather than keeping the old value', async () => {
    const chat = await contractChat(
      openProps({ header: { title: 'Kept title', name: 'Dropped name' } })
    );
    await chat.rerender(openProps({ header: { title: 'Kept title' } }));
    await waitFor(() => expect(byTestId(PageObjectId.HEADER_NAME)).toBeNull());
    expect(shownText(getByTestId(PageObjectId.HEADER_TITLE))).toBe(
      'Kept title'
    );
  });

  it('hides the minimize button when hideMinimizeButton turns on, and shows it when it turns off', async () => {
    const chat = await contractChat(openProps());
    expect(byTestId(PageObjectId.CLOSE_CHAT)).not.toBeNull();
    await chat.rerender(openProps({ header: { hideMinimizeButton: true } }));
    await waitFor(() => expect(byTestId(PageObjectId.CLOSE_CHAT)).toBeNull());
    await chat.rerender(openProps({ header: { hideMinimizeButton: false } }));
    await waitFor(() =>
      expect(byTestId(PageObjectId.CLOSE_CHAT)).not.toBeNull()
    );
  });
});

// @covers config.assistantName config.strings
describe('assistantName updates', () => {
  contractSetup();

  it('relabels replies already shown with the new name', async () => {
    const chat = await contractChat(
      openProps({ assistantName: 'First', strings: LABEL_STRINGS })
    );
    await addReply(chat.instance, 'Hello', 'reply');
    expect(responseLabels()).toEqual([
      expect.stringMatching(/^From First at /),
    ]);
    await chat.rerender(
      openProps({ assistantName: 'Second', strings: LABEL_STRINGS })
    );
    await waitFor(() =>
      expect(responseLabels()).toEqual([
        expect.stringMatching(/^From Second at /),
      ])
    );
  });
});

// @covers config.strings
describe('strings updates', () => {
  contractSetup();

  it('relabels the input and the replies already shown', async () => {
    const chat = await contractChat(
      openProps({
        strings: {
          input_placeholder: 'Ask one',
          message_labelAssistant: 'Before {actorName}|',
        },
      })
    );
    await addReply(chat.instance, 'Hello', 'reply');
    expect(inputField().placeholder).toBe('Ask one');
    expect(mainPanelText()).toContain('Before');
    await chat.rerender(
      openProps({
        strings: {
          input_placeholder: 'Ask two',
          message_labelAssistant: 'After {actorName}|',
        },
      })
    );
    await waitFor(() => expect(inputField().placeholder).toBe('Ask two'));
    expect(mainPanelText()).toContain('After');
    expect(mainPanelText()).not.toContain('Before');
  });

  it('reverts a key the new strings leave out to its default', async () => {
    const chat = await contractChat(openProps());
    const defaultPlaceholder = inputField().placeholder;
    await chat.rerender(
      openProps({ strings: { input_placeholder: 'Overridden' } })
    );
    await waitFor(() => expect(inputField().placeholder).toBe('Overridden'));
    await chat.rerender(openProps());
    await waitFor(() =>
      expect(inputField().placeholder).toBe(defaultPlaceholder)
    );
    expect(defaultPlaceholder).not.toBe('Overridden');
  });
});

// @covers config.locale
describe('locale updates', () => {
  contractSetup();

  /** `en` writes times as `6:45 PM`; `de` writes them as `18:45`. */
  const EN_TIME = /^From \S+ at \d{1,2}:\d{2} [AP]M\|$/;
  const DE_TIME = /^From \S+ at \d{2}:\d{2}\|$/;

  it('formats times with the new locale from the next render on', async () => {
    const props = (locale: string) =>
      openProps({ locale, strings: LABEL_STRINGS });
    const chat = await contractChat(props('en'));
    await addReply(chat.instance, 'Earlier', 'earlier');
    expect(responseLabels()).toEqual([expect.stringMatching(EN_TIME)]);

    await chat.rerender(props('de'));
    await pause(200);
    // On `main` a reply already shown keeps the old locale's time format
    // after the change, until something else renders it again: the chat
    // re-renders on the new locale before the locale's data has loaded.
    // Suspected bug, reported.
    expect(responseLabels()).toEqual([expect.stringMatching(EN_TIME)]);

    await addReply(chat.instance, 'Later', 'later');
    await waitFor(() =>
      expect(responseLabels()).toEqual([
        expect.stringMatching(DE_TIME),
        expect.stringMatching(DE_TIME),
      ])
    );
  });
});

// @covers config.namespace config.strings
describe('namespace updates', () => {
  contractSetup();

  it('names the chat region with the new namespace', async () => {
    const strings = { window_ariaChatRegionNamespace: 'Region {namespace}' };
    const chat = await contractChat(openProps({ namespace: 'one', strings }));
    expect(byRole('region', 'Region one')).not.toBeNull();
    await chat.rerender(openProps({ namespace: 'two', strings }));
    await waitFor(() => expect(byRole('region', 'Region two')).not.toBeNull());
  });
});

// @covers config.input config.input.isDisabled config.input.isSendDisabled state.input.rawValue
describe('input updates', () => {
  contractSetup();

  it('disables the input when isDisabled turns on, and enables it when it turns off', async () => {
    const chat = await contractChat(openProps());
    await typeDraft(chat.instance, 'my draft');
    expect(inputField().disabled).toBe(false);
    await chat.rerender(openProps({ input: { isDisabled: true } }));
    await waitFor(() => expect(inputField().disabled).toBe(true));
    // Disabling takes focus from the input; its text stays.
    expect(chat.instance.getState().input).toMatchObject({
      rawValue: 'my draft',
      focused: false,
    });
    await chat.rerender(openProps({ input: { isDisabled: false } }));
    await waitFor(() => expect(inputField().disabled).toBe(false));
  });

  it('disables the send button when isSendDisabled turns on, and enables it when it turns off', async () => {
    const chat = await contractChat(openProps());
    await typeDraft(chat.instance, 'ready to send');
    const sendButton = () => getByTestId(PageObjectId.INPUT_SEND);
    await waitFor(() =>
      expect(sendButton().hasAttribute('disabled')).toBe(false)
    );
    await chat.rerender(openProps({ input: { isSendDisabled: true } }));
    await waitFor(() =>
      expect(sendButton().hasAttribute('disabled')).toBe(true)
    );
    expect(inputField().disabled).toBe(false);
    expect(chat.instance.getState().input.rawValue).toBe('ready to send');
    await chat.rerender(openProps({ input: { isSendDisabled: false } }));
    await waitFor(() =>
      expect(sendButton().hasAttribute('disabled')).toBe(false)
    );
  });
});

// @covers config.messaging config.messaging.customSendMessage state.messages
describe('customSendMessage changed mid-conversation', () => {
  contractSetup();

  it('sends the next message to the new handler, and leaves the one in flight with the old', async () => {
    const first = fakeBackend();
    const second = fakeBackend();
    const chat = await contractChat(
      openProps({ messaging: { customSendMessage: first.customSendMessage } })
    );
    const inFlight = await startSend(
      instanceSender(chat.instance, first),
      'to the first'
    );
    await chat.rerender(
      openProps({ messaging: { customSendMessage: second.customSendMessage } })
    );
    expect(inFlight.sent.options.signal.aborted).toBe(false);
    await finishSend(inFlight);

    const next = await startSend(
      instanceSender(chat.instance, second),
      'to the second'
    );
    await finishSend(next);
    expect(first.texts()).toEqual(['to the first']);
    expect(second.texts()).toEqual(['to the second']);
    expect(
      chat.instance.getState().messages.map((message) => message.id)
    ).toEqual([inFlight.sent.request.id, next.sent.request.id]);
  });

  it('gives a send queued behind the one in flight to the new handler', async () => {
    const first = fakeBackend();
    const second = fakeBackend();
    const chat = await contractChat(
      openProps({ messaging: { customSendMessage: first.customSendMessage } })
    );
    const inFlight = await startSend(
      instanceSender(chat.instance, first),
      'in flight'
    );
    let queued: Promise<void>;
    await act(async () => {
      queued = chat.instance.send('queued');
    });
    await chat.rerender(
      openProps({ messaging: { customSendMessage: second.customSendMessage } })
    );
    await finishSend(inFlight);
    const sent = await second.next();
    await act(async () => {
      sent.resolve();
      await queued;
    });
    expect(first.texts()).toEqual(['in flight']);
    expect(second.texts()).toEqual(['queued']);
  });
});

// @covers config.messaging.messageTimeoutSecs
describe('messageTimeoutSecs updates', () => {
  contractSetup();

  afterEach(() => {
    jest.useRealTimers();
  });

  /** Mounts with one timeout, rerenders with another, then sends. */
  async function sendAfterChange(before: number, after: number | undefined) {
    const backend = fakeBackend();
    const props = (messageTimeoutSecs: number | undefined) =>
      openProps({
        messaging: {
          customSendMessage: backend.customSendMessage,
          messageTimeoutSecs,
        },
      });
    const chat = await contractChat(props(before));
    await chat.rerender(props(after));
    jest.useFakeTimers();
    const started = await startSend(
      instanceSender(chat.instance, backend),
      'hello'
    );
    // The send rejects on timeout; the test reads the signal instead.
    started.done.catch((): void => undefined);
    return started.sent.options.signal;
  }

  it('times the next send out at the new value', async () => {
    const signal = await sendAfterChange(60, 2);
    await advance(1999);
    expect(signal.aborted).toBe(false);
    await advance(1);
    expect(signal.aborted).toBe(true);
    expect(signal.reason).toBe(CancellationReason.TIMEOUT);
  });

  it('keeps the old timeout when the new value is 0', async () => {
    const signal = await sendAfterChange(2, 0);
    await advance(2000);
    // On `main` a change to 0 after mount is ignored, though the JSDoc says 0
    // turns the timeout off; the old timeout still applies.
    expect(signal.aborted).toBe(true);
    expect(signal.reason).toBe(CancellationReason.TIMEOUT);
  });
});

// @covers config.messaging.skipWelcome
describe('skipWelcome updates', () => {
  contractSetup();

  function props(
    skipWelcome: boolean,
    customSendMessage: ReturnType<typeof fakeBackend>['customSendMessage']
  ): Props {
    return { messaging: { skipWelcome, customSendMessage } };
  }

  it('sends the welcome when it turns off before the main window first opens', async () => {
    const backend = fakeBackend({ autoResolve: true });
    const chat = await contractChat(props(true, backend.customSendMessage));
    await chat.rerender(props(false, backend.customSendMessage));
    await changeView(chat.instance, ViewType.MAIN_WINDOW);
    await waitFor(() => expect(backend.requests).toHaveLength(1));
    expect(backend.requests[0].options.silent).toBe(true);
  });

  it('sends no welcome when it turns off after the conversation started, until a restart', async () => {
    const backend = fakeBackend({ autoResolve: true });
    const chat = await contractChat({
      ...props(true, backend.customSendMessage),
      openChatByDefault: true,
    });
    await chat.rerender({
      ...props(false, backend.customSendMessage),
      openChatByDefault: true,
    });
    await pause();
    expect(backend.requests).toHaveLength(0);
    await act(async () => {
      await chat.instance.messaging.restartConversation();
    });
    await waitFor(() => expect(backend.requests).toHaveLength(1));
    expect(backend.requests[0].options.silent).toBe(true);
  });
});

// @covers config.messaging.customLoadHistory
describe('customLoadHistory updates', () => {
  contractSetup();

  const loader = () =>
    jest.fn(async (_instance: ChatInstance): Promise<HistoryItem[]> => []);

  it('calls the loader current when the main window first opens', async () => {
    const first = loader();
    const second = loader();
    const chat = await contractChat({
      messaging: { skipWelcome: true, customLoadHistory: first },
    });
    await chat.rerender({
      messaging: { skipWelcome: true, customLoadHistory: second },
    });
    await changeView(chat.instance, ViewType.MAIN_WINDOW);
    await waitFor(() => expect(second).toHaveBeenCalledTimes(1));
    expect(first).not.toHaveBeenCalled();
  });

  it('does not call a loader set after the first call', async () => {
    const first = loader();
    const later = loader();
    const chat = await contractChat(
      openProps({ messaging: { customLoadHistory: first } })
    );
    await waitFor(() => expect(first).toHaveBeenCalledTimes(1));
    await chat.rerender(openProps({ messaging: { customLoadHistory: later } }));
    await changeView(chat.instance, ViewType.LAUNCHER);
    await changeView(chat.instance, ViewType.MAIN_WINDOW);
    await pause();
    expect(first).toHaveBeenCalledTimes(1);
    expect(later).not.toHaveBeenCalled();
  });
});

// @covers config.openChatByDefault
describe('openChatByDefault after mount', () => {
  contractSetup();

  it('leaves the view as it is', async () => {
    const chat = await contractChat({ messaging: { skipWelcome: true } });
    await chat.rerender({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
    });
    await pause();
    // On `main` the field is read only when the chat starts.
    expect(chat.instance.getState().viewState).toEqual({
      launcher: true,
      mainWindow: false,
    });
  });
});

// @covers config.upload config.upload.isOn config.upload.onFileUpload
describe('upload updates', () => {
  contractSetup();

  const UPLOAD_LABEL = 'Attach a file';
  const strings = { input_uploadButtonLabel: UPLOAD_LABEL };

  /**
   * Picks files through the upload button the way a user would. The button
   * opens the browser's file picker, which jsdom can't show, so the picker's
   * click is caught and its change fired by hand.
   */
  async function pickFiles(files: File[]) {
    const spy = jest
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => undefined);
    await click(byRole('button', UPLOAD_LABEL));
    const [picker] = spy.mock.contexts as HTMLInputElement[];
    spy.mockRestore();
    await act(async () => {
      Object.defineProperty(picker, 'files', {
        configurable: true,
        value: files,
      });
      picker.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  const uploader = () =>
    jest.fn(
      (_file: File): Promise<StructuredData> => new Promise(() => undefined)
    );

  it('shows the upload button when isOn turns on, and hides it when it turns off', async () => {
    const onFileUpload = uploader();
    const chat = await contractChat(
      openProps({ strings, upload: { isOn: false, onFileUpload } })
    );
    expect(() => byRole('button', UPLOAD_LABEL)).toThrow();
    await chat.rerender(
      openProps({ strings, upload: { isOn: true, onFileUpload } })
    );
    await waitFor(() => expect(byRole('button', UPLOAD_LABEL)).not.toBeNull());
    await chat.rerender(
      openProps({ strings, upload: { isOn: false, onFileUpload } })
    );
    await waitFor(() => expect(() => byRole('button', UPLOAD_LABEL)).toThrow());
  });

  it('hands a file picked after the change to the new onFileUpload', async () => {
    const first = uploader();
    const second = uploader();
    const chat = await contractChat(
      openProps({ strings, upload: { isOn: true, onFileUpload: first } })
    );
    await chat.rerender(
      openProps({ strings, upload: { isOn: true, onFileUpload: second } })
    );
    const file = new File(['abc'], 'notes.txt');
    await pickFiles([file]);
    await waitFor(() => expect(second).toHaveBeenCalledTimes(1));
    expect(second.mock.calls[0][0]).toBe(file);
    expect(first).not.toHaveBeenCalled();
  });
});
