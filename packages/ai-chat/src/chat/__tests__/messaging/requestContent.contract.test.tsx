/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { act, waitFor } from '@testing-library/react';
import {
  BusEventType,
  PageObjectId,
  type MessageRequest,
} from '../../../aiChatEntry';
import {
  allByRole,
  click,
  contractChat,
  contractSetup,
  fakeBackend,
  getByTestId,
  mainPanelText,
  recordEvents,
} from '../helpers/contract';

describe('public request content', () => {
  contractSetup();

  it('keeps file-only requests useful without an empty text heading or request footer', async () => {
    const backend = fakeBackend({ autoResolve: true });
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: {
        skipWelcome: true,
        messageTimeoutSecs: 0,
        messageLoadingIndicatorTimeoutSecs: 0,
        customSendMessage: backend.customSendMessage,
      },
      upload: {
        onFileUpload: async () => ({
          fields: [
            {
              id: 'uploaded-file',
              type: 'file',
              value: {
                type: 'reference',
                id: 'file-reference',
                name: 'utility.pdf',
                mime_type: 'application/pdf',
              },
            },
          ],
        }),
      },
      strings: { messages_attachmentsLabel: 'Utility sent attachments' },
      renderCustomRequestFooter: () =>
        React.createElement('span', null, 'Utility request footer'),
    });
    const events = recordEvents(mount.instance, [
      BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
    ]);
    const sendButton = () => getByTestId(PageObjectId.INPUT_SEND);
    try {
      await act(async () => {
        await mount.instance.input.getEditor();
        await mount.instance.input.updateContent(() => ({
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Rich caption' }],
            },
          ],
        }));
      });
      await click(sendButton());
      await waitFor(() => expect(backend.requests).toHaveLength(1));
      await waitFor(() =>
        expect(mount.instance.state.get().status).toBe('ready')
      );
      expect(backend.requests[0].request.input.display_content).toEqual({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Rich caption' }],
          },
        ],
      });
      await waitFor(() =>
        expect(allByRole('heading', 'Rich caption')).toHaveLength(1)
      );
      await waitFor(() =>
        expect(mainPanelText()).toContain('Utility request footer')
      );
      expect(events.events).toHaveLength(1);
      await act(() =>
        mount.instance.messaging.addFile(
          new File(['file'], 'utility.pdf', { type: 'application/pdf' })
        )
      );
      await click(sendButton());
      await waitFor(() => expect(backend.requests).toHaveLength(2));
      await waitFor(() =>
        expect(mount.instance.state.get().status).toBe('ready')
      );
      const empty = backend.requests[1].request;
      expect(empty.input.text).toBe('');
      expect(empty.input.display_content).toBeUndefined();
      await waitFor(() =>
        expect(allByRole('list', 'Utility sent attachments')).toHaveLength(1)
      );
      expect(
        allByRole('heading', '', getByTestId(PageObjectId.MAIN_PANEL))
      ).toHaveLength(0);
      expect(events.events).toHaveLength(1);
      const whitespace: MessageRequest = {
        input: {
          text: '',
          display_content: {
            type: 'doc',
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: '   ' }] },
            ],
          },
          structured_data: {
            fields: [
              {
                id: 'second-file',
                type: 'file',
                value: {
                  type: 'reference',
                  id: 'second-reference',
                  name: 'second.pdf',
                  mime_type: 'application/pdf',
                },
              },
            ],
          },
        },
      };
      await act(() => mount.instance.messaging.send(whitespace));
      expect(backend.requests).toHaveLength(3);
      expect(allByRole('list', 'Utility sent attachments')).toHaveLength(2);
      expect(
        allByRole('heading', '', getByTestId(PageObjectId.MAIN_PANEL))
      ).toHaveLength(0);
      expect(events.events).toHaveLength(1);
      expect(allByRole('heading', 'Rich caption')).toHaveLength(1);
    } finally {
      events.stop();
      await act(async () => mount.unmount());
    }
  });
});
