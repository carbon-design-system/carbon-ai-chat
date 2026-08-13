/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * End-to-end coverage for issue #2152, driving the whole path the bug took: a
 * React config prop change → `mergePublicConfig` → `createAppConfig` →
 * reference reconciliation → the input hooks → the prompt-line element. The
 * store-level specs pin each seam; this asserts the user-visible outcome, that
 * typing survives a config update with its undo history intact.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { Editor } from '@tiptap/core';

import { ChatContainer } from '../../../src/react/ChatContainer';
import {
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import type { PublicConfig } from '../../../src/types/config/PublicConfig';

// Held as module constants exactly like the reproducing example app, so any
// churn observed downstream originates in the framework, not the host.
const STARTER_ITEMS = [
  { id: 's1', label: 'Summarize this' },
  { id: 's2', label: 'Draft an email' },
];
const PEOPLE = [{ id: 'u1', label: 'Alice' }];

function buildConfig(inputHasText: boolean): PublicConfig {
  return {
    ...createBaseConfig(),
    input: {
      starters: { items: STARTER_ITEMS, isOn: true },
      actions: [
        {
          text: inputHasText ? 'Hide starters' : 'Show starters',
          icon: {},
          onClick: (): void => undefined,
          // The example ties this to whether the user has typed, so the first
          // keystroke rebuilds the host config.
          disabled: inputHasText,
        },
      ],
    },
  } as PublicConfig;
}

/** The input config as it landed in the store, past all the reconciliation. */
function storedInput(instance: ChatInstance) {
  return instance.serviceManager.store.getState().config.public.input;
}

/** The starter trigger's live storage on the mounted editor. */
function starterStorage(editor: Editor): { items: unknown[]; isOn: boolean } {
  return (editor.storage as unknown as Record<string, unknown>)
    .carbonStarterTrigger as { items: unknown[]; isOn: boolean };
}

/** Render the chat and wait for the instance the chat hands back. */
async function renderChat(
  config: PublicConfig
): Promise<{ chat: ChatInstance; rerender: (config: PublicConfig) => void }> {
  let captured: ChatInstance | null = null;
  const onBeforeRender = jest.fn((next: ChatInstance) => {
    captured = next;
  });

  const result = render(
    <ChatContainer {...config} onBeforeRender={onBeforeRender} />
  );
  await waitFor(() => expect(captured).not.toBeNull(), { timeout: 5000 });

  return {
    chat: captured as unknown as ChatInstance,
    rerender: (next: PublicConfig) =>
      result.rerender(
        <ChatContainer {...next} onBeforeRender={onBeforeRender} />
      ),
  };
}

describe('prompt-line editor stability across runtime config updates', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  // Pins the reference reconciliation: an unrelated input field changes, and
  // `input.starters` keeps its previous reference, so the extension memo never
  // recomputes and `setExtensions` is never reached. The two cases below are
  // what pin the value comparison.
  it('keeps the live editor and its undo history when a sibling field changes', async () => {
    const { chat, rerender } = await renderChat(buildConfig(false));

    const editor = await chat.input.getEditor();
    editor.view.dispatch(editor.state.tr.insertText('hello'));

    rerender(buildConfig(true));
    await waitFor(() =>
      expect(storedInput(chat).actions[0].disabled).toBe(true)
    );

    // Same editor instance — the config update no longer tears it down.
    const afterUpdate = await chat.input.getEditor();
    expect(afterUpdate).toBe(editor);
    expect(afterUpdate.isDestroyed).toBe(false);

    afterUpdate.view.dispatch(afterUpdate.state.tr.insertText(' world'));
    expect(afterUpdate.getText()).toBe('hello world');

    // History reaches back past the config update to an empty field. Before the
    // fix it stopped at the first chunk typed before the rebuild.
    while (afterUpdate.commands.undo()) {
      /* drain the history stack */
    }
    expect(afterUpdate.getText()).toBe('');
  });

  it('keeps the editor when the starters list is toggled', async () => {
    const base = buildConfig(false);
    const { chat, rerender } = await renderChat(base);

    const editor = await chat.input.getEditor();
    expect(starterStorage(editor).isOn).toBe(true);

    rerender({
      ...base,
      input: {
        ...base.input,
        starters: { items: STARTER_ITEMS, isOn: false },
      },
    } as PublicConfig);
    await waitFor(() => expect(storedInput(chat).starters.isOn).toBe(false));

    // Toggling the list applies to extension storage in place; it is not a
    // reason to rebuild the editor.
    expect(await chat.input.getEditor()).toBe(editor);

    // `isOn` alone would not pin the write-through: AutocompleteController
    // writes that same field on every starters change, so this stays green
    // without it. `items` is the field only the write-through touches.
    await waitFor(() => expect(starterStorage(editor).isOn).toBe(false));

    rerender({
      ...base,
      input: {
        ...base.input,
        starters: {
          items: [{ id: 's9', label: 'Something else' }],
          isOn: false,
        },
      },
    } as PublicConfig);

    // Compare labels, not identity — `mergePublicConfig` clones the array.
    await waitFor(() =>
      expect(
        (starterStorage(editor).items as { label: string }[]).map(
          (item) => item.label
        )
      ).toEqual(['Something else'])
    );
    expect(await chat.input.getEditor()).toBe(editor);
  });

  it('keeps the editor when a rebuilt bundle carries an equal mention config', async () => {
    // Flipping `isOn` recomputes the starters memo, so `buildCarbonExtensions`
    // re-runs and every extension in the bundle — the mention one included —
    // arrives as a fresh instance. Starters short-circuit to equivalent, so the
    // mention pair is the one that has to compare equal by value for the editor
    // to survive. That `isEqual` rule has no other coverage on the React path.
    const base = {
      ...createBaseConfig(),
      input: {
        mention: { trigger: '@', items: PEOPLE },
        starters: { items: STARTER_ITEMS, isOn: true },
      },
    } as PublicConfig;
    const { chat, rerender } = await renderChat(base);

    const editor = await chat.input.getEditor();
    editor.view.dispatch(editor.state.tr.insertText('hi'));

    rerender({
      ...base,
      input: { ...base.input, starters: { items: STARTER_ITEMS, isOn: false } },
    } as PublicConfig);
    await waitFor(() => expect(storedInput(chat).starters.isOn).toBe(false));

    expect(await chat.input.getEditor()).toBe(editor);
    expect(editor.getText()).toBe('hi');
  });
});
