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
  PageObjectId,
  MessageState,
  ViewType,
  type PersistableState,
} from '../../../aiChatEntry';
import {
  contractChat,
  contractSetup,
  click,
  getByTestId,
  isDisabled,
  mainPanelText,
  responseOf,
  textItem,
  typeText,
} from '../helpers/contract';

describe('public saved-state callback recovery', () => {
  contractSetup();

  it('completes the actual view change after a host persistence callback throws', async () => {
    let throwNext = false;
    let failedSave: PersistableState | undefined;
    const saved: PersistableState[] = [];
    const requests: string[] = [];
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: {
        skipWelcome: true,
        customSendMessage: async (request, _options, instance) => {
          requests.push(request.input.text);
          await instance.messaging.upsertMessage(
            'save-recovered',
            MessageState.COMPLETE,
            () =>
              responseOf('save-recovered', [
                textItem('Recovered after save callback'),
              ])
          );
        },
      },
      persistedState: {
        onStateChange: (state) => {
          saved.push(state);
          if (throwNext) {
            throwNext = false;
            failedSave = state;
            throw new Error('Owned save callback failure');
          }
        },
      },
    });
    try {
      await waitFor(() =>
        expect(mount.instance.state.get().viewState).toEqual({
          mainWindow: true,
          launcher: false,
        })
      );
      throwNext = true;
      await act(async () => {
        await expect(
          mount.instance.changeView(ViewType.LAUNCHER)
        ).resolves.toBeUndefined();
      });
      expect(failedSave).toMatchObject({ viewState: { mainWindow: false } });
      await waitFor(() =>
        expect(mount.instance.state.get().viewState).toEqual({
          mainWindow: false,
          launcher: true,
        })
      );
      const launcher = await waitFor(() => getByTestId(PageObjectId.LAUNCHER));
      await click(launcher);
      await waitFor(() =>
        expect(mount.instance.state.get().viewState).toEqual({
          mainWindow: true,
          launcher: false,
        })
      );
      await typeText('Recover after save failure');
      await waitFor(() =>
        expect(isDisabled(getByTestId(PageObjectId.INPUT_SEND))).toBe(false)
      );
      await click(getByTestId(PageObjectId.INPUT_SEND));
      await waitFor(() =>
        expect(mainPanelText()).toContain('Recovered after save callback')
      );
      expect(requests).toEqual(['Recover after save failure']);
      await waitFor(() =>
        expect(mount.instance.state.get().status).toBe('ready')
      );
      expect(saved[saved.length - 1].viewState.mainWindow).toBe(true);
    } finally {
      throwNext = false;
      await act(async () => mount.unmount());
    }
  });
});
