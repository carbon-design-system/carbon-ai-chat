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
  PageObjectId,
  type BusEventHumanAgentPreSend,
  type MessageRequest,
  type PublicConfig,
  type ServiceDesk,
  type ServiceDeskCallback,
  type StructuredData,
} from '../../../aiChatEntry';
import {
  DANA,
  allByRole,
  byRole,
  click,
  contractChat,
  contractSetup,
  deferred,
  getByTestId,
  isDisabled,
  pause,
  pickFiles,
  shownText,
  textResponse,
  typeText,
} from '../helpers/contract';

const MANUAL: StructuredData = {
  fields: [{ id: 'account', value: 'consumer-account' }],
};
const FILE: StructuredData = {
  fields: [
    {
      id: 'attachment',
      type: 'file',
      value: { type: 'reference', id: 'uploaded-reference', name: 'owned.pdf' },
    },
  ],
};
const ATTACH = 'Owner attach';
const REASON = 'The upload host refused this document.';
const TITLE = 'Owner upload error';
const RECOVERY = 'Remove this document to retry.';
const strings = {
  input_uploadButtonLabel: ATTACH,
  fileSharing_removeButtonTitleWithName: 'Owner remove {filename}',
  fileSharing_uploadErrorTitle: TITLE,
  fileSharing_uploadErrorTitleWithName: 'Owner upload error: {filename}',
  fileSharing_uploadErrorRecovery: RECOVERY,
};

function liveRegions(
  root: ParentNode = document
): { live: string; text: string }[] {
  const found: { live: string; text: string }[] = [];
  for (const element of Array.from(root.querySelectorAll('*'))) {
    const live = element.getAttribute('aria-live');
    if (live) {
      found.push({ live, text: element.textContent ?? '' });
    }
    if (element.shadowRoot) {
      found.push(...liveRegions(element.shadowRoot));
    }
  }
  return found;
}

