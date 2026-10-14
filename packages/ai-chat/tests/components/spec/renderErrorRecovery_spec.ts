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
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from '../../test_helpers';
import {
  MessageResponse,
  MessageResponseTypes,
} from '../../../src/types/messaging/Messages';
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

const ERROR_TEXT = enLanguagePack.errors_singleMessage;

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
  await waitFor(() => expect(rendered.store.getState().isHydrated).toBe(true));
  act(() => {
    rendered.store.dispatch(actions.updateHasSentNonWelcomeMessage(true));
  });
  await waitFor(() =>
    expect(mockAnnounce).toHaveBeenCalledWith(
      expect.stringContaining(enLanguagePack.homeScreen_hidden),
      'polite'
    )
  );
  mockAnnounce.mockClear();
  return { ...rendered, onError };
}

describe('render errors in a message item', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

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
