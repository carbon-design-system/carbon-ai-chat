/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import type { JSONContent } from '@tiptap/core';

import {
  MessageRichUserContent,
  INPUT_NODE_SLOT_ATTR,
} from '../../../src/chat/components-legacy/MessageRichUserContent';
import {
  collectInputNodeSlots,
  InputNodePortalsContainer,
} from '../../../src/chat/components/portals/InputNodePortalsContainer';
import { StoreProvider } from '../../../src/chat/providers/StoreProvider';
import actions from '../../../src/chat/store/actions';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import { makeConfigStore } from '../../test_helpers';

jest.mock('../../../src/chat/hooks/useIntl', () => ({
  useIntl: () => ({ formatMessage: () => '' }),
}));
import type { MessageRequest } from '../../../src/types/messaging/Messages';

const MESSAGE_ID = 'msg-1';

function messageWith(content: JSONContent): MessageRequest {
  return {
    id: MESSAGE_ID,
    input: { text: '', display_content: content },
  } as unknown as MessageRequest;
}

// Minimal store — the pure-text branch renders `<MarkdownWithDefaults>`, which
// reads `state.config.public.shouldSanitizeHTML` via a selector.
function makeStore() {
  return makeConfigStore({});
}

/** Slot keys as `MessageRichUserContent` actually renders them, in DOM order. */
function renderedSlotKeys(content: JSONContent): string[] {
  const { container } = render(
    <StoreProvider store={makeStore()}>
      <MessageRichUserContent
        content={content}
        message={messageWith(content)}
      />
    </StoreProvider>
  );
  return Array.from(
    container.querySelectorAll(`[${INPUT_NODE_SLOT_ATTR}]`)
  ).map((el) => el.getAttribute(INPUT_NODE_SLOT_ATTR) ?? '');
}

/** Slot keys as `InputNodePortalsContainer` computes them, in document order. */
function walkedSlotKeys(content: JSONContent): string[] {
  return collectInputNodeSlots(content, MESSAGE_ID).map((s) => s.slotKey);
}

describe('rich user message node-key contract', () => {
  it('agrees on a mixed paragraph with a mention and a custom inline node', () => {
    const content: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hi ' },
            { type: 'mention', attrs: { id: 'u1', label: 'Alice' } },
            { type: 'text', text: ' see ' },
            { type: 'taskCard', attrs: { label: 'Ship it' } },
          ],
        },
      ],
    };
    // mention (0.1) and taskCard (0.3) both produce slots; text nodes do not.
    expect(walkedSlotKeys(content)).toEqual([
      `${MESSAGE_ID}::0.1`,
      `${MESSAGE_ID}::0.3`,
    ]);
    expect(renderedSlotKeys(content)).toEqual(walkedSlotKeys(content));
  });

  it('agrees on top-level custom blocks and an opaque blockquote', () => {
    const content: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'intro' }],
        },
        { type: 'fileBlock', attrs: { label: 'report.pdf' } },
        {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'quoted' }],
            },
          ],
        },
      ],
    };
    // blockquote is not built-in, so both walks stop at it without descending.
    expect(walkedSlotKeys(content)).toEqual([
      `${MESSAGE_ID}::1`,
      `${MESSAGE_ID}::2`,
    ]);
    expect(renderedSlotKeys(content)).toEqual(walkedSlotKeys(content));
  });

  it('agrees on a command node alongside a custom inline node', () => {
    const content: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'run ' },
            { type: 'command', attrs: { id: 'c1', label: 'deploy' } },
            { type: 'widget', attrs: { label: 'w' } },
          ],
        },
      ],
    };
    // command (0.1) and widget (0.2) both get slots; text nodes do not.
    expect(walkedSlotKeys(content)).toEqual([
      `${MESSAGE_ID}::0.1`,
      `${MESSAGE_ID}::0.2`,
    ]);
    expect(renderedSlotKeys(content)).toEqual(walkedSlotKeys(content));
  });

  it('agrees on a paragraph containing only a mention', () => {
    const content: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hi ' },
            { type: 'mention', attrs: { id: 'u1', label: 'Alice' } },
          ],
        },
      ],
    };
    expect(walkedSlotKeys(content)).toEqual([`${MESSAGE_ID}::0.1`]);
    expect(renderedSlotKeys(content)).toEqual(walkedSlotKeys(content));
  });

  it('agrees that pure-text docs produce no slots', () => {
    // A doc with no custom nodes goes down the plain-markdown path. The walker
    // emits nothing; the bubble emits a `<MarkdownWithDefaults>` with no
    // `<slot>`, so there is nothing to project and nothing to keep in sync.
    const pureText: JSONContent = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'just text' }] },
      ],
    };
    expect(walkedSlotKeys(pureText)).toEqual([]);
  });

  it('agrees when custom nodes sit in multiple paragraphs', () => {
    const content: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'a' },
            { type: 'chip', attrs: { label: 'one' } },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'chip', attrs: { label: 'two' } },
            { type: 'text', text: 'b' },
          ],
        },
      ],
    };
    expect(walkedSlotKeys(content)).toEqual([
      `${MESSAGE_ID}::0.1`,
      `${MESSAGE_ID}::1.0`,
    ]);
    expect(renderedSlotKeys(content)).toEqual(walkedSlotKeys(content));
  });
});

