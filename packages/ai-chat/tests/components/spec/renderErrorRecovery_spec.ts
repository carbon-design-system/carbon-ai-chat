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
  createBaseConfig,
  getChatShadowRoot,
  mockCustomSendMessage,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from '../../test_helpers';
import {
  MessageResponse,
  MessageResponseTypes,
} from '../../../src/types/messaging/Messages';
import { OnErrorType } from '../../../src/types/config/ErrorConfig';
import { MessageState } from '../../../src/types/config/MessagingConfig';
import { ChatInstance } from '../../../src/types/instance/ChatInstance';
import { MessageClass } from '../../../src/chat/components-legacy/MessageComponent';
import actions from '../../../src/chat/store/actions';
import enLanguagePack from '../../../src/chat/languages/en.json';

// Records every announcement instead of speaking it.
const mockAnnounce = jest.fn();

jest.mock(
  '@carbon/ai-chat-components/es/globals/utils/aria-announcer-manager.js',
  () => ({
    ...jest.requireActual(
      '@carbon/ai-chat-components/es/globals/utils/aria-announcer-manager.js'
    ),
    mountAriaAnnouncer: () => ({
      announce: mockAnnounce,
      disconnect: jest.fn(),
    }),
  })
);

// These markers throw from the renderers after the items pass drawability checks.
jest.mock(
  '../../../src/chat/components-legacy/responseTypes/image/Image',
  () => {
    const React = jest.requireActual('react');
    const actual = jest.requireActual(
      '../../../src/chat/components-legacy/responseTypes/image/Image'
    );
    return {
      ...actual,
      Image: (props: { altText?: string }) => {
        if (props.altText === '__throw__') {
          throw new Error('Image failed to draw');
        }
        return React.createElement(actual.Image, props);
      },
    };
  }
);

jest.mock(
  '../../../src/chat/components/responseTypes/button/ButtonItemComponent',
  () => {
    const React = jest.requireActual('react');
    const actual = jest.requireActual(
      '../../../src/chat/components/responseTypes/button/ButtonItemComponent'
    );
    return {
      ...actual,
      ButtonItemComponent: (props: {
        localMessageItem: { item: { label?: string } };
      }) => {
        if (props.localMessageItem.item.label === '__throw__') {
          throw new Error('Button failed to draw');
        }
        return React.createElement(actual.ButtonItemComponent, props);
      },
    };
  }
);

const ERROR_TEXT = enLanguagePack.errors_singleMessage;
const BACK_LABEL = enLanguagePack.general_returnToAssistant;

/** An option with no `options` list, which throws inside `OptionComponent`. */
const brokenOption = (streamId: string, title = 'Pick one') => ({
  response_type: MessageResponseTypes.OPTION,
  title,
  streaming_metadata: { id: streamId },
});

const response = (id: string, items: unknown[]): MessageResponse =>
  ({ id, output: { generic: items } }) as unknown as MessageResponse;

/**
 * Text from the chat. Message text renders inside `cds-aichat-markdown`'s own
 * shadow root, which a plain `textContent` doesn't reach.
 */
const deepText = (root: ParentNode | null): string => {
  let text = '';
  root?.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? '';
    } else if (node instanceof Element) {
      text += deepText(node.shadowRoot) + deepText(node);
    }
  });
  return text;
};

const chatText = () => deepText(getChatShadowRoot());

