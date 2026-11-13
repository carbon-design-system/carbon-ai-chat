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

import { act, waitFor } from '@testing-library/react';

import {
  ChatInstance,
  PageObjectId,
  ViewState,
  ViewType,
} from '../../../src/aiChatEntry';
import { byRole, byTestId, click } from './dom';

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

/**
 * Picks files the way a user does: clicks the upload button with this
 * accessible name, then answers the file picker it opens.
 *
 * jsdom has no file picker. The upload button opens the browser's picker by
 * clicking a file input, so this catches that click, and stands in for the
 * user's choice the way a browser hands it back: the input's `files` and a
 * `change` event. Nothing here reads markup to find the input.
 */
export async function pickFiles(
  buttonName: string,
  files: File[]
): Promise<void> {
  let picker: HTMLInputElement | undefined;
  const opened = jest
    .spyOn(HTMLInputElement.prototype, 'click')
    .mockImplementation(() => {});
  try {
    await click(byRole('button', buttonName));
    picker = opened.mock.contexts[0] as HTMLInputElement | undefined;
  } finally {
    opened.mockRestore();
  }
  if (!picker) {
    throw new Error('the upload button opened no file picker');
  }
  await act(async () => {
    Object.defineProperty(picker, 'files', {
      configurable: true,
      value: files,
    });
    picker.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

/**
 * Clicks the disclaimer's accept button until the chat records the
 * acceptance under the page hostname: the button only takes a click once the
 * panel has measured its content.
 */
export async function acceptDisclaimer(instance: ChatInstance): Promise<void> {
  const accepted = () =>
    instance.getState().disclaimersAccepted[window.location.hostname] === true;
  await waitFor(() => {
    if (!accepted()) {
      byTestId(PageObjectId.DISCLAIMER_ACCEPT_BUTTON)?.click();
    }
    expect(accepted()).toBe(true);
  });
}
