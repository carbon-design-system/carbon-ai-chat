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
  WriteableElementName,
  type HistoryItem,
  type MessageRequest,
  type StructuredData,
} from '../../../aiChatEntry';
import { contractChat, contractSetup, deferred } from '../helpers/contract';

const PARKED: StructuredData = {
  user_defined: { source: 'built-in composer' },
};
const EXPLICIT: StructuredData = {
  user_defined: { source: 'custom composer' },
};
const FILE: StructuredData = {
  fields: [
    {
      id: 'custom-file',
      type: 'file',
      value: {
        type: 'reference',
        id: 'custom-file-reference',
        name: 'parked.pdf',
      },
    },
  ],
};

async function bounded<T>(work: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} did not settle`)),
          5000
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function watch<T>(work: Promise<T>): Promise<T> {
  void work.catch((): void => undefined);
  return work;
}

describe('public custom prompt data ownership', () => {
  contractSetup();

  it('keeps built-in data parked for a custom send begun before real history loading even if the custom content is removed', async () => {
    const history = deferred<HistoryItem[]>();
    const entered = deferred();
    const sent: MessageRequest[] = [];
    const mount = await contractChat({
      messaging: {
        skipWelcome: true,
        customLoadHistory: () => {
          entered.resolve();
          return history.promise;
        },
        customSendMessage: (request): void => {
          sent.push(request);
        },
      },
    });
    const slot =
      mount.instance.writeableElements[WriteableElementName.CUSTOM_PROMPT_LINE];
    let sending: Promise<void>;
    try {
      await act(async () => {
        mount.instance.input.updateStructuredData(() => PARKED);
        slot.append(document.createElement('input'));
      });
      await act(async () => {
        sending = watch(
          mount.instance.messaging.send('Custom text during actual load')
        );
      });
      await bounded(entered.promise, 'Custom send real history entry');
      await act(async () => {
        slot.replaceChildren();
      });
      await act(async () => {
        history.resolve([]);
        await bounded(sending, 'Captured custom send');
      });
      expect(sent).toHaveLength(1);
      expect(sent[0].input.structured_data).toBeUndefined();
      expect(mount.instance.state.get().input.structuredData).toEqual(PARKED);
      await act(async () => {
        slot.append(document.createElement('input'));
      });
      await act(() =>
        mount.instance.messaging.send({
          input: {
            text: 'Current custom explicit data',
            structured_data: EXPLICIT,
          },
        })
      );
      expect(sent[1].input.structured_data).toEqual(EXPLICIT);
      expect(mount.instance.state.get().input.structuredData).toEqual(PARKED);
      await act(async () => {
        slot.replaceChildren();
      });
      await act(() => mount.instance.messaging.send('Current built-in data'));
      expect(sent).toHaveLength(3);
      expect(sent[2].input.structured_data).toEqual(PARKED);
      expect(mount.instance.state.get().input.structuredData).toBeUndefined();
    } finally {
      history.resolve([]);
      try {
        await bounded(Promise.allSettled([sending]), 'Custom history cleanup');
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });

  it('rechecks a real upload begun while custom send loads history and leaves its completed contribution parked', async () => {
    const history = deferred<HistoryItem[]>();
    const loading = deferred();
    const upload = deferred<StructuredData>();
    const uploading = deferred();
    const sent: MessageRequest[] = [];
    const mount = await contractChat({
      messaging: {
        skipWelcome: true,
        customLoadHistory: () => {
          loading.resolve();
          return history.promise;
        },
        customSendMessage: (request): void => {
          sent.push(request);
        },
      },
      upload: {
        onFileUpload: () => {
          uploading.resolve();
          return upload.promise;
        },
      },
    });
    let sending: Promise<void>;
    let attaching: Promise<{ id: string }>;
    try {
      await act(async () => {
        mount.instance.writeableElements[
          WriteableElementName.CUSTOM_PROMPT_LINE
        ].append(document.createElement('input'));
      });
      await act(async () => {
        sending = watch(
          mount.instance.messaging.send('Wait for actual upload')
        );
      });
      await bounded(loading.promise, 'Real custom send hydration');
      await act(async () => {
        attaching = watch(
          mount.instance.messaging.addFile(
            new File(['owned'], 'parked.pdf', {
              type: 'application/pdf',
            })
          )
        );
      });
      await bounded(uploading.promise, 'Real addFile upload entry');
      expect(mount.instance.state.get().input.hasInFlightUploads).toBe(true);
      history.resolve([]);
      await expect(
        bounded(sending, 'Upload rechecked after history')
      ).rejects.toThrow(/upload/i);
      expect(sent).toHaveLength(0);
      await act(async () => {
        upload.resolve(FILE);
        await bounded(attaching, 'Actual started attachment');
      });
      await waitFor(() =>
        expect(mount.instance.state.get().input.structuredData).toEqual(FILE)
      );
      await act(() =>
        mount.instance.messaging.send({
          input: {
            text: 'Custom retry with explicit data',
            structured_data: EXPLICIT,
          },
        })
      );
      expect(sent).toHaveLength(1);
      expect(sent[0].input.structured_data).toEqual(EXPLICIT);
      expect(mount.instance.state.get().input.structuredData).toEqual(FILE);
      const added = await attaching;
      await act(async () => mount.instance.messaging.removeFile(added.id));
      expect(mount.instance.state.get().input.structuredData).toBeUndefined();
    } finally {
      history.resolve([]);
      upload.resolve(FILE);
      try {
        await bounded(
          Promise.allSettled([sending, attaching, upload.promise]),
          'Owned custom upload cleanup'
        );
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });
});
