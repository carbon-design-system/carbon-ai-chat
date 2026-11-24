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
import {
  BusEventSend,
  BusEventType,
  MessageResponseTypes,
  MessageSendSource,
} from '../../../aiChatEntry';
import {
  byRole,
  click,
  contractChat,
  contractSetup,
  fakeBackend,
  recordEvents,
  responseOf,
} from '../helpers/contract';

describe('public date-picker send', () => {
  contractSetup();

  it('sends a confirmed date as one send event from the date picker', async () => {
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
    const recorder = recordEvents(mount.instance, [BusEventType.SEND]);
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
      const sends = recorder.of<BusEventSend>(BusEventType.SEND);
      expect(sends).toHaveLength(1);
      expect(sends[0].source).toBe(MessageSendSource.DATE_PICKER);
      expect(sends[0].data.input.text).toBe('2023-01-05');
      expect(sends[0].data.history.label).toBe('01/05/2023');
      expect(sends[0].data.history.related_message_id).toBe('utility-date');
    } finally {
      recorder.stop();
      await act(async () => mount.unmount());
    }
  });
});
