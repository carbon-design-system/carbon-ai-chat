// @vitest-environment jsdom
// happy-dom 21 does not retarget event.target out of shadow roots, which the chat's React handlers need; one more case also fails there, cause not isolated.
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
  ButtonItemType,
  MessageInputType,
  MessageResponseTypes,
  SelectionDisplay,
  type BusEventPreSend,
  type MessageInput,
  type MessageRequest,
  type MessageResponse,
  type OptionItem,
} from '../../../aiChatEntry';
import {
  allByRole,
  byRole,
  click,
  contractChat,
  contractSetup,
  fakeBackend,
  responseOf,
  shownText,
} from '../helpers/contract';

async function mountChoices(selectLabel?: string) {
  const backend = fakeBackend({ autoResolve: true });
  const mount = await contractChat({
    openChatByDefault: true,
    ...(selectLabel ? { strings: { options_select: selectLabel } } : {}),
    messaging: {
      skipWelcome: true,
      messageTimeoutSecs: 0,
      messageLoadingIndicatorTimeoutSecs: 0,
      customSendMessage: backend.customSendMessage,
    },
  });
  const sent = async (count: number): Promise<MessageRequest> => {
    await waitFor(() => expect(backend.requests).toHaveLength(count));
    await waitFor(() =>
      expect(mount.instance.state.get().status).toBe('ready')
    );
    return backend.requests[count - 1].request;
  };
  return { ...mount, sent };
}

