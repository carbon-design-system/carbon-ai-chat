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
  MessageState,
  OnErrorType,
  PageObjectId,
  type ChatContainerProps,
  type OnErrorData,
} from '../../../aiChatEntry';
import {
  allByRole,
  byRole,
  click,
  contractChat,
  contractSetup,
  flatChildren,
  getByTestId,
  isShownWithin,
  mainPanelText,
  shownText,
  textResponse,
  typeText,
} from '../helpers/contract';

function liveRegions(node: Node = document.documentElement): Element[] {
  if (!(node instanceof Element)) {
    return [];
  }
  return [
    ...(['polite', 'assertive'].includes(node.getAttribute('aria-live'))
      ? [node]
      : []),
    ...flatChildren(node).flatMap(liveRegions),
  ];
}

describe('public host turn failure recovery', () => {
  contractSetup();

  it('delivers one announcement per failed turn and retains the inline error through recovery', async () => {
    const firstAnnouncement = 'Owned first failure announcement';
    const nextAnnouncement = 'Owned later transport failure barrier';
    const inlineFailure = 'The retained reply could not finish.';
    const transportFailure = new Error('Owned later send rejected');
    const errors: OnErrorData[] = [];
    let laterRequestID: string;
    const send: NonNullable<
      NonNullable<ChatContainerProps['messaging']>['customSendMessage']
    > = async (request, _options, instance) => {
      if (request.input.text === 'Publish a partial reply') {
        return;
      } else if (request.input.text === 'Trigger the later real failure') {
        laterRequestID = request.id;
        throw transportFailure;
      } else {
        await instance.messaging.upsertMessage(
          'recovered-reply',
          MessageState.COMPLETE,
          () => ({
            ...textResponse('Usable recovered reply', 'recovered-reply'),
            request_id: request.id,
          })
        );
      }
    };
    const config = (announcement: string): Partial<ChatContainerProps> => ({
      openChatByDefault: true,
      messaging: { skipWelcome: true, customSendMessage: send },
      strings: {
        conversationalSearch_streamingIncomplete: inlineFailure,
        errors_ariaMessageFailed: announcement,
      },
      onError: (error): void => {
        errors.push(error);
      },
    });
    const mount = await contractChat(config(firstAnnouncement));
    await waitFor(() => expect(liveRegions().length).toBeGreaterThan(0));
    const delivered: string[] = [];
    const observers = liveRegions().map((region) => {
      const observer = new MutationObserver(() => {
        const text = region.textContent?.trim();
        if (text) {
          delivered.push(text);
        }
      });
      observer.observe(region, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      return observer;
    });
    const occurrences = (text: string) =>
      delivered.reduce(
        (count, value) => count + value.split(text).length - 1,
        0
      );
    try {
      await act(() => mount.instance.messaging.send('Publish a partial reply'));
      expect(mount.instance.state.get().status).toBe('ready');
      await act(() =>
        mount.instance.messaging.upsertMessage(
          'failed-reply',
          MessageState.STREAMING,
          () => textResponse('Retained reply before failure', 'failed-reply')
        )
      );
      await waitFor(() =>
        expect(mainPanelText()).toContain('Retained reply before failure')
      );
      expect(mount.instance.state.get().status).toBe('streaming');
      await act(() =>
        mount.instance.messaging.failTurn({
          error: { message: 'First host-requested failure' },
        })
      );
      await waitFor(() => expect(mainPanelText()).toContain(inlineFailure));
      await waitFor(() => expect(occurrences(firstAnnouncement)).toBe(1));
      expect(errors).toEqual([]);
      expect(mount.instance.state.get().status).toBe('error');
      await act(() =>
        mount.instance.messaging.failTurn({
          messageID: 'failed-reply',
          error: { message: 'Revised host-requested failure' },
        })
      );
      expect(mount.instance.state.get().error).toMatchObject({
        message: 'Revised host-requested failure',
      });
      // A later real failure is a positive barrier for any queued repeat.
      await mount.rerender(config(nextAnnouncement));
      await act(async () => {
        await expect(
          mount.instance.messaging.send('Trigger the later real failure')
        ).rejects.toThrow(transportFailure.message);
      });
      await waitFor(() => expect(occurrences(nextAnnouncement)).toBe(1));
      expect(occurrences(firstAnnouncement)).toBe(1);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        errorType: OnErrorType.MESSAGE_COMMUNICATION,
        messageID: laterRequestID,
      });
      await act(async () => {
        mount.instance.messaging.clearError();
      });
      expect(mount.instance.state.get().status).toBe('ready');
      expect(mount.instance.state.get().error).toBeNull();
      expect(mainPanelText()).toContain(inlineFailure);
      await act(() =>
        mount.instance.messaging.send('Recover this conversation')
      );
      await waitFor(() =>
        expect(mainPanelText()).toContain('Usable recovered reply')
      );
      expect(mainPanelText()).toContain('Retained reply before failure');
      expect(errors).toHaveLength(1);
    } finally {
      observers.forEach((observer) => observer.disconnect());
      await act(async () => mount.unmount());
    }
  });

  it('clears the conversation error while keeping a separately opened catastrophic dialog until the host closes it', async () => {
    const dialogName = 'Independent catastrophic problem';
    const sendName = 'Send recovered prompt';
    const failure = new Error('Owned initial transport error');
    const mount = await contractChat({
      openChatByDefault: true,
      strings: {
        aria_catastrophicErrorPanel: dialogName,
        input_buttonLabel: sendName,
      },
      messaging: {
        skipWelcome: true,
        customSendMessage: async (request, _options, instance) => {
          if (request.input.text === 'Create a conversation error') {
            throw failure;
          }
          await instance.messaging.addMessage(
            textResponse(
              'Recovered through the public input',
              'dialog-recovery'
            )
          );
        },
      },
    });
    try {
      await act(async () => {
        await expect(
          mount.instance.messaging.send('Create a conversation error')
        ).rejects.toThrow(failure.message);
      });
      expect(mount.instance.state.get().status).toBe('error');
      await act(async () => {
        mount.instance.updateCatastrophicErrorPanel({
          isOpen: true,
          title: 'Keep the independent dialog',
          bodyText: 'This dialog belongs to the host.',
          hideRetryButton: true,
        });
      });
      await waitFor(() =>
        expect(shownText(byRole('dialog', dialogName))).toContain(
          'This dialog belongs to the host.'
        )
      );
      expect(
        isShownWithin(
          byRole('dialog', dialogName),
          getByTestId(PageObjectId.CATASTROPHIC_PANEL)
        )
      ).toBe(true);
      await act(async () => {
        mount.instance.messaging.clearError();
      });
      expect(mount.instance.state.get().error).toBeNull();
      expect(mount.instance.state.get().status).toBe('ready');
      expect(shownText(byRole('dialog', dialogName))).toContain(
        'This dialog belongs to the host.'
      );
      await act(async () => {
        mount.instance.updateCatastrophicErrorPanel({ isOpen: false });
      });
      await waitFor(() =>
        expect(allByRole('dialog', dialogName)).toHaveLength(0)
      );
      await typeText('Recover using the actual input');
      await waitFor(() => expect(byRole('button', sendName)).toBeEnabled());
      await click(byRole('button', sendName));
      await waitFor(() =>
        expect(mainPanelText()).toContain('Recovered through the public input')
      );
    } finally {
      await act(async () => mount.unmount());
    }
  });
});
