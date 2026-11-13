/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import {
  PanelContentAdapter,
  type PanelContentParts,
} from '../../../src/chat/components/panels/PanelContentAdapter';
import { ExtensionHosts } from '../../../src/chat/services/extensionHosts';
import { ChatContainer } from '../../../src/react/ChatContainer';
import { ChatCustomElement } from '../../../src/react/ChatCustomElement';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import type { LocalMessageItem } from '../../../src/types/messaging/LocalMessageItem';
import type { ConversationalSearchItemCitation } from '../../../src/types/messaging/Messages';
import actions from '../../../src/chat/store/actions';
import {
  createBaseConfig,
  getChatShadowRoot,
  makeConfigStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

const Context = createContext('missing');
const firstEffects: Array<{
  part: string;
  connected: boolean;
  assigned: boolean;
}> = [];

function Probe({ part }: { part: string }) {
  const context = useContext(Context);
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const target = ref.current.closest<HTMLElement>('[slot]');
    firstEffects.push({
      part,
      connected: ref.current.isConnected,
      assigned: Boolean(target?.assignedSlot),
    });
  }, [part]);
  return (
    <button
      ref={ref}
      type="button"
      data-retained-panel={part}
      onClick={() => setCount((value) => value + 1)}>
      {context}:{count}
    </button>
  );
}

jest.mock(
  '../../../src/chat/components/responseTypes/message/BodyMessageComponents',
  () => ({
    BodyMessageComponents: () => <Probe part="body" />,
  })
);
jest.mock(
  '../../../src/chat/components/responseTypes/button/FooterButtonComponents',
  () => ({
    FooterButtonComponents: () => <Probe part="footer" />,
  })
);
jest.mock('../../../src/chat/components/panels/ViewSourcePanel', () => ({
  __esModule: true,
  default: () => <Probe part="citation" />,
}));
jest.mock('@carbon/ai-chat-components/es/react/markdown.js', () => ({
  __esModule: true,
  default: ({ markdown }: { markdown: string }) =>
    markdown.startsWith('retained title') ? (
      <Probe part="title" />
    ) : (
      <span data-markdown-source={markdown}>{markdown}</span>
    ),
}));

beforeEach(() => {
  setupBeforeEach();
  firstEffects.length = 0;
});
afterEach(setupAfterEach);

it('keeps the last committed payload while native requests lag behind the current revision', () => {
  const host = document.createElement('div');
  const shadow = host.attachShadow({ mode: 'open' });
  document.body.appendChild(host);
  const hosts = new ExtensionHosts(
    {} as ChatInstance,
    host,
    makeConfigStore({}),
    () => false
  );
  const oldParts: PanelContentParts = { 'custom-body': <Probe part="unit" /> };
  const request = hosts.preparePanelContent('custom', oldParts, [
    'custom-body',
  ]);
  shadow.appendChild(request.targets['custom-body']);
  hosts.markPanelContentPlaced(request);
  const commit = jest.spyOn(hosts, 'commitPanelContent');
  const tree = (parts: PanelContentParts, current = request) => (
    <Context.Provider value="host">
      <PanelContentAdapter hosts={hosts} request={current} parts={parts} />
    </Context.Provider>
  );
  const mounted = render(tree(oldParts));
  const counter = shadow.querySelector('[data-retained-panel="unit"]');
  fireEvent.click(counter);
  expect(counter.textContent).toBe('host:1');
  expect(hosts.isPanelContentCommitted('custom', oldParts)).toBe(true);
  const newParts: PanelContentParts = { 'custom-body': <Probe part="unit" /> };
  mounted.rerender(tree(newParts));
  expect(shadow.querySelector('[data-retained-panel="unit"]')).toBe(counter);
  expect(counter.textContent).toBe('host:1');
  expect(commit).toHaveBeenCalledTimes(1);
  const next = hosts.preparePanelContent('custom', newParts, ['custom-body']);
  expect(next.targets['custom-body']).toBe(request.targets['custom-body']);
  hosts.markPanelContentPlaced(next);
  mounted.rerender(tree(newParts, next));
  expect(hosts.isPanelContentCommitted('custom', newParts)).toBe(true);
  expect(hosts.commitPanelContent(request)).toBe(false);
  expect(shadow.querySelector('[data-retained-panel="unit"]')).toBe(counter);
  expect(firstEffects).toHaveLength(1);
});

