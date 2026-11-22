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
  type ButtonItem,
  ButtonItemType,
  GenericItem,
  MessageResponseTypes,
  MessageState,
} from '../../../aiChatEntry';
import {
  byRole,
  click,
  contractChat,
  contractSetup,
  pause,
  responseOf,
  shownText,
} from '../helpers/contract';

const TITLE = 'Snapshot panel';
const LABEL = 'Open snapshot panel';
const text = (value: string, id: string): GenericItem => ({
  response_type: MessageResponseTypes.TEXT,
  text: value,
  streaming_metadata: { id },
});
const footer = (label: string, id: string): ButtonItem => ({
  response_type: MessageResponseTypes.BUTTON,
  button_type: ButtonItemType.POST_BACK,
  label,
  value: { input: { text: label } },
  streaming_metadata: { id },
});

// @covers instance.messaging.upsertMessage response-type.button
// C09 / INTENDED08c: keep opening membership, skip removed items, resolve surviving local IDs live.
describe('response panel opening membership', () => {
  contractSetup();

  async function mountPanel(body: GenericItem[], buttons: ButtonItem[] = []) {
    const onError = vi.fn();
    const { instance } = await contractChat({
      openChatByDefault: true,
      strings: { aria_responsePanel: TITLE },
      messaging: { skipWelcome: true },
      onError,
    });
    async function update(
      nextBody: GenericItem[],
      nextFooter = buttons,
      label = LABEL,
      otherItems: GenericItem[] = []
    ) {
      await act(() =>
        instance.messaging.upsertMessage(
          'snapshot-panel',
          MessageState.COMPLETE,
          () =>
            responseOf('snapshot-panel', [
              {
                response_type: MessageResponseTypes.BUTTON,
                button_type: ButtonItemType.SHOW_PANEL,
                label,
                streaming_metadata: { id: 'root' },
                panel: { title: TITLE, body: nextBody, footer: nextFooter },
              },
              ...otherItems,
            ])
        )
      );
    }
    await update(body);
    await click(byRole('button', LABEL));
    await waitFor(() => expect(byRole('dialog', TITLE)).not.toBeNull());
    return { update, onError };
  }

  it('keeps the opening body membership while surviving named children update', async () => {
    const { update, onError } = await mountPanel([
      text('One', 'one'),
      text('Two', 'two'),
    ]);
    await waitFor(() =>
      expect(shownText(byRole('dialog', TITLE))).toContain('Two')
    );
    await update([
      text('One', 'one'),
      text('Two updated', 'two'),
      text('Three added', 'three'),
    ]);
    await waitFor(() =>
      expect(shownText(byRole('dialog', TITLE))).toContain('Two updated')
    );
    await pause(250);
    expect(shownText(byRole('dialog', TITLE))).not.toContain('Three added');
    expect(onError).not.toHaveBeenCalled();
  });

  it('skips a removed opening child without reporting a render error', async () => {
    const { update, onError } = await mountPanel([
      text('One', 'one'),
      text('Two', 'two'),
    ]);
    await waitFor(() =>
      expect(shownText(byRole('dialog', TITLE))).toContain('Two')
    );
    await update([text('One', 'one')]);
    await waitFor(() =>
      expect(shownText(byRole('dialog', TITLE))).not.toContain('Two')
    );
    expect(shownText(byRole('dialog', TITLE))).toContain('One');
    await pause();
    expect(onError).not.toHaveBeenCalled();
  });

  it('keeps an initially empty opening body empty after a later child arrives', async () => {
    const { update, onError } = await mountPanel([]);
    await update([text('Later child', 'later')], [], 'Open updated panel');
    await waitFor(() =>
      expect(byRole('button', 'Open updated panel')).not.toBeNull()
    );
    await pause();
    await pause(250);
    expect(shownText(byRole('dialog', TITLE))).not.toContain('Later child');
    expect(onError).not.toHaveBeenCalled();
  });

  it.each(['body', 'footer'])(
    'resolves an opening %s child after its named local item moves to another parent',
    async (slot) => {
      const body = slot === 'body' ? [text('Before move', 'moving')] : [];
      const buttons =
        slot === 'footer' ? [footer('Before move', 'moving')] : [];
      const { update, onError } = await mountPanel(body, buttons);
      await waitFor(() =>
        expect(shownText(byRole('dialog', TITLE))).toContain('Before move')
      );
      await update([], [], LABEL, [
        {
          response_type: MessageResponseTypes.CARD,
          body: slot === 'body' ? [text('After move', 'moving')] : [],
          footer: slot === 'footer' ? [footer('After move', 'moving')] : [],
        },
      ]);
      await waitFor(() =>
        expect(shownText(byRole('dialog', TITLE))).toContain('After move')
      );
      expect(onError).not.toHaveBeenCalled();
    }
  );

  it('keeps opening footer membership while surviving footer labels update', async () => {
    const { update, onError } = await mountPanel(
      [text('Body', 'body')],
      [footer('First', 'first'), footer('Second', 'second')]
    );
    await waitFor(() =>
      expect(shownText(byRole('dialog', TITLE))).toContain('Second')
    );
    await update(
      [text('Body', 'body')],
      [
        footer('First', 'first'),
        footer('Second updated', 'second'),
        footer('Third added', 'third'),
      ]
    );
    await waitFor(() =>
      expect(shownText(byRole('dialog', TITLE))).toContain('Second updated')
    );
    await pause(250);
    expect(shownText(byRole('dialog', TITLE))).not.toContain('Third added');
    expect(onError).not.toHaveBeenCalled();
  });
});
