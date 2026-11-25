/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';

import { PageObjectId } from '../../../aiChatEntry';
import {
  byTestId,
  contractSetup,
  deepActiveElement,
  focusHostButton,
  inputField,
  openChat,
  pause,
} from '../helpers/contract';

// @covers instance.requestFocus config.input.isDisabled
describe('requestFocus with a disabled input', () => {
  contractSetup();

  it('returns true while the input is disabled, and leaves focus where it is', async () => {
    const { instance } = await openChat({ input: { isDisabled: true } });
    expect(inputField().disabled).toBe(true);
    const button = focusHostButton();
    let result: boolean | void;
    await act(async () => {
      result = instance.requestFocus();
    });
    expect(result).toBe(true);
    await pause();
    expect(deepActiveElement()).toBe(button);
  });

  it('returns true while the rich editor input is disabled, and leaves focus where it is', async () => {
    const { instance } = await openChat({ input: { isDisabled: true } });
    const editor = await act(async () => instance.input.getEditor());
    expect(editor.isEditable).toBe(false);
    // The loaded editor is the input the chat shows.
    expect(byTestId(PageObjectId.INPUT)).toBe(editor.view.dom);
    const button = focusHostButton();
    let result: boolean | void;
    await act(async () => {
      result = instance.requestFocus();
    });
    expect(result).toBe(true);
    await pause();
    expect(deepActiveElement()).toBe(button);
    expect(editor.isFocused).toBe(false);
  });
});
