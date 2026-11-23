/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import { userEvent } from 'vitest/browser';

import {
  allByRole,
  byRole,
  contractSetup,
  deepActiveElement,
} from '../helpers/contract';
import { isVisible } from '../helpers/browserPanels';
import { STREAM_ROUTES, startCancellableStream } from '../helpers/stopStream';

const STOP = 'Stop response';
const stop = () => byRole('button', STOP);

/** Whether exactly one stop button exists and a user can see it. */
function expectOneVisibleStop() {
  expect(allByRole('button', STOP)).toHaveLength(1);
  expect(isVisible(stop())).toBe(true);
}

/** Real focus and key presses, so a disabled button must refuse both. */
async function focusAndPress(key: string) {
  stop().focus();
  await userEvent.keyboard(key);
}

describe.each(STREAM_ROUTES)('cancellable stop through %s', (route) => {
  contractSetup();

  it('keeps stop visible but inactive until cancellable becomes true again', async () => {
    const stream = await startCancellableStream(route);
    try {
      await stream.write(true);
      await waitFor(() => expect(stop()).toBeEnabled());
      expectOneVisibleStop();
      stop().focus();
      expect(deepActiveElement()).toBe(stop());

      await stream.write(false);
      await waitFor(() => expect(stop()).toBeDisabled());
      expectOneVisibleStop();
      await userEvent.click(stop(), { force: true });
      await focusAndPress('{Enter}');
      await userEvent.keyboard(' ');
      expect(stream.stopEvents()).toBe(0);

      await stream.write(undefined);
      expect(stop()).toBeDisabled();
      expectOneVisibleStop();
      await stream.write(true);
      await waitFor(() => expect(stop()).toBeEnabled());
      await focusAndPress('{Enter}');
      await waitFor(() => expect(stream.stopEvents()).toBe(1));
      await waitFor(() => expect(stop()).toBeDisabled());

      await stream.write(true);
      expect(stop()).toBeDisabled();
      await userEvent.click(stop(), { force: true });
      expect(stream.stopEvents()).toBe(1);
      await act(async () => stream.releaseStop());
      await waitFor(() => expect(allByRole('button', STOP)).toHaveLength(0));
    } finally {
      await act(async () => stream.mount.unmount());
    }
  });
});