describe('rich user message fallback projection', () => {
  it.each<[string, Record<string, string>]>([
    ['mention', { label: 'Alice' }],
    ['command', { label: 'deploy' }],
    ['widget', { label: 'Widget' }],
    ['widget', { value: 'Value' }],
  ])(
    'restores the %s fallback after removing a renderer host',
    async (type, attrs) => {
      const content: JSONContent = {
        type: 'doc',
        content: [{ type, attrs }],
      };
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });
      const container = document.createElement('div');
      shadowRoot.appendChild(container);
      document.body.appendChild(host);
      const { unmount } = render(
        <StoreProvider store={makeStore()}>
          <MessageRichUserContent
            content={content}
            message={messageWith(content)}
          />
        </StoreProvider>,
        { container }
      );

      try {
        const slot = shadowRoot.querySelector('slot');
        const fallback = slot.nextElementSibling as HTMLSpanElement;
        const fallbackContent = fallback.firstChild;
        expect(slot.name).toBe(`${MESSAGE_ID}::0`);
        expect(slot.childNodes).toHaveLength(0);
        expect(fallback.tagName).toBe('SPAN');
        expect(fallback.hidden).toBe(false);
        expect(fallback.textContent).toContain(attrs.label ?? attrs.value);

        const rendererHost = document.createElement('div');
        rendererHost.slot = slot.name;
        rendererHost.textContent = 'Custom renderer';
        await act(async () => {
          host.appendChild(rendererHost);
        });
        expect(slot.assignedNodes()).toEqual([rendererHost]);
        await waitFor(() => expect(fallback.hidden).toBe(true));
        expect(fallback.firstChild).toBe(fallbackContent);

        await act(async () => {
          rendererHost.remove();
        });
        expect(slot.assignedNodes()).toHaveLength(0);
        await waitFor(() => expect(fallback.hidden).toBe(false));
        expect(fallback.firstChild).toBe(fallbackContent);
        expect(fallback.textContent).toContain(attrs.label ?? attrs.value);
      } finally {
        unmount();
        host.remove();
      }
    }
  );

  it('hides the fallback when a renderer host exists before the slot mounts', async () => {
    const content: JSONContent = {
      type: 'doc',
      content: [{ type: 'widget', attrs: { label: 'Fallback' } }],
    };
    const host = document.createElement('div');
    const rendererHost = document.createElement('div');
    rendererHost.slot = `${MESSAGE_ID}::0`;
    rendererHost.textContent = 'Custom renderer';
    host.appendChild(rendererHost);
    const shadowRoot = host.attachShadow({ mode: 'open' });
    const container = document.createElement('div');
    shadowRoot.appendChild(container);
    document.body.appendChild(host);
    const { unmount } = render(
      <StoreProvider store={makeStore()}>
        <MessageRichUserContent
          content={content}
          message={messageWith(content)}
        />
      </StoreProvider>,
      { container }
    );

    try {
      const slot = shadowRoot.querySelector('slot');
      const fallback = slot.nextElementSibling as HTMLSpanElement;
      expect(slot.assignedNodes()).toEqual([rendererHost]);
      await waitFor(() => expect(fallback.hidden).toBe(true));
    } finally {
      unmount();
      host.remove();
    }
  });
});

describe('structured paragraph projection', () => {
  it.each([true, false])(
    'keeps text, chips, and custom output in one light tree (portals first: %s)',
    (portalsFirst) => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'prefix' },
              { type: 'mention', attrs: { label: 'Alice' } },
              { type: 'text', text: 'suffix' },
            ],
          },
        ],
      };
      const message = messageWith(content);
      const store = makeStore();
      store.dispatch(
        actions.changeState({ allMessagesByID: { [MESSAGE_ID]: message } })
      );
      const host = document.createElement('div');
      const root = host.attachShadow({ mode: 'open' });
      const container = document.createElement('div');
      root.appendChild(container);
      document.body.appendChild(host);
      const callback = jest.fn(() => <b>Custom</b>);
      const instance = {} as ChatInstance;
      const view = (custom: boolean) => {
        const portal = (
          <InputNodePortalsContainer
            key="portal"
            chatWrapper={host}
            chatInstance={instance}
            renderUserDefinedInputNode={custom ? callback : () => null}
          />
        );
        const bubble = (
          <MessageRichUserContent
            key="bubble"
            content={content}
            message={message}
          />
        );
        return (
          <StoreProvider store={store}>
            {portalsFirst ? [portal, bubble] : [bubble, portal]}
          </StoreProvider>
        );
      };
      const { rerender, unmount } = render(view(true), { container });
      try {
        const slot = root.querySelector('p > slot') as HTMLSlotElement;
        const paragraph = slot.assignedNodes()[0] as HTMLElement;
        const target = paragraph.querySelector(
          `[${INPUT_NODE_SLOT_ATTR}]`
        ) as HTMLElement;
        const fallback = target.firstElementChild as HTMLElement;
        const chip = fallback.firstChild;
        expect(paragraph.getRootNode()).toBe(document);
        expect(paragraph.querySelectorAll('slot')).toHaveLength(0);
        expect(paragraph.textContent).toBe('prefixAliceCustomsuffix');
        expect(fallback.hidden).toBe(true);
        expect(paragraph.querySelector('b')?.getRootNode()).toBe(document);
        expect(callback).toHaveBeenCalledTimes(1);

        rerender(view(false));
        expect(fallback.hidden).toBe(false);
        expect(fallback.firstChild).toBe(chip);
        expect(paragraph.querySelector('b')).toBeNull();
        expect(paragraph.textContent).toBe('prefixAlicesuffix');
        rerender(view(true));
        expect(fallback.hidden).toBe(true);
        expect(fallback.firstChild).toBe(chip);
        expect(paragraph.querySelector('b')).not.toBeNull();

        unmount();
        expect(host.childNodes).toHaveLength(0);
      } finally {
        unmount();
        host.remove();
      }
    }
  );
});
