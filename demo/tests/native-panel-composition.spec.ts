/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import {
  BusEventType,
  ButtonItemType,
  MessageResponseTypes,
  MessageState,
  PanelType,
} from '@carbon/ai-chat/server';
import type { ButtonItem, ChatInstance } from '@carbon/ai-chat';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import {
  destroyChatSession,
  expectNoCspViolations,
  installCspGuard,
  installTestCsp,
  openChatWindow,
  prepareDemoPage,
  sendChatMessage,
} from './utils';
import type {} from '../types/window';

interface PanelEventSnapshot {
  type: string;
  open: boolean;
  title?: string;
  content: string;
  connected: boolean;
}

type PanelProbeWindow = Window & {
  animationPanelEvents: PanelEventSnapshot[];
  panelAnimationsStarted: number;
  panelCompositionProbe: {
    instance: ChatInstance;
    host: HTMLElement;
    button: HTMLButtonElement;
    defaults: object;
    events: PanelEventSnapshot[];
    reactivations: number;
    backCalls: number;
  };
};

async function installHarnessCsp(page: Page) {
  let fixtureCss = '';
  await page.route('**/native-panel-fixture.css', (route) =>
    route.fulfill({ contentType: 'text/css', body: fixtureCss })
  );
  await installTestCsp(page, (body) => {
    const style = body.match(/<style>([\s\S]*?)<\/style>/i);
    if (!style) {
      throw new Error('Host compatibility fixture stylesheet was not found');
    }
    fixtureCss = style[1];
    return body.replace(
      style[0],
      '<link rel="stylesheet" href="/native-panel-fixture.css">'
    );
  });
  await installCspGuard(page);
}

async function prepareHost(
  page: Page,
  framework: string,
  layout: string,
  reducedMotion: 'reduce' | 'no-preference' = 'reduce'
) {
  await page.emulateMedia({ reducedMotion });
  await prepareDemoPage(page, {
    settings: {
      framework,
      layout,
      direction: layout === 'sidebar' ? 'rtl' : 'ltr',
      writeableElements: 'false',
    },
  });
  await page.waitForFunction(
    () =>
      window.chatInstance?.serviceManager?.store.getState()
        .initialViewChangeComplete
  );
  await page.evaluate(() =>
    window.setChatConfig({
      openChatByDefault: true,
      homescreen: { isOn: false },
      header: { title: 'Panel composition' },
    })
  );
  await openChatWindow(page);
  await expect(page.locator('html')).toHaveAttribute(
    'dir',
    layout === 'sidebar' ? 'rtl' : 'ltr'
  );
  await expect(page.locator('cds-aichat-custom-element')).toHaveCount(
    framework === 'web-component' && layout !== 'float' ? 1 : 0
  );
}

test.afterEach(async ({ page }) => {
  await expectNoCspViolations(page);
  await destroyChatSession(page);
});