describe('public upload and agent submission ownership', () => {
  contractSetup();

  it('preserves the current reply through a blocked upload send and removes only the real file contribution', async () => {
    const upload = deferred<StructuredData>();
    const sent: MessageRequest[] = [];
    const mount = await contractChat({
      openChatByDefault: true,
      strings,
      messaging: {
        skipWelcome: true,
        customSendMessage: (request): void => {
          sent.push(request);
        },
      },
      upload: { isOn: true, onFileUpload: () => upload.promise },
    });
    try {
      await act(() =>
        mount.instance.messaging.addMessage(
          textResponse('Retained upload reply', 'before-upload')
        )
      );
      expect(mount.instance.state.get().activeResponseId).toBe('before-upload');
      await act(async () => {
        mount.instance.input.updateStructuredData(() => MANUAL);
      });
      await pickFiles(ATTACH, [
        new File(['owned'], 'owned.pdf', {
          type: 'application/pdf',
        }),
      ]);
      expect(mount.instance.state.get().input.hasInFlightUploads).toBe(true);
      await act(async () => {
        await expect(
          mount.instance.messaging.send('Blocked upload send')
        ).rejects.toThrow(/upload/i);
      });
      expect(sent).toHaveLength(0);
      expect(mount.instance.state.get().activeResponseId).toBe('before-upload');
      await act(async () => {
        upload.resolve(FILE);
        await upload.promise;
      });
      await waitFor(() =>
        expect(mount.instance.state.get().input.structuredData).toEqual({
          fields: [...MANUAL.fields, ...FILE.fields],
        })
      );
      await click(byRole('button', 'Owner remove owned.pdf'));
      expect(mount.instance.state.get().input.structuredData).toEqual(MANUAL);
      await act(() => mount.instance.messaging.send('Manual fields survive'));
      expect(sent).toHaveLength(1);
      expect(sent[0].input.structured_data).toEqual(MANUAL);
      expect(mount.instance.state.get().messages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'before-upload' }),
        ])
      );
    } finally {
      upload.resolve(FILE);
      await upload.promise;
      await act(async () => mount.unmount());
    }
  });

  it('names every actual failed file and carries its localized recovery once in an assertive region before usable removal', async () => {
    const sent: MessageRequest[] = [];
    const mount = await contractChat({
      openChatByDefault: true,
      strings,
      messaging: {
        skipWelcome: true,
        customSendMessage: (request): void => {
          sent.push(request);
        },
      },
      upload: {
        isOn: true,
        onFileUpload: async () => {
          throw new Error(REASON);
        },
      },
    });
    try {
      await pickFiles(
        ATTACH,
        ['zebra.pdf', 'Apple.pdf'].map(
          (name) => new File(['refused'], name, { type: 'application/pdf' })
        )
      );
      for (const name of ['zebra.pdf', 'Apple.pdf']) {
        await waitFor(() =>
          expect(
            allByRole('group', `${name}. ${TITLE}. ${REASON} ${RECOVERY}`)
          ).toHaveLength(1)
        );
        expect(shownText(mount.host)).toContain(`Owner upload error: ${name}`);
        expect(byRole('button', `Owner remove ${name}`)).not.toBeNull();
      }
      await waitFor(() =>
        expect(
          liveRegions().some((region) => region.text.includes(REASON))
        ).toBe(true)
      );
      // Observe beyond the component announcer's 250 ms debounce window.
      await pause(400);
      const carrying = liveRegions().filter(({ text }) =>
        text.includes(REASON)
      );
      expect(carrying).toHaveLength(1);
      expect(carrying[0].live).toBe('assertive');
      expect(carrying[0].text).toContain(`${TITLE}.`);
      expect(carrying[0].text).toContain(RECOVERY);
      expect(isDisabled(getByTestId(PageObjectId.INPUT_SEND))).toBe(true);
      await click(byRole('button', 'Owner remove zebra.pdf'));
      await click(byRole('button', 'Owner remove Apple.pdf'));
      await typeText('Recovered after removing failed files');
      await click(getByTestId(PageObjectId.INPUT_SEND));
      await waitFor(() => expect(sent).toHaveLength(1));
      expect(sent[0].input.text).toBe('Recovered after removing failed files');
    } finally {
      await act(async () => mount.unmount());
    }
  });

  it('awaits the agent pre-send decision and cancels that actual composer message before a later allowed send', async () => {
    let callback: ServiceDeskCallback;
    const entered = deferred();
    const release = deferred();
    const sent: MessageRequest[] = [];
    const factory: NonNullable<PublicConfig['serviceDeskFactory']> = async (
      parameters
    ) => {
      callback = parameters.callback;
      const desk: ServiceDesk = {
        getName: () => 'Cancelled composer desk',
        startChat: async () => undefined,
        endChat: async () => undefined,
        sendMessageToAgent: async (request) => {
          sent.push(request);
        },
      };
      return desk;
    };
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      serviceDeskFactory: factory,
    });
    let handlerWork: Promise<void>;
    const handler = {
      type: BusEventType.HUMAN_AGENT_PRE_SEND as const,
      handler: (event: BusEventHumanAgentPreSend) => {
        entered.resolve();
        handlerWork = release.promise.then(() => {
          event.cancel = true;
        });
        return handlerWork;
      },
    };
    mount.instance.on(handler);
    try {
      await act(() => mount.instance.serviceDesk.startConversation());
      await act(() => callback.agentJoined(DANA));
      await typeText('Cancel this actual agent message');
      await click(getByTestId(PageObjectId.INPUT_SEND));
      await waitFor(() => expect(handlerWork).toBeDefined());
      await entered.promise;
      expect(sent).toHaveLength(0);
      await act(async () => {
        release.resolve();
        await handlerWork;
      });
      mount.instance.off(handler);
      await typeText('Allow this actual agent message');
      await click(getByTestId(PageObjectId.INPUT_SEND));
      await waitFor(() => expect(sent).toHaveLength(1));
      expect(sent[0].input.text).toBe('Allow this actual agent message');
      expect(
        mount.instance.state
          .get()
          .messages.some(
            (message) =>
              'input' in message &&
              'text' in message.input &&
              message.input.text === 'Cancel this actual agent message'
          )
      ).toBe(false);
      await waitFor(() =>
        expect(mount.instance.state.get().status).toBe('ready')
      );
    } finally {
      release.resolve();
      mount.instance.off(handler);
      try {
        await act(async () => {
          await Promise.allSettled([handlerWork]);
          await mount.instance.serviceDesk.endConversation();
        });
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });
});
