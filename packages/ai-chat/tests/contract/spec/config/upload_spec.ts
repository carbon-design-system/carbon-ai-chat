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
  ChatInstance,
  StructuredData,
  UploadConfig,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  allByRole,
  byRole,
  changeView,
  click,
  contractChat,
  contractSetup,
  fakeBackend,
  finishSend,
  instanceSender,
  isDisabled,
  pickFiles,
  shownText,
  startSend,
} from '../../helpers';

// Copy the tests set through `strings`, so they find controls by names they own.
const STRINGS = {
  input_uploadButtonLabel: 'Contract attach',
  input_buttonLabel: 'Contract send',
  fileSharing_removeButtonTitleWithName: 'Contract remove {filename}',
  fileSharing_uploadErrorTitleWithName: 'Contract upload failed: {filename}',
};

const attachButtons = () =>
  allByRole('button', STRINGS.input_uploadButtonLabel);
const removeButton = (name: string) =>
  byRole('button', `Contract remove ${name}`);
const sendButton = () => byRole('button', STRINGS.input_buttonLabel);

/** A file of `size` bytes. */
function makeFile(name: string, type = 'application/pdf', size = 3): File {
  return new File(['x'.repeat(size)], name, { type });
}

/** One call the chat made to `onFileUpload`, left open until the test settles it. */
interface UploadCall {
  file: File;
  signal: AbortSignal;
  resolve: (data: StructuredData) => void;
  reject: (error: unknown) => void;
}

/** An `onFileUpload` that records each call and leaves it open. */
function fakeUploader() {
  const calls: UploadCall[] = [];
  const onFileUpload = (file: File, signal: AbortSignal) =>
    new Promise<StructuredData>((resolve, reject) => {
      calls.push({ file, signal, resolve, reject });
    });
  return {
    calls,
    onFileUpload,
    names: () => calls.map((call) => call.file.name),
  };
}

/** Settles an upload call inside `act`. */
async function settle(
  call: UploadCall,
  outcome: { data: StructuredData } | { error: unknown }
): Promise<void> {
  await act(async () => {
    if ('data' in outcome) {
      call.resolve(outcome.data);
    } else {
      call.reject(outcome.error);
    }
  });
}

/** Mounts a chat with upload on and opens the main window. */
async function openChat(
  upload: Partial<UploadConfig>,
  backend = fakeBackend()
): Promise<{ instance: ChatInstance; host: HTMLElement; unmount: () => void }> {
  const mount = await contractChat({
    strings: STRINGS,
    messaging: {
      skipWelcome: true,
      customSendMessage: backend.customSendMessage,
    },
    upload: { isOn: true, ...upload },
  });
  await changeView(mount.instance, ViewType.MAIN_WINDOW);
  return mount;
}

const fileField = (id: string, value: string) => ({
  id,
  type: 'file',
  value,
});

// @covers config.upload config.upload.isOn config.upload.onFileUpload
describe('upload: the attach button', () => {
  contractSetup();

  let consoleError: jest.SpyInstance;
  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => consoleError?.mockRestore());

  /** The console errors that name an upload config field. */
  const uploadErrors = () =>
    consoleError.mock.calls
      .map((args) => args.map(String).join(' '))
      .filter((text) => /onFileUpload|isOn/.test(text));

  it('shows when isOn is true and onFileUpload is set, and logs no upload error', async () => {
    await openChat({ onFileUpload: fakeUploader().onFileUpload });
    expect(attachButtons()).toHaveLength(1);
    expect(uploadErrors()).toEqual([]);
  });

  it('is absent with no upload config', async () => {
    const { instance } = await contractChat({
      strings: STRINGS,
      messaging: { skipWelcome: true },
    });
    await changeView(instance, ViewType.MAIN_WINDOW);
    expect(attachButtons()).toHaveLength(0);
    expect(uploadErrors()).toEqual([]);
  });

  it.each([
    ['omitted', {}],
    ['false', { isOn: false }],
  ])(
    'is absent when isOn is %s, even with onFileUpload set, and logs an error',
    async (_label, isOn) => {
      const { instance } = await contractChat({
        strings: STRINGS,
        messaging: { skipWelcome: true },
        upload: { onFileUpload: fakeUploader().onFileUpload, ...isOn },
      });
      await changeView(instance, ViewType.MAIN_WINDOW);
      expect(attachButtons()).toHaveLength(0);
      expect(uploadErrors()).toHaveLength(1);
      expect(uploadErrors()[0]).toContain('isOn');
    }
  );

  it('is absent when isOn is true but onFileUpload is missing, and logs an error naming onFileUpload', async () => {
    await openChat({});
    expect(attachButtons()).toHaveLength(0);
    expect(uploadErrors()).toHaveLength(1);
    expect(uploadErrors()[0]).toContain('onFileUpload');
  });
});