for (const framework of ['react', 'web-component']) {
  for (const layout of ['float', 'sidebar']) {
    test(`${framework} ${layout} native panel slots, events, focus, and retained DOM`, async ({
      page,
    }) => {
      await prepareHost(page, framework, layout);
      await page.evaluate(
        (types) => {
          const instance = window.chatInstance;
          const host = instance.writeableElements.customPanelElement;
          const button = document.createElement('button');
          button.type = 'button';
          button.dataset.testid = 'native-panel-counter';
          button.textContent = 'Panel count 0';
          let count = 0;
          button.addEventListener('click', () => {
            button.textContent = `Panel count ${++count}`;
          });
          host.appendChild(button);
          const probe = ((window as PanelProbeWindow).panelCompositionProbe = {
            instance,
            host,
            button,
            defaults: {
              ...instance.serviceManager.store.getState().customPanelState
                .options,
            },
            events: [],
            reactivations: 0,
            backCalls: 0,
          });
          instance.on(
            types.map((type) => ({
              type,
              handler: (event) => {
                const state =
                  instance.serviceManager.store.getState().customPanelState;
                probe.events.push({
                  type: event.type,
                  open: state.isOpen,
                  title: state.options.title,
                  content: button.textContent,
                  connected: host.isConnected,
                });
              },
            }))
          );
          const frame =
            host.assignedSlot?.getRootNode() instanceof ShadowRoot
              ? (host.assignedSlot.getRootNode() as ShadowRoot).querySelector(
                  '[data-panel-name="custom"]'
                )
              : null;
          frame?.addEventListener('openend', (event: CustomEvent) => {
            if (event.detail?.isReactivation) {
              probe.reactivations += 1;
            }
          });
          return instance.customPanels.getPanel().open({
            title: '**Native panel**',
            disableAnimation: true,
            showFrame: true,
            showChatHeader: false,
            backButtonType: 'close',
            backButtonPosition: 'start',
          });
        },
        [
          BusEventType.CUSTOM_PANEL_PRE_OPEN,
          BusEventType.CUSTOM_PANEL_OPEN,
          BusEventType.CUSTOM_PANEL_PRE_CLOSE,
          BusEventType.CUSTOM_PANEL_CLOSE,
        ]
      );

      const region = page.locator('cds-aichat-native-panels');
      const custom = region.locator('[data-panel-name="custom"]');
      const counter = page.getByTestId('native-panel-counter');
      await expect(counter).toBeVisible();
      await expect(counter).toBeFocused();
      await expect(custom.locator('strong')).toHaveText('Native panel');
      expect(
        await region.evaluate((node) => {
          const root = node.getRootNode() as ShadowRoot;
          const container = root.host;
          const body = node.querySelector<HTMLElement>(
            '[data-panel-name="custom"] > [slot="body"]'
          );
          const host = (window as PanelProbeWindow).panelCompositionProbe.host;
          return {
            ownShadow: Boolean(node.shadowRoot),
            parent: node.parentElement.localName,
            panelsSlot: node.assignedSlot?.name,
            bodySlot: body.assignedSlot?.name,
            borrowedSlot: host.assignedSlot?.name,
            borrowedParent: host.parentElement === container,
            sharedSlotRoot: host.assignedSlot?.getRootNode() === root,
            consumerRoot: host.getRootNode() === container.getRootNode(),
          };
        })
      ).toEqual({
        ownShadow: false,
        parent: 'cds-aichat-shell',
        panelsSlot: 'panels',
        bodySlot: 'body',
        borrowedSlot: 'customPanelElement',
        borrowedParent: true,
        sharedSlotRoot: true,
        consumerRoot: true,
      });
      await counter.press('Enter');
      await expect(counter).toHaveText('Panel count 1');
      await page.evaluate(async (textType) => {
        await window.setChatConfig({
          header: { title: 'Updated shell config' },
        });
        await window.chatInstance.customPanels.getPanel().open({
          title: '**Updated panel**',
          disableAnimation: true,
          showFrame: true,
          showChatHeader: false,
          backButtonType: 'close',
          backButtonPosition: 'start',
        });
        await window.chatInstance.messaging.addMessageChunk({
          partial_response: { id: 'outside-panel-stream' },
          partial_item: {
            response_type: textType,
            text: 'Unrelated streamed text',
          },
        });
        await window.chatInstance.messaging.addMessageChunk({
          final_response: {
            id: 'outside-panel-stream',
            output: {
              generic: [
                {
                  response_type: textType,
                  text: 'Unrelated streamed text complete',
                },
              ],
            },
          },
        });
      }, MessageResponseTypes.TEXT);
      await expect(custom.locator('strong')).toHaveText('Updated panel');
      await expect(counter).toHaveText('Panel count 1');
      expect(
        await counter.evaluate((node) => {
          const probe = (window as PanelProbeWindow).panelCompositionProbe;
          return (
            node === probe.button &&
            window.chatInstance === probe.instance &&
            probe.host ===
              window.chatInstance.writeableElements.customPanelElement
          );
        })
      ).toBe(true);
      const back = custom.getByRole('button', {
        name: 'Return to conversation',
        exact: true,
      });
      await back.focus();
      await page.keyboard.press('Enter');
      await expect(counter).toBeHidden();
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              (window as PanelProbeWindow).panelCompositionProbe.events.length
          )
        )
        .toBe(4);
      const events = await page.evaluate(
        () => (window as PanelProbeWindow).panelCompositionProbe.events
      );
      expect(events.map(({ type }) => type)).toEqual([
        BusEventType.CUSTOM_PANEL_PRE_OPEN,
        BusEventType.CUSTOM_PANEL_OPEN,
        BusEventType.CUSTOM_PANEL_PRE_CLOSE,
        BusEventType.CUSTOM_PANEL_CLOSE,
      ]);
      expect(events.map(({ open }) => open)).toEqual([
        true,
        true,
        false,
        false,
      ]);
      expect(events.map(({ content }) => content)).toEqual([
        'Panel count 0',
        'Panel count 0',
        'Panel count 1',
        'Panel count 1',
      ]);
      expect(events.every(({ connected }) => connected)).toBe(true);
      expect(
        await page.evaluate(
          () =>
            window.chatInstance.serviceManager.store.getState().customPanelState
              .options
        )
      ).toEqual(
        await page.evaluate(
          () => (window as PanelProbeWindow).panelCompositionProbe.defaults
        )
      );

      await page.evaluate(() =>
        window.chatInstance.customPanels.getPanel().open({
          title: 'Legacy **panel**',
          disableAnimation: true,
          hideCloseButton: true,
          hideBackButton: false,
          onClickBack: () => {
            (window as PanelProbeWindow).panelCompositionProbe.backCalls += 1;
          },
        })
      );
      await expect(counter).toBeVisible();
      await expect(counter).toBeFocused();
      await expect(custom.locator('cds-aichat-header-view')).toHaveCount(1);
      await custom
        .getByRole('button', { name: 'Return to conversation', exact: true })
        .click();
      await expect(counter).toBeHidden();
      expect(
        await page.evaluate(
          () => (window as PanelProbeWindow).panelCompositionProbe.backCalls
        )
      ).toBe(1);
      expect(
        await page.evaluate(
          () =>
            window.chatInstance.serviceManager.store.getState().customPanelState
              .options
        )
      ).toEqual(
        await page.evaluate(
          () => (window as PanelProbeWindow).panelCompositionProbe.defaults
        )
      );
      await page.evaluate(() =>
        window.chatInstance.customPanels.getPanel().open({
          title: 'Covered panel',
          disableAnimation: true,
          showFrame: true,
          showChatHeader: false,
        })
      );
      await expect(counter).toBeVisible();
      await expect(counter).toBeFocused();
      await page.evaluate(() => {
        const { store } = window.chatInstance.serviceManager;
        store.dispatch({
          type: 'HA_SET_HUMAN_AGENT_JOINED',
          responseUserProfile: { id: 'panel-agent', nickname: 'Agent' },
        });
        store.dispatch({
          type: 'HA_SET_SHOW_SCREEN_SHARE_REQUEST',
          showRequest: true,
        });
      });
      const prompt = region.locator('[data-panel-name="screenShare"]');
      await expect(prompt).toBeVisible();
      await expect(counter).toBeHidden();
      const decline = prompt.locator('[slot="footer"]').getByRole('button', {
        name: 'Decline',
        exact: true,
      });
      await expect(decline).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(prompt).toBeHidden();
      await expect(counter).toBeVisible();
      // The parent restores the first header control after a covered panel's
      // closeend resets its options; reactivation skips the body's focus hook.
      await expect(
        custom.getByRole('button', {
          name: 'Return to conversation',
          exact: true,
        })
      ).toBeFocused();
      await expect(counter).toHaveText('Panel count 1');
      expect(
        await counter.evaluate((node) => {
          const probe = (window as PanelProbeWindow).panelCompositionProbe;
          return (
            node === probe.button &&
            probe.host ===
              window.chatInstance.writeableElements.customPanelElement
          );
        })
      ).toBe(true);
      expect(
        await page.evaluate(
          () =>
            window.chatInstance.serviceManager.store.getState().customPanelState
              .options
        )
      ).toEqual(
        await page.evaluate(
          () => (window as PanelProbeWindow).panelCompositionProbe.defaults
        )
      );
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              (window as PanelProbeWindow).panelCompositionProbe.reactivations
          )
        )
        .toBe(1);
      await custom
        .getByRole('button', { name: 'Return to conversation', exact: true })
        .click();
      await expect(counter).toBeHidden();
      expect(
        await page.evaluate(
          () => (window as PanelProbeWindow).panelCompositionProbe.backCalls
        )
      ).toBe(1);
      expect(
        await page.evaluate(
          () =>
            window.chatInstance.serviceManager.store.getState().customPanelState
              .options
        )
      ).toEqual(
        await page.evaluate(
          () => (window as PanelProbeWindow).panelCompositionProbe.defaults
        )
      );
    });
  }
}

