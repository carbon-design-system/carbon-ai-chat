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
  BusEventType,
  MessageResponseTypes,
  MessageState,
  type BusEventCustomFooterSlot,
  type MessageResponse,
  type TextItem,
} from '../../../aiChatEntry';
import {
  contractChat,
  contractSetup,
  mainPanelText,
} from '../helpers/contract';

describe('public custom footer writeback', () => {
  contractSetup();

  it('commits nonthrowing footer item and full-message edits to the public state and rendered text', async () => {
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
    });
    const response: MessageResponse = {
      id: 'footer-writeback',
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.TEXT,
            text: 'First before',
            message_item_options: {
              custom_footer_slot: { is_on: true, slot_name: 'writable-footer' },
            },
          },
          { response_type: MessageResponseTypes.TEXT, text: 'Second before' },
        ],
      },
    };
    let calls = 0;
    const handler = (event: BusEventCustomFooterSlot) => {
      calls += 1;
      (event.data.messageItem as TextItem).text = 'Footer item edit';
      (event.data.message.output.generic[1] as TextItem).text =
        'Footer message edit';
    };
    const listener = { type: BusEventType.CUSTOM_FOOTER_SLOT, handler };
    mount.instance.on(listener);
    try {
      await act(() =>
        mount.instance.messaging.upsertMessage(
          response.id,
          MessageState.STREAMING,
          () => response
        )
      );
      expect(calls).toBe(1);
      expect(
        mount.instance.state
          .get()
          .messages.find((item) => item.id === response.id)
      ).toMatchObject({
        output: {
          generic: [
            { text: 'Footer item edit' },
            { text: 'Footer message edit' },
          ],
        },
      });
      await waitFor(() => {
        expect(mainPanelText()).toContain('Footer item edit');
        expect(mainPanelText()).toContain('Footer message edit');
      });
    } finally {
      mount.instance.off(listener);
      await act(async () => mount.unmount());
    }
  });
});
