/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import { userEvent } from 'vitest/browser';

import { CarbonTheme } from '../../../types/config/CarbonTheme';
import { PageObjectId } from '../../../testing/PageObjectId';
import { ScreenShareState } from '../../../types/config/ServiceDeskConfig';
import type { ServiceDeskCallback } from '../../../types/config/ServiceDeskConfig';
import {
  DANA,
  allByRole,
  contractSetup,
  getByTestId,
  shownText,
} from '../helpers/contract';
import {
  deep,
  deepActive,
  deepAll,
  isVisible,
  mountPanelHost,
  type HostFramework,
} from '../helpers/browserPanels';

// The disclaimer counts as read only once its panel body scrolls to the end,
// and the confirmation body's slotting and spacing come from real CSS.
describe('native panel bodies', () => {
  contractSetup();
  afterEach(() => {
    document.documentElement.dir = '';
  });

  for (const framework of ['react', 'web-component'] as HostFramework[]) {
    it(`${framework} disclaimer keeps its body slot and enables Accept after reading`, async () => {
      document.documentElement.dir = framework === 'react' ? 'ltr' : 'rtl';
      const host = await mountPanelHost(framework, 'sidebar', {
        injectCarbonTheme: CarbonTheme.G100,
        disclaimer: {
          isOn: true,
          disclaimerHTML: Array.from(
            { length: 60 },
            (_, index) => `<p>Disclaimer paragraph ${index} must be read.</p>`
          ).join(''),
        },
      });
      expect(
        deep('cds-aichat-custom-element') ? 'web-component' : 'react'
      ).toBe(framework);
      await waitFor(() =>
        expect(
          isVisible(getByTestId(PageObjectId.DISCLAIMER_PANEL, host.root))
        ).toBe(true)
      );
      const panel = getByTestId(PageObjectId.DISCLAIMER_PANEL, host.root);
      const body = panel.querySelector<HTMLElement>(
        'cds-aichat-disclaimer-body'
      );
      await waitFor(() => expect(body.querySelectorAll('p')).toHaveLength(60));
      expect({
        shadow: Boolean(body.shadowRoot),
        slot: body.parentElement.assignedSlot?.name,
        display: getComputedStyle(body).display,
        svgParent: body.querySelector('svg')?.parentElement.className,
      }).toEqual({
        shadow: false,
        slot: 'body',
        display: 'contents',
        svgParent: 'cds-aichat--disclaimer__icon',
      });
      const accept = getByTestId(
        PageObjectId.DISCLAIMER_ACCEPT_BUTTON,
        host.root
      ).shadowRoot.querySelector('button');
      const scrollBody =
        panel.shadowRoot.querySelector<HTMLElement>('.panel-body');
      expect(scrollBody.scrollHeight).toBeGreaterThan(scrollBody.clientHeight);
      // Outlast the chat's own read checks, so a disabled Accept means the
      // unscrolled text is still unread.
      await new Promise((resolve) => setTimeout(resolve, 600));
      expect(accept.disabled).toBe(true);
      scrollBody.scrollTop = scrollBody.scrollHeight;
      await waitFor(() => expect(accept.disabled).toBe(false));
      accept.focus();
      expect(deepActive()).toBe(accept);
      await userEvent.keyboard('{Enter}');
      await waitFor(() =>
        expect(
          isVisible(
            deep(`[data-testid="${PageObjectId.DISCLAIMER_PANEL}"]`, host.root)
          )
        ).toBe(false)
      );
      await waitFor(() =>
        expect(isVisible(getByTestId(PageObjectId.MAIN_PANEL, host.root))).toBe(
          true
        )
      );
      expect(deepAll('.cds-aichat--aria-announcer')).toHaveLength(1);
      await host.unmount();
    });

    it(`${framework} native confirmation keeps direct slots, keyboard actions, and rank`, async () => {
      document.documentElement.dir = framework === 'react' ? 'ltr' : 'rtl';
      let callback: ServiceDeskCallback;
      const host = await mountPanelHost(framework, 'sidebar', {
        serviceDeskFactory: async (parameters) => {
          callback = parameters.callback;
          return {
            getName: () => 'Confirmation desk',
            startChat: async () => undefined,
            endChat: async () => undefined,
            sendMessageToAgent: async () => undefined,
          };
        },
      });
      const { instance } = host;
      await act(() => instance.serviceDesk.startConversation());
      await act(() => callback.agentJoined(DANA));
      const requests: Promise<ScreenShareState>[] = [];
      await act(async () => {
        requests.push(callback.screenShareRequest());
      });
      const body = await waitFor(() => {
        const found = deepAll('cds-aichat-confirmation-body', host.root).find(
          (node) =>
            Array.from(node.querySelectorAll('h1, h2, h3')).some(
              (heading) => heading.textContent.trim() === 'Screen sharing'
            )
        );
        expect(isVisible(found?.firstElementChild)).toBe(true);
        return found;
      });
      expect({
        shadow: Boolean(body.shadowRoot),
        slot: body.assignedSlot?.name,
        parent: body.parentElement.localName,
        display: getComputedStyle(body).display,
        padding: getComputedStyle(body.firstElementChild).paddingBlockStart,
      }).toEqual({
        shadow: false,
        slot: 'body',
        parent: 'cds-aichat-panel',
        display: 'contents',
        padding: '32px',
      });
      const footer = body.parentElement.querySelector<HTMLElement>(
        ':scope > [slot="footer"]'
      );
      const footerButton = (name: string) => {
        const found = allByRole('button', name, footer);
        expect(found).toHaveLength(1);
        return found[0];
      };
      const decline = footerButton('Decline');
      await waitFor(() => expect(deepActive()).toBe(decline));
      await waitFor(() =>
        expect(
          deepAll('.cds-aichat--aria-announcer')
            .map((node) => node.textContent)
            .join(' ')
        ).toMatch(/share your screen/i)
      );
      await act(async () => {
        instance.updateCatastrophicErrorPanel({
          isOpen: true,
          title: 'Higher priority error',
          bodyText: 'Retained **markdown** body.',
        });
      });
      const error = () =>
        getByTestId(PageObjectId.CATASTROPHIC_PANEL, host.root);
      await waitFor(() => {
        expect(shownText(error())).toContain('Higher priority error');
        expect(isVisible(error())).toBe(true);
      });
      await waitFor(() =>
        expect(isVisible(body.firstElementChild)).toBe(false)
      );
      await act(async () => {
        instance.updateCatastrophicErrorPanel({ isOpen: false });
      });
      await waitFor(() => expect(isVisible(body.firstElementChild)).toBe(true));
      footerButton('Decline').focus();
      await userEvent.keyboard('{Escape}');
      await expect(requests[0]).resolves.toBe(ScreenShareState.DECLINED);
      await waitFor(() =>
        expect(isVisible(body.firstElementChild)).toBe(false)
      );
      await waitFor(() =>
        expect(isVisible(getByTestId(PageObjectId.MAIN_PANEL, host.root))).toBe(
          true
        )
      );

      await act(async () => {
        requests.push(callback.screenShareRequest());
      });
      await waitFor(() => expect(isVisible(body.firstElementChild)).toBe(true));
      const accept = footerButton('Share screen');
      accept.focus();
      expect(deepActive()).toBe(accept);
      await userEvent.keyboard('{Enter}');
      await expect(requests[1]).resolves.toBe(ScreenShareState.ACCEPTED);
      await waitFor(() =>
        expect(isVisible(body.firstElementChild)).toBe(false)
      );
      expect(instance.getState().humanAgent.isScreenSharing).toBe(true);
      await act(() => callback.screenShareEnded());
      await act(() => instance.serviceDesk.endConversation());
      await host.unmount();
    });
  }
});