for (const framework of ['react', 'web-component']) {
  test(`${framework} sidebar opens response, citation, and mobile history through public fixtures`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 600, height: 900 });
    await prepareHost(page, framework, 'sidebar');
    const region = page.locator('cds-aichat-native-panels');

    await sendChatMessage(page, 'button');
    await page
      .getByRole('button', { name: 'Open a panel', exact: true })
      .click();
    const response = region.locator('[data-panel-name="response"]');
    await expect(response).toBeVisible();
    await expect(response.locator('[slot="title"]')).toHaveText('My panel');
    await expect(response.locator(':scope > [slot="body"]')).toContainText(
      'Carbon is great!'
    );
    await expect(
      response
        .locator(':scope > [slot="footer"]')
        .getByRole('button', { name: 'Select footer action', exact: true })
    ).toBeVisible();
    // Footer URL items retain Carbon's standard-button role on their anchor.
    const optionalButton = response
      .locator(':scope > [slot="footer"]')
      .getByRole('button', { name: /Optional Button/ });
    await expect(optionalButton).toBeVisible();
    await expect(optionalButton).toHaveAttribute('href', 'https://ibm.com');
    expect(
      await response.evaluate((frame) => {
        const root = frame.getRootNode();
        const title = frame.querySelector<HTMLElement>('[slot="title"]');
        const body = frame.querySelector<HTMLElement>(':scope > [slot="body"]');
        const footer = frame.querySelector<HTMLElement>(
          ':scope > [slot="footer"]'
        );
        const region = frame.parentElement;
        return {
          nativeRegion: region.localName,
          regionSlot: region.assignedSlot?.name,
          titleParent: title.parentElement.localName,
          titleSlot: title.assignedSlot?.name,
          bodySlot: body.assignedSlot?.name,
          footerSlot: footer.assignedSlot?.name,
          sameRoot: [title, body, footer].every(
            (target) => target.isConnected && target.getRootNode() === root
          ),
        };
      })
    ).toEqual({
      nativeRegion: 'cds-aichat-native-panels',
      regionSlot: 'panels',
      titleParent: 'cds-aichat-toolbar',
      titleSlot: 'title',
      bodySlot: 'body',
      footerSlot: 'footer',
      sameRoot: true,
    });
    await response
      .getByRole('button', { name: 'Return to conversation', exact: true })
      .click();
    await expect(response).toBeHidden();

    await sendChatMessage(page, 'conversational search');
    await page
      .getByRole('button', {
        name: 'Open or close the list of sources',
        exact: true,
      })
      .click();
    const citationTitle =
      'Carbon Research Database - Internal Collection (IBM Quantum Network)';
    const sources = page.locator(
      '.cds-aichat--conversational-search [slot="citations"] cds-aichat-carousel'
    );
    const nextSource = sources.getByRole('button', {
      name: 'Go to next slide.',
      exact: true,
    });
    await expect(sources.getByText('1 / 3', { exact: true })).toBeVisible();
    await nextSource.click();
    await expect(sources.getByText('2 / 3', { exact: true })).toBeVisible();
    await nextSource.click();
    await expect(sources.getByText('3 / 3', { exact: true })).toBeVisible();
    const sourceCard = sources.getByRole('button', {
      name: citationTitle,
      exact: true,
    });
    await sourceCard.focus();
    await expect(sourceCard).toBeFocused();
    await sourceCard.press('Enter');
    const citation = region.locator('[data-panel-name="citation"]');
    await expect(citation).toBeVisible();
    await expect(citation.locator('[slot="title"]')).toHaveText(citationTitle);
    const citationBody = citation.locator(':scope > [slot="body"]');
    const sourceParagraph =
      'Carbon exists in multiple allotropes including diamond, graphite, and fullerenes. Diamond was first synthesized artificially in 1955, while fullerenes were discovered in 1985, and graphene was first isolated in 2004 by Andre Geim and Konstantin Novoselov at the University of Manchester.';
    await expect(citationBody).toContainText(sourceParagraph);
    // The fixture's quote ends "1985." while its source continues "1985, and".
    // The parent renders the complete source without a substring highlight.
    await expect(
      citationBody.locator('.cds-aichat--search-result-highlight')
    ).toHaveCount(0);
    await expect(citationBody).toContainText(
      'Carbon nanotubes, another important allotrope'
    );
    const retainedCitationBody = await citationBody.elementHandle();
    const citationContent = citationBody.locator(
      '.cds-aichat--view-source-panel'
    );
    const retainedCitationContent = await citationContent.elementHandle();
    await page.evaluate(() =>
      window.setChatConfig({ header: { title: 'Updated panel host' } })
    );
    expect(
      await citationBody.evaluate(
        (node, original) => node === original,
        retainedCitationBody
      )
    ).toBe(true);
    expect(
      await citationContent.evaluate(
        (node, original) => node === original,
        retainedCitationContent
      )
    ).toBe(true);
    expect(await citationBody.evaluate((node) => node.assignedSlot?.name)).toBe(
      'body'
    );
    await expect(citationBody).toContainText(sourceParagraph);
    await expect(citationBody).toContainText(
      'Carbon nanotubes, another important allotrope'
    );
    await expect(
      citationBody.locator('.cds-aichat--search-result-highlight')
    ).toHaveCount(0);
    await citation
      .getByRole('button', { name: 'Return to conversation', exact: true })
      .click();
    await expect(citation).toBeHidden();

    await page.evaluate(() =>
      window.setChatConfig({
        history: { isOn: true, showMobileMenu: true, startClosed: true },
      })
    );
    await expect
      .poll(() =>
        page.evaluate(
          () => window.chatInstance.getState().customPanels.history.isMobile
        )
      )
      .toBe(true);
    await page.evaluate(
      (history) => window.chatInstance.customPanels.getPanel(history).open(),
      PanelType.HISTORY
    );
    const history = region.locator('[data-panel-name="history"]');
    await expect(history).toBeVisible();
    const historyContent = page.locator('[slot="historyPanelElement"]');
    await expect(
      historyContent.getByText('Chats', { exact: true })
    ).toBeVisible();
    await expect(
      historyContent.getByRole('button', {
        name: 'Close chat history',
        exact: true,
      })
    ).toBeVisible();
    expect(
      await history.evaluate((frame) => {
        const host = window.chatInstance.writeableElements.historyPanelElement;
        const body = frame.querySelector<HTMLElement>(':scope > [slot="body"]');
        return {
          mobile: window.chatInstance.getState().customPanels.history.isMobile,
          open: window.chatInstance.getState().customPanels.history.isOpen,
          bodySlot: body.assignedSlot?.name,
          historySlot: host.assignedSlot?.name,
          historySlotRoot:
            host.assignedSlot?.getRootNode() === frame.getRootNode(),
          hostConnected: host.isConnected,
        };
      })
    ).toEqual({
      mobile: true,
      open: true,
      bodySlot: 'body',
      historySlot: 'historyPanelElement',
      historySlotRoot: true,
      hostConnected: true,
    });
    await historyContent
      .getByRole('button', { name: 'Close chat history', exact: true })
      .click();
    await expect(history).toBeHidden();
    await expect
      .poll(() =>
        page.evaluate(
          () => window.chatInstance.getState().customPanels.history.isOpen
        )
      )
      .toBe(false);
  });
}

