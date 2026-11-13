/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Host calls that change the chat, each awaited inside `act`, so a test reads
 * the result only after any batched notification has been delivered.
 */

import { act } from '@testing-library/react';

import { ChatInstance, ViewState, ViewType } from '../../../src/aiChatEntry';

/** Calls `changeView` the way a host would, and waits for it. */
export async function changeView(
  instance: ChatInstance,
  view: ViewType | Partial<ViewState>
): Promise<void> {
  await act(async () => {
    await instance.changeView(view);
  });
}

/**
 * Shows or hides the unread indicator: a public change that touches no
 * messaging field.
 */
export async function showUnread(
  instance: ChatInstance,
  isVisible = true
): Promise<void> {
  await act(async () => {
    instance.updateAssistantUnreadIndicatorVisibility(isVisible);
  });
}