it.each([
  ['ChatContainer', ChatContainer],
  ['ChatCustomElement', ChatCustomElement],
] as const)(
  'retains panel bodies, footers, citations and title state through %s',
  async (_name, Wrapper) => {
    let instance: ChatInstance;
    const item = {
      fullMessageID: 'retained-panel-message',
      ui_state: { id: 'retained-panel-item' },
      item: {
        response_type: 'button',
        button_type: 'show_panel',
        label: 'Panel',
        panel: { title: 'retained title' },
      },
    } as unknown as LocalMessageItem;
    const citation = {
      title: 'Citation',
      text: 'Original citation',
    } as ConversationalSearchItemCitation;
    const after = jest.fn();
    const before = async (chat: ChatInstance) => {
      instance = chat;
      await chat.messaging.addMessage({
        id: item.fullMessageID,
        output: { generic: [] },
      });
      const store = chat.serviceManager.store;
      store.dispatch(actions.setResponsePanelContent(item, false));
      store.dispatch(actions.setViewSourcePanelIsOpen(false, citation));
    };
    const config = createBaseConfig();
    const tree = (context: string) => (
      <Context.Provider value={context}>
        <Wrapper
          {...config}
          className=""
          onBeforeRender={before}
          onAfterRender={after}
        />
      </Context.Provider>
    );
    const mounted = render(tree('host'));
    await waitFor(() => expect(after).toHaveBeenCalledTimes(1), {
      timeout: 5000,
    });
    const root = getChatShadowRoot();
    const native = root.querySelector('cds-aichat-native-panels');
    expect(native.assignedSlot?.name).toBe('panels');
    expect(native.getRootNode()).toBe(root);
    expect(native.shadowRoot).toBeNull();
    const counters = ['body', 'footer', 'citation', 'title'].map((part) =>
      root.querySelector(`[data-retained-panel="${part}"]`)
    );
    const targets = counters.map((counter) => counter.closest('[slot]'));
    expect(counters.every(Boolean)).toBe(true);
    expect(firstEffects).toEqual(
      expect.arrayContaining(
        ['body', 'footer', 'citation', 'title'].map((part) => ({
          part,
          connected: true,
          assigned: true,
        }))
      )
    );
    counters.forEach((counter) => {
      expect(counter.textContent).toBe('host:0');
      fireEvent.click(counter);
      expect(counter.textContent).toBe('host:1');
    });
    const store = instance.serviceManager.store;
    await act(async () => {
      store.dispatch(
        actions.setResponsePanelContent(
          {
            ...item,
            item: { ...item.item, panel: { title: 'retained title changed' } },
          } as LocalMessageItem,
          false
        )
      );
      store.dispatch(
        actions.setViewSourcePanelIsOpen(false, {
          ...citation,
          text: 'Updated citation',
        })
      );
      store.dispatch(
        actions.setChatMessagesStateProperty('isMessageLoadingCounter', 1)
      );
    });
    await waitFor(() =>
      expect(root.querySelector('[data-retained-panel="title"]')).toBe(
        counters[3]
      )
    );
    counters.forEach((counter, index) => {
      expect(counter.textContent).toBe('host:1');
      expect(counter.closest('[slot]')).toBe(targets[index]);
      expect(
        root.querySelector(
          `[data-retained-panel="${['body', 'footer', 'citation', 'title'][index]}"]`
        )
      ).toBe(counter);
    });
    mounted.rerender(tree('next'));
    await waitFor(() =>
      counters.forEach((counter) => expect(counter.textContent).toBe('next:1'))
    );
    expect(firstEffects).toHaveLength(4);
    expect(after).toHaveBeenCalledTimes(1);
  }
);
