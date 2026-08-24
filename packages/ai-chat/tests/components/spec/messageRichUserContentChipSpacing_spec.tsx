/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Regression tests for issue #2155: the sent message bubble was stripping
 * whitespace adjacent to mention/command chips.
 *
 * `renderParagraphInline` coalesces consecutive text nodes into a run and
 * flushes each run through `renderInlineMarkdown`. The block-level markdown
 * parser trims leading and trailing whitespace from each run, so spaces next
 * to a chip were eaten. The fix captures boundary whitespace before parsing
 * and re-emits it as plain text siblings.
 *
 * These tests compare the paragraph's rendered text content against the raw
 * text the user composed, so a regression fails on content rather than on
 * markup shape.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { JSONContent } from '@tiptap/core';

import { MessageRichUserContent } from '../../../src/chat/components-legacy/MessageRichUserContent';
import { StoreProvider } from '../../../src/chat/providers/StoreProvider';
import { createAppStore } from '../../../src/chat/store/appStore';
import type { MessageRequest } from '../../../src/types/messaging/Messages';

// `renderTokenChip` mounts a Lit web-component into a <span> via a useEffect.
// In jsdom those custom elements never upgrade, so the host span stays empty.
// We only care about the surrounding text content here, so a lightweight mock
// that renders the chip's label is enough to verify spacing.
jest.mock(
  '@carbon/ai-chat-components/es/components/prompt-line/index.js',
  () => ({
    renderTokenChip: ({ attrs }: { attrs: Record<string, string> }) => {
      const el = document.createElement('span');
      el.textContent = attrs.label ?? '';
      return el;
    },
  })
);

// The chip-free paragraph path goes through `MarkdownWithDefaults` which
// reads `state.languagePack` from a fully-seeded store. This spec focuses on
// the inline path, so stub the block-level renderer to a passthrough.
jest.mock(
  '../../../src/chat/components/helpers/MarkdownWithDefaults/MarkdownWithDefaults',
  () => ({
    MarkdownWithDefaults: ({ text }: { text: string }) =>
      React.createElement('span', { 'data-testid': 'markdown' }, text),
  })
);

function makeStore() {
  return createAppStore((state) => state, { config: { public: {} } } as never);
}

function messageWith(content: JSONContent): MessageRequest {
  return {
    id: 'msg-chip-spacing',
    input: { text: '', display_content: content },
  } as unknown as MessageRequest;
}

/** Return the text content of every <p> in the rendered bubble, joined. */
function renderedText(content: JSONContent): string {
  const { container } = render(
    <StoreProvider store={makeStore()}>
      <MessageRichUserContent
        content={content}
        message={messageWith(content)}
      />
    </StoreProvider>
  );
  return Array.from(container.querySelectorAll('p'))
    .map((p) => p.textContent ?? '')
    .join('');
}

describe('MessageRichUserContent chip spacing (issue #2155)', () => {
  it('@mention followed by text preserves the space before the text', () => {
    // Composed: "@Bob Chen hi!"
    const content: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'mention', attrs: { id: 'u1', label: 'Bob Chen' } },
            { type: 'text', text: ' hi!' },
          ],
        },
      ],
    };
    expect(renderedText(content)).toBe('Bob Chen hi!');
  });

  it('text followed by @mention preserves the space after the text', () => {
    // Composed: "hey @Bob Chen"
    const content: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'hey ' },
            { type: 'mention', attrs: { id: 'u1', label: 'Bob Chen' } },
          ],
        },
      ],
    };
    expect(renderedText(content)).toBe('hey Bob Chen');
  });

  it('text sandwiched between two chips keeps both spaces', () => {
    // Composed: "@Alice   @Bob Chen"
    const content: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'mention', attrs: { id: 'u1', label: 'Alice' } },
            { type: 'text', text: ' and ' },
            { type: 'mention', attrs: { id: 'u2', label: 'Bob Chen' } },
          ],
        },
      ],
    };
    expect(renderedText(content)).toBe('Alice and Bob Chen');
  });

  it('consecutive chips separated by a space keep the separator', () => {
    const content: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'mention', attrs: { id: 'u1', label: 'Alice' } },
            { type: 'text', text: ' ' },
            { type: 'mention', attrs: { id: 'u2', label: 'Bob Chen' } },
          ],
        },
      ],
    };
    expect(renderedText(content)).toBe('Alice Bob Chen');
  });

  it('inline markdown inside a run still renders (bold)', () => {
    const content: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'mention', attrs: { id: 'u1', label: 'Alice' } },
            { type: 'text', text: ' do **this** now' },
          ],
        },
      ],
    };
    const { container } = render(
      <StoreProvider store={makeStore()}>
        <MessageRichUserContent
          content={content}
          message={messageWith(content)}
        />
      </StoreProvider>
    );
    const para = container.querySelector('p');
    expect(para?.textContent).toBe('Alice do this now');
    expect(para?.querySelector('strong')?.textContent).toBe('this');
  });

  it('chip-free paragraph path is unchanged', () => {
    // A doc with only text/hardBreak nodes goes through the allTextual fast
    // path — it bypasses renderParagraphInline entirely and passes the joined
    // text to MarkdownWithDefaults. The whitespace fix must not affect it.
    const content: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'just text ' },
            { type: 'text', text: 'no chips' },
          ],
        },
      ],
    };
    const { getByTestId } = render(
      <StoreProvider store={makeStore()}>
        <MessageRichUserContent
          content={content}
          message={messageWith(content)}
        />
      </StoreProvider>
    );
    // The stub renders the flattened text inside a data-testid="markdown" span.
    expect(getByTestId('markdown').textContent).toBe('just text no chips');
  });

  it('command chip preserves surrounding spaces', () => {
    const content: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'run ' },
            { type: 'command', attrs: { id: 'c1', label: 'deploy' } },
            { type: 'text', text: ' now' },
          ],
        },
      ],
    };
    expect(renderedText(content)).toBe('run deploy now');
  });
});
