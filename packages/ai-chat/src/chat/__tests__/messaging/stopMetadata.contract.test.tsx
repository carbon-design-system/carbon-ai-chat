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
  MessageResponseTypes,
  MessageState,
  type ChatInstance,
  type MessageResponse,
} from '../../../aiChatEntry';
import {
  allByRole,
  byRole,
  click,
  contractChat,
  contractSetup,
} from '../helpers/contract';

const STOP_NAME = 'Contract native stop';
const stop = () => byRole('button', STOP_NAME);

function response(
  id: string,
  flags: Array<boolean | undefined>,
  note = id
): MessageResponse {
  return {
    id,
    output: {
      generic: flags.map((cancellable, index) => ({
        response_type: MessageResponseTypes.TEXT,
        text: `${note} item ${index}`,
        streaming_metadata: {
          id: `item-${index}`,
          ...(cancellable === undefined ? {} : { cancellable }),
        },
      })),
    },
  };
}

async function write(
  instance: ChatInstance,
  id: string,
  flags: Array<boolean | undefined>,
  state = MessageState.STREAMING,
  note = id
): Promise<void> {
  await act(() =>
    instance.messaging.upsertMessage(id, state, () => response(id, flags, note))
  );
}

describe('public native cancellation metadata', () => {
  contractSetup();

  it('lets false beat true within one response and preserves the restriction when the flag is omitted', async () => {
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      strings: { input_stopResponse: STOP_NAME },
    });
    try {
      await write(mount.instance, 'first', [true]);
      await waitFor(() => expect(stop()).toBeEnabled());
      await write(mount.instance, 'first', [true, false]);
      await waitFor(() => expect(stop()).toBeDisabled());
      await write(mount.instance, 'first', [undefined]);
      expect(stop()).toBeDisabled();
      await write(mount.instance, 'first', [true]);
      await waitFor(() => expect(stop()).toBeEnabled());
      await write(mount.instance, 'first', [true], MessageState.COMPLETE);
    } finally {
      await act(async () => mount.unmount());
    }
  });

  it('keeps the shared Stop control restricted until each concurrent response permits cancellation or ends', async () => {
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      strings: { input_stopResponse: STOP_NAME },
    });
    try {
      await write(mount.instance, 'first', [true]);
      await write(mount.instance, 'second', [false]);
      await waitFor(() => expect(stop()).toBeDisabled());
      await write(mount.instance, 'first', [true]);
      expect(stop()).toBeDisabled();
      await write(mount.instance, 'second', [true]);
      await waitFor(() => expect(stop()).toBeEnabled());
      await write(mount.instance, 'second', [false]);
      await waitFor(() => expect(stop()).toBeDisabled());
      await write(mount.instance, 'first', [false], MessageState.COMPLETE);
      expect(stop()).toBeDisabled();
      await write(mount.instance, 'second', [false], MessageState.ERROR);
      await waitFor(() =>
        expect(allByRole('button', STOP_NAME)).toHaveLength(0)
      );
      expect(mount.instance.state.get().status).toBe('ready');
    } finally {
      await act(async () => mount.unmount());
    }
  });

  it('settles both unsolicited streams through the actual Stop control and permits a fresh generation', async () => {
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      strings: { input_stopResponse: STOP_NAME },
    });
    try {
      await write(mount.instance, 'first', [true]);
      await write(mount.instance, 'second', [true]);
      await waitFor(() => expect(stop()).toBeEnabled());
      await click(stop());
      await waitFor(() =>
        expect(mount.instance.state.get().status).toBe('ready')
      );
      expect(
        mount.instance.state
          .get()
          .messageItems.filter((item) =>
            ['first', 'second'].includes(item.messageID)
          )
          .map((item) => item.status)
      ).toEqual(['complete', 'complete']);
      await write(
        mount.instance,
        'first',
        [true],
        MessageState.STREAMING,
        'New generation'
      );
      await waitFor(() => expect(stop()).toBeEnabled());
      expect(mount.instance.state.get().status).toBe('streaming');
      await write(
        mount.instance,
        'first',
        [true],
        MessageState.COMPLETE,
        'Finished generation'
      );
    } finally {
      await act(async () => mount.unmount());
    }
  });
});
