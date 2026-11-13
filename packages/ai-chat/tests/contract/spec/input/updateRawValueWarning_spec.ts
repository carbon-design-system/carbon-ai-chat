/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';

import { ChatInstance } from '../../../../src/aiChatEntry';
import { contractSetup, openChat } from '../../helpers';

async function updateRawValue(
  instance: ChatInstance,
  updater: (previous: string) => string
): Promise<void> {
  await act(async () => {
    instance.input.updateRawValue(updater);
  });
}

/**
 * The console warnings that name `updateRawValue`. Other warnings (a Tiptap
 * one, say) don't count.
 */
function deprecationWarnings(consoleWarn: jest.SpyInstance): unknown[][] {
  return consoleWarn.mock.calls.filter((args) =>
    args.some((arg: unknown) => String(arg).includes('updateRawValue'))
  );
}

// On `main` the deprecation warning's once-per-session flag is module-level,
// so it lives for the whole test file. This file holds only the tests that
// watch for the warning, and no test before them writes to the rich editor
// with updateRawValue.
// @covers instance.input.updateRawValue state.input.rawValue
describe('input.updateRawValue deprecation warning', () => {
  contractSetup();

  let consoleWarn: jest.SpyInstance;
  beforeEach(() => {
    consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    consoleWarn?.mockRestore();
  });

  it('warns nothing in the plain field', async () => {
    const { instance } = await openChat();
    consoleWarn.mockClear();
    await updateRawValue(instance, () => 'one');
    // src/types/instance/ChatInstanceInput.ts:39 says the method "emits one
    // deprecation warning per session"; on `main` it warns only once the rich
    // editor is mounted (src/chat/services/InputActionsService.ts:78).
    expect(deprecationWarnings(consoleWarn)).toEqual([]);
  });

  it('warns once, over two writes, in the rich editor', async () => {
    const { instance } = await openChat();
    await act(async () => {
      await instance.input.getEditor();
    });
    consoleWarn.mockClear();
    await updateRawValue(instance, () => 'one');
    await updateRawValue(instance, () => 'two');
    expect(instance.state.get().input.rawValue).toBe('two');
    expect(deprecationWarnings(consoleWarn)).toHaveLength(1);
  });
});
