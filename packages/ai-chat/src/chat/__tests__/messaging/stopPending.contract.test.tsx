/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import {
  BusEventType,
  MessageResponseTypes,
  MessageState,
  type ChatInstance,
} from '../../../aiChatEntry';
import {
  allByRole,
  byRole,
  click,
  contractChat,
  contractSetup,
  deferred,
  fakeBackend,
  finishSend,
  instanceSender,
  startSend,
} from '../helpers/contract';

const STOP = 'Finish owned response';

async function write(
  instance: ChatInstance,
  cancellable: boolean
): Promise<void> {
  await act(() =>
    instance.messaging.upsertMessage(
      'pending-stop',
      MessageState.STREAMING,
      () => ({
        id: 'pending-stop',
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: 'Still streaming',
              streaming_metadata: { id: 'text', cancellable },
            },
          ],
        },
      })
    )
  );
}

describe('public pending Stop control', () => {
  contractSetup();

  it('keeps Stop disabled while its real handler is pending even when metadata permits cancellation again', async () => {
    const release = deferred();
    let stopStarted = false;
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      strings: { input_stopResponse: STOP },
    });
    const handler = {
      type: BusEventType.STOP_STREAMING as const,
      handler: async () => {
        stopStarted = true;
        await release.promise;
      },
    };
    mount.instance.on(handler);
    try {
      await write(mount.instance, true);
      await waitFor(() => expect(byRole('button', STOP)).toBeEnabled());
      await click(byRole('button', STOP));
      await waitFor(() => expect(stopStarted).toBe(true));
      expect(byRole('button', STOP)).toBeDisabled();
      await write(mount.instance, false);
      expect(byRole('button', STOP)).toBeDisabled();
      await write(mount.instance, true);
      expect(byRole('button', STOP)).toBeDisabled();
      release.resolve();
      await waitFor(() => expect(allByRole('button', STOP)).toHaveLength(0));
      await waitFor(() =>
        expect(mount.instance.state.get().status).toBe('ready')
      );
    } finally {
      release.resolve();
      mount.instance.off(handler);
      try {
        await act(() => mount.instance.messaging.stop());
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });

  it('keeps a host-shown Stop disabled until its handler returns, even when the request it stopped ends first', async () => {
    const release = deferred();
    let stopCalls = 0;
    const backend = fakeBackend();
    const mount = await contractChat({
      openChatByDefault: true,
      input: { showStopStreamingButton: true },
      messaging: {
        skipWelcome: true,
        showStopButtonImmediately: true,
        customSendMessage: backend.customSendMessage,
      },
      strings: { input_stopResponse: STOP },
    });
    const handler = {
      type: BusEventType.STOP_STREAMING as const,
      handler: async () => {
        stopCalls += 1;
        await release.promise;
      },
    };
    mount.instance.on(handler);
    try {
      const started = await startSend(
        instanceSender(mount.instance, backend),
        'Owned stopped request'
      );
      await waitFor(() => expect(byRole('button', STOP)).toBeEnabled());
      await click(byRole('button', STOP));
      await waitFor(() => expect(stopCalls).toBe(1));
      expect(byRole('button', STOP)).toBeDisabled();

      // The request ends while the handler still runs.
      await finishSend(started);
      // The host flag keeps the control shown, and it stays disabled.
      expect(byRole('button', STOP)).toBeDisabled();

      release.resolve();
      await waitFor(() => expect(byRole('button', STOP)).toBeEnabled());
      expect(stopCalls).toBe(1);
    } finally {
      release.resolve();
      mount.instance.off(handler);
      await act(async () => mount.unmount());
    }
  });
});