// @covers config.upload.onFileUpload state.input.hasInFlightUploads
describe('upload: onFileUpload', () => {
  contractSetup();

  it('is called once per picked file, with the file and a live abort signal', async () => {
    const uploader = fakeUploader();
    await openChat({ onFileUpload: uploader.onFileUpload });
    const first = makeFile('first.pdf');
    const second = makeFile('second.pdf');
    await pickFiles(STRINGS.input_uploadButtonLabel, [first, second]);
    expect(uploader.calls.map((call) => call.file)).toEqual([first, second]);
    expect(uploader.calls.map((call) => call.signal)).toEqual([
      expect.any(AbortSignal),
      expect.any(AbortSignal),
    ]);
    expect(uploader.calls.map((call) => call.signal.aborted)).toEqual([
      false,
      false,
    ]);
  });

  it('shows the file by name while it uploads', async () => {
    const uploader = fakeUploader();
    await openChat({ onFileUpload: uploader.onFileUpload });
    await pickFiles(STRINGS.input_uploadButtonLabel, [makeFile('report.pdf')]);
    expect(allByRole('group', 'report.pdf')).toHaveLength(1);
  });

  it('puts what onFileUpload returns into input.structuredData once it resolves', async () => {
    const uploader = fakeUploader();
    const { instance } = await openChat({
      onFileUpload: uploader.onFileUpload,
    });
    await pickFiles(STRINGS.input_uploadButtonLabel, [makeFile('report.pdf')]);
    expect(instance.getState().input.structuredData).toBeUndefined();
    await settle(uploader.calls[0], {
      data: { fields: [fileField('doc', 'ref-1')] },
    });
    expect(instance.getState().input.structuredData).toEqual({
      fields: [fileField('doc', 'ref-1')],
    });
  });

  it('merges each file’s fields in the order the files were picked, whatever order they finish in', async () => {
    const uploader = fakeUploader();
    const { instance } = await openChat({
      onFileUpload: uploader.onFileUpload,
    });
    await pickFiles(STRINGS.input_uploadButtonLabel, [
      makeFile('b.pdf'),
      makeFile('a.pdf'),
    ]);
    await settle(uploader.calls[1], {
      data: { fields: [fileField('from-a', 'ref-a')] },
    });
    await settle(uploader.calls[0], {
      data: {
        fields: [fileField('from-b', 'ref-b')],
        user_defined: { note: 'b' },
      },
    });
    expect(instance.getState().input.structuredData).toEqual({
      fields: [fileField('from-b', 'ref-b'), fileField('from-a', 'ref-a')],
      user_defined: { note: 'b' },
    });
  });

  it('sends the merged data on the next send, then clears the attachments', async () => {
    const backend = fakeBackend();
    const uploader = fakeUploader();
    const { instance } = await openChat(
      { onFileUpload: uploader.onFileUpload },
      backend
    );
    await pickFiles(STRINGS.input_uploadButtonLabel, [makeFile('report.pdf')]);
    await settle(uploader.calls[0], {
      data: { fields: [fileField('doc', 'ref-1')] },
    });
    const started = await startSend(instanceSender(instance, backend), 'hi');
    expect(started.sent.request.input.structured_data).toEqual({
      fields: [fileField('doc', 'ref-1')],
    });
    await finishSend(started);
    expect(instance.getState().input.structuredData).toBeUndefined();
    expect(allByRole('group', 'report.pdf')).toHaveLength(0);
  });

  it('drops a finished file’s data when the user removes it', async () => {
    const uploader = fakeUploader();
    const { instance } = await openChat({
      onFileUpload: uploader.onFileUpload,
    });
    await pickFiles(STRINGS.input_uploadButtonLabel, [
      makeFile('a.pdf'),
      makeFile('b.pdf'),
    ]);
    await settle(uploader.calls[0], {
      data: { fields: [fileField('from-a', 'ref-a')] },
    });
    await settle(uploader.calls[1], {
      data: { fields: [fileField('from-b', 'ref-b')] },
    });
    await click(removeButton('a.pdf'));
    expect(instance.getState().input.structuredData).toEqual({
      fields: [fileField('from-b', 'ref-b')],
    });
    expect(allByRole('group', 'a.pdf')).toHaveLength(0);
    expect(allByRole('group', 'b.pdf')).toHaveLength(1);
  });

  it('shows the error message onFileUpload rejects with, under the chat’s title naming the file', async () => {
    const uploader = fakeUploader();
    const { instance, host } = await openChat({
      onFileUpload: uploader.onFileUpload,
    });
    await pickFiles(STRINGS.input_uploadButtonLabel, [makeFile('report.pdf')]);
    await settle(uploader.calls[0], {
      error: new Error('Contract reason: too large'),
    });
    await waitFor(() => {
      const text = shownText(host);
      expect(text).toContain('Contract upload failed: report.pdf');
      expect(text).toContain('Contract reason: too large');
    });
    expect(instance.getState().input.structuredData).toBeUndefined();
    expect(instance.getState().input.hasInFlightUploads).toBe(false);
  });

  it('sends nothing from a failed file, and the user can remove it', async () => {
    const backend = fakeBackend();
    const uploader = fakeUploader();
    const { instance } = await openChat(
      { onFileUpload: uploader.onFileUpload },
      backend
    );
    await pickFiles(STRINGS.input_uploadButtonLabel, [makeFile('report.pdf')]);
    await settle(uploader.calls[0], { error: new Error('nope') });
    const started = await startSend(instanceSender(instance, backend), 'hi');
    expect(started.sent.request.input.structured_data).toBeUndefined();
    await finishSend(started);
    await pickFiles(STRINGS.input_uploadButtonLabel, [makeFile('other.pdf')]);
    await settle(uploader.calls[1], { error: new Error('nope') });
    await click(removeButton('other.pdf'));
    expect(allByRole('group', 'other.pdf')).toHaveLength(0);
  });

  it('offers a remove control while a file uploads, which aborts the signal and drops the file', async () => {
    const backend = fakeBackend();
    const uploader = fakeUploader();
    const { instance } = await openChat(
      { onFileUpload: uploader.onFileUpload },
      backend
    );
    await pickFiles(STRINGS.input_uploadButtonLabel, [makeFile('report.pdf')]);
    expect(instance.getState().input.hasInFlightUploads).toBe(true);
    await click(removeButton('report.pdf'));
    expect(uploader.calls[0].signal.aborted).toBe(true);
    expect(allByRole('group', 'report.pdf')).toHaveLength(0);
    expect(instance.getState().input.hasInFlightUploads).toBe(false);
    // A host that ignores the signal and resolves anyway adds nothing.
    await settle(uploader.calls[0], {
      data: { fields: [fileField('doc', 'ref-1')] },
    });
    expect(instance.getState().input.structuredData).toBeUndefined();
    const started = await startSend(instanceSender(instance, backend), 'hi');
    expect(started.sent.request.input.structured_data).toBeUndefined();
    await finishSend(started);
  });

  it('aborts the signal when the chat unmounts mid-upload', async () => {
    const uploader = fakeUploader();
    const { unmount } = await openChat({ onFileUpload: uploader.onFileUpload });
    await pickFiles(STRINGS.input_uploadButtonLabel, [makeFile('report.pdf')]);
    expect(uploader.calls[0].signal.aborted).toBe(false);
    unmount();
    await waitFor(() => expect(uploader.calls[0].signal.aborted).toBe(true));
  });
});

