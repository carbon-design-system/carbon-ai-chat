/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';
import type { JSONContent } from '@tiptap/core';

import { ChatInstance } from '../../../../src/aiChatEntry';
import { contractSetup, openChat } from '../../helpers';

/** The editor `input.getEditor` resolves with. */
type Editor = Awaited<ReturnType<ChatInstance['input']['getEditor']>>;

/** A one-paragraph doc holding this text. */
function textDoc(text: string): JSONContent {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  };
}

// This test has a file of its own so the first `getEditor` call in it loads
// the editor runtime cold. Once a file has loaded the runtime, an upgrade
// finishes inside the first call, and two calls in the same turn never
// overlap one; a cold load makes the second call arrive mid-upgrade. Don't
// add a test here that calls `getEditor` before this one.
// @covers instance.input instance.input.getEditor state.input.rawValue
describe('input.getEditor', () => {
  contractSetup();

  it('resolves the same editor to concurrent and later calls', async () => {
    const { instance } = await openChat();
    let editors: Editor[];
    await act(async () => {
      editors = await Promise.all([
        instance.input.getEditor(),
        instance.input.getEditor(),
      ]);
    });
    let later: Editor;
    await act(async () => {
      later = await instance.input.getEditor();
    });
    expect(editors[0]).toBe(editors[1]);
    expect(later).toBe(editors[0]);
    // No call mounted a second editor in its place: the one they all got is
    // live, and the field publishes what a host writes through it.
    expect(later.isDestroyed).toBe(false);
    await act(async () => {
      later.commands.setContent(textDoc('still the field'));
    });
    expect(instance.state.get().input.rawValue).toBe('still the field');
  });
});
