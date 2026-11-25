/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { MessagePresentationAdapter } from '../MessagePresentationAdapter';

function capabilities() {
  return {
    hasCustomPromptLine: () => false,
    announceSending: vi.fn(),
    requestComposerFocus: () => false,
    isHomeScreenOpen: () => false,
    closeHomeScreen: vi.fn(),
    isResponsePanelOpen: () => false,
    closeResponsePanel: vi.fn(),
  };
}

it('resolves the current scroll handle separately for capture and restore', () => {
  let handle:
    | {
        getMessagesScrollBottom(): number;
        doAutoScroll(value: { scrollToBottom: number | undefined }): void;
      }
    | undefined;
  const adapter = new MessagePresentationAdapter({
    ...capabilities(),
    getMessagesScrollBottom: () => handle?.getMessagesScrollBottom(),
    restoreMessagesScroll: (scrollBottom) =>
      handle?.doAutoScroll({ scrollToBottom: scrollBottom }),
  });
  expect(adapter.getMessagesScrollBottom()).toBeUndefined();
  adapter.restoreMessagesScroll(undefined);
  const oldRestore = vi.fn();
  handle = { getMessagesScrollBottom: () => 12, doAutoScroll: oldRestore };
  const bottom = adapter.getMessagesScrollBottom();
  const newRestore = vi.fn();
  handle = { getMessagesScrollBottom: () => 99, doAutoScroll: newRestore };
  adapter.restoreMessagesScroll(bottom);
  expect(oldRestore).not.toHaveBeenCalled();
  expect(newRestore).toHaveBeenCalledWith({ scrollToBottom: 12 });
  handle = undefined;
  adapter.restoreMessagesScroll(bottom);
  expect(newRestore).toHaveBeenCalledTimes(1);
});