/** Lets React commit and the announcer's microtask flush. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

async function renderOpenChat(onError = jest.fn()) {
  const base = createBaseConfig();
  const rendered = await renderChatAndGetInstanceWithStore({
    ...base,
    openChatByDefault: true,
    messaging: { ...base.messaging, skipWelcome: true },
    onError,
  } as any);
  await settle();
  mockAnnounce.mockClear();
  return { ...rendered, onError };
}

describe('render errors in a message item', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('reports a failed item once, as a render error', async () => {
    const { instance, store, onError } = await renderOpenChat();

    await instance.messaging.addMessage(
      response('shape', [brokenOption('opt')])
    );

    await waitFor(() => expect(chatText()).toContain(ERROR_TEXT));
    expect(onError).toHaveBeenCalledTimes(1);
    const [data] = onError.mock.calls[0];
    expect(data.errorType).toBe(OnErrorType.RENDER);
    expect(data.message).toBe('Message.componentDidCatch');
    expect(data.catastrophicErrorType).toBeUndefined();
    expect(store.getState().catastrophicErrorType).toBeUndefined();
  });

  it('announces a failed addMessage item as it did before', async () => {
    const { instance } = await renderOpenChat();

    await instance.messaging.addMessage(
      response('announce', [brokenOption('opt')])
    );
    await waitFor(() => expect(chatText()).toContain(ERROR_TEXT));
    await settle();

    // Today the error box is not announced: the failing pass commits nothing,
    // so componentDidMount hands the announcer a null ref and then clears
    // needsAnnouncement before the error box renders.
    expect(mockAnnounce.mock.calls).toEqual([]);
  });

  it('announces a chunk item that fails through final_response as it did before', async () => {
    const { instance } = await renderOpenChat();

    await instance.messaging.addMessageChunk({
      streaming_metadata: { response_id: 'chunked' },
      partial_item: brokenOption('opt'),
    } as any);
    await settle();
    await instance.messaging.addMessageChunk({
      final_response: response('chunked', [brokenOption('opt')]),
    } as any);
    await waitFor(() => expect(chatText()).toContain(ERROR_TEXT));
    await settle();

    expect(mockAnnounce.mock.calls).toEqual([
      ['watsonx is responding...', 'polite'],
      [`watsonx said ${ERROR_TEXT}`, 'polite'],
    ]);
  });

  it('shows the error box for connect_to_agent with no service desk', async () => {
    const { instance } = await renderOpenChat();

    await instance.messaging.addMessage(
      response('no-desk', [
        {
          response_type: MessageResponseTypes.CONNECT_TO_HUMAN_AGENT,
          message_to_human_agent: 'The user needs help',
        },
      ])
    );

    await waitFor(() => expect(chatText()).toContain(ERROR_TEXT));
  });
});

/** The same option with a two-item `options` list, which draws. */
const fixedOption = (streamId: string) => ({
  response_type: MessageResponseTypes.OPTION,
  title: 'Pick one',
  options: [
    { label: 'Option Alpha', value: { input: { text: 'alpha' } } },
    { label: 'Option Beta', value: { input: { text: 'beta' } } },
  ],
  streaming_metadata: { id: streamId },
});

const upsert = (
  instance: ChatInstance,
  id: string,
  state: MessageState,
  items: unknown[]
) => instance.messaging.upsertMessage(id, state, () => response(id, items));

const renderErrors = (onError: jest.Mock) =>
  onError.mock.calls.filter(
    ([error]) => error.errorType === OnErrorType.RENDER
  );

const firstLocalID = (store: any, messageID: string): string =>
  store
    .getState()
    .assistantMessageState.localMessageIDs.find(
      (localID: string) =>
        store.getState().allMessageItemsByID[localID]?.fullMessageID ===
        messageID
    );

const errorAnnouncements = () =>
  mockAnnounce.mock.calls.filter(([text]) => String(text).includes(ERROR_TEXT));

/** Counts `MessageComponent` mounts per local item id. */
function spyOnMessageMounts() {
  const spy = jest.spyOn(MessageClass.prototype, 'componentDidMount');
  return {
    count: (localID: string) =>
      spy.mock.contexts.filter(
        (component: any) =>
          component.props.localMessageItem.ui_state.id === localID
      ).length,
    restore: () => spy.mockRestore(),
  };
}

const chunkPartial = (responseID: string, item: unknown) =>
  ({
    streaming_metadata: { response_id: responseID },
    partial_item: item,
  }) as any;

const chunkComplete = (responseID: string, item: unknown) =>
  ({
    streaming_metadata: { response_id: responseID },
    complete_item: item,
  }) as any;

const chunkFinal = (responseID: string, items: unknown[]) =>
  ({ final_response: response(responseID, items) }) as any;

