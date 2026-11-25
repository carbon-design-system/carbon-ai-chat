/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import { PageObjectId, type StructuredData } from '../../../aiChatEntry';
import {
  byRole,
  click,
  contractChat,
  contractSetup,
  fakeBackend,
  getByTestId,
  isDisabled,
  pickFiles,
  shownText,
} from '../helpers/contract';

function uploaded(name: string): StructuredData {
  return {
    fields: [
      {
        id: name,
        type: 'file',
        value: {
          type: 'reference',
          id: name,
          name,
          mime_type: 'application/pdf',
        },
      },
    ],
  };
}

const strings = {
  input_uploadButtonLabel: 'Utility attach',
  input_buttonLabel: 'Utility send',
  messages_attachmentsLabel: 'Utility uploaded attachments',
  fileSharing_uploadErrorTitleWithName: 'Utility upload failed: {filename}',
  fileSharing_fileTooLarge: 'Utility oversized rejection above {maxSize}',
  fileSharing_removeButtonTitleWithName: 'Utility remove {filename}',
};

function assertiveText(root: ParentNode = document): string {
  return Array.from(root.querySelectorAll('*'))
    .flatMap((element) => [
      ...(element.getAttribute('aria-live') === 'assertive'
        ? [element.textContent ?? '']
        : []),
      ...(element.shadowRoot ? [assertiveText(element.shadowRoot)] : []),
    ])
    .join(' ');
}

describe('public upload recovery', () => {
  contractSetup();

  it('does not spend a one-file budget on an oversized rejection before a valid selection', async () => {
    const backend = fakeBackend({ autoResolve: true });
    const names: string[] = [];
    const mount = await contractChat({
      openChatByDefault: true,
      strings,
      messaging: {
        skipWelcome: true,
        customSendMessage: backend.customSendMessage,
      },
      upload: {
        isOn: true,
        maxFiles: 1,
        maxFileSizeBytes: 10,
        onFileUpload: async (file) => {
          names.push(file.name);
          return uploaded(file.name);
        },
      },
    });
    try {
      await pickFiles('Utility attach', [
        new File(['x'.repeat(11)], 'oversized.pdf', {
          type: 'application/pdf',
        }),
        new File(['x'], 'fits.pdf', { type: 'application/pdf' }),
      ]);
      await waitFor(() => expect(names).toEqual(['fits.pdf']));
      await waitFor(() =>
        expect(mount.instance.state.get().input.hasInFlightUploads).toBe(false)
      );
      await waitFor(() =>
        expect(assertiveText()).toContain(
          'Utility oversized rejection above 10 B'
        )
      );
      expect(isDisabled(getByTestId(PageObjectId.INPUT_SEND))).toBe(false);
      await click(getByTestId(PageObjectId.INPUT_SEND));
      await waitFor(() => expect(backend.requests).toHaveLength(1));
      expect(backend.requests[0].request.input.structured_data).toEqual(
        uploaded('fits.pdf')
      );
      await waitFor(() =>
        expect(
          shownText(byRole('list', 'Utility uploaded attachments'))
        ).toContain('fits.pdf')
      );
    } finally {
      await act(async () => mount.unmount());
    }
  });

  it('keeps failed uploads unsendable until their removal and then sends the surviving file without text', async () => {
    const backend = fakeBackend({ autoResolve: true });
    const mount = await contractChat({
      openChatByDefault: true,
      strings,
      messaging: {
        skipWelcome: true,
        customSendMessage: backend.customSendMessage,
      },
      upload: {
        isOn: true,
        maxFiles: 2,
        onFileUpload: async (file) => {
          if (file.name === 'failed.pdf') {
            throw new Error('Utility rejected upload');
          }
          return uploaded(file.name);
        },
      },
    });
    try {
      await pickFiles('Utility attach', [
        new File(['bad'], 'failed.pdf', { type: 'application/pdf' }),
      ]);
      await waitFor(() =>
        expect(shownText(mount.host)).toContain('Utility rejected upload')
      );
      await waitFor(() =>
        expect(mount.instance.state.get().input.hasInFlightUploads).toBe(false)
      );
      expect(isDisabled(getByTestId(PageObjectId.INPUT_SEND))).toBe(true);
      expect(backend.requests).toHaveLength(0);
      await pickFiles('Utility attach', [
        new File(['good'], 'survived.pdf', { type: 'application/pdf' }),
      ]);
      await waitFor(() =>
        expect(mount.instance.state.get().input.hasInFlightUploads).toBe(false)
      );
      expect(isDisabled(getByTestId(PageObjectId.INPUT_SEND))).toBe(true);
      expect(shownText(mount.host)).toContain('Utility rejected upload');
      await click(byRole('button', 'Utility remove failed.pdf'));
      await waitFor(() =>
        expect(isDisabled(getByTestId(PageObjectId.INPUT_SEND))).toBe(false)
      );
      expect(shownText(mount.host)).not.toContain('Utility rejected upload');
      await click(getByTestId(PageObjectId.INPUT_SEND));
      await waitFor(() => expect(backend.requests).toHaveLength(1));
      expect(backend.requests[0].request.input.text).toBe('');
      expect(backend.requests[0].request.input.structured_data).toEqual(
        uploaded('survived.pdf')
      );
      await waitFor(() =>
        expect(
          shownText(byRole('list', 'Utility uploaded attachments'))
        ).toContain('survived.pdf')
      );
    } finally {
      await act(async () => mount.unmount());
    }
  });
});
