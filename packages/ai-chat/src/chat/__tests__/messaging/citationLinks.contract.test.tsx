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
  MessageResponseTypes,
  type MessageResponse,
} from '../../../aiChatEntry';
import {
  allByRole,
  byRole,
  click,
  contractChat,
  contractSetup,
  shownText,
} from '../helpers/contract';

describe('public citation links', () => {
  contractSetup();

  it('renders a supplied HTTP citation as a useful external link', async () => {
    const url = 'http://citation.example.test/document';
    const toggleLabel = 'Show contract citation sources';
    const linkName =
      'HTTP sourceThe source supports this answercitation.example.test';
    const message: MessageResponse = {
      id: 'http-citation',
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.CONVERSATIONAL_SEARCH,
            text: 'An answer with a source',
            citations: [
              {
                title: 'HTTP source',
                text: 'The source supports this answer',
                url,
              },
            ],
          },
        ],
      },
    };
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      strings: { conversationalSearch_toggleCitations: toggleLabel },
    });
    try {
      await act(() => mount.instance.messaging.addMessage(message));
      await waitFor(() => expect(byRole('button', toggleLabel)).not.toBeNull());
      await click(byRole('button', toggleLabel));
      await waitFor(() =>
        expect(
          allByRole('link', linkName).some(
            (link) => link.getAttribute('href') === url
          )
        ).toBe(true)
      );
      const link = allByRole('link', linkName).find(
        (element) => element.getAttribute('href') === url
      );
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(shownText(link)).toContain('HTTP source');
      expect(shownText(link)).toContain('The source supports this answer');
    } finally {
      await act(async () => mount.unmount());
    }
  });
});
