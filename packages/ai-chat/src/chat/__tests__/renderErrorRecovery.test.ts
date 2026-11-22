/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { Mock as VitestMock, MockInstance } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import {
  createBaseConfig,
  getChatShadowRoot,
  mockCustomSendMessage,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
  cannotDrawOf,
} from './helpers/chat';
import {
  MessageResponse,
  MessageResponseTypes,
} from '../../types/messaging/Messages';
import { OnErrorType } from '../../types/config/ErrorConfig';
import { MessageState } from '../../types/config/MessagingConfig';
import { ChatInstance } from '../../types/instance/ChatInstance';
import { MessageClass } from '../components-legacy/MessageComponent';
import enLanguagePack from '../../languages/en.json';
import { viewActions } from '../state';

// Records every announcement instead of speaking it.
const mockAnnounce = vi.fn();

vi.mock(
  '@carbon/ai-chat-components/es/globals/utils/aria-announcer-manager.js',
  async () => ({
    ...(await vi.importActual<
      typeof import('@carbon/ai-chat-components/es/globals/utils/aria-announcer-manager.js')
    >('@carbon/ai-chat-components/es/globals/utils/aria-announcer-manager.js')),
    mountAriaAnnouncer: () => ({
      announce: mockAnnounce,
      disconnect: vi.fn(),
    }),
  })
);

// These markers throw from the renderers after the items pass drawability checks.
vi.mock('../components-legacy/responseTypes/image/Image', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  const actual = await vi.importActual<
    typeof import('../components-legacy/responseTypes/image/Image')
  >('../components-legacy/responseTypes/image/Image');
  return {
    ...actual,
    Image: (props: { altText?: string }) => {
      if (props.altText === '__throw__') {
        throw new Error('Image failed to draw');
      }
      return React.createElement(
        actual.Image,
        props as import('react').ComponentProps<typeof actual.Image>
      );
    },
  };
});

vi.mock('../components/responseTypes/button/ButtonItemComponent', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  const actual = await vi.importActual<
    typeof import('../components/responseTypes/button/ButtonItemComponent')
  >('../components/responseTypes/button/ButtonItemComponent');
  return {
    ...actual,
    ButtonItemComponent: (props: {
      localMessageItem: { item: { label?: string } };
    }) => {
      if (props.localMessageItem.item.label === '__throw__') {
        throw new Error('Button failed to draw');
      }
      return React.createElement(
        actual.ButtonItemComponent,
        props as import('react').ComponentProps<
          typeof actual.ButtonItemComponent
        >
      );
    },
  };
});

const ERROR_TEXT = enLanguagePack.errors_singleMessage;
const BACK_LABEL = enLanguagePack.general_returnToAssistant;

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

async function renderOpenChat(onError = vi.fn()) {
  const base = createBaseConfig();
  const rendered = await renderChatAndGetInstanceWithStore({
    ...base,
    openChatByDefault: true,
    messaging: { ...base.messaging, skipWelcome: true },
    onError,
  } as any);
  await waitFor(() => expect(rendered.store.getState().isHydrated).toBe(true));
  // Lets the mount's own announcements go out before the test counts any.
  await act(() => settle());
  mockAnnounce.mockClear();
  return { ...rendered, onError };
}

const upsert = (
  instance: ChatInstance,
  id: string,
  state: MessageState,
  items: unknown[]
) => instance.messaging.upsertMessage(id, state, () => response(id, items));

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
  let catchError: MockInstance;

  beforeEach(() => {
    setupBeforeEach();
    catchError = vi.spyOn(MessageClass.prototype, 'componentDidCatch');
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
    expect(cannotDrawOf(store.getState(), localID)).toBeUndefined();
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
    expect(store.getState().view.catastrophicErrorType).toBeUndefined();
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
      expect(store.getState().view.catastrophicErrorType).toBeUndefined();
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

const panelErrors = (onError: VitestMock) =>
  onError.mock.calls.filter(
    ([error]) => error.message === 'ResponsePanel.componentDidCatch'
  );

async function closePanel(store: any) {
  act(() => {
    panelBackAction().onClick();
  });
  await settle();
  expect(store.getState().view.responsePanelState.isOpen).toBe(false);
  // The panel clears its content when its close animation ends, which jsdom
  // never runs, so do what that handler does.
  act(() => {
    store.dispatch(viewActions.setResponsePanelContent(null, false));
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

    expect(store.getState().view.catastrophicErrorType).toBeUndefined();
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

    expect(store.getState().view.catastrophicErrorType).toBeUndefined();
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

    // The open panel draws the live nested items, and this update's second one throws.
    await upsertPanelMessage(instance, {
      body: [panelText('Body one'), throwingImage],
    });
    await settle();

    expect(store.getState().view.catastrophicErrorType).toBeUndefined();
    await waitFor(() => expect(panelError('body')).toBeTruthy());
    expect(panelErrors(onError)).toHaveLength(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].catastrophicErrorType).toBeUndefined();

    await closePanel(store);
    await upsertPanelMessage(instance, { body: [panelText('Body one')] });
    await settle();
    await openPanel();
    await waitFor(() =>
      expect(deepText(responsePanelBody())).toContain('Body one')
    );
    expect(panelError('body')).toBeFalsy();
    expect(deepText(responsePanelBody())).not.toContain('Body two');
  });

  it('skips a removed nested item from the opening panel membership', async () => {
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

    expect(store.getState().view.catastrophicErrorType).toBeUndefined();
    await waitFor(() =>
      expect(deepText(responsePanelBody())).not.toContain('Body two')
    );
    expect(deepText(responsePanelBody())).toContain('Body one');
    expect(panelError('body')).toBeFalsy();
    expect(onError).not.toHaveBeenCalled();
  });

  it('keeps the opening nested membership when an update adds an item', async () => {
    const { instance, store, onError } = await renderOpenChat();
    await upsertPanelMessage(instance, {
      body: [panelText('Body one'), panelText('Body two')],
    });
    await settle();
    await openPanel();
    await waitFor(() =>
      expect(deepText(responsePanelBody())).toContain('Body two')
    );

    await upsertPanelMessage(instance, {
      body: [
        panelText('Body one'),
        panelText('Body two'),
        panelText('Body three'),
      ],
    });
    await settle();

    expect(deepText(responsePanelBody())).toContain('Body two');
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(deepText(responsePanelBody())).not.toContain('Body three');
    expect(panelError('body')).toBeFalsy();
    expect(onError).not.toHaveBeenCalled();
    expect(store.getState().view.catastrophicErrorType).toBeUndefined();
  });

  it('leaves the chat usable after a panel fails', async () => {
    const { instance, store } = await renderOpenChat();
    await upsertPanelMessage(instance, { body: [throwingImage] });
    await settle();
    await openPanel();

    expect(store.getState().view.catastrophicErrorType).toBeUndefined();
    await closePanel(store);
    expect(
      getChatShadowRoot()?.querySelector('.BaseButtonItemComponent__ShowPanel')
    ).toBeTruthy();

    await instance.send({ input: { text: 'hello' } } as any);
    await waitFor(() => expect(mockCustomSendMessage).toHaveBeenCalled());
    await waitFor(() => expect(chatText()).toContain('hello'));
    expect(store.getState().view.catastrophicErrorType).toBeUndefined();
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
    expect(store.getState().view.catastrophicErrorType).toBeUndefined();

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