// @covers config.upload.onFileUpload state.input.hasInFlightUploads
// @covers instance.messaging.restartConversation instance.destroySession
describe('upload: restart and destroySession', () => {
  contractSetup();

  const resets: [string, (instance: ChatInstance) => Promise<void>][] = [
    [
      'restartConversation',
      (instance) => instance.messaging.restartConversation(),
    ],
    ['destroySession', (instance) => instance.destroySession(true)],
  ];

  for (const [name, reset] of resets) {
    it(`${name} aborts an upload in progress and drops its file, which adds nothing to the next send`, async () => {
      const backend = fakeBackend();
      const uploader = fakeUploader();
      const { instance } = await openChat(
        { onFileUpload: uploader.onFileUpload },
        backend
      );
      await pickFiles(STRINGS.input_uploadButtonLabel, [
        makeFile('report.pdf'),
      ]);
      expect(instance.getState().input.hasInFlightUploads).toBe(true);
      await act(async () => {
        await reset(instance);
      });
      expect(uploader.calls[0].signal.aborted).toBe(true);
      expect(allByRole('group', 'report.pdf')).toHaveLength(0);
      expect(instance.getState().input.hasInFlightUploads).toBe(false);
      // A host that ignores the signal and resolves anyway adds nothing.
      await settle(uploader.calls[0], {
        data: { fields: [fileField('doc', 'ref-1')] },
      });
      expect(instance.getState().input.structuredData).toBeUndefined();
      const started = await startSend(instanceSender(instance, backend), 'hi');
      expect(started.sent.request.input.structured_data).toBeUndefined();
      await finishSend(started);
    });
  }
});

