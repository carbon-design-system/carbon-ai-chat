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
  MarkdownItPlugin,
  PageObjectId,
  PublicConfig,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  allByRole,
  byRole,
  changeView,
  click,
  contractChat,
  contractSetup,
  fakeBackend,
  finishSend,
  getByTestId,
  instanceSender,
  responseOf,
  shownText,
  startSend,
  textItem,
} from '../../helpers';

/** Counts the clicks an inline `onclick` in rendered HTML makes. */
declare global {
  interface Window {
    contractClicks?: number;
  }
}

const RAW_HTML = [
  'Before',
  '<a href="javascript:void(0)">Contract raw link</a>',
  '<button onclick="window.contractClicks = (window.contractClicks || 0) + 1">Contract raw button</button>',
  '[Contract markdown link](https://example.com)',
  'after',
].join(' ');

/** The text the main message list shows, with whitespace collapsed. */
const listText = () =>
  shownText(getByTestId(PageObjectId.MAIN_PANEL)).replace(/\s+/g, ' ');

/** Mounts a chat with this config, opens it, and adds a response with `text`. */
async function showResponse(text: string, config: Partial<PublicConfig> = {}) {
  const mount = await contractChat({
    ...config,
    messaging: { skipWelcome: true, ...config.messaging },
  });
  await changeView(mount.instance, ViewType.MAIN_WINDOW);
  await act(() =>
    mount.instance.messaging.addMessage(responseOf('r1', [textItem(text)]))
  );
  await waitFor(() => expect(listText()).toContain('after'));
  return mount;
}

/** A plugin that renders inline code as a `javascript:` link. */
function codeAsScriptLink(md: {
  renderer: {
    rules: Record<string, (tokens: { content: string }[], i: number) => string>;
  };
}): void {
  md.renderer.rules.code_inline = (tokens, index) =>
    `<a href="javascript:void(0)">${tokens[index].content}</a>`;
}

// @covers config.shouldSanitizeHTML
describe('shouldSanitizeHTML', () => {
  contractSetup();
  afterEach(() => {
    delete window.contractClicks;
  });

  it.each([
    ['unset', {}],
    ['false', { shouldSanitizeHTML: false }],
  ])(
    'when %s, draws an assistant’s raw HTML as written, handlers included',
    async (_label, config) => {
      await showResponse(RAW_HTML, config);
      expect(allByRole('link', 'Contract raw link')).toHaveLength(1);
      await click(byRole('button', 'Contract raw button'));
      expect(window.contractClicks).toBe(1);
    }
  );

  it('when true, strips a javascript: link and an inline handler but keeps their text', async () => {
    await showResponse(RAW_HTML, { shouldSanitizeHTML: true });
    expect(listText()).toContain(
      'Before Contract raw link Contract raw button Contract markdown link after'
    );
    expect(allByRole('link', 'Contract raw link')).toHaveLength(0);
    await click(byRole('button', 'Contract raw button'));
    expect(window.contractClicks).toBeUndefined();
  });

  it('when true, keeps a markdown link a link', async () => {
    await showResponse(RAW_HTML, { shouldSanitizeHTML: true });
    expect(allByRole('link', 'Contract markdown link')).toHaveLength(1);
  });

  // @covers config.markdown.markdownItPlugins
  it.each([
    [true, 0],
    [false, 1],
  ])(
    'when %s, applies the same to HTML a markdown plugin renders (%s links)',
    async (shouldSanitizeHTML, links) => {
      await showResponse('See `Contract plugin link` after', {
        shouldSanitizeHTML,
        markdown: {
          markdownItPlugins: [
            codeAsScriptLink,
          ] as unknown as MarkdownItPlugin[],
        },
      });
      expect(listText()).toContain('See Contract plugin link after');
      expect(allByRole('link', 'Contract plugin link')).toHaveLength(links);
    }
  );

  it('when false, still never draws a user’s own message as HTML', async () => {
    const backend = fakeBackend();
    const mount = await contractChat({
      shouldSanitizeHTML: false,
      messaging: {
        skipWelcome: true,
        customSendMessage: backend.customSendMessage,
      },
    });
    await changeView(mount.instance, ViewType.MAIN_WINDOW);
    const started = await startSend(
      instanceSender(mount.instance, backend),
      'User <button onclick="window.contractClicks = 1">Contract user button</button> after'
    );
    await waitFor(() => expect(listText()).toContain('after'));
    expect(allByRole('button', 'Contract user button')).toHaveLength(0);
    await finishSend(started);
  });
});
