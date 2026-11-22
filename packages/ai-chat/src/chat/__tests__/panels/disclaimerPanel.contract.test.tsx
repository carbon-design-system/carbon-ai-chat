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
  CarbonTheme,
  PageObjectId,
  type ChatContainerProps,
} from '../../../aiChatEntry';
import {
  allByRole,
  byRole,
  click,
  contractChat,
  contractCustomElementChat,
  contractSetup,
  getByTestId,
  isDisabled,
  shownText,
  type ContractMount,
} from '../helpers/contract';

const PANEL_NAME = 'Owned disclaimer panel';
const NOTE_NAME = 'Owned terms note';

/**
 * Short enough that the panel body never scrolls, so the chat counts it as
 * read without a scroll. The same object goes to every render, so a rerender
 * changes only the strings and the theme.
 */
const DISCLAIMER = {
  isOn: true,
  disclaimerHTML: `<p>Owned short terms</p><input type="text" aria-label="${NOTE_NAME}">`,
};

/** The host props for one render, with its Accept wording and theme. */
function disclaimerProps(
  accept: string,
  label: string,
  injectCarbonTheme?: CarbonTheme
): Partial<ChatContainerProps> {
  return {
    openChatByDefault: true,
    messaging: { skipWelcome: true },
    disclaimer: DISCLAIMER,
    strings: {
      aria_disclaimerPanel: PANEL_NAME,
      disclaimer_accept: accept,
      disclaimer_acceptance_label: label,
    },
    ...(injectCarbonTheme ? { injectCarbonTheme } : {}),
  };
}

/** The Accept control, by its public test ID. */
function accept(): HTMLElement {
  return getByTestId(PageObjectId.DISCLAIMER_ACCEPT_BUTTON);
}

/** Mounts one React host with these props. */
type MountHost = (
  props: Partial<ChatContainerProps>
) => Promise<Pick<ContractMount, 'instance' | 'rerender' | 'unmount'>>;

const HOSTS: [string, MountHost][] = [
  ['ChatContainer', contractChat],
  ['ChatCustomElement', contractCustomElementChat],
];

describe.each(HOSTS)('public disclaimer panel through %s', (_name, mount) => {
  contractSetup();

  it('keeps Accept enabled and the typed terms through a strings and theme update, then closes on Accept', async () => {
    const chat = await mount(
      disclaimerProps('Owned accept', 'Owned acceptance')
    );
    try {
      await waitFor(() => expect(byRole('dialog', PANEL_NAME)).not.toBeNull());
      // Short text counts as read, so Accept becomes usable without a scroll.
      await waitFor(() => expect(isDisabled(accept())).toBe(false));
      expect(byRole('button', 'Owned acceptance')).not.toBeNull();
      const note = byRole('textbox', NOTE_NAME) as HTMLInputElement;
      await act(async () => {
        note.value = 'Kept note';
        note.dispatchEvent(new Event('input', { bubbles: true }));
      });

      await chat.rerender(
        disclaimerProps(
          'Renamed accept',
          'Renamed acceptance',
          CarbonTheme.G100
        )
      );
      await waitFor(() =>
        expect(byRole('button', 'Renamed acceptance')).not.toBeNull()
      );
      expect(allByRole('button', 'Owned acceptance')).toHaveLength(0);
      expect(shownText(accept())).toContain('Renamed accept');
      // The read state outlives the update.
      expect(isDisabled(accept())).toBe(false);
      // The update did not replace the disclaimer HTML.
      expect(byRole('textbox', NOTE_NAME)).toBe(note);
      expect(note.value).toBe('Kept note');
      expect(
        chat.instance.getState().disclaimersAccepted[window.location.hostname]
      ).not.toBe(true);

      await click(byRole('button', 'Renamed acceptance'));
      await waitFor(() =>
        expect(allByRole('dialog', PANEL_NAME)).toHaveLength(0)
      );
      expect(
        chat.instance.getState().disclaimersAccepted[window.location.hostname]
      ).toBe(true);
    } finally {
      await act(async () => chat.unmount());
    }
  });
});