// @covers state.input.hasInFlightUploads config.upload.onFileUpload instance.send
describe('upload: hasInFlightUploads', () => {
  contractSetup();

  it('is false with no upload, true while onFileUpload is pending, and false once it resolves', async () => {
    const uploader = fakeUploader();
    const { instance } = await openChat({
      onFileUpload: uploader.onFileUpload,
    });
    expect(instance.getState().input.hasInFlightUploads).toBe(false);
    await pickFiles(STRINGS.input_uploadButtonLabel, [
      makeFile('a.pdf'),
      makeFile('b.pdf'),
    ]);
    expect(instance.getState().input.hasInFlightUploads).toBe(true);
    await settle(uploader.calls[0], { data: {} });
    expect(instance.getState().input.hasInFlightUploads).toBe(true);
    await settle(uploader.calls[1], { data: {} });
    expect(instance.getState().input.hasInFlightUploads).toBe(false);
  });

  it('turns false when onFileUpload rejects', async () => {
    const uploader = fakeUploader();
    const { instance } = await openChat({
      onFileUpload: uploader.onFileUpload,
    });
    await pickFiles(STRINGS.input_uploadButtonLabel, [makeFile('a.pdf')]);
    await settle(uploader.calls[0], { error: new Error('nope') });
    expect(instance.getState().input.hasInFlightUploads).toBe(false);
  });

  it('disables the send button while true, and enables it once the upload finishes', async () => {
    const uploader = fakeUploader();
    await openChat({ onFileUpload: uploader.onFileUpload });
    await pickFiles(STRINGS.input_uploadButtonLabel, [makeFile('a.pdf')]);
    expect(isDisabled(sendButton())).toBe(true);
    await settle(uploader.calls[0], { data: {} });
    // A finished attachment is enough to send, with no text.
    expect(isDisabled(sendButton())).toBe(false);
  });

  it('makes send reject without calling customSendMessage while true', async () => {
    const backend = fakeBackend();
    const uploader = fakeUploader();
    const { instance } = await openChat(
      { onFileUpload: uploader.onFileUpload },
      backend
    );
    await pickFiles(STRINGS.input_uploadButtonLabel, [makeFile('a.pdf')]);
    await expect(instance.send('hi')).rejects.toThrow();
    expect(backend.requests).toHaveLength(0);
    expect(instance.getState().messages).toEqual([]);
    await settle(uploader.calls[0], {
      data: { fields: [fileField('doc', 'ref-1')] },
    });
    const started = await startSend(instanceSender(instance, backend), 'hi');
    expect(started.sent.request.input.structured_data).toEqual({
      fields: [fileField('doc', 'ref-1')],
    });
    await finishSend(started);
  });
});

