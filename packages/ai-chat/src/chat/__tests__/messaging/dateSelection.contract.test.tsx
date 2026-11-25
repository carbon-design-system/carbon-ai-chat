// @vitest-environment jsdom
// happy-dom 21 fires no slotchange when a slot is inserted over existing children, so cds-date-picker never creates its calendar.
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
  byRole,
  click,
  contractChat,
  contractSetup,
  fakeBackend,
  responseOf,
} from '../helpers/contract';

describe('public date selection', () => {
  contractSetup();

  it('pads a selected January date for the user and sends its ISO date to the assistant', async () => {
    const backend = fakeBackend({ autoResolve: true });
    const mount = await contractChat({
      openChatByDefault: true,
      locale: 'en',
      messaging: {
        skipWelcome: true,
        customSendMessage: backend.customSendMessage,
      },
      strings: {
        datePicker_chooseDate: 'Utility choose {format}',
        datePicker_confirmDate: 'Utility confirm date',
      },
    });
    try {
      await act(() =>
        mount.instance.messaging.addMessage(
          responseOf('utility-date', [
            { response_type: MessageResponseTypes.DATE },
          ])
        )
      );
      const input = (await waitFor(() =>
        byRole('textbox', 'Utility choose mm/dd/yyyy')
      )) as HTMLInputElement;
      await act(async () => {
        input.focus();
        input.value = '1/5/2023';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.blur();
      });
      // Native blur asks the real allow-input picker to parse and emit its own
      // changed event. The test never manufactures a picker callback payload.
      await waitFor(() => expect(input.value).toBe('01/05/2023'));
      await click(
        await waitFor(() => byRole('button', 'Utility confirm date'))
      );
      await waitFor(() => expect(backend.requests).toHaveLength(1));
      const request = backend.requests[0].request;
      expect(request.input.text).toBe('2023-01-05');
      expect(request.history.label).toBe('01/05/2023');
      expect(request.history.related_message_id).toBe('utility-date');
      await waitFor(() =>
        expect(byRole('heading', '01/05/2023')).toBeDefined()
      );
    } finally {
      await act(async () => mount.unmount());
    }
  });
});