describe('recovering a message item from a render error', () => {
  let mounts: ReturnType<typeof spyOnMessageMounts>;

  beforeEach(() => {
    setupBeforeEach();
    mounts = spyOnMessageMounts();
  });
  afterEach(() => {
    mounts.restore();
    setupAfterEach();
  });

  it('recovers an upserted item when a fixed version arrives', async () => {
    const { instance, store, onError } = await renderOpenChat();

    await upsert(instance, 'rec-upsert', MessageState.STREAMING, [
      brokenOption('opt'),
    ]);
    await settle();
    const localID = firstLocalID(store, 'rec-upsert');
    expect(chatText()).not.toContain(ERROR_TEXT);
    expect(chatText()).not.toContain('Pick one');
    expect(onError).not.toHaveBeenCalled();

    mockAnnounce.mockClear();
    await upsert(instance, 'rec-upsert', MessageState.COMPLETE, [
      fixedOption('opt'),
    ]);
    await waitFor(() => expect(chatText()).toContain('Option Alpha'));
    await settle();
    expect(chatText()).toContain('Option Beta');
    expect(chatText()).not.toContain(ERROR_TEXT);
    expect(onError).not.toHaveBeenCalled();
    expect(firstLocalID(store, 'rec-upsert')).toBe(localID);
    expect(mounts.count(localID)).toBe(1);
    // Announced once, as an item that never failed.
    expect(mockAnnounce.mock.calls).toEqual([
      ['watsonx said Pick one', 'polite'],
    ]);
  });

  it('recovers a chunk-streamed item at its complete_item', async () => {
    const { instance, store, onError } = await renderOpenChat();

    await instance.messaging.addMessageChunk(
      chunkPartial('rec-chunk', brokenOption('opt'))
    );
    await settle();
    const localID = firstLocalID(store, 'rec-chunk');
    expect(chatText()).not.toContain(ERROR_TEXT);
    expect(onError).not.toHaveBeenCalled();

    await instance.messaging.addMessageChunk(
      chunkComplete('rec-chunk', fixedOption('opt'))
    );
    await waitFor(() => expect(chatText()).toContain('Option Alpha'));
    expect(chatText()).toContain('Option Beta');
    expect(chatText()).not.toContain(ERROR_TEXT);

    await instance.messaging.addMessageChunk(
      chunkFinal('rec-chunk', [fixedOption('opt')])
    );
    await settle();
    expect(chatText()).toContain('Option Alpha');
    expect(chatText()).not.toContain(ERROR_TEXT);
    expect(onError).not.toHaveBeenCalled();
    expect(firstLocalID(store, 'rec-chunk')).toBe(localID);
    expect(mounts.count(localID)).toBe(1);
  });

  it('recovers an item when addMessage resends it fixed', async () => {
    const { instance, store, onError } = await renderOpenChat();

    await instance.messaging.addMessage(
      response('rec-add', [brokenOption('opt')])
    );
    await waitFor(() => expect(chatText()).toContain(ERROR_TEXT));
    expect(renderErrors(onError)).toHaveLength(1);
    const localID = firstLocalID(store, 'rec-add');

    await instance.messaging.addMessage(
      response('rec-add', [fixedOption('opt')])
    );
    await waitFor(() => expect(chatText()).toContain('Option Alpha'));
    expect(chatText()).not.toContain(ERROR_TEXT);
    expect(renderErrors(onError)).toHaveLength(1);
    expect(firstLocalID(store, 'rec-add')).toBe(localID);
    expect(mounts.count(localID)).toBe(1);
  });
});

