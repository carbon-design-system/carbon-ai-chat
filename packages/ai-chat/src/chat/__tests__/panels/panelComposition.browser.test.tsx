/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { createContext, useContext, useState } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { page, userEvent } from 'vitest/browser';

import { BusEventType } from '../../../types/events/eventBusTypes';
import type { ChatInstance } from '../../../types/instance/ChatInstance';
import {
  ButtonItemType,
  MessageResponseTypes,
} from '../../../types/messaging/Messages';
import { PanelType } from '../../../types/instance/apiTypes';
import type {
  ServiceDesk,
  ServiceDeskCallback,
} from '../../../types/config/ServiceDeskConfig';
import { MessageState } from '../../../types/config/MessagingConfig';
import { ChatContainer } from '../../../react/ChatContainer';
import { chatStore } from '../../services/attachChatView';
import {
  DANA,
  allByRole,
  byRole,
  contractSetup,
  shownText,
} from '../helpers/contract';
import {
  deep,
  deepActive,
  isVisible,
  mountPanelHost,
  type HostFramework,
  type HostLayout,
  type PanelHost,
} from '../helpers/browserPanels';

const PANEL_EVENTS = [
  BusEventType.CUSTOM_PANEL_PRE_OPEN,
  BusEventType.CUSTOM_PANEL_OPEN,
  BusEventType.CUSTOM_PANEL_PRE_CLOSE,
  BusEventType.CUSTOM_PANEL_CLOSE,
];

const CITATION_TITLE =
  'Carbon Research Database - Internal Collection (IBM Quantum Network)';

const SOURCE_PARAGRAPH =
  'Carbon exists in multiple allotropes including diamond, graphite, and fullerenes. Diamond was first synthesized artificially in 1955, while fullerenes were discovered in 1985, and graphene was first isolated in 2004 by Andre Geim and Konstantin Novoselov at the University of Manchester.';

/** The demo's conversational search answer, with three citations. */
const SEARCH_ITEM = {
  response_type: MessageResponseTypes.CONVERSATIONAL_SEARCH,
  text: 'Carbon was first recognized as an element by Antoine Lavoisier in 1789, though carbon compounds have been known since ancient times. Carbon exists in multiple allotropes including diamond, graphite, and fullerenes. Diamond was first synthesized artificially in 1955, while fullerenes were discovered in 1985, and graphene was first isolated in 2004 by Andre Geim and Konstantin Novoselov at the University of Manchester.',
  citations: [
    {
      title: 'Carbon Allotropes - Chemical Database (IBM Research)',
      text: 'Diamond was first synthesized artificially in 1955, while fullerenes were discovered in 1985, and graphene was first isolated in 2004 by Andre Geim and Konstantin Novoselov.',
      url: 'https://ibm.com/research/carbon-allotropes#:~:text=Diamond%20was%20first,University%20of%20Manchester',
      ranges: [{ start: 147, end: 290 }],
    },
    {
      title: 'Carbon Element History - Chemical Elements Database (IBM Watson)',
      text: 'Carbon was first recognized as an element by Antoine Lavoisier in 1789, though carbon compounds have been known since ancient times.',
      url: 'https://ibm.com/chemistry/elements/carbon#:~:text=Antoine%20Lavoisier%201789',
      ranges: [{ start: 0, end: 137 }],
    },
    {
      title: CITATION_TITLE,
      text: 'Carbon exists in multiple allotropes including diamond, graphite, and fullerenes. Diamond was first synthesized artificially in 1955, while fullerenes were discovered in 1985.',
      search_result_idx: 0,
      ranges: [{ start: 138, end: 247 }],
    },
  ],
  search_results: [
    {
      body: `${SOURCE_PARAGRAPH}

Carbon forms the backbone of organic chemistry due to its ability to form four covalent bonds and create long chains and complex structures. The element has an atomic number of 6 and is located in group 14 of the periodic table.

Carbon nanotubes, another important allotrope, exhibit remarkable mechanical and electrical properties. These cylindrical structures were first discovered in 1991 and have applications in electronics, materials science, and nanotechnology.

Isotopes of carbon include carbon-12, carbon-13, and carbon-14. Carbon-14 is radioactive and is used in carbon dating to determine the age of organic materials up to about 50,000 years old.`,
    },
  ],
};

