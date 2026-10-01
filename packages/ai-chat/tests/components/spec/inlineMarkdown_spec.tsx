/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';

import { InlineMarkdown } from '../../../src/chat/components/helpers/InlineMarkdown/InlineMarkdown';

jest.mock('../../../src/chat/hooks/useIntl', () => ({
  useIntl: () => ({ formatMessage: () => '' }),
}));

import type MarkdownIt from 'markdown-it';
import { MessageRichUserContent } from '../../../src/chat/components-legacy/MessageRichUserContent';
import type { JSONContent } from '@tiptap/core';
import type { MessageRequest } from '../../../src/types/messaging/Messages';
import type { MarkdownConfig } from '../../../src/types/config/MarkdownConfig';
import actions from '../../../src/chat/store/actions';
import * as miscUtils from '../../../src/chat/utils/miscUtils';
import { StoreProvider } from '../../../src/chat/providers/StoreProvider';
import { makeConfigStore } from '../../test_helpers';

function renderInline(text: string) {
  return render(
    <StoreProvider store={makeConfigStore({})}>
      <div data-testid="root">
        <InlineMarkdown text={text} />
      </div>
    </StoreProvider>
  );
}

describe('renderInlineMarkdown', () => {
  it('renders nothing for empty input', () => {
    const { getByTestId } = renderInline('');
    expect(getByTestId('root').textContent).toBe('');
    expect(getByTestId('root').querySelector('span').childElementCount).toBe(0);
  });

  it('renders plain text unchanged', () => {
    const { getByTestId } = renderInline('hello there');
    expect(getByTestId('root').textContent).toBe('hello there');
  });

  it('emits <strong> for **bold**', () => {
    const { getByTestId } = renderInline('a **bold** word');
    const root = getByTestId('root');
    const strong = root.querySelector('strong');
    expect(strong?.textContent).toBe('bold');
    expect(root.textContent).toBe('a bold word');
  });

  it('emits <em> for *italic*', () => {
    const { getByTestId } = renderInline('an *em* word');
    expect(getByTestId('root').querySelector('em')?.textContent).toBe('em');
  });

  it('emits <code> for `inline code`', () => {
    const { getByTestId } = renderInline('run `npm install`');
    expect(getByTestId('root').querySelector('code')?.textContent).toBe(
      'npm install'
    );
  });

  it('emits <s> for ~~strike~~', () => {
    const { getByTestId } = renderInline('a ~~strike~~');
    expect(getByTestId('root').querySelector('s')?.textContent).toBe('strike');
  });

  it('emits <mark> for ==highlight==', () => {
    const { getByTestId } = renderInline('a ==marked== word');
    const root = getByTestId('root');
    expect(root.querySelector('mark')?.textContent).toBe('marked');
    expect(root.textContent).toBe('a marked word');
  });

  it('emits <a target=_blank rel=noopener> for links', () => {
    const { getByTestId } = renderInline('see [docs](https://example.com)');
    const a = getByTestId('root').querySelector('a');
    expect(a?.getAttribute('href')).toBe('https://example.com');
    expect(a?.getAttribute('target')).toBe('_blank');
    expect(a?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(a?.textContent).toBe('docs');
  });

  it('renders a soft break (single newline) as <br>', () => {
    const { container } = renderInline('one\ntwo');
    const root = container.querySelector('[data-testid=root]');
    expect(root?.querySelectorAll('br')).toHaveLength(1);
    // Exact text, not `toContain`: a half-fix that emitted the <br> and kept
    // the old space Fragment would render the same two lines and still pass.
    expect(root?.textContent).toBe('onetwo');
  });

  it('renders a hard break (two trailing spaces + newline) as <br>', () => {
    const { container } = renderInline('one  \ntwo');
    const root = container.querySelector('[data-testid=root]');
    expect(root?.querySelectorAll('br')).toHaveLength(1);
  });

  it('strips raw HTML (removeHTML=true at tokenize time)', () => {
    // Malicious-ish input: an inline <img> tag with onerror. With HTML disabled
    // in the tokenizer, the parser keeps the raw `<` text but does not produce
    // an html_inline token, so React renders the literal characters.
    const { getByTestId } = renderInline(
      'before<img src=x onerror=alert(1)>after'
    );
    const root = getByTestId('root');
    // No real <img> element should be present.
    expect(root.querySelector('img')).toBeNull();
    // Text content keeps the literal characters.
    expect(root.textContent).toContain('alert(1)');
  });
  it('keeps complete block input as escaped fallback text', () => {
    const source = '\nfirst\n\nsecond\n';
    const { getByTestId } = renderInline(source);
    expect(getByTestId('root').textContent).toBe(source);
  });
});

describe('InlineMarkdown bridge', () => {
  const pluginOutput = jest.fn(
    () => '<span onclick="bad()" data-plugin="yes">plugin</span>'
  );
  const plugin = (md: MarkdownIt) => {
    md.renderer.rules.code_inline = pluginOutput;
  };
  const mounts: CustomEvent[] = [];
  const onMount = (event: Event) => {
    mounts.push(event as CustomEvent);
  };
  let diagnostic: jest.SpyInstance;
  beforeEach(() => {
    pluginOutput.mockClear();
    mounts.length = 0;
    diagnostic = jest
      .spyOn(miscUtils, 'consoleError')
      .mockImplementation(() => {});
    document.addEventListener('cds-aichat-markdown-plugin-host-mount', onMount);
  });
  afterEach(() => {
    diagnostic.mockRestore();
    document.removeEventListener(
      'cds-aichat-markdown-plugin-host-mount',
      onMount
    );
  });

  function setup(text: string, config?: MarkdownConfig, strict = false) {
    const store = makeConfigStore({ shouldSanitizeHTML: false });
    store.dispatch(actions.setAppStateValue('markdownConfig', config));
    const tree = (source: string) => {
      const content = (
        <StoreProvider store={store}>
          <InlineMarkdown text={source} preserveBoundaryWhitespace />
        </StoreProvider>
      );
      return strict ? <React.StrictMode>{content}</React.StrictMode> : content;
    };
    const result = render(tree(text));
    return {
      ...result,
      store,
      update: (source: string) => result.rerender(tree(source)),
    };
  }

  it('runs padded link and plugin renderers once and projects sanitized output', async () => {
    const click = jest.fn((event: MouseEvent) => event.preventDefault());
    const link = jest.fn(() => ({ href: '#host', onClick: click }));
    const image = jest.fn(() => ({
      src: 'https://example.com/host.png',
      attributes: { alt: 'host image' },
    }));
    const { container } = setup(
      ' `code` [link](#old) ![old](https://example.com/old.png) ',
      { markdownItPlugins: [plugin], customRenderers: { link, image } }
    );
    await act(async () => {});
    expect(link).toHaveBeenCalledTimes(1);
    expect(image).toHaveBeenCalledTimes(1);
    expect(pluginOutput).toHaveBeenCalledTimes(1);
    expect(container.querySelector('slot')).not.toBeNull();
    expect(mounts).toHaveLength(1);
    expect(mounts[0].detail.html).toContain('data-plugin="yes"');
    expect(mounts[0].detail.html).not.toContain('onclick');
    expect(container.querySelector('a').getAttribute('href')).toBe('#host');
    expect(container.querySelector('img').getAttribute('alt')).toBe(
      'host image'
    );
    fireEvent.click(container.querySelector('a'));
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('uses host plugins in chip-bearing runs and textual sibling paragraphs', async () => {
    const content: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: '`first` ' },
            { type: 'mention', attrs: { id: 'alice', label: 'Alice' } },
          ],
        },
        { type: 'paragraph', content: [{ type: 'text', text: '`second`' }] },
      ],
    };
    const store = makeConfigStore({});
    store.dispatch(
      actions.setAppStateValue('markdownConfig', {
        markdownItPlugins: [plugin],
      })
    );
    const { container } = render(
      <StoreProvider store={store}>
        <MessageRichUserContent
          content={content}
          message={{ id: 'mixed', input: { text: '' } } as MessageRequest}
        />
      </StoreProvider>
    );
    await act(async () => {});
    expect(container.querySelectorAll('p')).toHaveLength(2);
    expect(container.querySelectorAll('p slot')).toHaveLength(2);
    expect(mounts).toHaveLength(2);
    expect(pluginOutput).toHaveBeenCalledTimes(2);
  });

  it('replaces host callbacks after config changes', () => {
    const oldClick = jest.fn((event: MouseEvent) => event.preventDefault());
    const newClick = jest.fn((event: MouseEvent) => event.preventDefault());
    const { container, store } = setup('[link](#old)', {
      customRenderers: { link: () => ({ onClick: oldClick }) },
    });
    act(() =>
      store.dispatch(
        actions.setAppStateValue('markdownConfig', {
          customRenderers: {
            link: () => ({ href: '#new', onClick: newClick }),
          },
        })
      )
    );
    fireEvent.click(container.querySelector('a'));
    expect(oldClick).not.toHaveBeenCalled();
    expect(newClick).toHaveBeenCalledTimes(1);
    expect(container.querySelector('a').getAttribute('href')).toBe('#new');
  });

  it.each([
    '\nfirst\n\nsecond\n',
    '    indented code',
    '<img onerror="bad()">\n\nsecond',
  ])(
    'keeps complete failed source %p and reports once per update',
    (source) => {
      const { container, update } = setup(source, undefined, true);
      expect(container.textContent).toBe(source);
      expect(
        container.querySelector('.cds-aichat--inline-markdown-fallback')
      ).not.toBeNull();
      expect(container.querySelector('img')).toBeNull();
      expect(diagnostic).toHaveBeenCalledTimes(1);
      expect(diagnostic.mock.calls[0][0]).toContain('block-content');
      expect(JSON.stringify(diagnostic.mock.calls)).not.toContain(source);
      update(source);
      expect(diagnostic).toHaveBeenCalledTimes(1);
      update('**restored**');
      expect(container.querySelector('strong').textContent).toBe('restored');
      expect(
        container.querySelector('.cds-aichat--inline-markdown-fallback')
      ).toBeNull();
      update(source);
      expect(diagnostic).toHaveBeenCalledTimes(2);
    }
  );

  it('falls back for callback exceptions and block plugin output', () => {
    const { container, store, update } = setup('[secret](#link)', {
      customRenderers: {
        link: () => {
          throw new Error('secret');
        },
      },
    });
    expect(container.textContent).toBe('[secret](#link)');
    expect(diagnostic.mock.calls[0][0]).toContain('(Error)');
    expect(JSON.stringify(diagnostic.mock.calls)).not.toContain('secret');
    act(() =>
      store.dispatch(
        actions.setAppStateValue('markdownConfig', {
          markdownItPlugins: [
            (md: MarkdownIt) => {
              md.renderer.rules.code_inline = () => '<div>block</div>';
            },
          ],
        })
      )
    );
    update('`source`');
    expect(container.textContent).toBe('`source`');
    expect(container.querySelector('div')).toBeNull();
  });

  it('disconnects projected plugins on update, empty input, and Strict Mode unmount', async () => {
    const unmount = jest.fn();
    document.addEventListener(
      'cds-aichat-markdown-plugin-host-unmount',
      unmount
    );
    const result = setup('`one`', { markdownItPlugins: [plugin] }, true);
    await act(async () => {});
    expect(result.container.querySelectorAll('slot')).toHaveLength(1);
    expect(mounts).toHaveLength(1);
    result.update('`two`');
    await act(async () => {});
    expect(mounts).toHaveLength(2);
    expect(unmount).toHaveBeenCalledTimes(1);
    result.update('');
    expect(result.container.textContent).toBe('');
    expect(unmount).toHaveBeenCalledTimes(2);
    result.update('`three`');
    await act(async () => {});
    result.unmount();
    expect(unmount).toHaveBeenCalledTimes(3);
    document.removeEventListener(
      'cds-aichat-markdown-plugin-host-unmount',
      unmount
    );
  });
});
