/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import { PageObjectId, PanelType } from '../../../aiChatEntry';
import {
  allByRole,
  byRole,
  click,
  contractChat,
  contractSetup,
  getByTestId,
  isHidden,
} from '../helpers/contract';

describe('public panel requested before first render', () => {
  contractSetup();

  it('shows the panel opened in the actual before-render callback and closes through its public control', async () => {
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      strings: { general_returnToAssistant: 'Return from initial panel' },
      onBeforeRender: async (instance) => {
        await instance.customPanels.getPanel().open({
          title: 'Initial owned panel',
          disableAnimation: true,
        });
      },
    });
    try {
      await waitFor(() =>
        expect(allByRole('dialog', 'Initial owned panel')).toHaveLength(1)
      );
      expect(mount.instance.state.get().customPanels.default.isOpen).toBe(true);
      await click(
        byRole(
          'button',
          'Return from initial panel',
          getByTestId(PageObjectId.CUSTOM_PANEL)
        )
      );
      await waitFor(() =>
        expect(mount.instance.state.get().customPanels.default.isOpen).toBe(
          false
        )
      );
      await waitFor(() =>
        expect(allByRole('dialog', 'Initial owned panel')).toHaveLength(0)
      );
      expect(mount.instance.state.get().viewState.mainWindow).toBe(true);
    } finally {
      await act(async () => mount.unmount());
    }
  });

  it('keeps history opened in the before-render callback open and shown through the first mobile layout with startClosed', async () => {
    const content = document.createElement('span');
    content.textContent = 'Initial history content';
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      history: { isOn: true, startClosed: true },
      onBeforeRender: async (instance) => {
        instance.writeableElements.historyPanelElement.append(content);
        await instance.customPanels.getPanel(PanelType.HISTORY).open();
      },
    });
    try {
      // A floating chat measures as mobile on its first render, which creates
      // the mobile history panel after the open.
      await waitFor(() =>
        expect(mount.instance.state.get().customPanels.history).toEqual({
          isOpen: true,
          isMobile: true,
        })
      );
      await waitFor(() => expect(isHidden(content)).toBe(false));
      await act(() =>
        mount.instance.customPanels.getPanel(PanelType.HISTORY).close()
      );
      await waitFor(() => expect(isHidden(content)).toBe(true));
    } finally {
      await act(async () => mount.unmount());
    }
  });
});
