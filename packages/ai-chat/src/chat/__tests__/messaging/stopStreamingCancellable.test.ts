/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';

import { allByRole, byRole, click, contractSetup } from '../helpers/contract';
import { STREAM_ROUTES, startCancellableStream } from '../helpers/stopStream';

const STOP = 'Stop response';
const stopButtons = () => allByRole('button', STOP);

describe.each(STREAM_ROUTES)('cancellable stop through %s', (route) => {
  contractSetup();

  it.each([
    ['leaves stop hidden', false],
    ['disables the immediate stop button', true],
  ] as const)('an initial false %s', async (_title, immediate) => {
    const stream = await startCancellableStream(route, immediate);
    try {
      if (immediate) {
        await waitFor(() => expect(stopButtons()).toHaveLength(1));
      }
      await stream.write(false);
      if (immediate) {
        await waitFor(() => expect(byRole('button', STOP)).toBeDisabled());
      } else {
        expect(stopButtons()).toHaveLength(0);
      }
      await stream.write(true);
      await waitFor(() => expect(byRole('button', STOP)).toBeEnabled());
      await click(byRole('button', STOP));
      await waitFor(() => expect(stream.stopEvents()).toBe(1));
      await act(async () => stream.releaseStop());
      await waitFor(() => expect(stopButtons()).toHaveLength(0));
    } finally {
      await act(async () => stream.mount.unmount());
    }
  });

  it.each([
    ['COMPLETE or complete_item', 'complete'],
    ['ERROR or final_response', 'error'],
  ] as const)('hides disabled stop at %s', async (_title, terminal) => {
    const stream = await startCancellableStream(route);
    try {
      await stream.write(true);
      await waitFor(() => expect(byRole('button', STOP)).toBeEnabled());
      await stream.write(false);
      await waitFor(() => expect(byRole('button', STOP)).toBeDisabled());
      await stream.write(false, terminal);
      await waitFor(() => expect(stopButtons()).toHaveLength(0));
    } finally {
      await act(async () => stream.mount.unmount());
    }
  });
});