interface PanelEventSnapshot {
  type: string;
  open: boolean;
  content: string;
  connected: boolean;
}

/**
 * The default panel's options. No public state shows them, and the demo test
 * checked they reset to the defaults after each close.
 */
function customPanelOptions(instance: ChatInstance) {
  return chatStore(instance.serviceManager).getState().view.customPanelState
    .options;
}

/** The region that holds the native panels, in the chat's shadow root. */
function panelRegion(host: PanelHost): HTMLElement {
  return host.root.querySelector('cds-aichat-native-panels');
}

function panelFrame(host: PanelHost, name: string): HTMLElement {
  return panelRegion(host).querySelector(`[data-panel-name="${name}"]`);
}

/** The one visible "Return to conversation" button inside a panel frame. */
function backButton(frame: HTMLElement): HTMLElement {
  const buttons = allByRole('button', 'Return to conversation', frame);
  expect(buttons).toHaveLength(1);
  return buttons[0];
}

async function pressEnterOn(element: HTMLElement) {
  element.focus();
  expect(deepActive()).toBe(element);
  await userEvent.keyboard('{Enter}');
}

function recordPanelEvents(
  instance: ChatInstance,
  host: HTMLElement,
  content: () => string
) {
  const events: PanelEventSnapshot[] = [];
  instance.on(
    PANEL_EVENTS.map((type) => ({
      type,
      handler: (event: { type: string }) => {
        events.push({
          type: event.type,
          open: instance.getState().customPanels.default.isOpen,
          content: content(),
          connected: host.isConnected,
        });
      },
    }))
  );
  return events;
}

/** A desk that can ask the user to share their screen. */
function screenShareDesk() {
  let callback: ServiceDeskCallback;
  return {
    serviceDeskFactory: async (parameters: {
      callback: ServiceDeskCallback;
    }): Promise<ServiceDesk> => {
      callback = parameters.callback;
      return {
        getName: () => 'Panel composition desk',
        startChat: async (): Promise<void> => undefined,
        endChat: async (): Promise<void> => undefined,
        sendMessageToAgent: async (): Promise<void> => undefined,
      };
    },
    get callback() {
      return callback;
    },
  };
}

