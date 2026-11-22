// @vitest-environment jsdom
// happy-dom 21 leaves javascript: URLs and inline handlers in DOMPurify's output.
/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import type { JSONContent } from '@tiptap/core';
import type MarkdownIt from 'markdown-it';
import {
  PageObjectId,
  type ChatInstance,
  type ChatContainerProps,
  type PublicConfig,
} from '../../../aiChatEntry';
import {
  allByRole,
  byRole,
  click,
  contractChat,
  contractSetup,
  flatChildren,
  getByTestId,
  isHidden,
  shownText,
  textResponse,
} from '../helpers/contract';

const transport: NonNullable<
  NonNullable<PublicConfig['messaging']>['customSendMessage']
> = async (request, _options, instance) => {
  await instance.messaging.addMessage(
    textResponse('Fixture acknowledged', `ack-${request.id}`, {
      request_id: request.id,
    })
  );
};

function props(
  config: Partial<ChatContainerProps> = {}
): Partial<ChatContainerProps> {
  return {
    openChatByDefault: true,
    messaging: { skipWelcome: true, customSendMessage: transport },
    ...config,
  };
}

function text(value: string): JSONContent {
  return { type: 'text', text: value };
}

function paragraph(...content: JSONContent[]): JSONContent {
  return { type: 'paragraph', content };
}

const ALICE: JSONContent = {
  type: 'mention',
  attrs: { id: 'alice', label: 'Alice' },
};
const DEPLOY: JSONContent = {
  type: 'command',
  attrs: { id: 'deploy', label: 'deploy' },
};
const BREAK: JSONContent = { type: 'hardBreak' };

async function sendRich(
  instance: ChatInstance,
  id: string,
  ...content: JSONContent[]
): Promise<void> {
  await act(() =>
    instance.messaging.send({
      id,
      input: { text: id, display_content: { type: 'doc', content } },
    })
  );
}

function elements(root: Node): Element[] {
  if (root instanceof Element && isHidden(root)) {
    return [];
  }
  return [
    ...(root instanceof Element ? [root] : []),
    ...flatChildren(root).flatMap(elements),
  ];
}

function requestContaining(marker: string): Element {
  const matches = elements(getByTestId(PageObjectId.MAIN_PANEL)).filter(
    (element) =>
      element.getAttribute('role') === 'heading' &&
      shownText(element).includes(marker)
  );
  if (matches.length !== 1) {
    throw new Error(`Expected one user message containing ${marker}`);
  }
  return matches[0];
}

function tags(root: Node, name: string): Element[] {
  return elements(root).filter((element) => element.localName === name);
}

// Projected inline runs leave fallback DOM under their slot. Read only the
// assigned flat tree, so the inactive fallback cannot duplicate a live link.
function link(name: string): HTMLElement {
  const visible = new Set(elements(getByTestId(PageObjectId.MAIN_PANEL)));
  const matches = allByRole('link', name).filter((node) => visible.has(node));
  if (matches.length !== 1) {
    throw new Error(
      `Expected one projected link named ${name}, found ${matches.length}`
    );
  }
  return matches[0];
}

function diagnosticText(calls: unknown[][]): string {
  return JSON.stringify(calls, (_key, value) =>
    value instanceof Error
      ? { name: value.name, message: value.message, stack: value.stack }
      : value
  );
}