describe('holding a render error until the stream completes', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("shows an upserted item's error only when its stream completes", async () => {
    const { instance, onError } = await renderOpenChat();

    await upsert(instance, 'held-upsert', MessageState.STREAMING, [
      brokenOption('opt'),
    ]);
    await settle();
    expect(chatText()).not.toContain(ERROR_TEXT);
    expect(onError).not.toHaveBeenCalled();

    await upsert(instance, 'held-upsert', MessageState.COMPLETE, [
      brokenOption('opt'),
    ]);
    await waitFor(() => expect(chatText()).toContain(ERROR_TEXT));
    await settle();
    expect(renderErrors(onError)).toHaveLength(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(errorAnnouncements()).toHaveLength(1);
  });

  it("shows a chunk item's error only at its complete_item", async () => {
    const { instance, onError } = await renderOpenChat();

    await instance.messaging.addMessageChunk(
      chunkPartial('held-chunk', brokenOption('opt'))
    );
    await settle();
    expect(chatText()).not.toContain(ERROR_TEXT);
    expect(onError).not.toHaveBeenCalled();

    await instance.messaging.addMessageChunk(
      chunkComplete('held-chunk', brokenOption('opt'))
    );
    await waitFor(() => expect(chatText()).toContain(ERROR_TEXT));
    expect(renderErrors(onError)).toHaveLength(1);
  });

  it('reports a still-broken chunk item once through its final_response', async () => {
    const { instance, onError } = await renderOpenChat();

    await instance.messaging.addMessageChunk(
      chunkComplete('held-final', brokenOption('opt'))
    );
    await waitFor(() => expect(chatText()).toContain(ERROR_TEXT));
    expect(renderErrors(onError)).toHaveLength(1);

    // final_response stores the host's item, a newer version, which gets one
    // fresh attempt (D21). It is the same failure, so it doesn't report again.
    await instance.messaging.addMessageChunk(
      chunkFinal('held-final', [brokenOption('opt')])
    );
    await settle();
    await waitFor(() => expect(chatText()).toContain(ERROR_TEXT));
    expect(renderErrors(onError)).toHaveLength(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('shows a held error when a stop settles the stream, without reporting', async () => {
    const { instance, serviceManager, onError } = await renderOpenChat();

    await upsert(instance, 'held-stop', MessageState.STREAMING, [
      brokenOption('opt'),
    ]);
    await settle();
    expect(chatText()).not.toContain(ERROR_TEXT);
    expect(onError).not.toHaveBeenCalled();

    act(() => {
      serviceManager.messageUpsertCoordinator.endAllStreaming();
    });
    await waitFor(() => expect(chatText()).toContain(ERROR_TEXT));
    expect(onError).not.toHaveBeenCalled();
  });

  it('reports no error for versions that fail mid-stream', async () => {
    const { instance, onError } = await renderOpenChat();

    for (const title of ['First', 'Second', 'Third']) {
      await upsert(instance, 'held-many', MessageState.STREAMING, [
        brokenOption('opt', title),
      ]);
      await settle();
    }
    await upsert(instance, 'held-many', MessageState.COMPLETE, [
      fixedOption('opt'),
    ]);
    await waitFor(() => expect(chatText()).toContain('Option Alpha'));
    expect(chatText()).toContain('Option Beta');
    expect(onError).not.toHaveBeenCalled();
  });
});

describe('a still-broken message item', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('keeps a still-broken item on the error without retrying', async () => {
    const { instance, store, onError } = await renderOpenChat();
    const brokenMessage = () => [brokenOption('opt')];

    await upsert(instance, 'no-retry', MessageState.COMPLETE, brokenMessage());
    await waitFor(() => expect(chatText()).toContain(ERROR_TEXT));
    await settle();
    expect(renderErrors(onError)).toHaveLength(1);
    const localID = firstLocalID(store, 'no-retry');
    // componentDidMount's announcement write has run by now.
    expect(store.getState().allMessageItemsByID[localID].ui_state).toEqual(
      expect.objectContaining({ needsAnnouncement: false })
    );

    await instance.messaging.addMessage(
      response('after-no-retry', [
        { response_type: MessageResponseTypes.TEXT, text: 'Later message' },
      ])
    );
    await settle();
    await upsert(instance, 'no-retry', MessageState.COMPLETE, brokenMessage());
    await settle();
    act(() => {
      store.dispatch(
        actions.setMessageUIProperty(localID, 'wasHumanAgentChatEnded', true)
      );
    });
    await settle();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(chatText()).toContain(ERROR_TEXT);
    expect(store.getState().catastrophicErrorType).toBeUndefined();
    const updateDepthErrors = (console.error as jest.Mock).mock.calls.filter(
      (args) => String(args[0]).includes('Maximum update depth')
    );
    expect(updateDepthErrors).toHaveLength(0);
  });

  it('reports an addMessage item resent still broken once', async () => {
    const { instance, store, onError } = await renderOpenChat();

    await instance.messaging.addMessage(
      response('resend-broken', [brokenOption('opt')])
    );
    await waitFor(() => expect(chatText()).toContain(ERROR_TEXT));
    expect(renderErrors(onError)).toHaveLength(1);
    const localID = firstLocalID(store, 'resend-broken');

    await instance.messaging.addMessage(
      response('resend-broken', [brokenOption('opt')])
    );
    await settle();

    expect(firstLocalID(store, 'resend-broken')).toBe(localID);
    expect(chatText()).toContain(ERROR_TEXT);
    expect(renderErrors(onError)).toHaveLength(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('reports each broken version once and never escalates', async () => {
    const { instance, store, onError } = await renderOpenChat();

    await upsert(instance, 'two-broken', MessageState.COMPLETE, [
      brokenOption('opt', 'First'),
    ]);
    await waitFor(() => expect(chatText()).toContain(ERROR_TEXT));
    await settle();
    expect(renderErrors(onError)).toHaveLength(1);

    await upsert(instance, 'two-broken', MessageState.COMPLETE, [
      brokenOption('opt', 'Second'),
    ]);
    await waitFor(() => expect(renderErrors(onError)).toHaveLength(2));
    await waitFor(() => expect(chatText()).toContain(ERROR_TEXT));
    expect(onError).toHaveBeenCalledTimes(2);
    expect(store.getState().catastrophicErrorType).toBeUndefined();
  });
});

const showPanelButton = (panel: Record<string, unknown>) => ({
  response_type: MessageResponseTypes.BUTTON,
  button_type: 'show_panel',
  label: 'Open panel',
  panel: { title: 'Panel title', ...panel },
});

const panelText = (text: string) => ({
  response_type: MessageResponseTypes.TEXT,
  text,
});

const throwingImage = {
  response_type: MessageResponseTypes.IMAGE,
  source: 'https://example.com/image.png',
  alt_text: '__throw__',
};

describe('renderer exceptions in upserted message items', () => {
  let catchError: jest.SpyInstance;

  beforeEach(() => {
    setupBeforeEach();
    catchError = jest.spyOn(MessageClass.prototype, 'componentDidCatch');
  });

  afterEach(() => {
    catchError.mockRestore();
    setupAfterEach();
  });

  const image = {
    ...throwingImage,
    streaming_metadata: { id: 'image' },
  };
  const fixedImage = {
    ...image,
    alt_text: 'Recovered image',
    title: 'Recovered image',
  };

  it('recovers from a renderer exception before the stream ends', async () => {
    const { instance, store, onError } = await renderOpenChat();

    await upsert(instance, 'renderer-recovery', MessageState.STREAMING, [
      image,
    ]);
    await waitFor(() => expect(catchError).toHaveBeenCalled());
    await settle();

    const localID = firstLocalID(store, 'renderer-recovery');
    expect(
      store.getState().allMessageItemsByID[localID].ui_state.cannotDraw
    ).toBeUndefined();
    expect(chatText()).not.toContain(ERROR_TEXT);
    expect(onError).not.toHaveBeenCalled();

    await upsert(instance, 'renderer-recovery', MessageState.STREAMING, [
      fixedImage,
    ]);
    await waitFor(() => expect(chatText()).toContain('Recovered image'));
    await upsert(instance, 'renderer-recovery', MessageState.COMPLETE, [
      fixedImage,
    ]);
    await settle();

    expect(firstLocalID(store, 'renderer-recovery')).toBe(localID);
    expect(chatText()).not.toContain(ERROR_TEXT);
    expect(onError).not.toHaveBeenCalled();
    expect(store.getState().catastrophicErrorType).toBeUndefined();
  });

  it.each([MessageState.COMPLETE, MessageState.ERROR])(
    'reports a renderer exception once when the stream becomes %s',
    async (state) => {
      const { instance, store, onError } = await renderOpenChat();

      await upsert(instance, 'renderer-terminal', MessageState.STREAMING, [
        image,
      ]);
      await waitFor(() => expect(catchError).toHaveBeenCalled());
      await settle();
      expect(chatText()).not.toContain(ERROR_TEXT);
      expect(onError).not.toHaveBeenCalled();

      await upsert(instance, 'renderer-terminal', state, [image]);
      await waitFor(() => expect(chatText()).toContain(ERROR_TEXT));
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          errorType: OnErrorType.RENDER,
          message: 'Message.componentDidCatch',
        })
      );

      await upsert(instance, 'renderer-terminal', state, [image]);
      await settle();
      expect(onError).toHaveBeenCalledTimes(1);

      await upsert(instance, 'renderer-terminal', MessageState.COMPLETE, [
        fixedImage,
      ]);
      await waitFor(() => expect(chatText()).toContain('Recovered image'));
      expect(chatText()).not.toContain(ERROR_TEXT);
      expect(onError).toHaveBeenCalledTimes(1);
      expect(store.getState().catastrophicErrorType).toBeUndefined();
    }
  );
});

const throwingFooterButton = {
  response_type: MessageResponseTypes.BUTTON,
  button_type: 'post_back',
  label: '__throw__',
  value: { input: { text: 'footer' } },
};

const upsertPanelMessage = (
  instance: ChatInstance,
  panel: Record<string, unknown>
) =>
  upsert(instance, 'panel-message', MessageState.COMPLETE, [
    showPanelButton(panel),
  ]);

async function openPanel() {
  const button = getChatShadowRoot()?.querySelector<HTMLElement>(
    '.BaseButtonItemComponent__ShowPanel'
  );
  act(() => {
    button.click();
  });
  await settle();
}

/**
 * The panel header's back button. The toolbar draws its action buttons in its
 * own shadow root only after it measures its width, which jsdom can't do, so
 * the spec reads the action it was given.
 */
const panelBackAction = (): { onClick: () => void } | undefined =>
  Array.from(
    responsePanelBody()?.parentElement?.querySelectorAll(
      'cds-aichat-toolbar'
    ) ?? []
  )
    .flatMap((toolbar: any) => toolbar.actions ?? [])
    .find((action: { text: string }) => action.text === BACK_LABEL);

/** The response panel's body slot. Other panels have body slots too. */
const responsePanelBody = () =>
  getChatShadowRoot()
    ?.querySelector('[slot="body"] .cds-aichat--body-message-components')
    ?.closest('[slot="body"]');

const panelError = (slot: 'body' | 'footer') =>
  getChatShadowRoot()?.querySelector(
    `[slot="${slot}"] .cds-aichat--inline-error`
  );

const panelErrors = (onError: jest.Mock) =>
  onError.mock.calls.filter(
    ([error]) => error.message === 'ResponsePanel.componentDidCatch'
  );

async function closePanel(store: any) {
  act(() => {
    panelBackAction().onClick();
  });
  await settle();
  expect(store.getState().responsePanelState.isOpen).toBe(false);
  // The panel clears its content when its close animation ends, which jsdom
  // never runs, so do what that handler does.
  act(() => {
    store.dispatch(actions.setResponsePanelContent(null, false));
  });
  await settle();
}

describe('render errors in response panel content', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('shows a failing panel body as an error inside the panel', async () => {
    const { instance, store, onError } = await renderOpenChat();
    await upsertPanelMessage(instance, { body: [throwingImage] });
    await settle();
    mockAnnounce.mockClear();

    await openPanel();

    expect(store.getState().catastrophicErrorType).toBeUndefined();
    await waitFor(() =>
      expect(deepText(panelError('body'))).toContain(ERROR_TEXT)
    );
    expect(panelBackAction()).toBeDefined();
    expect(onError).toHaveBeenCalledTimes(1);
    const [data] = onError.mock.calls[0];
    expect(data.errorType).toBe(OnErrorType.RENDER);
    expect(data.message).toBe('ResponsePanel.componentDidCatch');
    expect(data.catastrophicErrorType).toBeUndefined();
    await settle();
    expect(errorAnnouncements()).toEqual([[ERROR_TEXT, 'polite']]);
  });

  it('isolates a failing panel footer from its body', async () => {
    const { instance, store, onError } = await renderOpenChat();
    await upsertPanelMessage(instance, {
      body: [panelText('Panel body text')],
      footer: [throwingFooterButton],
    });
    await settle();

    await openPanel();

    expect(store.getState().catastrophicErrorType).toBeUndefined();
    await waitFor(() => expect(panelError('footer')).toBeTruthy());
    await waitFor(() =>
      expect(deepText(responsePanelBody())).toContain('Panel body text')
    );
    expect(panelError('body')).toBeFalsy();
    expect(onError).toHaveBeenCalledTimes(1);
    const [data] = onError.mock.calls[0];
    expect(data.errorType).toBe(OnErrorType.RENDER);
    expect(data.message).toBe('ResponsePanel.componentDidCatch');
    expect(data.catastrophicErrorType).toBeUndefined();
  });

  it('keeps a panel crash from a live update inside the panel', async () => {
    const { instance, store, onError } = await renderOpenChat();
    await upsertPanelMessage(instance, {
      body: [panelText('Body one'), panelText('Body two')],
    });
    await settle();
    await openPanel();
    await waitFor(() =>
      expect(deepText(responsePanelBody())).toContain('Body two')
    );

    // The open panel still lists the nested id this upsert prunes.
    await upsertPanelMessage(instance, { body: [panelText('Body one')] });
    await settle();

    expect(store.getState().catastrophicErrorType).toBeUndefined();
    await waitFor(() => expect(panelError('body')).toBeTruthy());
    expect(panelErrors(onError)).toHaveLength(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].catastrophicErrorType).toBeUndefined();

    await closePanel(store);
    await openPanel();
    await waitFor(() =>
      expect(deepText(responsePanelBody())).toContain('Body one')
    );
    expect(panelError('body')).toBeFalsy();
    expect(deepText(responsePanelBody())).not.toContain('Body two');
  });

  it('leaves the chat usable after a panel fails', async () => {
    const { instance, store } = await renderOpenChat();
    await upsertPanelMessage(instance, { body: [throwingImage] });
    await settle();
    await openPanel();

    expect(store.getState().catastrophicErrorType).toBeUndefined();
    await closePanel(store);
    expect(
      getChatShadowRoot()?.querySelector('.BaseButtonItemComponent__ShowPanel')
    ).toBeTruthy();

    await instance.send({ input: { text: 'hello' } } as any);
    await waitFor(() => expect(mockCustomSendMessage).toHaveBeenCalled());
    await waitFor(() => expect(chatText()).toContain('hello'));
    expect(store.getState().catastrophicErrorType).toBeUndefined();
  });

  it('reopens a failed panel without escalating', async () => {
    const { instance, store, onError } = await renderOpenChat();
    await upsertPanelMessage(instance, { body: [throwingImage] });
    await settle();
    await openPanel();
    await waitFor(() => expect(panelError('body')).toBeTruthy());
    expect(panelErrors(onError)).toHaveLength(1);

    await closePanel(store);
    await openPanel();
    await waitFor(() => expect(panelErrors(onError)).toHaveLength(2));
    expect(panelError('body')).toBeTruthy();
    expect(onError).toHaveBeenCalledTimes(2);
    expect(store.getState().catastrophicErrorType).toBeUndefined();

    await closePanel(store);
    await upsertPanelMessage(instance, { body: [panelText('Fixed body')] });
    await settle();
    await openPanel();
    await waitFor(() =>
      expect(deepText(responsePanelBody())).toContain('Fixed body')
    );
    expect(panelError('body')).toBeFalsy();
    expect(onError).toHaveBeenCalledTimes(2);
  });
});
