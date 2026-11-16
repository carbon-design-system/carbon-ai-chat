/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';

import {
  contractSetup,
  deepActiveElement,
  focusHostButton,
  inputField,
  openChat,
  pause,
} from '../../helpers';

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
});
