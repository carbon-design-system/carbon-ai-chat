/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ChatSDKConfig } from '../index';
import {
  ErrorType,
  type ServiceDesk,
  type ServiceDeskCallback,
} from '../../types/config/ServiceDeskConfig';
import {
  UserType,
  type MessageRequest,
  type StructuredData,
} from '../../types/messaging/Messages';
import { withSDK } from './helpers/publicContract';

const AGENT = {
  id: 'file-agent',
  nickname: 'File agent',
  user_type: UserType.HUMAN,
};

const FILE_DATA: StructuredData = {
  fields: [
    {
      id: 'assistant-file',
      type: 'file',
      value: {
        type: 'reference',
        id: 'assistant-reference',
        name: 'assistant.txt',
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

/** A service desk that records the names of the files staged for it. */
function integration() {
  let callback: ServiceDeskCallback;
  const selected: string[] = [];
  const factory: NonNullable<ChatSDKConfig['serviceDeskFactory']> = async (
    parameters
  ) => {
    callback = parameters.callback;
    const desk: ServiceDesk = {
      getName: () => 'Public file capability desk',
      startChat: async (): Promise<void> => undefined,
      endChat: async (): Promise<void> => undefined,
      sendMessageToAgent: async (): Promise<void> => undefined,
      filesSelectedForUpload: (files): void => {
        selected.push(...files.map(({ file }) => file.name));
      },
    };
    return desk;
  };
  return {
    factory,
    selected,
    get callback() {
      return callback;
    },
  };
}

const png = (name: string) => new File(['image'], name, { type: 'image/png' });

describe('SDK agent availability and file ownership', () => {
  it('publishes the queue position while connecting and clears it after a real connecting failure', async () => {
    const desk = integration();
    await withSDK(
      async (sdk) => {
        try {
          await sdk.serviceDesk.startConversation();
          await desk.callback.updateAgentAvailability({ positionInQueue: 3 });
          expect(sdk.state.get().humanAgent).toMatchObject({
            isConnecting: true,
            availability: { positionInQueue: 3 },
          });
          await desk.callback.setErrorStatus({ type: ErrorType.CONNECTING });
          expect(sdk.state.get().humanAgent.isConnecting).toBe(false);
          expect(sdk.state.get().humanAgent.availability).toBeNull();
        } finally {
          await sdk.serviceDesk.endConversation();
        }
      },
      () => undefined,
      { serviceDeskFactory: desk.factory }
    );
  });

  it('applies the joined desk file capabilities to addFile and frees its single-file slot after removeFile', async () => {
    const desk = integration();
    await withSDK(
      async (sdk) => {
        try {
          await sdk.serviceDesk.startConversation();
          await desk.callback.agentJoined(AGENT);
          desk.callback.updateCapabilities({ allowFileUploads: false });
          await expect(
            sdk.messaging.addFile(new File(['x'], 'blocked.txt'))
          ).rejects.toThrow("The service desk doesn't take files");
          desk.callback.updateCapabilities({
            allowFileUploads: true,
            allowMultipleFileUploads: false,
            allowedFileUploadTypes: 'image/*',
          });
          await expect(
            sdk.messaging.addFile(
              new File(['x'], 'wrong.txt', { type: 'text/plain' })
            )
          ).rejects.toThrow("isn't a type the service desk accepts");
          const first = await sdk.messaging.addFile(png('first.png'));
          expect(desk.selected).toEqual(['first.png']);
          expect(sdk.state.get().pendingUploads).toEqual([
            expect.objectContaining({ id: first.id, status: 'complete' }),
          ]);
          await expect(
            sdk.messaging.addFile(png('second.png'))
          ).rejects.toThrow("would go past the service desk's limit of 1");
          sdk.messaging.removeFile(first.id);
          expect(sdk.state.get().pendingUploads).toEqual([]);
          const next = await sdk.messaging.addFile(png('second.png'));
          expect(desk.selected).toEqual(['first.png', 'second.png']);
          expect(sdk.state.get().pendingUploads).toEqual([
            expect.objectContaining({ id: next.id, status: 'complete' }),
          ]);
          sdk.messaging.removeFile(next.id);
        } finally {
          await sdk.serviceDesk.endConversation();
        }
      },
      () => undefined,
      { serviceDeskFactory: desk.factory }
    );
  });

  it('finishes an assistant upload in its original input and removes it while the agent input is active', async () => {
    const desk = integration();
    const sent: MessageRequest[] = [];
    let finish: (data: StructuredData) => void;
    const upload = new Promise<StructuredData>((resolve) => {
      finish = resolve;
    });
    let entered: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    await withSDK(
      async (sdk) => {
        let stopWatching = (): void => undefined;
        try {
          const added = await sdk.messaging.addFile(
            new File(['owned'], 'assistant.txt', { type: 'text/plain' })
          );
          await bounded(started, 'Assistant upload entry');
          expect(sdk.state.get().hasInFlightUploads).toBe(true);
          await sdk.serviceDesk.startConversation();
          await desk.callback.agentJoined(AGENT);
          // The agent input is active now, and it has no files of its own.
          expect(sdk.state.get().pendingUploads).toEqual([]);
          let ready: () => void;
          const completed = new Promise<void>((resolve) => {
            ready = resolve;
          });
          stopWatching = sdk.state.subscribe(() => {
            if (
              sdk.state
                .get()
                .pendingUploads.some(
                  ({ id, status }) => id === added.id && status === 'complete'
                )
            ) {
              ready();
            }
          });
          finish(FILE_DATA);
          await upload;
          await sdk.serviceDesk.endConversation();
          await bounded(completed, 'Original assistant upload publication');
          expect(sdk.state.get().pendingUploads).toEqual([
            expect.objectContaining({
              id: added.id,
              status: 'complete',
              contributedData: FILE_DATA,
            }),
          ]);
          stopWatching();
          await sdk.serviceDesk.startConversation();
          await desk.callback.agentJoined(AGENT);
          sdk.messaging.removeFile(added.id);
          await sdk.serviceDesk.endConversation();
          expect(sdk.state.get().pendingUploads).toEqual([]);
          await sdk.messaging.send('Assistant after inactive file removal');
          expect(sent).toHaveLength(1);
          expect(sent[0].input.structured_data).toBeUndefined();
        } finally {
          finish(FILE_DATA);
          stopWatching();
          await upload;
          await sdk.serviceDesk.endConversation();
        }
      },
      (request): void => {
        sent.push(request);
      },
      {
        serviceDeskFactory: desk.factory,
        upload: {
          onFileUpload: (): Promise<StructuredData> => {
            entered();
            return upload;
          },
        },
      }
    );
  });
});
