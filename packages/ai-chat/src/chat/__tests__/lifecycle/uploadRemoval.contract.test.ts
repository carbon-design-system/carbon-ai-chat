/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { waitFor } from '@testing-library/react';

import {
  CancellationReason,
  StructuredData,
  ViewType,
} from '../../../aiChatEntry';
import {
  addConnect,
  changeView,
  contractChat,
  contractSetup,
  fakeDesk,
  pickFiles,
} from '../helpers/contract';

// @covers config.upload.onFileUpload instance.serviceDesk.endConversation
// @covers host.ChatContainer

describe('an upload when its host leaves', () => {
  contractSetup();

  it('aborts with CHAT_REMOVED after disconnecting the service desk', async () => {
    const desk = fakeDesk();
    const reasons: unknown[] = [];
    let uploadSignal: AbortSignal;
    let ending: Promise<void>;
    const mount = await contractChat({
      strings: { input_uploadButtonLabel: 'Attach a file' },
      serviceDeskFactory: desk.factory,
      serviceDesk: { skipConnectHumanAgentCard: true },
      messaging: { skipWelcome: true },
      upload: {
        isOn: true,
        onFileUpload: (_file, signal) => {
          uploadSignal = signal;
          signal.addEventListener('abort', () => {
            reasons.push(signal.reason);
            ending = instance.serviceDesk.endConversation();
          });
          return new Promise<StructuredData>(() => {});
        },
      },
    });
    const { instance } = mount;
    await changeView(instance, ViewType.MAIN_WINDOW);
    await pickFiles('Attach a file', [new File(['x'], 'pending.pdf')]);
    await addConnect(instance);
    await waitFor(() => expect(desk.desk.startChat).toHaveBeenCalledTimes(1));
    expect(uploadSignal.aborted).toBe(false);
    expect(instance.getState().humanAgent.isConnected).toBe(false);

    mount.unmount();
    await waitFor(() => expect(uploadSignal.aborted).toBe(true));
    await ending;

    expect(reasons).toEqual([CancellationReason.CHAT_REMOVED]);
    expect(desk.desk.endChat).not.toHaveBeenCalled();
  });
});
