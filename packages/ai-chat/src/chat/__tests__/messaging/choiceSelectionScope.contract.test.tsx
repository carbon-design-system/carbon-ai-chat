// @vitest-environment jsdom
// happy-dom 21 does not retarget event.target out of shadow roots, which the chat's React handlers need; every case here fails at its first click.
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
  ButtonItemType,
  MessageResponseTypes,
  type ButtonItem,
  type CardItem,
  type OptionItem,
} from '../../../aiChatEntry';
import {
  addChunk,
  byRole,
  click,
  contractChat,
  contractSetup,
  fakeBackend,
  isDisabled,
  isInFlatTree,
  mainPanelText,
  responseOf,
  textItem,
} from '../helpers/contract';

function postBack(label: string): ButtonItem {
  return {
    response_type: MessageResponseTypes.BUTTON,
    button_type: ButtonItemType.POST_BACK,
    label,
    value: { input: { text: label.toLowerCase() } },
    silent: true,
  };
}

function choices(title: string): OptionItem {
  return {
    response_type: MessageResponseTypes.OPTION,
    title,
    options: [
      { label: 'Yes', value: { input: { text: 'yes' } }, silent: true },
      { label: 'No', value: { input: { text: 'no' } }, silent: true },
    ],
  };
}

async function mountChoices() {
  const backend = fakeBackend({ autoResolve: true });
  const mount = await contractChat({
    openChatByDefault: true,
    messaging: {
      skipWelcome: true,
      customSendMessage: backend.customSendMessage,
    },
  });
  return { ...mount, backend };
}

// @covers response-type.card response-type.button response-type.option
// @covers instance.messaging.addMessage instance.messaging.addMessageChunk
// @covers config.messaging.customSendMessage

describe('public choice selection scope', () => {
  contractSetup();

  it('shows a choice made from a card footer on that footer button alone', async () => {
    const { instance, backend, unmount } = await mountChoices();
    try {
      const card: CardItem = {
        response_type: MessageResponseTypes.CARD,
        body: [textItem('Pick the next step')],
        footer: [postBack('Go'), postBack('Wait')],
      };
      await act(() =>
        instance.messaging.addMessage(responseOf('card-choice', [card]))
      );
      const go = await waitFor(() => byRole('button', 'Go'));
      const wait = byRole('button', 'Wait');
      await waitFor(() => expect(go).toHaveAttribute('aria-pressed', 'false'));
      expect(wait).toHaveAttribute('aria-pressed', 'false');
      expect(isDisabled(go)).toBe(false);

      await click(go);
      await waitFor(() => expect(backend.requests).toHaveLength(1));
      expect(backend.requests[0].request.input.text).toBe('go');
      expect(backend.requests[0].request.history).toMatchObject({
        label: 'Go',
        related_message_id: 'card-choice',
      });
      await waitFor(() => expect(go).toHaveAttribute('aria-pressed', 'true'));
      expect(isDisabled(go)).toBe(true);
      // Its footer sibling keeps its own, unpressed state and stays usable.
      expect(wait).toHaveAttribute('aria-pressed', 'false');
      expect(isDisabled(wait)).toBe(false);
    } finally {
      await act(async () => unmount());
    }
  });

  it('keeps an option chosen from a streamed list through later chunks into that list', async () => {
    const { instance, backend, unmount } = await mountChoices();
    const responseID = 'streamed-choice';
    const itemID = 'stream-options';
    try {
      await addChunk(instance, {
        streaming_metadata: { response_id: responseID },
        complete_item: {
          ...choices('Continue?'),
          streaming_metadata: { id: itemID },
        },
      });
      const yes = await waitFor(() => byRole('button', 'Yes'));
      const no = byRole('button', 'No');
      expect(yes.tabIndex).toBe(0);
      expect(no.tabIndex).toBe(0);

      await click(yes);
      await waitFor(() => expect(backend.requests).toHaveLength(1));
      expect(backend.requests[0].request.input.text).toBe('yes');
      expect(backend.requests[0].request.history).toMatchObject({
        label: 'Yes',
        related_message_id: responseID,
        is_choice_request: true,
      });
      await waitFor(() => expect(yes.tabIndex).toBe(-1));
      expect(no.tabIndex).toBe(0);

      await addChunk(instance, {
        streaming_metadata: { response_id: responseID },
        partial_item: {
          response_type: MessageResponseTypes.OPTION,
          streaming_metadata: { id: itemID },
        },
      });
      expect(isInFlatTree(yes)).toBe(true);
      expect(yes.tabIndex).toBe(-1);
      expect(no.tabIndex).toBe(0);

      // A later complete_item rewrites the item; its new title shows the
      // chunk landed, and the choice stays on the option the user picked.
      await addChunk(instance, {
        streaming_metadata: { response_id: responseID },
        complete_item: {
          ...choices('Continue now?'),
          streaming_metadata: { id: itemID },
        },
      });
      await waitFor(() => expect(mainPanelText()).toContain('Continue now?'));
      expect(isInFlatTree(yes)).toBe(true);
      expect(isInFlatTree(no)).toBe(true);
      // The rewrite updates the same list rather than drawing a second one.
      expect(byRole('button', 'Yes')).toBe(yes);
      expect(byRole('button', 'No')).toBe(no);
      expect(mainPanelText()).not.toContain('Continue?');
      expect(yes.tabIndex).toBe(-1);
      expect(no.tabIndex).toBe(0);
      expect(backend.requests).toHaveLength(1);
    } finally {
      await act(async () => unmount());
    }
  });
});
