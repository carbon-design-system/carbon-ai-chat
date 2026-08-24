/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect } from '@open-wc/testing';
import { Editor } from '@tiptap/core';
import DocumentNode from '@tiptap/extension-document';
import ParagraphNode from '@tiptap/extension-paragraph';
import TextNode from '@tiptap/extension-text';

import { carbonStarterTrigger } from '../carbon-starter-trigger.js';
import type { TriggerChangeEventDetail } from '../types.js';

const ITEMS = [
  { id: '1', label: 'Say hello' },
  { id: '2', label: 'Introduce yourself' },
];

function makeEditor(items = ITEMS) {
  const mount = document.createElement('div');
  // Must be in the document and have layout for focus() to work.
  mount.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;';
  document.body.appendChild(mount);
  const editor = new Editor({
    element: mount,
    extensions: [
      DocumentNode,
      ParagraphNode,
      TextNode,
      carbonStarterTrigger(items),
    ],
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

function flushMacrotask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve));
}

describe('tiptap/carbon-starter-trigger', function () {
  it('emits a starter trigger when the editor is focused and empty', () => {
    const { editor, events, cleanup } = makeEditor();

    editor.view.dom.focus();

    const last = events[events.length - 1];
    expect(last).to.deep.equal({
      type: 'starter',
      query: '',
      triggerOffset: 0,
    });
    cleanup();
  });

  it('stays silent while the list is empty', () => {
    // `buildCarbonExtensions` installs the extension for an empty list so that
    // emptying `items` is a storage write rather than an editor recreate. The
    // emission stays gated on the list, or those hosts get a starter trigger
    // with nothing behind it.
    const { editor, events, cleanup } = makeEditor([]);

    editor.view.dom.focus();

    expect(events).to.have.lengthOf(0);
    cleanup();
  });

  it('emits null when the editor has content', () => {
    const { editor, events, cleanup } = makeEditor();

    editor.view.dom.focus();
    editor.commands.insertContent('hello');
    // onUpdate fires synchronously — editor is not empty, null is dispatched.

    const last = events[events.length - 1];
    expect(last).to.equal(null);
    cleanup();
  });

  it("does not dismiss on blur — blur dismissal is the controller's responsibility", async () => {
    // Tiptap's onBlur fires transiently on every click (ProseMirror
    // blur/refocus cycle), so the trigger cannot use it reliably.
    // Genuine blur-to-dismiss is handled by
    // AutocompleteController._handleEditorFocusOut instead.
    const { editor, events, cleanup } = makeEditor();

    editor.view.dom.focus();
    events.length = 0;

    editor.view.dom.blur();
    await flushMacrotask();

    // No null should be emitted by the trigger itself on blur.
    const nullEvents = events.filter((e) => e === null);
    expect(nullEvents.length).to.equal(0);
    cleanup();
  });
});
