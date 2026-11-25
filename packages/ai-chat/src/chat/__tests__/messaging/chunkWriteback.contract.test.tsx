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
  MessageState,
  type BusEventChunkUserDefinedResponse,
} from '../../../aiChatEntry';
import {
  addChunk,
  contractChat,
  contractSetup,
  deferred,
  finalChunk,
  mainPanelText,
  partialUserDefined,
  responseOf,
  textItem,
  userDefinedItem,
} from '../helpers/contract';

const schedule = globalThis.setTimeout.bind(globalThis);
const cancel = globalThis.clearTimeout.bind(globalThis);

async function bounded<T>(work: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof schedule>;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = schedule(
          () => reject(new Error(`${label} did not settle`)),
          5000
        );
      }),
    ]);
  } finally {
    cancel(timer);
  }
}

describe('public streamed callback writeback', () => {
  contractSetup();

  it('commits current chunk edits when its held callback rejects and processes the next chunk', async () => {
    const entered = deferred();
    const release = deferred();
    const failure = new Error('Current chunk callback failed');
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
    });
    const handler = {
      type: BusEventType.CHUNK_USER_DEFINED_RESPONSE as const,
      handler: async (
        event: BusEventChunkUserDefinedResponse
      ): Promise<void> => {
        event.data.messageItem.user_defined.value = 'during';
        entered.resolve();
        await release.promise;
        event.data.messageItem.user_defined.value = 'after';
        throw failure;
      },
    };
    mount.instance.on(handler);
    let write = Promise.resolve();
    let rejection = Promise.resolve();
    try {
      await act(async () => {
        write = mount.instance.messaging.addMessageChunk(
          partialUserDefined('held-current', 'custom', { value: 'before' })
        );
        rejection = expect(write).rejects.toBe(failure);
        void rejection.catch((): void => undefined);
      });
      await bounded(entered.promise, 'Current chunk callback entry');
      const beforeCommit = mount.instance.state.get();
      expect(
        beforeCommit.messages.find(({ id }) => id === 'held-current')
      ).toMatchObject({
        output: { generic: [{ user_defined: { value: 'before' } }] },
      });
      await act(async () => {
        release.resolve();
        await bounded(rejection, 'Current chunk rejection');
      });
      expect(
        mount.instance.state
          .get()
          .messages.find(({ id }) => id === 'held-current')
      ).toMatchObject({
        output: { generic: [{ user_defined: { value: 'after' } }] },
      });
      expect(
        beforeCommit.messages.find(({ id }) => id === 'held-current')
      ).toMatchObject({
        output: { generic: [{ user_defined: { value: 'before' } }] },
      });
      await addChunk(
        mount.instance,
        finalChunk('held-current', [
          textItem('Recovered after the rejected chunk'),
        ])
      );
      await waitFor(() =>
        expect(mainPanelText()).toContain('Recovered after the rejected chunk')
      );
    } finally {
      release.resolve();
      try {
        await act(async () => {
          await bounded(
            Promise.allSettled([write, rejection]),
            'Owned current chunk cleanup'
          );
          await mount.instance.messaging.stop();
        });
      } finally {
        mount.instance.off(handler);
        await act(async () => mount.unmount());
      }
    }
  });

  it('preserves a same-ID replacement when an entered old chunk callback edits then rejects', async () => {
    const entered = deferred();
    const release = deferred();
    const failure = new Error('Removed chunk callback failed');
    const calls: string[] = [];
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
    });
    const handler = {
      type: BusEventType.CHUNK_USER_DEFINED_RESPONSE as const,
      handler: async (
        event: BusEventChunkUserDefinedResponse
      ): Promise<void> => {
        const value = event.data.messageItem.user_defined.value;
        calls.push(String(value));
        if (value !== 'original') {
          return;
        }
        event.data.messageItem.user_defined.value = 'pending edit';
        entered.resolve();
        await release.promise;
        event.data.messageItem.user_defined.value = 'stale edit';
        throw failure;
      },
    };
    mount.instance.on(handler);
    let write = Promise.resolve();
    let rejection = Promise.resolve();
    try {
      await act(async () => {
        write = mount.instance.messaging.addMessageChunk(
          partialUserDefined('same-chunk', 'custom', { value: 'original' })
        );
        rejection = expect(write).rejects.toBe(failure);
        void rejection.catch((): void => undefined);
      });
      await bounded(entered.promise, 'Old chunk callback entry');
      const beforeRemoval = mount.instance.state.get();
      expect(
        beforeRemoval.messages.find(({ id }) => id === 'same-chunk')
      ).toMatchObject({
        output: { generic: [{ user_defined: { value: 'original' } }] },
      });
      await act(async () => {
        await mount.instance.messaging.removeMessages(['same-chunk']);
        await mount.instance.messaging.upsertMessage(
          'same-chunk',
          MessageState.STREAMING,
          () =>
            responseOf('same-chunk', [
              userDefinedItem('custom', { value: 'replacement' }),
              textItem('Current replacement content', 'caption'),
            ])
        );
      });
      await waitFor(() =>
        expect(mainPanelText()).toContain('Current replacement content')
      );
      const replacement = mount.instance.state.get();
      expect(
        replacement.messages.find(({ id }) => id === 'same-chunk')
      ).toMatchObject({
        output: {
          generic: [
            { user_defined: { value: 'replacement' } },
            { text: 'Current replacement content' },
          ],
        },
      });
      await act(async () => {
        release.resolve();
        await bounded(rejection, 'Removed chunk rejection');
      });
      expect(
        mount.instance.state
          .get()
          .messages.find(({ id }) => id === 'same-chunk')
      ).toMatchObject({
        output: {
          generic: [
            { user_defined: { value: 'replacement' } },
            { text: 'Current replacement content' },
          ],
        },
      });
      expect(mount.instance.state.get().status).toBe('streaming');
      expect(
        beforeRemoval.messages.find(({ id }) => id === 'same-chunk')
      ).toMatchObject({
        output: { generic: [{ user_defined: { value: 'original' } }] },
      });
      expect(
        replacement.messages.find(({ id }) => id === 'same-chunk')
      ).toMatchObject({
        output: {
          generic: [
            { user_defined: { value: 'replacement' } },
            { text: 'Current replacement content' },
          ],
        },
      });
      await addChunk(
        mount.instance,
        partialUserDefined('fresh-chunk', 'custom', { value: 'clean' })
      );
      expect(calls).toEqual(['original', 'clean']);
      expect(mainPanelText()).toContain('Current replacement content');
    } finally {
      release.resolve();
      try {
        await act(async () => {
          await bounded(
            Promise.allSettled([write, rejection]),
            'Owned removed chunk cleanup'
          );
          await mount.instance.messaging.stop();
        });
      } finally {
        mount.instance.off(handler);
        await act(async () => mount.unmount());
      }
    }
  });

  it('lands a final chunk queued behind a held chunk callback that then rejects', async () => {
    const entered = deferred();
    const release = deferred();
    const failure = new Error('Held chunk callback failed');
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
    });
    const handler = {
      type: BusEventType.CHUNK_USER_DEFINED_RESPONSE as const,
      handler: async (
        event: BusEventChunkUserDefinedResponse
      ): Promise<void> => {
        if (event.data.messageItem.user_defined.value !== 'held') {
          return;
        }
        entered.resolve();
        await release.promise;
        throw failure;
      },
    };
    mount.instance.on(handler);
    let held = Promise.resolve();
    let rejection = Promise.resolve();
    let queued = Promise.resolve();
    let queuedSettled = false;
    try {
      await act(async () => {
        held = mount.instance.messaging.addMessageChunk(
          partialUserDefined('held-chunk', 'custom', { value: 'held' })
        );
        rejection = expect(held).rejects.toBe(failure);
        void rejection.catch((): void => undefined);
      });
      await bounded(entered.promise, 'Held chunk callback entry');
      await act(async () => {
        queued = mount.instance.messaging.addMessageChunk(
          finalChunk('queued-chunk', [
            textItem('Queued chunk after the rejection', 'text'),
          ])
        );
        void queued.then(
          () => {
            queuedSettled = true;
          },
          () => {
            queuedSettled = true;
          }
        );
      });
      // The final chunk waits behind the held callback.
      expect(queuedSettled).toBe(false);
      expect(
        mount.instance.state
          .get()
          .messages.some(({ id }) => id === 'queued-chunk')
      ).toBe(false);
      await act(async () => {
        release.resolve();
        await bounded(rejection, 'Held chunk rejection');
        await bounded(queued, 'Queued final chunk');
      });
      expect(
        mount.instance.state
          .get()
          .messages.find(({ id }) => id === 'queued-chunk')
      ).toMatchObject({
        output: { generic: [{ text: 'Queued chunk after the rejection' }] },
      });
      await waitFor(() =>
        expect(mainPanelText()).toContain('Queued chunk after the rejection')
      );
      expect(mount.instance.state.get().status).toBe('ready');
    } finally {
      release.resolve();
      try {
        await act(async () => {
          await bounded(
            Promise.allSettled([held, rejection, queued]),
            'Owned queued chunk cleanup'
          );
          await mount.instance.messaging.stop();
        });
      } finally {
        mount.instance.off(handler);
        await act(async () => mount.unmount());
      }
    }
  });
});
