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
  ReasoningStepOpenState,
  type MessageResponse,
} from '../../../aiChatEntry';
import {
  byRole,
  click,
  contractChat,
  contractSetup,
  mainPanelText,
  responseOf,
  textItem,
} from '../helpers/contract';

describe('public reasoning control', () => {
  contractSetup();

  it('drops a controlled manual override when the final snapshot returns reasoning to automatic mode', async () => {
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      strings: {
        reasoningSteps_mainLabelOpen: 'Utility hide details',
        reasoningSteps_mainLabelClosed: 'Utility show details',
      },
    });
    const response = (controlled: boolean): MessageResponse => ({
      ...responseOf('utility-reasoning', [
        textItem('Useful utility answer', 'answer'),
      ]),
      message_options: {
        reasoning: {
          ...(controlled ? { open_state: ReasoningStepOpenState.CLOSE } : {}),
          steps: [
            {
              title: 'Utility reasoning step',
              content: 'Reasoning remains available',
            },
          ],
        },
      },
    });
    try {
      await act(() =>
        mount.instance.messaging.upsertMessage(
          'utility-reasoning',
          MessageState.STREAMING,
          () => response(true)
        )
      );
      await waitFor(() =>
        expect(byRole('button', 'Utility show details')).toHaveAttribute(
          'aria-expanded',
          'false'
        )
      );
      await click(byRole('button', 'Utility show details'));
      expect(byRole('button', 'Utility hide details')).toHaveAttribute(
        'aria-expanded',
        'true'
      );
      await act(() =>
        mount.instance.messaging.upsertMessage(
          'utility-reasoning',
          MessageState.COMPLETE,
          () => response(false)
        )
      );
      await waitFor(() =>
        expect(byRole('button', 'Utility show details')).toHaveAttribute(
          'aria-expanded',
          'false'
        )
      );
      expect(mainPanelText()).toContain('Useful utility answer');
      await click(byRole('button', 'Utility show details'));
      expect(byRole('button', 'Utility hide details')).toHaveAttribute(
        'aria-expanded',
        'true'
      );
      await click(byRole('button', 'Utility hide details'));
      expect(byRole('button', 'Utility show details')).toHaveAttribute(
        'aria-expanded',
        'false'
      );
    } finally {
      await act(async () => mount.unmount());
    }
  });
});
