/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Tests for the silent-send behaviour.
 *
 * A send with nothing to show is marked silent so it does not render as an empty
 * bubble. An attachment-only send is not such a case: a file with no caption has
 * something to show, so it renders like any other message.
 *
 * The rule lives in useInputCallbacks.onSendInput, which defers to
 * `shouldSendSilently` — covered directly in tests/utils/spec/fileAttachments_spec.
 *
 * We test the observable outcome:
 *   - silent=true  → message is NOT added to the visible message list in Redux
 *   - silent=false → message IS added to the visible message list in Redux
 */

import { waitFor } from '@testing-library/react';

import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';
import {
  BusEventType,
  MessageSendSource,
} from '../../../src/types/events/eventBusTypes';
import { createMessageRequestForText } from '../../../src/chat/utils/messageUtils';

describe('silent send', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  // -------------------------------------------------------------------------
  // silent: true → message NOT added to visible message list
  // -------------------------------------------------------------------------

  it('does not add a message to the visible store when silent=true', async () => {
    const { store, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const messagesBefore =
      store.getState().assistantMessageState.localMessageIDs.length;

    await serviceManager.actions.sendWithCatch(
      createMessageRequestForText(''),
      MessageSendSource.MESSAGE_INPUT,
      { silent: true }
    );

    const messagesAfter =
      store.getState().assistantMessageState.localMessageIDs.length;

    // A silent message must not appear in the visible message list.
    expect(messagesAfter).toBe(messagesBefore);
  });

  it('sets history.silent=true on the outgoing message when silent=true', async () => {
    const { instance, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const preSendMessages: any[] = [];
    instance.on([
      {
        type: BusEventType.PRE_SEND,
        handler: (event: any) => {
          preSendMessages.push(event.data);
        },
      },
    ]);

    await serviceManager.actions.sendWithCatch(
      createMessageRequestForText(''),
      MessageSendSource.MESSAGE_INPUT,
      { silent: true }
    );

    expect(preSendMessages).toHaveLength(1);
    expect(preSendMessages[0].history.silent).toBe(true);
  });

  // -------------------------------------------------------------------------
  // silent: false (or omitted) → message IS added to visible message list
  // -------------------------------------------------------------------------

  it('adds a message to the visible store when silent=false (text send)', async () => {
    const { store, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const messagesBefore =
      store.getState().assistantMessageState.localMessageIDs.length;

    await serviceManager.actions.sendWithCatch(
      createMessageRequestForText('Hello'),
      MessageSendSource.MESSAGE_INPUT,
      { silent: false }
    );

    const messagesAfter =
      store.getState().assistantMessageState.localMessageIDs.length;

    // A non-silent message must appear in the visible message list.
    expect(messagesAfter).toBeGreaterThan(messagesBefore);
  });

  it('adds a message to the visible store when no silent option is provided', async () => {
    const { store, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const messagesBefore =
      store.getState().assistantMessageState.localMessageIDs.length;

    await serviceManager.actions.sendWithCatch(
      createMessageRequestForText('Hello'),
      MessageSendSource.MESSAGE_INPUT
    );

    const messagesAfter =
      store.getState().assistantMessageState.localMessageIDs.length;

    expect(messagesAfter).toBeGreaterThan(messagesBefore);
  });

  // -------------------------------------------------------------------------
  // The Send control's enabled state. The predicates behind it are unit-tested
  // in tests/utils/spec/sendableInput_spec; what is pinned here is that the
  // rendered control starts out of reach when there is nothing to send.
  // -------------------------------------------------------------------------

  describe('the Send control', () => {
    /**
     * The Send control sits inside the prompt-line's own shadow root, nested under
     * the chat's, so the search has to walk shadow boundaries rather than query
     * one level.
     */
    function deepQuery(
      root: ParentNode | null,
      selector: string
    ): Element | null {
      if (!root) {
        return null;
      }

      const direct = root.querySelector?.(selector);
      if (direct) {
        return direct;
      }

      const elements = Array.from(root.querySelectorAll?.('*') ?? []);
      for (const element of elements) {
        const found = deepQuery((element as Element).shadowRoot, selector);
        if (found) {
          return found;
        }
      }

      return null;
    }

    function sendButton(): HTMLButtonElement | null {
      return deepQuery(
        document.querySelector('cds-aichat-react')?.shadowRoot ?? null,
        'button[aria-label="Send message"]'
      ) as HTMLButtonElement | null;
    }

    /*
      Only the starting state is asserted here. A store-driven prop change does not
      flush into the Lit Send control in jsdom, so staging a file and watching the
      control follow is verified in a real browser instead; a test that cannot
      distinguish the two states would pass for the wrong reason. The predicates
      themselves are covered in tests/utils/spec/sendableInput_spec.
    */

    it('starts disabled with neither text nor attachments', async () => {
      await renderChatAndGetInstanceWithStore({
        ...createBaseConfig(),
        openChatByDefault: true,
        // The Input only receives `pendingUploads` when uploads are configured, so
        // the send predicate can't see a staged file without this.
        upload: { is_on: true, onFileUpload: jest.fn() },
      } as never);

      await waitFor(() => expect(sendButton()).not.toBeNull(), {
        timeout: 5000,
      });

      expect(sendButton()?.disabled).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Explicit silent option is always preserved (options?.silent ?? !text)
  // -------------------------------------------------------------------------

  it('explicit silent:true is preserved even when text is non-empty', async () => {
    const { store, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const messagesBefore =
      store.getState().assistantMessageState.localMessageIDs.length;

    // Simulate a caller that explicitly passes silent:true with text
    await serviceManager.actions.sendWithCatch(
      createMessageRequestForText('Hello'),
      MessageSendSource.MESSAGE_INPUT,
      { silent: true }
    );

    const messagesAfter =
      store.getState().assistantMessageState.localMessageIDs.length;

    // Explicit silent:true must be respected regardless of text content.
    expect(messagesAfter).toBe(messagesBefore);
  });

  it('explicit silent:false is preserved even when text is empty', async () => {
    const { store, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const messagesBefore =
      store.getState().assistantMessageState.localMessageIDs.length;

    // Simulate a caller that explicitly passes silent:false with empty text
    await serviceManager.actions.sendWithCatch(
      createMessageRequestForText(''),
      MessageSendSource.MESSAGE_INPUT,
      { silent: false }
    );

    const messagesAfter =
      store.getState().assistantMessageState.localMessageIDs.length;

    // Explicit silent:false must be respected — message should be visible.
    expect(messagesAfter).toBeGreaterThan(messagesBefore);
  });
});