test('native custom panel preserves ordinary animation events and keyboard close order', async ({
  page,
}) => {
  await prepareHost(page, 'react', 'float', 'no-preference');
  await page.evaluate(
    (types) => {
      const instance = window.chatInstance;
      const host = instance.writeableElements.customPanelElement;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Animated panel content';
      button.dataset.testid = 'animated-panel-content';
      host.append(button);
      const probe = window as PanelProbeWindow;
      probe.animationPanelEvents = [];
      probe.panelAnimationsStarted = 0;
      const root = host.assignedSlot.getRootNode() as ShadowRoot;
      const frame = root.querySelector('[data-panel-name="custom"]');
      frame.addEventListener('animationstart', (event) => {
        if (event.target === frame) {
          probe.panelAnimationsStarted += 1;
        }
      });
      instance.on(
        types.map((type) => ({
          type,
          handler: (event) => {
            probe.animationPanelEvents.push({
              type: event.type,
              open: instance.serviceManager.store.getState().customPanelState
                .isOpen,
              content: button.textContent,
              connected: host.isConnected,
            });
          },
        }))
      );
      return instance.customPanels.getPanel().open({
        title: 'Animated panel',
        disableAnimation: false,
        showFrame: true,
        showChatHeader: false,
        backButtonType: 'close',
      });
    },
    [
      BusEventType.CUSTOM_PANEL_PRE_OPEN,
      BusEventType.CUSTOM_PANEL_OPEN,
      BusEventType.CUSTOM_PANEL_PRE_CLOSE,
      BusEventType.CUSTOM_PANEL_CLOSE,
    ]
  );
  const frame = page.locator(
    'cds-aichat-native-panels [data-panel-name="custom"]'
  );
  const content = page.getByTestId('animated-panel-content');
  await expect(content).toBeVisible();
  await expect(content).toBeFocused();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as PanelProbeWindow).animationPanelEvents.length
      )
    )
    .toBe(2);
  await frame
    .getByRole('button', { name: 'Return to conversation', exact: true })
    .focus();
  await page.keyboard.press('Enter');
  await expect(content).toBeHidden();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as PanelProbeWindow).animationPanelEvents.length
      )
    )
    .toBe(4);
  const events = await page.evaluate(
    () => (window as PanelProbeWindow).animationPanelEvents
  );
  expect(events.map(({ type }) => type)).toEqual([
    BusEventType.CUSTOM_PANEL_PRE_OPEN,
    BusEventType.CUSTOM_PANEL_OPEN,
    BusEventType.CUSTOM_PANEL_PRE_CLOSE,
    BusEventType.CUSTOM_PANEL_CLOSE,
  ]);
  expect(events.map(({ open }) => open)).toEqual([true, true, false, false]);
  expect(
    events.every(
      ({ content, connected }) =>
        content === 'Animated panel content' && connected
    )
  ).toBe(true);
  expect(
    await page.evaluate(
      () => (window as PanelProbeWindow).panelAnimationsStarted
    )
  ).toBe(2);
});

