/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect } from '@open-wc/testing';
import { Editor, type Extension } from '@tiptap/core';
import DocumentNode from '@tiptap/extension-document';
import ParagraphNode from '@tiptap/extension-paragraph';
import TextNode from '@tiptap/extension-text';

import { buildCarbonExtensions } from '../build-extensions.js';
import type { TriggerChangeEventDetail } from '../types.js';

const ITEMS = [{ id: '1', label: 'Alice' }];

function makeEditor(extensions: Extension[]) {
  const mount = document.createElement('div');
  mount.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;';
  document.body.appendChild(mount);
  const editor = new Editor({
    element: mount,
    extensions: [DocumentNode, ParagraphNode, TextNode, ...extensions],
    content: '',
  });
  const events: (TriggerChangeEventDetail | null)[] = [];
  editor.view.dom.addEventListener('cds-aichat-trigger-change', (e) => {
    events.push((e as CustomEvent<TriggerChangeEventDetail | null>).detail);
  });
  return {
    editor,
    events,
    cleanup: () => {
      editor.destroy();
      mount.remove();
    },
  };
}

describe('buildCarbonExtensions — trigger coexistence', function () {
  it('mention trigger fires as "mention" when autocomplete is also enabled', () => {
    const extensions = buildCarbonExtensions({
      mention: { trigger: '@', items: ITEMS },
      autocomplete: { items: ITEMS },
    });
    const { editor, events, cleanup } = makeEditor(
      extensions as unknown as Extension[]
    );

    // Typing plain text first — should produce an autocomplete trigger.
    editor.commands.insertContent('hello');
    const afterPlain = events[events.length - 1];
    expect(afterPlain?.type).to.equal('autocomplete');

    // Clear and type a mention trigger.
    editor.commands.clearContent();
    events.length = 0;
    editor.commands.insertContent('@');

    const last = events[events.length - 1];
    expect(last?.type).to.equal(
      'mention',
      'Expected mention trigger, got ' + last?.type
    );
    cleanup();
  });

  it('command trigger fires as "command" when autocomplete is also enabled — but only at start of input', () => {
    const extensions = buildCarbonExtensions({
      command: { trigger: '/', triggerPosition: 'start', items: ITEMS },
      autocomplete: { items: ITEMS },
    });
    const { editor, events, cleanup } = makeEditor(
      extensions as unknown as Extension[]
    );

    // '/' at the very start of input must open the command picker.
    editor.commands.insertContent('/');
    const atStart = events[events.length - 1];
    expect(atStart?.type).to.equal(
      'command',
      'Expected command trigger at start, got ' + atStart?.type
    );

    // '/' mid-sentence must NOT open the command picker — autocomplete wins.
    editor.commands.clearContent();
    events.length = 0;
    editor.commands.insertContent('some /');

    const midSentence = events[events.length - 1];
    expect(midSentence?.type).to.equal(
      'autocomplete',
      'Expected autocomplete mid-sentence, got ' + midSentence?.type
    );
    cleanup();
  });
});