describe('native panel composition', () => {
  contractSetup();
  afterEach(async () => {
    document.documentElement.dir = '';
    await page.viewport(800, 600);
  });

  async function prepareHost(
    framework: HostFramework,
    layout: HostLayout,
    config: Parameters<typeof mountPanelHost>[2] = {}
  ) {
    document.documentElement.dir = layout === 'sidebar' ? 'rtl' : 'ltr';
    const host = await mountPanelHost(framework, layout, {
      homescreen: { isOn: false },
      header: { title: 'Panel composition' },
      ...config,
    });
    expect(Boolean(deep('cds-aichat-custom-element'))).toBe(
      framework === 'web-component' && layout !== 'float'
    );
    await waitFor(() =>
      expect(isVisible(panelRegion(host)?.parentElement)).toBe(true)
    );
    return host;
  }

  for (const framework of ['react', 'web-component'] as HostFramework[]) {
    for (const layout of ['float', 'sidebar'] as HostLayout[]) {
      it(`${framework} ${layout} native panel slots, events, focus, and retained DOM`, async () => {
        const desk = screenShareDesk();
        const host = await prepareHost(framework, layout, {
          serviceDeskFactory: desk.serviceDeskFactory,
          exposeServiceManagerForTesting: true,
        });
        const { instance } = host;
        const panelHost = instance.writeableElements.customPanelElement;
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'Panel count 0';
        let count = 0;
        button.addEventListener('click', () => {
          button.textContent = `Panel count ${++count}`;
        });
        panelHost.appendChild(button);
        const defaults = { ...customPanelOptions(instance) };
        const events = recordPanelEvents(
          instance,
          panelHost,
          () => button.textContent
        );
        let reactivations = 0;
        const custom = panelFrame(host, 'custom');
        custom.addEventListener('openend', (event: CustomEvent) => {
          if (event.detail?.isReactivation) {
            reactivations += 1;
          }
        });
        let backCalls = 0;
        await act(() =>
          instance.customPanels.getPanel().open({
            title: '**Native panel**',
            disableAnimation: true,
            showFrame: true,
            showChatHeader: false,
            backButtonType: 'close',
            backButtonPosition: 'start',
          })
        );
        await waitFor(() => expect(isVisible(button)).toBe(true));
        await waitFor(() => expect(deepActive()).toBe(button));
        await waitFor(() =>
          expect(deep('strong', custom)?.textContent).toBe('Native panel')
        );
        const region = panelRegion(host);
        const body = region.querySelector<HTMLElement>(
          '[data-panel-name="custom"] > [slot="body"]'
        );
        expect({
          ownShadow: Boolean(region.shadowRoot),
          parent: region.parentElement.localName,
          panelsSlot: region.assignedSlot?.name,
          bodySlot: body.assignedSlot?.name,
          borrowedSlot: panelHost.assignedSlot?.name,
          borrowedParent: panelHost.parentElement === host.container,
          sharedSlotRoot: panelHost.assignedSlot?.getRootNode() === host.root,
          consumerRoot:
            panelHost.getRootNode() === host.container.getRootNode(),
        }).toEqual({
          ownShadow: false,
          parent: 'cds-aichat-shell',
          panelsSlot: 'panels',
          bodySlot: 'body',
          borrowedSlot: 'customPanelElement',
          borrowedParent: true,
          sharedSlotRoot: true,
          consumerRoot: true,
        });
        await pressEnterOn(button);
        expect(button.textContent).toBe('Panel count 1');
        await host.update({ header: { title: 'Updated shell config' } });
        await act(async () => {
          await instance.customPanels.getPanel().open({
            title: '**Updated panel**',
            disableAnimation: true,
            showFrame: true,
            showChatHeader: false,
            backButtonType: 'close',
            backButtonPosition: 'start',
          });
          await instance.messaging.addMessageChunk({
            partial_response: { id: 'outside-panel-stream' },
            partial_item: {
              response_type: MessageResponseTypes.TEXT,
              text: 'Unrelated streamed text',
            },
          } as never);
          await instance.messaging.addMessageChunk({
            final_response: {
              id: 'outside-panel-stream',
              output: {
                generic: [
                  {
                    response_type: MessageResponseTypes.TEXT,
                    text: 'Unrelated streamed text complete',
                  },
                ],
              },
            },
          } as never);
        });
        await waitFor(() =>
          expect(deep('strong', custom)?.textContent).toBe('Updated panel')
        );
        expect(button.textContent).toBe('Panel count 1');
        expect(button.parentElement).toBe(panelHost);
        expect(instance.writeableElements.customPanelElement).toBe(panelHost);
        await pressEnterOn(backButton(custom));
        await waitFor(() => expect(isVisible(button)).toBe(false));
        await waitFor(() => expect(events).toHaveLength(4));
        expect(events.map(({ type }) => type)).toEqual(PANEL_EVENTS);
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
        expect(customPanelOptions(instance)).toEqual(defaults);

        await act(() =>
          instance.customPanels.getPanel().open({
            title: 'Legacy **panel**',
            disableAnimation: true,
            hideCloseButton: true,
            hideBackButton: false,
            onClickBack: () => {
              backCalls += 1;
            },
          })
        );
        await waitFor(() => expect(isVisible(button)).toBe(true));
        await waitFor(() => expect(deepActive()).toBe(button));
        expect(custom.querySelectorAll('cds-aichat-header-view')).toHaveLength(
          1
        );
        await userEvent.click(backButton(custom));
        await waitFor(() => expect(isVisible(button)).toBe(false));
        expect(backCalls).toBe(1);
        expect(customPanelOptions(instance)).toEqual(defaults);

        await act(() =>
          instance.customPanels.getPanel().open({
            title: 'Covered panel',
            disableAnimation: true,
            showFrame: true,
            showChatHeader: false,
          })
        );
        await waitFor(() => expect(isVisible(button)).toBe(true));
        await waitFor(() => expect(deepActive()).toBe(button));
        await act(() => instance.serviceDesk.startConversation());
        await act(() => desk.callback.agentJoined(DANA));
        let request: Promise<unknown>;
        await act(async () => {
          request = desk.callback.screenShareRequest();
        });
        const prompt = panelFrame(host, 'screenShare');
        await waitFor(() => expect(isVisible(prompt)).toBe(true));
        await waitFor(() => expect(isVisible(button)).toBe(false));
        const decline = allByRole(
          'button',
          'Decline',
          prompt.querySelector('[slot="footer"]')
        );
        expect(decline).toHaveLength(1);
        await waitFor(() => expect(deepActive()).toBe(decline[0]));
        await userEvent.keyboard('{Escape}');
        await request;
        await waitFor(() => expect(isVisible(prompt)).toBe(false));
        await waitFor(() => expect(isVisible(button)).toBe(true));
        // Closing the cover returns focus to the control it covered. The
        // covered panel's options still reset when another panel covers it.
        await waitFor(() => expect(deepActive()).toBe(button));
        expect(button.textContent).toBe('Panel count 1');
        expect(button.parentElement).toBe(panelHost);
        expect(instance.writeableElements.customPanelElement).toBe(panelHost);
        expect(customPanelOptions(instance)).toEqual(defaults);
        await waitFor(() => expect(reactivations).toBe(1));
        await userEvent.click(backButton(custom));
        await waitFor(() => expect(isVisible(button)).toBe(false));
        expect(backCalls).toBe(1);
        expect(customPanelOptions(instance)).toEqual(defaults);
        await act(() => instance.serviceDesk.endConversation());
        await host.unmount();
      });
    }
  }

  for (const framework of ['react', 'web-component'] as HostFramework[]) {
    it(`${framework} sidebar opens response, citation, and mobile history through public fixtures`, async () => {
      await page.viewport(600, 900);
      const host = await prepareHost(framework, 'sidebar');
      const { instance } = host;
      const region = panelRegion(host);
      await act(() =>
        instance.messaging.addMessage({
          id: 'panel-button-response',
          output: {
            generic: [
              {
                response_type: MessageResponseTypes.BUTTON,
                button_type: ButtonItemType.SHOW_PANEL,
                label: 'Open a panel',
                panel: {
                  title: 'My panel',
                  show_animations: true,
                  body: [
                    {
                      response_type: MessageResponseTypes.TEXT,
                      text: 'Carbon is great!',
                    },
                  ],
                  footer: [
                    {
                      response_type: MessageResponseTypes.BUTTON,
                      button_type: ButtonItemType.POST_BACK,
                      label: 'Select footer action',
                      value: { input: { text: 'text' } },
                    },
                    {
                      response_type: MessageResponseTypes.BUTTON,
                      button_type: ButtonItemType.URL,
                      url: 'https://ibm.com',
                      label: 'Optional Button',
                    },
                  ],
                },
              },
            ],
          },
        } as never)
      );
      const openPanel = await waitFor(() => {
        const found = allByRole('button', 'Open a panel', host.root);
        expect(found).toHaveLength(1);
        return found[0];
      });
      await userEvent.click(openPanel);
      const response = panelFrame(host, 'response');
      await waitFor(() => expect(isVisible(response)).toBe(true));
      expect(response.querySelectorAll('[slot="title"]')).toHaveLength(1);
      await waitFor(() =>
        expect(shownText(response.querySelector('[slot="title"]')).trim()).toBe(
          'My panel'
        )
      );
      const responseBody = response.querySelector<HTMLElement>(
        ':scope > [slot="body"]'
      );
      await waitFor(() =>
        expect(shownText(responseBody)).toContain('Carbon is great!')
      );
      const responseFooter = response.querySelector<HTMLElement>(
        ':scope > [slot="footer"]'
      );
      const footerAction = allByRole(
        'button',
        'Select footer action',
        responseFooter
      );
      expect(footerAction).toHaveLength(1);
      expect(isVisible(footerAction[0])).toBe(true);
      // Footer URL items keep Carbon's standard-button role on their anchor.
      const optional = allByRole('button', 'Optional Button', responseFooter);
      expect(optional).toHaveLength(1);
      expect(optional[0].getAttribute('href')).toBe('https://ibm.com');
      expect(isVisible(optional[0])).toBe(true);
      const title = response.querySelector<HTMLElement>('[slot="title"]');
      const root = response.getRootNode();
      expect({
        nativeRegion: response.parentElement.localName,
        regionSlot: response.parentElement.assignedSlot?.name,
        titleParent: title.parentElement.localName,
        titleSlot: title.assignedSlot?.name,
        bodySlot: responseBody.assignedSlot?.name,
        footerSlot: responseFooter.assignedSlot?.name,
        sameRoot: [title, responseBody, responseFooter].every(
          (target) => target.isConnected && target.getRootNode() === root
        ),
      }).toEqual({
        nativeRegion: 'cds-aichat-native-panels',
        regionSlot: 'panels',
        titleParent: 'cds-aichat-toolbar',
        titleSlot: 'title',
        bodySlot: 'body',
        footerSlot: 'footer',
        sameRoot: true,
      });
      expect(response.parentElement).toBe(region);
      await userEvent.click(backButton(response));
      await waitFor(() => expect(isVisible(response)).toBe(false));

      await act(() =>
        instance.messaging.addMessage({
          id: 'panel-search-response',
          output: { generic: [SEARCH_ITEM] },
        } as never)
      );
      const toggle = await waitFor(() => {
        const found = allByRole(
          'button',
          'Open or close the list of sources',
          host.root
        );
        expect(found).toHaveLength(1);
        return found[0];
      });
      await userEvent.click(toggle);
      const sources = await waitFor(() => {
        const found = deep(
          '.cds-aichat--conversational-search [slot="citations"] cds-aichat-carousel',
          host.root
        );
        expect(found).not.toBeNull();
        return found;
      });
      const nextSource = () => {
        const found = allByRole('button', 'Go to next slide.', sources);
        expect(found).toHaveLength(1);
        return found[0];
      };
      const slideCounter = (text: string) =>
        expect(shownText(sources).replace(/\s+/g, ' ')).toContain(text);
      await waitFor(() => slideCounter('1 / 3'));
      await userEvent.click(nextSource());
      await waitFor(() => slideCounter('2 / 3'));
      await userEvent.click(nextSource());
      await waitFor(() => slideCounter('3 / 3'));
      const sourceCard = await waitFor(() => {
        const found = allByRole('button', CITATION_TITLE, sources);
        expect(found).toHaveLength(1);
        expect(isVisible(found[0])).toBe(true);
        return found[0];
      });
      await pressEnterOn(sourceCard);
      const citation = panelFrame(host, 'citation');
      await waitFor(() => expect(isVisible(citation)).toBe(true));
      await waitFor(() =>
        expect(shownText(citation.querySelector('[slot="title"]')).trim()).toBe(
          CITATION_TITLE
        )
      );
      const citationBody = citation.querySelector<HTMLElement>(
        ':scope > [slot="body"]'
      );
      const citationText = () => shownText(citationBody).replace(/\s+/g, ' ');
      await waitFor(() => expect(citationText()).toContain(SOURCE_PARAGRAPH));
      // The citation's quote ends "1985." while its source continues "1985,
      // and". The panel renders the complete source without a highlight.
      expect(
        deep('.cds-aichat--search-result-highlight', citationBody)
      ).toBeNull();
      expect(citationText()).toContain(
        'Carbon nanotubes, another important allotrope'
      );
      const citationContent = deep(
        '.cds-aichat--view-source-panel',
        citationBody
      );
      expect(citationContent).not.toBeNull();
      await host.update({ header: { title: 'Updated panel host' } });
      expect(citation.querySelector(':scope > [slot="body"]')).toBe(
        citationBody
      );
      expect(deep('.cds-aichat--view-source-panel', citationBody)).toBe(
        citationContent
      );
      expect(citationBody.assignedSlot?.name).toBe('body');
      expect(citationText()).toContain(SOURCE_PARAGRAPH);
      expect(citationText()).toContain(
        'Carbon nanotubes, another important allotrope'
      );
      expect(
        deep('.cds-aichat--search-result-highlight', citationBody)
      ).toBeNull();
      await userEvent.click(backButton(citation));
      await waitFor(() => expect(isVisible(citation)).toBe(false));

      await host.update({
        history: { isOn: true, showMobileMenu: true, startClosed: true },
      });
      await waitFor(() =>
        expect(instance.getState().customPanels.history.isMobile).toBe(true)
      );
      const historyHost = instance.writeableElements.historyPanelElement;
      const historyHeading = document.createElement('h2');
      historyHeading.textContent = 'Chats';
      const closeHistory = document.createElement('button');
      closeHistory.type = 'button';
      closeHistory.textContent = 'Close chat history';
      closeHistory.addEventListener('click', () =>
        instance.customPanels.getPanel(PanelType.HISTORY).close()
      );
      historyHost.append(historyHeading, closeHistory);
      await act(() => instance.customPanels.getPanel(PanelType.HISTORY).open());
      const history = panelFrame(host, 'history');
      await waitFor(() => expect(isVisible(history)).toBe(true));
      await waitFor(() => expect(isVisible(historyHeading)).toBe(true));
      expect(isVisible(closeHistory)).toBe(true);
      const historyBody = history.querySelector<HTMLElement>(
        ':scope > [slot="body"]'
      );
      expect({
        mobile: instance.getState().customPanels.history.isMobile,
        open: instance.getState().customPanels.history.isOpen,
        bodySlot: historyBody.assignedSlot?.name,
        historySlot: historyHost.assignedSlot?.name,
        historySlotRoot:
          historyHost.assignedSlot?.getRootNode() === history.getRootNode(),
        hostConnected: historyHost.isConnected,
      }).toEqual({
        mobile: true,
        open: true,
        bodySlot: 'body',
        historySlot: 'historyPanelElement',
        historySlotRoot: true,
        hostConnected: true,
      });
      await userEvent.click(closeHistory);
      await waitFor(() => expect(isVisible(history)).toBe(false));
      await waitFor(() =>
        expect(instance.getState().customPanels.history.isOpen).toBe(false)
      );
      await host.unmount();
    });
  }

  // The page doesn't ask for reduced motion, so the panel's CSS animations run.
  it('native custom panel preserves ordinary animation events and keyboard close order', async () => {
    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(
      false
    );
    const host = await prepareHost('react', 'float');
    const { instance } = host;
    const panelHost = instance.writeableElements.customPanelElement;
    const content = document.createElement('button');
    content.type = 'button';
    content.textContent = 'Animated panel content';
    panelHost.append(content);
    const frame = panelFrame(host, 'custom');
    let animationsStarted = 0;
    frame.addEventListener('animationstart', (event) => {
      if (event.target === frame) {
        animationsStarted += 1;
      }
    });
    const events = recordPanelEvents(
      instance,
      panelHost,
      () => content.textContent
    );
    await act(() =>
      instance.customPanels.getPanel().open({
        title: 'Animated panel',
        disableAnimation: false,
        showFrame: true,
        showChatHeader: false,
        backButtonType: 'close',
      })
    );
    await waitFor(() => expect(isVisible(content)).toBe(true));
    await waitFor(() => expect(deepActive()).toBe(content));
    await waitFor(() => expect(events).toHaveLength(2));
    await pressEnterOn(backButton(frame));
    await waitFor(() => expect(isVisible(content)).toBe(false));
    await waitFor(() => expect(events).toHaveLength(4));
    expect(events.map(({ type }) => type)).toEqual(PANEL_EVENTS);
    expect(events.map(({ open }) => open)).toEqual([true, true, false, false]);
    expect(
      events.every(
        (event) => event.content === 'Animated panel content' && event.connected
      )
    ).toBe(true);
    expect(animationsStarted).toBe(2);
    await host.unmount();
  });

  it('retained response-panel content keeps React context and state through source-message and stream updates', async () => {
    const ThemeContext = createContext('none');
    function Counter() {
      const theme = useContext(ThemeContext);
      const [count, setCount] = useState(0);
      return (
        <button
          type="button"
          data-testid="host_compat_udr"
          onClick={() => setCount(count + 1)}>
          {theme}:{count}
        </button>
      );
    }
    let instance: ChatInstance;
    const after = vi.fn();
    const tree = (theme: string) => (
      <ThemeContext.Provider value={theme}>
        <ChatContainer
          openChatByDefault
          messaging={{ skipWelcome: true }}
          homescreen={{ isOn: false }}
          renderUserDefinedResponse={() => <Counter />}
          onBeforeRender={(chat) => {
            instance = chat;
          }}
          onAfterRender={after}
        />
      </ThemeContext.Provider>
    );
    const mounted = render(tree('light'));
    await waitFor(() => expect(after).toHaveBeenCalledTimes(1), {
      timeout: 5000,
    });
    await act(() =>
      instance.messaging.addMessage({
        id: 'react-context-panel',
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.BUTTON,
              button_type: ButtonItemType.SHOW_PANEL,
              label: 'Open context panel',
              panel: {
                title: 'Context panel',
                show_animations: false,
                body: [
                  {
                    response_type: MessageResponseTypes.USER_DEFINED,
                    user_defined: {},
                  },
                ],
              },
            },
          ],
        },
      } as never)
    );
    const openPanel = await waitFor(() => {
      const found = allByRole('button', 'Open context panel');
      expect(found).toHaveLength(1);
      return found[0];
    });
    await userEvent.click(openPanel);
    const counter = await waitFor(() => {
      const found = document.querySelector<HTMLElement>(
        '[data-testid="host_compat_udr"]'
      );
      expect(isVisible(found)).toBe(true);
      return found;
    });
    expect(counter.textContent).toBe('light:0');
    await userEvent.click(counter);
    await waitFor(() => expect(counter.textContent).toBe('light:1'));
    await act(async () => {
      await instance.messaging.upsertMessage(
        'react-context-panel',
        MessageState.COMPLETE,
        (previous: any) => ({
          ...previous,
          output: {
            ...previous.output,
            generic: previous.output.generic.map((item: any) =>
              item.response_type === MessageResponseTypes.BUTTON
                ? {
                    ...item,
                    panel: { ...item.panel, title: 'Updated context panel' },
                  }
                : item
            ),
          },
        })
      );
      await instance.messaging.addMessageChunk({
        partial_response: { id: 'context-unrelated-stream' },
        partial_item: {
          response_type: MessageResponseTypes.TEXT,
          text: 'Unrelated',
        },
      } as never);
      await instance.messaging.addMessageChunk({
        final_response: {
          id: 'context-unrelated-stream',
          output: {
            generic: [
              {
                response_type: MessageResponseTypes.TEXT,
                text: 'Unrelated complete',
              },
            ],
          },
        },
      } as never);
    });
    mounted.rerender(tree('dark'));
    // Opening a response panel captures its message item. Updating the source
    // message keeps that snapshot, including its original title.
    await waitFor(() =>
      expect(isVisible(byRole('dialog', 'Context panel'))).toBe(true)
    );
    await waitFor(() => expect(counter.textContent).toBe('dark:1'));
    expect(document.querySelector('[data-testid="host_compat_udr"]')).toBe(
      counter
    );
    const slot = counter.parentElement.assignedSlot;
    expect(Boolean(slot && slot.getRootNode() instanceof ShadowRoot)).toBe(
      true
    );
    mounted.unmount();
  });
});
