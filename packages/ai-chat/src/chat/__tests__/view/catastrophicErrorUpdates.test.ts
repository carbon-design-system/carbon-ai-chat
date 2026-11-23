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
  CatastrophicErrorPanelState,
  ChatInstance,
  PublicConfig,
  ViewType,
} from '../../../aiChatEntry';
import {
  allByRole,
  byRole,
  changeView,
  click,
  contractChat,
  contractSetup,
  flatChildren,
  openElement,
  shownText,
} from '../helpers/contract';

const PANEL_NAME = 'Update error panel';

const FIRST = {
  aria_catastrophicErrorPanel: PANEL_NAME,
  buttons_retry: 'Retry first',
  errors_somethingWrong: 'First problem',
  errors_communicating: 'First cannot reach {assistantName}.',
};

const SECOND = {
  aria_catastrophicErrorPanel: PANEL_NAME,
  buttons_retry: 'Try again',
  errors_somethingWrong: 'Localized problem',
  errors_communicating: 'Cannot reach {assistantName}.',
};

const panelCount = () => allByRole('dialog', PANEL_NAME).length;
const panel = () => byRole('dialog', PANEL_NAME);
const panelText = () => shownText(panel()).replace(/\s+/g, ' ').trim();

/** The text of each `strong` the panel shows, in the flat tree a user sees. */
function boldTexts(node: Node = panel()): string[] {
  if (node instanceof Element && node.localName === 'strong') {
    return [node.textContent ?? ''];
  }
  return flatChildren(node).flatMap((child) => boldTexts(child));
}

/** A mounted chat, and a way to change its config the way its host does. */
interface Host {
  instance: ChatInstance;
  updateConfig: (config: Partial<PublicConfig>) => Promise<void>;
}

const HOSTS: Array<[string, (config: Partial<PublicConfig>) => Promise<Host>]> =
  [
    [
      'ChatContainer',
      async (config) => {
        let current: Partial<PublicConfig> = {
          ...config,
          messaging: { skipWelcome: true },
        };
        const mount = await contractChat(current);
        await changeView(mount.instance, ViewType.MAIN_WINDOW);
        return {
          instance: mount.instance,
          updateConfig: async (next) => {
            current = { ...current, ...next };
            await mount.rerender(current);
          },
        };
      },
    ],
    [
      'cds-aichat-custom-element',
      async (config) => {
        const mount = await openElement('cds-aichat-custom-element', {
          ...config,
        });
        return {
          instance: mount.instance,
          updateConfig: async (next) => {
            await act(async () => {
              Object.assign(mount.element, next);
            });
          },
        };
      },
    ],
  ];

async function update(
  instance: ChatInstance,
  panelState: CatastrophicErrorPanelState
): Promise<void> {
  await act(async () => {
    instance.updateCatastrophicErrorPanel(panelState);
  });
}

describe.each(HOSTS)('the error panel through %s', (_name, mountHost) => {
  contractSetup();

  it('follows strings changes while open, and keeps a markdown body', async () => {
    const { instance, updateConfig } = await mountHost({
      assistantName: 'First Assistant',
      strings: FIRST,
    });
    await update(instance, {
      isOpen: true,
      title: 'Panel error proof',
      bodyText: 'Retained **bold body**.',
    });
    await waitFor(() =>
      expect(panelText()).toContain('Panel error proof Retained bold body.')
    );
    expect(boldTexts()).toEqual(['bold body']);
    expect(allByRole('button', 'Retry first')).toHaveLength(1);

    // A strings change leaves the call's own title and markdown body alone.
    await updateConfig({ assistantName: 'Panel Assistant', strings: SECOND });
    await waitFor(() =>
      expect(allByRole('button', 'Try again')).toHaveLength(1)
    );
    expect(panelCount()).toBe(1);
    expect(panelText()).toContain('Panel error proof Retained bold body.');
    expect(boldTexts()).toEqual(['bold body']);

    // With no title or body of its own, the panel shows the current strings.
    await update(instance, {
      isOpen: true,
      title: undefined,
      bodyText: undefined,
      hideRetryButton: true,
    });
    await waitFor(() =>
      expect(panelText()).toContain(
        'Localized problem Cannot reach Panel Assistant.'
      )
    );
    expect(panelCount()).toBe(1);
    expect(allByRole('button', 'Try again')).toHaveLength(0);

    await updateConfig({
      assistantName: 'Third Assistant',
      strings: { ...SECOND, errors_somethingWrong: 'Third problem' },
    });
    await waitFor(() =>
      expect(panelText()).toContain(
        'Third problem Cannot reach Third Assistant.'
      )
    );
    expect(panelCount()).toBe(1);

    await update(instance, { isOpen: true, hideRetryButton: false });
    await click(byRole('button', 'Try again'));
    await waitFor(() => expect(panelCount()).toBe(0));
  });
});
