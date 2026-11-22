/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import { MessageResponseTypes, type OnErrorData } from '../../../aiChatEntry';
import {
  allByRole,
  byRole,
  contractChat,
  contractSetup,
  responseOf,
} from '../helpers/contract';

describe('public date-picker locale', () => {
  contractSetup();

  it('loads French date formatting through a supported language with an unsupported region', async () => {
    const errors: OnErrorData[] = [];
    const mount = await contractChat({
      openChatByDefault: true,
      locale: 'fr-ZZ',
      messaging: { skipWelcome: true },
      strings: { datePicker_chooseDate: 'Utility date {format}' },
      onError: (error) => {
        errors.push(error);
      },
    });
    try {
      await act(() =>
        mount.instance.messaging.addMessage(
          responseOf('locale-date', [
            {
              response_type: MessageResponseTypes.DATE,
            },
          ])
        )
      );
      await waitFor(() =>
        expect(allByRole('textbox', 'Utility date dd/mm/yyyy')).toHaveLength(1)
      );
      const input = byRole('textbox', 'Utility date dd/mm/yyyy');
      expect(input).toHaveAttribute('placeholder', 'dd/mm/yyyy');
      expect(input).toBeEnabled();
      expect(mount.instance.state.get().messages.map(({ id }) => id)).toContain(
        'locale-date'
      );
      expect(errors).toEqual([]);
    } finally {
      await act(async () => mount.unmount());
    }
  });
});