describe('public app markdown policy', () => {
  contractSetup();

  it('keeps rich user HTML inert and sanitizes plugin output when assistant HTML is trusted', async () => {
    const plugin = (md: MarkdownIt): void => {
      md.renderer.rules.code_inline = (tokens, index) => {
        const label = md.utils.escapeHtml(tokens[index].content);
        return `<span role="img" aria-label="Plugin ${label}" onclick="bad()">Plugin ${label}</span>`;
      };
    };
    const mount = await contractChat(
      props({
        shouldSanitizeHTML: false,
        markdown: { markdownItPlugins: [plugin] },
      })
    );
    try {
      await sendRich(
        mount.instance,
        'rich-safe',
        paragraph(
          text(
            'Before <img src=x onerror="bad()"> `chip-run` [Safe docs](https://docs.example.test) '
          ),
          ALICE
        ),
        paragraph(
          text(
            '`text-run` [Projected docs](https://projection.example.test) after'
          )
        )
      );
      await waitFor(() => {
        expect(byRole('img', 'Plugin chip-run')).not.toBeNull();
        expect(byRole('img', 'Plugin text-run')).not.toBeNull();
        expect(link('Projected docs')).not.toBeNull();
      });
      const request = requestContaining('Before');
      expect(tags(request, 'img')).toHaveLength(0);
      expect(shownText(request)).toContain('<img src=x onerror="bad()">');
      for (const label of ['Plugin chip-run', 'Plugin text-run']) {
        expect(byRole('img', label).getAttribute('onclick')).toBeNull();
      }
      expect(link('Safe docs').getAttribute('href')).toBe(
        'https://docs.example.test'
      );
      expect(link('Safe docs').getAttribute('target')).toBe('_blank');
      expect(link('Safe docs').getAttribute('rel')).toBe('noopener noreferrer');
      expect(link('Projected docs').getAttribute('href')).toBe(
        'https://projection.example.test'
      );
      expect(link('Projected docs').getAttribute('target')).toBe('_blank');
      expect(link('Projected docs').getAttribute('rel')).toBe(
        'noopener noreferrer'
      );
    } finally {
      await act(async () => mount.unmount());
    }
    expect(allByRole('img', 'Plugin chip-run')).toHaveLength(0);
    expect(allByRole('img', 'Plugin text-run')).toHaveLength(0);
  });

  it('adopts current inline link callbacks while preserving a consumer rel override', async () => {
    const oldClicks: MouseEvent[] = [];
    const newClicks: MouseEvent[] = [];
    const plugin = (md: MarkdownIt): void => {
      md.renderer.rules.code_inline = () => '<span>marker</span>';
    };
    const config = (next: boolean) =>
      props({
        markdown: {
          markdownItPlugins: [plugin],
          customRenderers: {
            link: () => ({
              href: next ? '#after' : '#before',
              rel: 'author',
              onClick: (event: MouseEvent): void => {
                event.preventDefault();
                (next ? newClicks : oldClicks).push(event);
              },
            }),
          },
        },
      });
    const mount = await contractChat(config(false));
    try {
      await sendRich(
        mount.instance,
        'link-update',
        paragraph(ALICE),
        paragraph(text('`marker` [Current docs](#source)'))
      );
      await waitFor(() =>
        expect(link('Current docs').getAttribute('href')).toBe('#before')
      );
      expect(link('Current docs').getAttribute('rel')).toBe('author');
      await click(link('Current docs'));
      expect(oldClicks).toHaveLength(1);
      expect(oldClicks[0].defaultPrevented).toBe(true);
      await mount.rerender(config(true));
      await waitFor(() =>
        expect(link('Current docs').getAttribute('href')).toBe('#after')
      );
      await click(link('Current docs'));
      expect(oldClicks).toHaveLength(1);
      expect(newClicks).toHaveLength(1);
      expect(newClicks[0].defaultPrevented).toBe(true);
      expect(link('Current docs').getAttribute('rel')).toBe('author');
    } finally {
      await act(async () => mount.unmount());
    }
  });

  it('shows a complete rejected inline source without leaking its private text in diagnostics', async () => {
    const source =
      '\nPRIVATE_INLINE_BLOCK <img src=x onerror="bad()">\n\nsecond\n';
    const mount = await contractChat(props({ shouldSanitizeHTML: false }));
    const diagnostic = vi.spyOn(console, 'error');
    try {
      await sendRich(
        mount.instance,
        'inline-block',
        paragraph(text(source), ALICE)
      );
      await waitFor(() =>
        expect(shownText(requestContaining('PRIVATE_INLINE_BLOCK'))).toContain(
          source
        )
      );
      const request = requestContaining('PRIVATE_INLINE_BLOCK');
      expect(tags(request, 'img')).toHaveLength(0);
      expect(shownText(request)).toContain('Alice');
      const fallback = elements(request).find(
        (element) =>
          element instanceof HTMLElement &&
          element.style.whiteSpace === 'pre-wrap'
      );
      expect(fallback).toBeDefined();
      expect(diagnosticText(diagnostic.mock.calls)).toContain('block-content');
      expect(diagnosticText(diagnostic.mock.calls)).not.toContain(
        'PRIVATE_INLINE_BLOCK'
      );
    } finally {
      await act(async () => mount.unmount());
      diagnostic.mockRestore();
    }
  });

  it('recovers a rich link after a throwing host renderer is removed without logging its secret', async () => {
    const source =
      'See [PRIVATE_CALLBACK_SOURCE](https://secret.example.test) ';
    const mount = await contractChat(
      props({
        markdown: {
          customRenderers: {
            link: () => {
              throw new Error('PRIVATE_CALLBACK_ERROR');
            },
          },
        },
      })
    );
    const diagnostic = vi.spyOn(console, 'error');
    try {
      await sendRich(
        mount.instance,
        'callback-recovery',
        paragraph(text(source), ALICE)
      );
      await waitFor(() =>
        expect(
          shownText(requestContaining('PRIVATE_CALLBACK_SOURCE'))
        ).toContain(source)
      );
      expect(allByRole('link', 'PRIVATE_CALLBACK_SOURCE')).toHaveLength(0);
      expect(diagnosticText(diagnostic.mock.calls)).toContain('(Error)');
      expect(diagnosticText(diagnostic.mock.calls)).not.toContain(
        'PRIVATE_CALLBACK_SOURCE'
      );
      expect(diagnosticText(diagnostic.mock.calls)).not.toContain(
        'PRIVATE_CALLBACK_ERROR'
      );
      await mount.rerender(props());
      await waitFor(() =>
        expect(link('PRIVATE_CALLBACK_SOURCE').getAttribute('href')).toBe(
          'https://secret.example.test'
        )
      );
      expect(shownText(requestContaining('PRIVATE_CALLBACK_SOURCE'))).toContain(
        'See PRIVATE_CALLBACK_SOURCE Alice'
      );
    } finally {
      await act(async () => mount.unmount());
      diagnostic.mockRestore();
    }
  });

  it('preserves sent text and meaningful line breaks around real chips and on the text-only path', async () => {
    const mount = await contractChat(props());
    try {
      await sendRich(
        mount.instance,
        'plain-lines',
        paragraph(text('Plain '), text('two'), BREAK, text('lines'))
      );
      await waitFor(() =>
        expect(shownText(requestContaining('Plain')).trim()).toBe(
          'Plain twolines'
        )
      );
      expect(tags(requestContaining('Plain'), 'br')).toHaveLength(1);
      await sendRich(
        mount.instance,
        'rich-lines',
        paragraph(
          text('Before '),
          ALICE,
          text(' do **this** now '),
          DEPLOY,
          text(' end')
        ),
        paragraph(
          text(' \n'),
          ALICE,
          text(' \n middle '),
          DEPLOY,
          text('\n tail\n ')
        ),
        paragraph(text('one'), BREAK, ALICE, BREAK, text('two'))
      );
      await waitFor(() =>
        expect(shownText(requestContaining('Before'))).toContain(
          'Before Alice do this now deploy end'
        )
      );
      const paragraphs = tags(requestContaining('Before'), 'p');
      expect(paragraphs.map(shownText)).toEqual([
        'Before Alice do this now deploy end',
        'Alice  middle deploy tail',
        'oneAlicetwo',
      ]);
      expect(paragraphs.map((item) => tags(item, 'br').length)).toEqual([
        0, 2, 2,
      ]);
      expect(tags(paragraphs[0], 'strong')[0].textContent).toBe('this');
    } finally {
      await act(async () => mount.unmount());
    }
  });

  it('forwards app code and table labels and uses the configured locale for table sorting', async () => {
    const mount = await contractChat(
      props({
        locale: 'sv',
        strings: {
          codeSnippet_tooltipContent: 'Copy fixture',
          codeSnippet_ariaLabelReadOnly: 'Fixture code',
          codeSnippet_lineCount: '{count} fixture lines',
          table_filterPlaceholder: 'Filter fixture rows',
        },
      })
    );
    try {
      await act(() =>
        mount.instance.messaging.addMessage(
          textResponse(
            '```text\nalpha\nbeta\n```\n\n| Letter |\n| --- |\n| ä |\n| z |\n| a |',
            'localized-markdown'
          )
        )
      );
      const panel = getByTestId(PageObjectId.MAIN_PANEL);
      await waitFor(() => {
        expect(byRole('button', 'Copy fixture')).not.toBeNull();
        expect(byRole('textbox', 'Fixture code')).not.toBeNull();
        expect(byRole('search', 'Filter fixture rows')).not.toBeNull();
        expect(shownText(panel)).toMatch(/\d+ fixture lines/);
        expect(byRole('columnheader', 'Letter')).not.toBeNull();
        expect(
          byRole('button', 'Letter', byRole('columnheader', 'Letter'))
        ).not.toBeNull();
      });
      const cellOrder = () => {
        const cells = new Set<Element>(
          ['ä', 'z', 'a'].map((label) => byRole('cell', label, panel))
        );
        return elements(panel)
          .filter((element) => cells.has(element))
          .map(shownText);
      };
      await waitFor(() => expect(cellOrder()).toEqual(['ä', 'z', 'a']));
      await click(byRole('button', 'Letter', byRole('columnheader', 'Letter')));
      await waitFor(() => expect(cellOrder()).toEqual(['a', 'z', 'ä']));
    } finally {
      await act(async () => mount.unmount());
    }
  });
});
