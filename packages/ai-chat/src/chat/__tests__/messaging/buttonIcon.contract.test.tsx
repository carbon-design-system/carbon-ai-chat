/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import { ButtonItemType, MessageResponseTypes } from '../../../aiChatEntry';
import {
  byRole,
  contractChat,
  contractSetup,
  getByTestId,
  responseOf,
} from '../helpers/contract';

describe('public button icon', () => {
  contractSetup();

  it('renders the supplied icon while preserving the name of an icon-only URL action', async () => {
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
    });
    try {
      await act(() =>
        mount.instance.messaging.addMessage(
          responseOf('utility-button', [
            {
              response_type: MessageResponseTypes.BUTTON,
              button_type: ButtonItemType.URL,
              url: 'https://example.com/utility-icon',
              label: 'Utility icon action',
              icon: {
                name: 'supplied-utility',
                size: 16,
                elem: 'svg',
                attrs: {
                  viewBox: '0 0 16 16',
                  'data-testid': 'utility-supplied-icon',
                },
                content: [{ elem: 'path', attrs: { d: 'M0 0h16v16H0z' } }],
              },
              hide_label: true,
              icon_alignment: 'start',
            },
          ])
        )
      );
      await waitFor(() =>
        expect(byRole('button', 'Utility icon action')).toBeDefined()
      );
      const icon = getByTestId('utility-supplied-icon');
      expect(icon).toHaveAttribute('slot', 'icon');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
      expect(byRole('button', 'Utility icon action')).toHaveAttribute(
        'href',
        'https://example.com/utility-icon'
      );
    } finally {
      await act(async () => mount.unmount());
    }
  });
});
