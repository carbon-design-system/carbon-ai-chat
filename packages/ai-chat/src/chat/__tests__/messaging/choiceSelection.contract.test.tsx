// @vitest-environment jsdom
// happy-dom 21 does not retarget event.target out of shadow roots, which the chat's React handlers need.
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
  ButtonItemType,
  MessageResponseTypes,
  OnErrorType,
  type ButtonItem,
  type OnErrorData,
} from '../../../aiChatEntry';
import {
  byRole,
  click,
  contractChat,
  contractSetup,
  fakeBackend,
  isDisabled,
  responseOf,
} from '../helpers/contract';

function postBack(label: string, is?: 'standard-button'): ButtonItem {
  return {
    response_type: MessageResponseTypes.BUTTON,
    button_type: ButtonItemType.POST_BACK,
    label,
    is,
    value: { input: { text: label } },
    silent: true,
  };
}

describe('public selected choice controls', () => {
  contractSetup();

  it.each([undefined, 'standard-button'] as const)(
    'distinguishes an obsolete %s button from a selection that survives a failed send',
    async (is) => {
      const backend = fakeBackend();
      const errors: OnErrorData[] = [];
      const mount = await contractChat({
        openChatByDefault: true,
        messaging: {
          skipWelcome: true,
          customSendMessage: backend.customSendMessage,
        },
        onError: (error) => {
          errors.push(error);
        },
      });
      try {
        await act(() =>
          mount.instance.messaging.addMessage(
            responseOf('obsolete-choice', [postBack('Earlier action', is)])
          )
        );
        const obsolete = await waitFor(() =>
          byRole('button', 'Earlier action')
        );
        expect(isDisabled(obsolete)).toBe(false);
        expect(obsolete).toHaveAttribute('aria-pressed', 'false');
        await act(() =>
          mount.instance.messaging.addMessage(
            responseOf('current-choice', [postBack('Current action', is)])
          )
        );
        await waitFor(() => expect(isDisabled(obsolete)).toBe(true));
        expect(obsolete).toHaveAttribute('aria-pressed', 'false');
        const current = await waitFor(() => byRole('button', 'Current action'));
        expect(isDisabled(current)).toBe(false);
        await click(current);
        await waitFor(() => expect(backend.requests).toHaveLength(1));
        await waitFor(() =>
          expect(current).toHaveAttribute('aria-pressed', 'true')
        );
        expect(isDisabled(current)).toBe(true);
        await act(async () => {
          backend.requests[0].reject(
            new Error('Owned selected-button send failure')
          );
        });
        await waitFor(() =>
          expect(errors.map(({ errorType }) => errorType)).toEqual([
            OnErrorType.MESSAGE_COMMUNICATION,
          ])
        );
        await waitFor(() =>
          expect(mount.instance.state.get().status).toBe('error')
        );
        expect(current).toHaveAttribute('aria-pressed', 'true');
        expect(isDisabled(current)).toBe(true);
      } finally {
        backend.requests.forEach((request) => request.resolve());
        await act(async () => mount.unmount());
      }
    }
  );

  it('keeps only the chosen quick action inert after its real silent send fails', async () => {
    const backend = fakeBackend();
    const errors: OnErrorData[] = [];
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: {
        skipWelcome: true,
        customSendMessage: backend.customSendMessage,
      },
      onError: (error) => {
        errors.push(error);
      },
    });
    try {
      await act(() =>
        mount.instance.messaging.addMessage(
          responseOf('quick-choices', [
            {
              response_type: MessageResponseTypes.OPTION,
              options: [
                {
                  label: 'First route',
                  value: { input: { text: 'first-route' } },
                  silent: true,
                },
                {
                  label: 'Second route',
                  value: { input: { text: 'second-route' } },
                  silent: true,
                },
              ],
            },
          ])
        )
      );
      const first = await waitFor(() => byRole('button', 'First route'));
      const second = byRole('button', 'Second route');
      expect(first.tabIndex).toBe(0);
      expect(second.tabIndex).toBe(0);
      await click(second);
      await waitFor(() => expect(backend.requests).toHaveLength(1));
      expect(backend.requests[0].request.input.text).toBe('second-route');
      await act(async () => {
        backend.requests[0].reject(
          new Error('Owned quick-action send failure')
        );
      });
      await waitFor(() =>
        expect(errors.map(({ errorType }) => errorType)).toEqual([
          OnErrorType.MESSAGE_COMMUNICATION,
        ])
      );
      await waitFor(() =>
        expect(mount.instance.state.get().status).toBe('error')
      );
      expect(second.tabIndex).toBe(-1);
      expect(first.tabIndex).toBe(0);
      await click(second);
      expect(backend.requests).toHaveLength(1);
      await click(first);
      await waitFor(() => expect(backend.requests).toHaveLength(2));
      expect(backend.requests[1].request.input.text).toBe('first-route');
      await act(async () => {
        backend.requests[1].resolve();
      });
      await waitFor(() =>
        expect(mount.instance.state.get().status).toBe('ready')
      );
    } finally {
      backend.requests.forEach((request) => request.resolve());
      await act(async () => mount.unmount());
    }
  });
});
