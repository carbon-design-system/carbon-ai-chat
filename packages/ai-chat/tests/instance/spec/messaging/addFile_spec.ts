/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * `instance.messaging.addFile()` and `removeFile()`, with `state.pendingUploads` and root
 * `state.hasInFlightUploads` (#2351), and `messaging.send()`'s upload rules (#1826 O4, O5).
 */

import { waitFor } from '@testing-library/react';
import { deepQuerySelector } from '@carbon/ai-chat-components/es/globals/utils/dom-utils.js';
import createHumanAgentService from '../../../../src/shared/services/haa/HumanAgentServiceImpl';
import { selectInputState } from '../../../../src/shared/store/selectors';
import actions from '../../../../src/shared/store/actions';
import { updateCapabilities } from '../../../../src/shared/store/humanAgentActions';
import { resolvablePromise } from '../../../../src/shared/utils/resolvablePromise';
import type { PublicConfig } from '../../../../src/types/config/PublicConfig';
import { CancellationReason } from '../../../../src/types/config/MessagingConfig';
import type { ServiceDesk } from '../../../../src/types/config/ServiceDeskConfig';
import type { UploadConfig } from '../../../../src/types/config/UploadConfig';
import type { ChatInstance } from '../../../../src/types/instance/ChatInstance';
import { ViewType } from '../../../../src/types/instance/apiTypes';
import type {
  MessageRequest,
  StructuredData,
} from '../../../../src/types/messaging/Messages';
import {
  createBaseConfig,
  getChatShadowRoot,
  renderChatAndGetInstance,
  setupAfterEach,
  setupBeforeEach,
} from '../../../test_helpers';

/** An `onFileUpload` whose uploads each wait for the test to settle them. */
function uploader() {
  const calls: {
    file: File;
    signal: AbortSignal;
    done: ReturnType<typeof resolvablePromise<StructuredData>>;
  }[] = [];
  const onFileUpload = jest.fn((file: File, signal: AbortSignal) => {
    const done = resolvablePromise<StructuredData>();
    calls.push({ file, signal, done });
    return done;
  });
  return { calls, onFileUpload };
}

const file = (name: string, size = 3, type = 'text/plain') =>
  new File(['x'.repeat(size)], name, { type });

const dataFor = (name: string): StructuredData => ({
  fields: [{ id: name, type: 'text', value: name } as any],
});

async function chatWith(
  upload: UploadConfig,
  sent: MessageRequest[] = [],
  extra: Partial<PublicConfig> = {}
) {
  const instance = await renderChatAndGetInstance({
    ...createBaseConfig(),
    ...extra,
    upload,
    messaging: {
      skipWelcome: true,
      customSendMessage: async (request: MessageRequest) => {
        sent.push(request);
      },
    },
  });
  await instance.changeView(ViewType.MAIN_WINDOW);
  await waitFor(() => expect(instance.state.get().status).toBe('ready'));
  return instance;
}

const uploads = (instance: ChatInstance) => instance.state.get().pendingUploads;

describe('messaging.addFile and removeFile (#2351)', () => {
  beforeEach(() => {
    setupBeforeEach();
    // jsdom has no object URLs; the input draws an image preview with one.
    URL.createObjectURL ??= () => 'blob:preview';
    URL.revokeObjectURL ??= () => undefined;
    sessionStorage.clear();
    localStorage.clear();
  });
  afterEach(setupAfterEach);

  it('resolves with the ID once the upload starts, before it finishes, and needs no isOn (O2, O4)', async () => {
    const host = uploader();
    const instance = await chatWith({ onFileUpload: host.onFileUpload });

    const { id } = await instance.messaging.addFile(file('a.txt'));

    expect(host.onFileUpload).toHaveBeenCalledTimes(1);
    expect(uploads(instance)).toEqual([
      expect.objectContaining({ id, status: 'uploading' }),
    ]);
    expect(uploads(instance)[0].file).toBe(host.calls[0].file);
    expect(instance.state.get().hasInFlightUploads).toBe(true);
    // The deprecated field reads the same value.
    expect(instance.state.get().input.hasInFlightUploads).toBe(true);
  });

  it.each([
    [
      'a type accept does not allow',
      { accept: 'image/*' },
      file('a.txt'),
      "isn't a type upload.accept allows",
    ],
    [
      'a file over maxFileSizeBytes',
      { maxFileSizeBytes: 2 },
      file('a.txt', 3),
      'is larger than upload.maxFileSizeBytes (2 bytes)',
    ],
  ])(
    'rejects %s before calling onFileUpload (O1, O3)',
    async (_, limits, candidate, reason) => {
      const host = uploader();
      const instance = await chatWith({
        ...limits,
        onFileUpload: host.onFileUpload,
      });

      await expect(instance.messaging.addFile(candidate)).rejects.toThrow(
        reason
      );
      expect(host.onFileUpload).not.toHaveBeenCalled();
      expect(uploads(instance)).toEqual([]);
    }
  );

  it('rejects a file past maxFiles (O1, O3)', async () => {
    const host = uploader();
    const instance = await chatWith({
      maxFiles: 1,
      onFileUpload: host.onFileUpload,
    });
    await instance.messaging.addFile(file('a.txt'));

    await expect(instance.messaging.addFile(file('b.txt'))).rejects.toThrow(
      'would go past upload.maxFiles (1)'
    );
    expect(host.onFileUpload).toHaveBeenCalledTimes(1);
  });

  it('rejects when there is no onFileUpload (O4)', async () => {
    const instance = await chatWith({ isOn: true });

    await expect(instance.messaging.addFile(file('a.txt'))).rejects.toThrow(
      "There's no upload.onFileUpload in the config"
    );
  });

  it('lists files in added order with their status, data, and error (O7, O8, O9)', async () => {
    const host = uploader();
    const instance = await chatWith({ onFileUpload: host.onFileUpload });
    const a = await instance.messaging.addFile(file('a.txt'));
    const b = await instance.messaging.addFile(file('b.txt'));
    const c = await instance.messaging.addFile(file('c.txt'));

    host.calls[1].done.doResolve(dataFor('b'));
    await waitFor(() => expect(uploads(instance)[1].status).toBe('complete'));
    // Another file still runs.
    expect(instance.state.get().hasInFlightUploads).toBe(true);
    host.calls[2].done.doReject(new Error('The file is corrupt.'));
    await waitFor(() => expect(uploads(instance)[2].status).toBe('error'));
    host.calls[0].done.doResolve(dataFor('a'));
    await waitFor(() =>
      expect(instance.state.get().hasInFlightUploads).toBe(false)
    );

    expect(uploads(instance).map(({ id }) => id)).toEqual([a.id, b.id, c.id]);
    expect(uploads(instance)[1]).toMatchObject({
      status: 'complete',
      contributedData: dataFor('b'),
    });
    expect(uploads(instance)[2]).toMatchObject({
      status: 'error',
      errorMessage: 'The file is corrupt.',
    });
    expect(Object.isFrozen(uploads(instance))).toBe(true);
    expect(Object.isFrozen(uploads(instance)[0])).toBe(true);
    // The host's File isn't frozen.
    expect(Object.isFrozen(uploads(instance)[0].file)).toBe(false);
  });

  it('aborts a running upload, drops a finished one, and ignores an unknown ID (O10)', async () => {
    const host = uploader();
    const instance = await chatWith({ onFileUpload: host.onFileUpload });
    const running = await instance.messaging.addFile(file('a.txt'));
    const finished = await instance.messaging.addFile(file('b.txt'));
    host.calls[1].done.doResolve(dataFor('b'));
    await waitFor(() => expect(uploads(instance)[1].status).toBe('complete'));

    instance.messaging.removeFile(running.id);
    expect(host.calls[0].signal.aborted).toBe(true);
    expect(uploads(instance).map(({ id }) => id)).toEqual([finished.id]);

    instance.messaging.removeFile(finished.id);
    expect(uploads(instance)).toEqual([]);

    const before = instance.state.get();
    instance.messaging.removeFile('no-such-file');
    expect(instance.state.get()).toBe(before);
  });

  it('rejects a send while an upload runs, then carries the finished files and empties the list (O11, O12; #1826 O4, O5)', async () => {
    const host = uploader();
    const sent: MessageRequest[] = [];
    const instance = await chatWith({ onFileUpload: host.onFileUpload }, sent);
    await instance.messaging.addFile(file('a.txt'));

    await expect(instance.messaging.send('Hello')).rejects.toThrow(
      'Cannot send while a file upload is in progress'
    );
    expect(sent).toEqual([]);

    host.calls[0].done.doResolve(dataFor('a'));
    await waitFor(() =>
      expect(instance.state.get().hasInFlightUploads).toBe(false)
    );
    await instance.messaging.send('Hello');

    expect(sent).toHaveLength(1);
    expect(sent[0].input.structured_data).toEqual(dataFor('a'));
    expect(uploads(instance)).toEqual([]);
  });

  it('rejects after the chat was removed, asking the host for nothing', async () => {
    const host = uploader();
    const instance = await chatWith({ onFileUpload: host.onFileUpload });
    // The chat's own manager, as its services see it.
    (
      instance.serviceManager.inputActionsService as any
    ).serviceManager.isShutdown = true;

    await expect(instance.messaging.addFile(file('a.txt'))).rejects.toThrow(
      'The chat was removed from the page'
    );
    expect(host.onFileUpload).not.toHaveBeenCalled();
  });

  it('keeps an unchanged entry and the list object while nothing about them changes', async () => {
    const host = uploader();
    const instance = await chatWith({ onFileUpload: host.onFileUpload });
    await instance.messaging.addFile(file('a.txt'));
    await instance.messaging.addFile(file('b.txt'));
    const [first] = uploads(instance);
    const list = uploads(instance);

    instance.input.updateRawValue(() => 'typing');
    expect(uploads(instance)).toBe(list);

    host.calls[1].done.doResolve(dataFor('b'));
    await waitFor(() => expect(uploads(instance)[1].status).toBe('complete'));
    expect(uploads(instance)[0]).toBe(first);
  });

  it('marks a file failed when onFileUpload throws at once', async () => {
    const instance = await chatWith({
      onFileUpload: () => {
        throw new Error('No uploads today.');
      },
    });

    await instance.messaging.addFile(file('a.txt'));

    await waitFor(() =>
      expect(uploads(instance)[0]).toMatchObject({
        status: 'error',
        errorMessage: 'No uploads today.',
      })
    );
  });

  it('aborts a running upload with CHAT_REMOVED when the chat shuts down', async () => {
    const host = uploader();
    const instance = await chatWith({ onFileUpload: host.onFileUpload });
    await instance.messaging.addFile(file('a.txt'));

    await (
      instance.serviceManager.inputActionsService as any
    ).serviceManager.shutdown();

    expect(host.calls[0].signal.reason).toBe(CancellationReason.CHAT_REMOVED);
  });

  it('settles an upload in the input it started in when an agent connects meanwhile', async () => {
    const host = uploader();
    const instance = await chatWith({ onFileUpload: host.onFileUpload });
    const { id } = await instance.messaging.addFile(file('a.txt'));
    const manager = (instance.serviceManager.inputActionsService as any)
      .serviceManager;
    manager.store.dispatch(
      actions.changeState({
        persistedToBrowserStorage: { humanAgentState: { isConnected: true } },
      })
    );

    host.calls[0].done.doResolve(dataFor('a'));
    await waitFor(() =>
      expect(
        manager.store.getState().assistantInputState.pendingUploads[0].status
      ).toBe('complete')
    );
    // removeFile finds it even though the input now goes to the agent.
    instance.messaging.removeFile(id);
    expect(manager.store.getState().assistantInputState.pendingUploads).toEqual(
      []
    );
  });

  it('keeps a host-only upload failure out of the input when the attach button is off', async () => {
    const instance = await chatWith({
      onFileUpload: async () => {
        throw new Error('Rejected by the server.');
      },
    });
    await instance.messaging.addFile(file('a.txt'));
    await waitFor(() => expect(uploads(instance)[0].status).toBe('error'));
    await new Promise((resolve) => setTimeout(resolve, 50));

    const input = deepQuerySelector(
      getChatShadowRoot(),
      'cds-aichat-chat-input'
    ) as unknown as { inputProps: { uploadErrors?: unknown[] } };
    expect(input).toBeTruthy();
    // No banner pointing at an attachment the input can't show, and send isn't blocked.
    expect(input.inputProps.uploadErrors ?? []).toEqual([]);
  });

  describe('during a human agent conversation (O6)', () => {
    async function agentChat(capabilities: Record<string, unknown>) {
      const host = uploader();
      const instance = await chatWith({ onFileUpload: host.onFileUpload });
      const { serviceManager } = instance;
      const desk = {
        getName: () => 'stub-desk',
        startChat: jest.fn().mockResolvedValue(undefined),
        endChat: jest.fn().mockResolvedValue(undefined),
        sendMessageToAgent: jest.fn().mockResolvedValue(undefined),
        filesSelectedForUpload: jest.fn(),
      };
      const impl =
        serviceManager.humanAgentService ??
        createHumanAgentService(serviceManager);
      (impl as any).serviceDesk = desk as unknown as ServiceDesk;
      (impl as any).chatStarted = true;
      serviceManager.humanAgentService = impl;
      serviceManager.store.dispatch(
        actions.changeState({
          persistedToBrowserStorage: {
            humanAgentState: { isConnected: true },
          },
        })
      );
      serviceManager.store.dispatch(updateCapabilities(capabilities as any));
      return { instance, host, desk, impl };
    }

    it('hands the file to the service desk, which receives it with the next message', async () => {
      const { instance, host, desk, impl } = await agentChat({
        allowFileUploads: true,
        allowMultipleFileUploads: true,
      });
      const picked = file('a.txt');

      const { id } = await instance.messaging.addFile(picked);

      expect(host.onFileUpload).not.toHaveBeenCalled();
      expect(desk.filesSelectedForUpload).toHaveBeenCalledWith([
        expect.objectContaining({ id, file: picked }),
      ]);
      expect(uploads(instance)).toEqual([
        expect.objectContaining({ id, file: picked, status: 'complete' }),
      ]);

      // The prebuilt input sends the agent slice's files with the message.
      const { files } = selectInputState(
        instance.serviceManager.store.getState()
      );
      await impl.sendMessageToAgent('Here it is', files);
      expect(desk.sendMessageToAgent).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          filesToUpload: [expect.objectContaining({ id, file: picked })],
        })
      );
    });

    it("checks the desk's limits, and removes a staged file", async () => {
      const { instance } = await agentChat({
        allowFileUploads: true,
        allowedFileUploadTypes: 'image/*',
      });
      await expect(instance.messaging.addFile(file('a.txt'))).rejects.toThrow(
        "isn't a type the service desk accepts"
      );

      const { id } = await instance.messaging.addFile(
        file('a.png', 3, 'image/png')
      );
      instance.messaging.removeFile(id);
      expect(uploads(instance)).toEqual([]);
    });

    it('takes one file at a time when the desk allows only one', async () => {
      const { instance } = await agentChat({
        allowFileUploads: true,
        allowMultipleFileUploads: false,
      });
      await instance.messaging.addFile(file('a.txt'));

      await expect(instance.messaging.addFile(file('b.txt'))).rejects.toThrow(
        "would go past the service desk's limit of 1 for one message"
      );
    });

    it('rejects when the desk takes no files', async () => {
      const { instance } = await agentChat({ allowFileUploads: false });

      await expect(instance.messaging.addFile(file('a.txt'))).rejects.toThrow(
        "The service desk doesn't take files"
      );
    });
  });
});
