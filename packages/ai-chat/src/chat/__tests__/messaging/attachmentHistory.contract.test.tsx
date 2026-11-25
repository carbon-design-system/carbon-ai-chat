/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor, within } from '@testing-library/react';
import type { HistoryItem, MessageRequest } from '../../../aiChatEntry';
import {
  byRole,
  contractChat,
  contractSetup,
  fakeBackend,
  shownText,
} from '../helpers/contract';

describe('public attachment history', () => {
  contractSetup();

  it('renders reference and live inline files, skips an unrecognized sibling and restores a serialized inline fallback', async () => {
    const backend = fakeBackend({ autoResolve: true });
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: {
        skipWelcome: true,
        customSendMessage: backend.customSendMessage,
      },
      strings: {
        messages_attachmentsLabel: 'Utility attachments',
        messages_unnamedAttachment: 'Utility unnamed attachment',
      },
    });
    const request: MessageRequest = {
      id: 'utility-attachment-request',
      input: {
        text: '',
        structured_data: {
          fields: [
            {
              id: 'files',
              type: 'file',
              value: [
                {
                  type: 'reference',
                  id: 'reference',
                  name: 'report.pdf',
                  mime_type: 'application/pdf',
                },
                'unrecognized sibling',
                {
                  type: 'inline',
                  id: 'inline',
                  file: new File(['notes'], 'notes.txt', {
                    type: 'text/plain',
                  }),
                },
              ],
            },
          ],
        },
      },
    };
    try {
      await act(() => mount.instance.messaging.send(request));
      let list = await waitFor(() => byRole('list', 'Utility attachments'));
      expect(within(list).getAllByRole('listitem')).toHaveLength(2);
      expect(shownText(list)).toContain('report.pdf');
      expect(shownText(list)).toContain('notes.txt');
      expect(shownText(list)).not.toContain('unrecognized sibling');
      const stored = mount.instance.state
        .get()
        .messages.find(({ id }) => id === request.id);
      expect(stored).toBeDefined();
      const restored = JSON.parse(JSON.stringify(stored)) as MessageRequest;
      await act(() => mount.instance.messaging.clearConversation());
      await act(() =>
        mount.instance.messaging.insertHistory([
          { message: restored, time: '2026-01-05T00:00:00.000Z' },
        ])
      );
      list = await waitFor(() => byRole('list', 'Utility attachments'));
      expect(within(list).getAllByRole('listitem')).toHaveLength(2);
      expect(shownText(list)).toContain('report.pdf');
      expect(shownText(list)).toContain('Utility unnamed attachment');
      expect(shownText(list)).not.toContain('notes.txt');
    } finally {
      await act(async () => mount.unmount());
    }
  });

  it('renders a valid attachment-only history request whose input omits text', async () => {
    const history: HistoryItem[] = [
      {
        message: {
          id: 'omitted-text-attachment',
          input: {
            structured_data: {
              fields: [
                {
                  id: 'file',
                  type: 'file',
                  value: {
                    type: 'reference',
                    id: 'omitted-reference',
                    name: 'omitted-text.pdf',
                    mime_type: 'application/pdf',
                  },
                },
              ],
            },
          },
        },
        time: '2026-01-05T00:00:00.000Z',
      },
    ];
    const mount = await contractChat({
      openChatByDefault: true,
      strings: { messages_attachmentsLabel: 'Omitted text attachments' },
      messaging: { skipWelcome: true, customLoadHistory: async () => history },
    });
    try {
      const list = await waitFor(() =>
        byRole('list', 'Omitted text attachments')
      );
      expect(within(list).getAllByRole('listitem')).toHaveLength(1);
      expect(shownText(list)).toContain('omitted-text.pdf');
      expect(mount.instance.state.get().messages.map(({ id }) => id)).toContain(
        'omitted-text-attachment'
      );
    } finally {
      await act(async () => mount.unmount());
    }
  });
});
