/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import { html, nothing, render } from 'lit';
import type { Editor } from '@tiptap/core';

import {
  PageObjectId,
  type ChatInstance,
  type SuggestionItem,
} from '../../../aiChatEntry';
import {
  allByRole,
  byRole,
  click,
  contractSetup,
  getByTestId,
  isShownWithin,
  openChat,
  openElement,
  pause,
} from '../helpers/contract';

const ALICE: SuggestionItem = { id: 'alice', label: 'Alice', value: '@alice' };

/**
 * A `renderCustomToken` that returns a new chip element on each call, and
 * keeps every chip it made so a test can see which ones are still on the
 * page.
 */
function tokenChips() {
  const made: HTMLElement[] = [];
  return {
    renderCustomToken: (item: SuggestionItem) => {
      const chip = document.createElement('span');
      chip.textContent = `Custom ${item.label}`;
      made.push(chip);
      return chip;
    },
    connected: () => made.filter((chip) => chip.isConnected),
    shownInInput: () =>
      made.filter((chip) =>
        isShownWithin(chip, getByTestId(PageObjectId.INPUT))
      ),
  };
}

/** Loads and focuses the chat's rich editor through the public handle. */
async function focusedEditor(instance: ChatInstance): Promise<Editor> {
  const editor = await act(async () => instance.input.getEditor());
  await act(async () => {
    editor.commands.focus();
  });
  return editor;
}

/**
 * Inserts text at the caret through the public editor handle. jsdom can't
 * type real keystrokes into the rich editor, so this stands in for typing.
 */
async function insert(editor: Editor, text: string): Promise<void> {
  await act(async () => {
    editor.commands.focus();
    editor.commands.insertContent(text);
  });
}

/** Waits for the suggestion option with this name, then clicks it. */
async function choose(name: string): Promise<void> {
  await waitFor(() => expect(allByRole('option', name)).toHaveLength(1));
  await click(byRole('option', name));
}

/** Waits for the browser's next animation frames to run, inside `act`. */
async function nextFrames(count: number): Promise<void> {
  for (let frame = 0; frame < count; frame++) {
    await act(async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    });
  }
}

// @covers config.input.mention
describe('public editor token hosts', () => {
  contractSetup();

  it('releases a renderCustomToken chip from page DOM when its token leaves the input, and shows one chip when it is chosen again', async () => {
    const chips = tokenChips();
    const { instance } = await openChat({
      input: {
        mention: {
          trigger: '@',
          items: [ALICE],
          renderCustomToken: chips.renderCustomToken,
        },
      },
    });
    const editor = await focusedEditor(instance);
    await insert(editor, '@al');
    await choose('Alice');
    await waitFor(() => {
      expect(chips.shownInInput()).toHaveLength(1);
      expect(chips.connected()).toHaveLength(1);
    });
    const [first] = chips.shownInInput();
    expect(first.getRootNode()).toBe(document);

    await act(async () => {
      editor.commands.clearContent(true);
    });
    await waitFor(() => expect(chips.connected()).toEqual([]));

    await insert(editor, '@al');
    await choose('Alice');
    await waitFor(() => {
      expect(chips.shownInInput()).toHaveLength(1);
      expect(chips.connected()).toEqual(chips.shownInInput());
    });
    expect(chips.shownInInput()).not.toContain(first);
  });

  it('keeps a renderCustomToken chip in the input when a Lit template clears the chat element’s trailing part', async () => {
    const chips = tokenChips();
    const { instance, element } = await openElement('cds-aichat-container', {
      input: {
        mention: {
          trigger: '@',
          items: [ALICE],
          renderCustomToken: chips.renderCustomToken,
        },
      },
    });
    await waitFor(() =>
      expect(instance.state.get().status).not.toBe('loading')
    );
    // Let the chat's startup focus land before the test types.
    await nextFrames(2);
    // The page renders its own content into the chat element with Lit. The
    // root part's marker goes after the element's current children and the
    // part runs to the end, so rendering nothing there clears every node
    // after the marker. (A part inside a template would stop at Lit's own end
    // marker, which a node appended after it outlives.)
    await act(async () => {
      render(html`<p>Banner</p>`, element);
    });
    expect(element.textContent).toContain('Banner');

    const editor = await focusedEditor(instance);
    await insert(editor, '@al');
    await choose('Alice');
    await waitFor(() => expect(chips.shownInInput()).toHaveLength(1));
    const [chip] = chips.shownInInput();

    await act(async () => {
      render(nothing, element);
    });
    // A short wait gives the chat a chance to react to the cleared part.
    await pause();

    expect(element.textContent).not.toContain('Banner');
    expect(chip.isConnected).toBe(true);
    expect(isShownWithin(chip, getByTestId(PageObjectId.INPUT))).toBe(true);
  });
});
