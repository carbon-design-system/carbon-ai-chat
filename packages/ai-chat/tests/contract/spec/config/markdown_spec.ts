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
  ChatInstance,
  MarkdownItPlugin,
  PublicConfig,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  allByRole,
  changeView,
  contractChat,
  contractElement,
  contractSetup,
  fakeBackend,
  finishSend,
  instanceSender,
  mainPanelText,
  responseOf,
  startSend,
  textItem,
} from '../../helpers';

/** The markdown-it instance a plugin gets, as far as these plugins use it. */
interface MarkdownIt {
  core: {
    ruler: {
      push(name: string, rule: (state: { tokens: Token[] }) => void): void;
    };
  };
  renderer: {
    rules: Record<string, (tokens: Token[], index: number) => string>;
  };
}

interface Token {
  type: string;
  content: string;
  children: Token[] | null;
}

let ruleCount = 0;

/**
 * A plugin that rewrites `from` to `to` in every text token. Each use gets a
 * rule of its own, so two uses run one after the other.
 */
function rewrite(md: MarkdownIt, from = 'PLUGIN_ME', to = 'Plugin ran'): void {
  ruleCount += 1;
  md.core.ruler.push(`contract_rewrite_${ruleCount}`, (state) => {
    for (const token of state.tokens) {
      for (const child of token.children ?? []) {
        if (child.type === 'text') {
          child.content = child.content.split(from).join(to);
        }
      }
    }
  });
}

/** The same rewrite, taking a `{ from, to }` options object. */
function rewriteWithOptions(
  md: MarkdownIt,
  options: { from: string; to: string }
): void {
  rewrite(md, options.from, options.to);
}

/** A plugin that renders inline code as a link to it. */
function codeAsLink(md: MarkdownIt): void {
  md.renderer.rules.code_inline = (tokens, index) => {
    const { content } = tokens[index];
    return `<a href="https://example.com/${encodeURIComponent(content)}">${content}</a>`;
  };
}

const asPlugins = (...plugins: unknown[]) => plugins as MarkdownItPlugin[];

/** Mounts a chat with this config and opens the main window. */
async function openChat(config: Partial<PublicConfig> = {}) {
  const mount = await contractChat({
    ...config,
    messaging: { skipWelcome: true, ...config.messaging },
  });
  await changeView(mount.instance, ViewType.MAIN_WINDOW);
  return mount;
}

/** Adds an assistant response with one text item, and waits for `shown`. */
async function addText(
  instance: ChatInstance,
  text: string,
  shown: string
): Promise<void> {
  await act(() =>
    instance.messaging.addMessage(responseOf('r1', [textItem(text)]))
  );
  await waitFor(() => expect(mainPanelText()).toContain(shown));
}

// @covers config.markdown
describe('markdown: with no config', () => {
  contractSetup();

  it('renders assistant markdown, showing the text without its markup', async () => {
    const { instance } = await openChat();
    await addText(
      instance,
      'Say **PLUGIN_ME** and [the docs](https://example.com)',
      'PLUGIN_ME'
    );
    expect(mainPanelText()).toContain('Say PLUGIN_ME and the docs');
    expect(mainPanelText()).not.toContain('**');
    expect(allByRole('link', 'the docs')).toHaveLength(1);
  });
});

// @covers config.markdown config.markdown.markdownItPlugins
describe('markdown: markdownItPlugins', () => {
  contractSetup();

  it('runs a bare plugin function on assistant text', async () => {
    const { instance } = await openChat({
      markdown: { markdownItPlugins: asPlugins(rewrite) },
    });
    await addText(
      instance,
      'Before PLUGIN_ME after',
      'Before Plugin ran after'
    );
    expect(mainPanelText()).not.toContain('PLUGIN_ME');
  });

  it('passes the options of a [plugin, options] entry to the plugin', async () => {
    const { instance } = await openChat({
      markdown: {
        markdownItPlugins: asPlugins([
          rewriteWithOptions,
          { from: 'PLUGIN_ME', to: 'Options ran' },
        ]),
      },
    });
    await addText(
      instance,
      'Before PLUGIN_ME after',
      'Before Options ran after'
    );
  });

  it('passes every parameter of a [plugin, ...params] entry to the plugin', async () => {
    const { instance } = await openChat({
      markdown: {
        markdownItPlugins: asPlugins([rewrite, 'PLUGIN_ME', 'Params ran']),
      },
    });
    await addText(
      instance,
      'Before PLUGIN_ME after',
      'Before Params ran after'
    );
  });

  it('runs plugins in array order', async () => {
    const { instance } = await openChat({
      markdown: {
        markdownItPlugins: asPlugins(
          [rewrite, 'PLUGIN_ME', 'STEP_TWO'],
          [rewrite, 'STEP_TWO', 'Both ran']
        ),
      },
    });
    await addText(instance, 'Before PLUGIN_ME after', 'Before Both ran after');
    expect(mainPanelText()).not.toContain('STEP_TWO');
  });

  it('draws what a plugin’s renderer rule returns', async () => {
    const { instance } = await openChat({
      markdown: { markdownItPlugins: asPlugins(codeAsLink) },
    });
    await addText(instance, 'See `contract-docs` here', 'contract-docs');
    expect(allByRole('link', 'contract-docs')).toHaveLength(1);
  });

  it('runs on the user’s own messages too', async () => {
    const backend = fakeBackend();
    const { instance } = await openChat({
      markdown: { markdownItPlugins: asPlugins(rewrite) },
      messaging: { customSendMessage: backend.customSendMessage },
    });
    const started = await startSend(
      instanceSender(instance, backend),
      'User says PLUGIN_ME'
    );
    await waitFor(() =>
      expect(mainPanelText()).toContain('User says Plugin ran')
    );
    await finishSend(started);
  });

  it('reaches a cds-aichat-container through its markdown property', async () => {
    const { instance } = await contractElement('cds-aichat-container', {
      properties: {
        messaging: { skipWelcome: true },
        markdown: { markdownItPlugins: asPlugins(rewrite) },
      },
    });
    await changeView(instance, ViewType.MAIN_WINDOW);
    await addText(
      instance,
      'Before PLUGIN_ME after',
      'Before Plugin ran after'
    );
  });
});
