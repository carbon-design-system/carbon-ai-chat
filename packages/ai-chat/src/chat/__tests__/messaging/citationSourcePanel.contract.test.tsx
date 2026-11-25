/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import { MessageResponseTypes } from '../../../aiChatEntry';
import {
  allByRole,
  byRole,
  click,
  contractChat,
  contractSetup,
  responseOf,
  shownText,
} from '../helpers/contract';

describe('public citation source panel', () => {
  contractSetup();

  it('opens the actual search-result context and returns to the answer', async () => {
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      strings: {
        conversationalSearch_toggleCitations: 'Show owned sources',
        general_returnToAssistant: 'Return to owned answer',
      },
    });
    try {
      await act(() =>
        mount.instance.messaging.addMessage(
          responseOf('source-panel-answer', [
            {
              response_type: MessageResponseTypes.CONVERSATIONAL_SEARCH,
              text: 'An answer supported by the owned source.',
              citations: [
                {
                  title: 'Owned source',
                  text: 'Cited fact.',
                  search_result_idx: 0,
                },
              ],
              search_results: [
                { body: 'Context before. Cited fact. Context after.' },
              ],
            },
          ])
        )
      );
      expect(allByRole('dialog', 'Owned source')).toHaveLength(0);
      await click(await waitFor(() => byRole('button', 'Show owned sources')));
      await click(await waitFor(() => byRole('button', 'Owned source')));
      await waitFor(() => {
        const current = byRole('dialog', 'Owned source');
        expect(shownText(current)).toContain(
          'Context before. Cited fact. Context after.'
        );
        return current;
      });
      await click(
        await waitFor(() => byRole('button', 'Return to owned answer'))
      );
      await waitFor(() =>
        expect(allByRole('dialog', 'Owned source')).toHaveLength(0)
      );
      expect(byRole('button', 'Show owned sources')).not.toBeNull();
    } finally {
      await act(async () => mount.unmount());
    }
  });
});