// @covers config.upload.accept
describe('upload: accept', () => {
  contractSetup();

  // jsdom has no `URL.createObjectURL`, which the chat calls to preview an
  // attached image. Stand in for it while these tests attach images.
  const { createObjectURL, revokeObjectURL } = URL;
  beforeEach(() => {
    URL.createObjectURL = () => 'blob:contract-preview';
    URL.revokeObjectURL = () => {};
  });
  afterEach(() => {
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
  });

  it('passes only files matching an extension list to onFileUpload', async () => {
    const uploader = fakeUploader();
    await openChat({
      onFileUpload: uploader.onFileUpload,
      accept: '.pdf,.docx',
    });
    await pickFiles(STRINGS.input_uploadButtonLabel, [
      makeFile('notes.txt', 'text/plain'),
      makeFile('report.pdf'),
      makeFile('letter.docx', ''),
    ]);
    expect(uploader.names()).toEqual(['report.pdf', 'letter.docx']);
    expect(allByRole('group', 'notes.txt')).toHaveLength(0);
  });

  it('matches a MIME wildcard against the file’s type', async () => {
    const uploader = fakeUploader();
    await openChat({ onFileUpload: uploader.onFileUpload, accept: 'image/*' });
    await pickFiles(STRINGS.input_uploadButtonLabel, [
      makeFile('photo.png', 'image/png'),
      makeFile('report.pdf'),
    ]);
    expect(uploader.names()).toEqual(['photo.png']);
  });

  it('passes every file when omitted', async () => {
    const uploader = fakeUploader();
    await openChat({ onFileUpload: uploader.onFileUpload });
    await pickFiles(STRINGS.input_uploadButtonLabel, [
      makeFile('notes.txt', 'text/plain'),
      makeFile('photo.png', 'image/png'),
    ]);
    expect(uploader.names()).toEqual(['notes.txt', 'photo.png']);
  });
});

// @covers config.upload.maxFileSizeBytes
describe('upload: maxFileSizeBytes', () => {
  contractSetup();

  it('passes a file at the limit and rejects one over it before onFileUpload', async () => {
    const uploader = fakeUploader();
    await openChat({
      onFileUpload: uploader.onFileUpload,
      maxFileSizeBytes: 10,
    });
    await pickFiles(STRINGS.input_uploadButtonLabel, [
      makeFile('big.pdf', 'application/pdf', 11),
      makeFile('fits.pdf', 'application/pdf', 10),
    ]);
    expect(uploader.names()).toEqual(['fits.pdf']);
    expect(allByRole('group', 'big.pdf')).toHaveLength(0);
  });
});

// @covers config.upload.maxFiles
describe('upload: maxFiles', () => {
  contractSetup();

  it('passes only the first files up to the limit from one pick', async () => {
    const uploader = fakeUploader();
    await openChat({ onFileUpload: uploader.onFileUpload, maxFiles: 2 });
    await pickFiles(STRINGS.input_uploadButtonLabel, [
      makeFile('a.pdf'),
      makeFile('b.pdf'),
      makeFile('c.pdf'),
    ]);
    expect(uploader.names()).toEqual(['a.pdf', 'b.pdf']);
  });

  it('counts files already attached, and disables the attach button at the limit until one is removed', async () => {
    const uploader = fakeUploader();
    await openChat({ onFileUpload: uploader.onFileUpload, maxFiles: 2 });
    await pickFiles(STRINGS.input_uploadButtonLabel, [makeFile('a.pdf')]);
    expect(isDisabled(byRole('button', STRINGS.input_uploadButtonLabel))).toBe(
      false
    );
    await pickFiles(STRINGS.input_uploadButtonLabel, [
      makeFile('b.pdf'),
      makeFile('c.pdf'),
    ]);
    expect(uploader.names()).toEqual(['a.pdf', 'b.pdf']);
    expect(isDisabled(byRole('button', STRINGS.input_uploadButtonLabel))).toBe(
      true
    );
    await settle(uploader.calls[0], { data: {} });
    await settle(uploader.calls[1], { data: {} });
    await click(removeButton('a.pdf'));
    expect(isDisabled(byRole('button', STRINGS.input_uploadButtonLabel))).toBe(
      false
    );
  });

  it('sets no limit when omitted', async () => {
    const uploader = fakeUploader();
    await openChat({ onFileUpload: uploader.onFileUpload });
    const files = ['a', 'b', 'c', 'd', 'e'].map((name) =>
      makeFile(`${name}.pdf`)
    );
    await pickFiles(STRINGS.input_uploadButtonLabel, files);
    expect(uploader.names()).toEqual([
      'a.pdf',
      'b.pdf',
      'c.pdf',
      'd.pdf',
      'e.pdf',
    ]);
    expect(isDisabled(byRole('button', STRINGS.input_uploadButtonLabel))).toBe(
      false
    );
  });
});
