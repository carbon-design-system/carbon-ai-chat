/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { waitFor } from '@testing-library/react';
import { deepQuerySelector } from '@carbon/ai-chat-components/es/globals/utils/dom-utils.js';
import type { PromptLineElement } from '@carbon/ai-chat-components/es/components/prompt-line/index.js';
import { Node } from '@tiptap/core';
import type { Extension } from '@tiptap/core';

import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from './helpers/chat';

const docFromText = (text: string) => ({
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text }],
    },
  ],
});

// A minimal inline atom node so a host can stage a custom node via
// `input.tiptap.extensions` and exercise the lazy lite -> rich upgrade.
const TestChip = Node.create({
  name: 'testChip',
  group: 'inline',
  inline: true,
  atom: true,
  parseHTML() {
    return [{ tag: 'span[data-test-chip]' }];
  },
  renderHTML() {
    return ['span', { 'data-test-chip': '' }];
  },
});

const chipDoc = () => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'testChip' }] }],
});

function configWithChip() {
  const config = createBaseConfig();
  config.input = {
    ...config.input,
    tiptap: { extensions: [TestChip as unknown as Extension] },
  };
  return config;
}

// The chat host renders behind nested shadow roots, so reach the prompt-line
// element with the deep query helper. Its own `getEditor()` is a probe that
// returns null in textarea mode and never triggers a Tiptap load.
async function getPromptLine(): Promise<PromptLineElement> {
  return waitFor(
    () => {
      const el = deepQuerySelector(document, 'cds-aichat-prompt-line');
      if (!el) {
        throw new Error('prompt-line not mounted');
      }
      return el as unknown as PromptLineElement;
    },
    { timeout: 5000 }
  );
}

describe('ChatInstance.input.updateContent (text-only)', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('plain-text writes stay in the textarea — no Tiptap load', async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const promptLine = await getPromptLine();

    await instance.input.updateContent(() => docFromText('hello'));

    expect(promptLine.getEditor()).toBeNull();
  });
});

describe('ChatInstance.input.updateContent (configured tiptap extension)', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('mounts the rich editor for a configured extension, with it installed', async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(configWithChip());
    const promptLine = await getPromptLine();

    // A configured tiptap extension forces rich (it may contribute input rules
    // / shortcuts that only run in a live editor), so the editor mounts without
    // a prior updateContent / getEditor call.
    await waitFor(() => {
      expect(promptLine.getEditor()).not.toBeNull();
    });

    await instance.input.updateContent(chipDoc);

    // The custom node survives because the editor mounted with the staged
    // extension installed in its schema.
    const editor = promptLine.getEditor();
    expect(editor).not.toBeNull();
    expect(JSON.stringify(editor.getJSON())).toContain('testChip');
  });
});