test('retained response-panel content keeps React context and state through source-message and stream updates', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route(/.*ibm-common\.js$/, (route) => route.abort());
  await installHarnessCsp(page);
  await page.goto('/host-compatibility.html?order=react,wc');
  await page.waitForFunction(
    () => window.hostCompatibility?.loaded.join(',') === 'react,wc'
  );
  await page.evaluate(
    async ({ buttonType, responseType, userDefined }) => {
      const instance = window.hostCompatibility.reactInstance as ChatInstance;
      await instance.messaging.addMessage({
        id: 'react-context-panel',
        output: {
          generic: [
            {
              response_type: responseType,
              button_type: buttonType,
              label: 'Open context panel',
              panel: {
                title: 'Context panel',
                show_animations: false,
                body: [{ response_type: userDefined, user_defined: {} }],
              },
            },
          ],
        },
      });
    },
    {
      buttonType: ButtonItemType.SHOW_PANEL,
      responseType: MessageResponseTypes.BUTTON,
      userDefined: MessageResponseTypes.USER_DEFINED,
    }
  );
  await page
    .getByRole('button', { name: 'Open context panel', exact: true })
    .click();
  const counter = page.getByTestId('host_compat_udr');
  await expect(counter).toBeVisible();
  await expect(counter).toHaveText('light:0');
  await counter.click();
  await expect(counter).toHaveText('light:1');
  const node = await counter.elementHandle();
  await page.evaluate(
    async ({ complete, button, text }) => {
      const instance = window.hostCompatibility.reactInstance as ChatInstance;
      await instance.messaging.upsertMessage(
        'react-context-panel',
        complete,
        (previous) => ({
          ...previous,
          output: {
            ...previous.output,
            generic: previous.output.generic.map((item) =>
              item.response_type === button
                ? {
                    ...item,
                    panel: {
                      ...(item as ButtonItem).panel,
                      title: 'Updated context panel',
                    },
                  }
                : item
            ),
          },
        })
      );
      await instance.messaging.addMessageChunk({
        partial_response: { id: 'context-unrelated-stream' },
        partial_item: { response_type: text, text: 'Unrelated' },
      });
      await instance.messaging.addMessageChunk({
        final_response: {
          id: 'context-unrelated-stream',
          output: {
            generic: [{ response_type: text, text: 'Unrelated complete' }],
          },
        },
      });
      window.hostCompatibility.setTheme?.('dark');
    },
    {
      complete: MessageState.COMPLETE,
      button: MessageResponseTypes.BUTTON,
      text: MessageResponseTypes.TEXT,
    }
  );
  // Opening a response panel captures its localMessageItem. Updating the source
  // message preserves that selected snapshot, including its original title.
  await expect(
    page.getByRole('dialog', { name: 'Context panel', exact: true })
  ).toBeVisible();
  await expect(counter).toHaveText('dark:1');
  expect(
    await counter.evaluate((current, original) => current === original, node)
  ).toBe(true);
  expect(
    await counter.evaluate((current) => {
      const slot = (current.parentElement as HTMLElement).assignedSlot;
      return Boolean(slot && slot.getRootNode() instanceof ShadowRoot);
    })
  ).toBe(true);
});
