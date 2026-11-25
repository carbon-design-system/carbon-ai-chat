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
  click,
  contractChat,
  contractSetup,
  DANA,
  fakeDesk,
  getByTestId,
  typeText,
} from '../helpers/contract';

describe('public composer agent file ownership', () => {
  contractSetup();

  it('stages a public file with the joined desk, sends it with the real composer, and stays uploading until the desk reports it done', async () => {
    const desk = fakeDesk();
    const onFileUpload = vi.fn(async (): Promise<StructuredData> => ({
      fields: [],
    }));
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      upload: { onFileUpload },
      serviceDeskFactory: desk.factory,
    });
    let fileID: string;
    try {
      await act(async () => {
        await mount.instance.serviceDesk.startConversation();
        await desk.callback().agentJoined(DANA);
        desk.callback().updateCapabilities({
          allowFileUploads: true,
          allowMultipleFileUploads: true,
        });
      });
      const file = new File(['owned'], 'agent-notes.txt', {
        type: 'text/plain',
      });
      await act(async () => {
        fileID = (await mount.instance.messaging.addFile(file)).id;
      });
      // The desk takes the file; the assistant upload callback never runs.
      expect(desk.desk.filesSelectedForUpload).toHaveBeenCalledWith([
        expect.objectContaining({ id: fileID, file }),
      ]);
      expect(onFileUpload).not.toHaveBeenCalled();
      expect(mount.instance.state.get().pendingUploads).toEqual([
        expect.objectContaining({ id: fileID, file, status: 'complete' }),
      ]);
      expect(mount.instance.state.get().humanAgent.isUploadingFile).toBe(false);

      await typeText('Here are the agent notes');
      await click(getByTestId(PageObjectId.INPUT_SEND));
      await waitFor(() =>
        expect(desk.desk.sendMessageToAgent).toHaveBeenCalledTimes(1)
      );
      const [message, , additionalData] =
        desk.desk.sendMessageToAgent.mock.calls[0];
      expect(message.input.text).toBe('Here are the agent notes');
      expect(additionalData.filesToUpload).toEqual([
        expect.objectContaining({ id: fileID, file }),
      ]);
      expect(mount.instance.state.get().pendingUploads).toEqual([]);
      expect(mount.instance.state.get().humanAgent.isUploadingFile).toBe(true);

      await act(() => desk.callback().setFileUploadStatus(fileID));
      expect(mount.instance.state.get().humanAgent.isUploadingFile).toBe(false);
      await waitFor(() =>
        expect(mount.instance.state.get().status).toBe('ready')
      );
    } finally {
      try {
        await act(() => mount.instance.serviceDesk.endConversation());
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });
});