describe('public choice controls', () => {
  contractSetup();

  it('sends the complete option input while showing its chosen transcript text', async () => {
    const mount = await mountChoices();
    const input: MessageInput = {
      text: 'Machine choice',
      structured_data: { user_defined: { original: true } },
      display_content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Rich payload only' }],
          },
        ],
      },
    };
    const beforeSend = (event: BusEventPreSend) => {
      event.data.input.structured_data.user_defined.callbackEdit = true;
    };
    mount.instance.on({ type: BusEventType.PRE_SEND, handler: beforeSend });
    try {
      await act(() =>
        mount.instance.messaging.addMessage(
          responseOf('option-owner', [
            {
              response_type: MessageResponseTypes.OPTION,
              options: [
                {
                  label: 'Visible choice',
                  value: { input },
                  selection_display: SelectionDisplay.INPUT_TEXT,
                },
              ],
            },
          ])
        )
      );
      await waitFor(() =>
        expect(allByRole('button', 'Visible choice')).toHaveLength(1)
      );
      await click(byRole('button', 'Visible choice'));
      const request = await mount.sent(1);
      expect(request.input).toEqual({
        ...input,
        message_type: MessageInputType.TEXT,
        structured_data: {
          user_defined: { original: true, callbackEdit: true },
        },
      });
      expect(request.history).toMatchObject({
        label: 'Machine choice',
        related_message_id: 'option-owner',
        is_choice_request: true,
      });
      await waitFor(() =>
        expect(allByRole('heading', 'Machine choice')).toHaveLength(1)
      );
      expect(allByRole('heading', 'Rich payload only')).toHaveLength(0);
      const source = mount.instance.state
        .get()
        .messages.find(({ id }) => id === 'option-owner') as MessageResponse;
      const storedChoice = source.output.generic[0] as OptionItem;
      expect(
        storedChoice.options[0].value.input.structured_data.user_defined
      ).toEqual({ original: true });
      expect(input.structured_data.user_defined).toEqual({ original: true });
    } finally {
      mount.instance.off({ type: BusEventType.PRE_SEND, handler: beforeSend });
      await act(async () => mount.unmount());
    }
  });

  it('uses the available post-back text without dropping supported input data', async () => {
    const mount = await mountChoices();
    try {
      await act(() =>
        mount.instance.messaging.addMessage(
          responseOf('unlabelled-button', [
            {
              response_type: MessageResponseTypes.BUTTON,
              button_type: ButtonItemType.POST_BACK,
              value: { input: { text: 'Unlabelled trigger' } },
              silent: true,
            },
          ])
        )
      );
      await waitFor(() =>
        expect(allByRole('button', 'Unlabelled trigger')).toHaveLength(1)
      );
      await click(byRole('button', 'Unlabelled trigger'));
      const first = await mount.sent(1);
      expect(first.input.text).toBe('Unlabelled trigger');
      expect(first.history).toMatchObject({
        label: 'Unlabelled trigger',
        related_message_id: 'unlabelled-button',
        silent: true,
      });
      expect(allByRole('heading', 'Unlabelled trigger')).toHaveLength(0);
      await act(() =>
        mount.instance.messaging.addMessage(
          responseOf('fallback-button', [
            {
              response_type: MessageResponseTypes.BUTTON,
              button_type: ButtonItemType.POST_BACK,
              label: 'Fallback label',
              selection_display: SelectionDisplay.INPUT_TEXT,
              value: {
                input: {
                  structured_data: { fields: [{ id: 'rating', value: 4 }] },
                  display_content: { type: 'doc', content: [] },
                },
              },
            },
          ])
        )
      );
      await waitFor(() =>
        expect(allByRole('button', 'Fallback label')).toHaveLength(1)
      );
      await click(byRole('button', 'Fallback label'));
      const second = await mount.sent(2);
      expect(second.input).toEqual({
        text: 'Fallback label',
        message_type: MessageInputType.TEXT,
        structured_data: { fields: [{ id: 'rating', value: 4 }] },
        display_content: { type: 'doc', content: [] },
      });
      expect(second.history).toMatchObject({
        label: 'Fallback label',
        related_message_id: 'fallback-button',
      });
      await waitFor(() =>
        expect(allByRole('heading', 'Fallback label')).toHaveLength(1)
      );
    } finally {
      await act(async () => mount.unmount());
    }
  });

  it('uses an option label without dropping input fields when the option has no input text', async () => {
    const mount = await mountChoices();
    try {
      await act(() =>
        mount.instance.messaging.addMessage(
          responseOf('fallback-option', [
            {
              response_type: MessageResponseTypes.OPTION,
              options: [
                {
                  label: 'Structured option',
                  value: {
                    input: {
                      structured_data: { fields: [{ id: 'rating', value: 4 }] },
                    },
                  },
                },
              ],
            },
          ])
        )
      );
      await waitFor(() =>
        expect(allByRole('button', 'Structured option')).toHaveLength(1)
      );
      await click(byRole('button', 'Structured option'));
      const request = await mount.sent(1);
      expect(request.input).toEqual({
        text: 'Structured option',
        message_type: MessageInputType.TEXT,
        structured_data: { fields: [{ id: 'rating', value: 4 }] },
      });
      expect(request.history).toMatchObject({
        label: 'Structured option',
        related_message_id: 'fallback-option',
        is_choice_request: true,
      });
      await waitFor(() =>
        expect(allByRole('heading', 'Structured option')).toHaveLength(1)
      );
    } finally {
      await act(async () => mount.unmount());
    }
  });

  it('makes a long option list usable while a silent selection keeps its history off the transcript', async () => {
    const title = 'Choose a utility route';
    const mount = await mountChoices(title);
    const options = Array.from({ length: 5 }, (_, index) => ({
      label: `Utility route ${index + 1}`,
      value: { input: { text: `route-${index + 1}` } },
      silent: true,
    }));
    try {
      await act(() =>
        mount.instance.messaging.addMessage(
          responseOf('dropdown-owner', [
            {
              response_type: MessageResponseTypes.OPTION,
              title,
              options,
            },
          ])
        )
      );
      await waitFor(() => expect(allByRole('combobox', title)).toHaveLength(1));
      await click(byRole('combobox', title));
      await waitFor(() =>
        expect(allByRole('option', 'Utility route 3')).toHaveLength(1)
      );
      await click(byRole('option', 'Utility route 3'));
      const request = await mount.sent(1);
      expect(request.input.text).toBe('route-3');
      expect(request.history).toMatchObject({
        label: 'Utility route 3',
        related_message_id: 'dropdown-owner',
        is_choice_request: true,
        silent: true,
      });
      await waitFor(() =>
        expect(shownText(byRole('combobox', title))).toContain(
          'Utility route 3'
        )
      );
      expect(allByRole('heading', 'Utility route 3')).toHaveLength(0);
      expect(allByRole('heading', 'route-3')).toHaveLength(0);
    } finally {
      await act(async () => mount.unmount());
    }
  });
});
