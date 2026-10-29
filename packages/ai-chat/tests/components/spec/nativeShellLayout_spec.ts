/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { deepQuerySelector } from '@carbon/ai-chat-components/es/globals/utils/dom-utils.js';
import '../../../src/web-components/cds-aichat-container';
import '../../../src/web-components/cds-aichat-custom-element';
import { ChatContainer } from '../../../src/react/ChatContainer';
import { ChatCustomElement } from '../../../src/react/ChatCustomElement';
import { MessagesComponentClass } from '../../../src/chat/components-legacy/MessagesComponent';
import actions from '../../../src/chat/store/actions';
import type { ChatContainerProps } from '../../../src/types/component/ChatContainer';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import type { PublicConfig } from '../../../src/types/config/PublicConfig';
import { WriteableElementName } from '../../../src/types/instance/WriteableElements';
import { MessageResponseTypes } from '../../../src/types/messaging/Messages';
import {
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

const wrappers = [
  ['ChatContainer', ChatContainer],
  ['ChatCustomElement', ChatCustomElement],
] as const;

const baseConfig = (): PublicConfig => ({
  ...createBaseConfig(),
  openChatByDefault: true,
  shouldTakeFocusIfOpensAutomatically: false,
  homescreen: { isOn: false },
});

interface LayoutFixture {
  instance: ChatInstance;
  container: HTMLElement;
  root: ShadowRoot;
  shell: HTMLElement;
}

function readLayout(instance: ChatInstance): LayoutFixture {
  const container = deepQuerySelector(
    document,
    'cds-aichat-container'
  ) as HTMLElement;
  const root = container?.shadowRoot;
  const shell = root?.querySelector<HTMLElement>('cds-aichat-shell');
  expect(shell).not.toBeNull();
  expect(shell.isConnected).toBe(true);
  return { instance, container, root, shell };
}

async function boot(
  Wrapper: (typeof wrappers)[number][1],
  initial: Partial<ChatContainerProps> = {}
) {
  let instance: ChatInstance;
  const after = jest.fn();
  const onBeforeRender = (chat: ChatInstance) => {
    instance = chat;
  };
  let props: Partial<ChatContainerProps> = { ...baseConfig(), ...initial };
  const tree = () =>
    React.createElement(Wrapper, {
      className: '',
      ...props,
      onBeforeRender,
      onAfterRender: after,
    });
  const view = render(tree());
  await waitFor(() => expect(after).toHaveBeenCalledTimes(1), {
    timeout: 5000,
  });
  return {
    ...readLayout(instance),
    update(next: Partial<ChatContainerProps>) {
      props = { ...props, ...next };
      view.rerender(tree());
    },
  };
}

function directRegion(shell: HTMLElement, name: string) {
  return shell.querySelector<HTMLElement>(`:scope > [slot="${name}"]`);
}

function expectDirectRegion(f: LayoutFixture, name: string, projected = true) {
  const child = directRegion(f.shell, name);
  expect(child).not.toBeNull();
  expect(child.parentElement).toBe(f.shell);
  expect(child.getRootNode()).toBe(f.root);
  if (projected) {
    expect(child.assignedSlot).toBe(
      f.shell.shadowRoot.querySelector(`slot[name="${name}"]`)
    );
    expect(child.assignedSlot).not.toBeNull();
  }
  return child;
}

function expectWritable(
  f: LayoutFixture,
  key: WriteableElementName,
  region: string
) {
  const borrowed = f.instance.writeableElements[key];
  const slot = f.root.querySelector<HTMLSlotElement>(`slot[name="${key}"]`);
  expect(slot).not.toBeNull();
  expect(borrowed.parentElement).toBe(f.container);
  expect(borrowed.assignedSlot).toBe(slot);
  expect(slot.getRootNode()).toBe(f.root);
  const wrapper = slot.closest<HTMLElement>('[slot]');
  expect(wrapper.slot).toBe(region);
  expect(wrapper.parentElement).toBe(f.shell);
}

function expectGraph(f: LayoutFixture) {
  expect(f.root.querySelectorAll('cds-aichat-shell')).toHaveLength(1);
  const outer = f.root.querySelector('.cds-aichat--container--render');
  const layer = f.shell.parentElement;
  expect(outer.getAttribute('role')).toBe('region');
  expect(outer.getAttribute('aria-label')).toBeTruthy();
  expect(outer.getAttribute('data-theme')).toBeTruthy();
  expect(outer.hasAttribute('dir')).toBe(true);
  expect(layer.localName).toBe('cds-layer');
  expect(layer.parentElement).toBe(outer);
  expect(outer.getRootNode()).toBe(f.root);
  for (const name of ['header', 'messages', 'input', 'panels']) {
    expectDirectRegion(f, name);
  }
  const input = f.shell.querySelector('cds-aichat-chat-input');
  const panels = f.shell.querySelector('cds-aichat-native-panels');
  expect(input.parentElement).toBe(f.shell);
  expect(input.getAttribute('slot')).toBe('input');
  expect(panels).toBe(directRegion(f.shell, 'panels'));
  // Closed auxiliary regions keep their light-DOM nodes even without a shell slot.
  expectDirectRegion(f, 'workspace', false);
  expectDirectRegion(f, 'history', false);
  for (const [key, region] of [
    [WriteableElementName.CUSTOM_HEADER, 'header'],
    [WriteableElementName.CUSTOM_PROMPT_LINE, 'input'],
    [WriteableElementName.HEADER_BOTTOM_ELEMENT, 'header-after'],
    [WriteableElementName.BEFORE_INPUT_ELEMENT, 'input-before'],
    [WriteableElementName.AFTER_INPUT_ELEMENT, 'input-after'],
    [WriteableElementName.FOOTER_ELEMENT, 'footer'],
    [WriteableElementName.WORKSPACE_PANEL_ELEMENT, 'workspace'],
    [WriteableElementName.HISTORY_PANEL_ELEMENT, 'history'],
  ] as const) {
    expectWritable(f, key, region);
  }
}

beforeEach(setupBeforeEach);
afterEach(() => {
  setupAfterEach();
  jest.restoreAllMocks();
});

describe.each(wrappers)('shell layout through %s', (_name, Wrapper) => {
  it('keeps every named region directly under the shell in the existing shadow root', async () => {
    const f = await boot(Wrapper);
    await waitFor(() => expectGraph(f));
  });

  it('distinguishes omitted, empty, and late writable maps without replacing borrowed nodes', async () => {
    const f = await boot(Wrapper);
    const borrowed = { ...f.instance.writeableElements };
    const footer = borrowed.footerElement;
    const imperative = document.createElement('span');
    imperative.textContent = 'Imperative content';
    footer.append(imperative);
    const expectBorrowed = () => {
      for (const key of Object.keys(borrowed) as (keyof typeof borrowed)[]) {
        const node = borrowed[key];
        expect(f.instance.writeableElements[key]).toBe(node);
        expect(node.parentElement).toBe(f.container);
      }
      expect(imperative.parentElement).toBe(footer);
    };
    await waitFor(() =>
      expectWritable(f, WriteableElementName.FOOTER_ELEMENT, 'footer')
    );
    f.update({ renderWriteableElements: {} });
    await waitFor(() => {
      expect(directRegion(f.shell, 'footer')).toBeNull();
      expect(directRegion(f.shell, 'input-after')).toBeNull();
      expect(footer.assignedSlot).toBeNull();
    });
    expectBorrowed();
    f.update({
      renderWriteableElements: {
        footerElement: React.createElement('b', null, 'Late footer'),
      },
    });
    await waitFor(() => {
      expectWritable(f, WriteableElementName.FOOTER_ELEMENT, 'footer');
      expect(footer.querySelector('b')?.textContent).toBe('Late footer');
      expect(directRegion(f.shell, 'input-after')).toBeNull();
    });
    expectBorrowed();
    f.update({ renderWriteableElements: undefined });
    await waitFor(() => {
      expectWritable(
        f,
        WriteableElementName.AFTER_INPUT_ELEMENT,
        'input-after'
      );
      expect(footer.querySelector('b')).toBeNull();
    });
    expectBorrowed();
  });

  it('unmounts the default header and input while custom content occupies their regions', async () => {
    const f = await boot(Wrapper);
    const headerNode = f.instance.writeableElements.customHeader;
    const promptNode = f.instance.writeableElements.customPromptLine;
    let previousHeader = f.root.querySelector('cds-aichat-header-view');
    let previousInput = f.root.querySelector('cds-aichat-chat-input');
    expect(previousHeader).not.toBeNull();
    expect(previousInput).not.toBeNull();
    for (let cycle = 0; cycle < 2; cycle += 1) {
      f.update({
        renderWriteableElements: {
          customHeader: React.createElement('h2', null, 'Custom header'),
          customPromptLine: React.createElement(
            'button',
            { type: 'button' },
            'Custom input'
          ),
        },
      });
      await waitFor(() => {
        expect(f.root.querySelector('cds-aichat-header-view')).toBeNull();
        expect(f.root.querySelector('cds-aichat-chat-input')).toBeNull();
        expectWritable(f, WriteableElementName.CUSTOM_HEADER, 'header');
        expectWritable(f, WriteableElementName.CUSTOM_PROMPT_LINE, 'input');
      });
      expect(previousHeader.isConnected).toBe(false);
      expect(previousInput.isConnected).toBe(false);
      f.update({ renderWriteableElements: {} });
      await waitFor(() => {
        expect(f.root.querySelector('cds-aichat-header-view')).not.toBeNull();
        expect(f.root.querySelector('cds-aichat-chat-input')).not.toBeNull();
        expect(headerNode.textContent).toBe('');
        expect(promptNode.textContent).toBe('');
      });
      const nextHeader = f.root.querySelector('cds-aichat-header-view');
      const nextInput = f.root.querySelector('cds-aichat-chat-input');
      expect(nextHeader).not.toBe(previousHeader);
      expect(nextInput).not.toBe(previousInput);
      expect(f.instance.writeableElements.customHeader).toBe(headerNode);
      expect(f.instance.writeableElements.customPromptLine).toBe(promptNode);
      previousHeader = nextHeader;
      previousInput = nextInput;
    }
  });

  it('unmounts messages when home opens and preserves the messages region across each switch', async () => {
    const mounted = jest.spyOn(
      MessagesComponentClass.prototype,
      'componentDidMount'
    );
    const unmounted = jest.spyOn(
      MessagesComponentClass.prototype,
      'componentWillUnmount'
    );
    const f = await boot(Wrapper, {
      homescreen: { isOn: true, greeting: 'Welcome' },
    });
    const region = expectDirectRegion(f, 'messages');
    let previousHome = region.querySelector('cds-aichat-home-screen');
    expect(previousHome).not.toBeNull();
    expect(mounted).not.toHaveBeenCalled();
    expectWritable(
      f,
      WriteableElementName.HOME_SCREEN_HEADER_BOTTOM_ELEMENT,
      'header-after'
    );
    expectWritable(
      f,
      WriteableElementName.HOME_SCREEN_BEFORE_INPUT_ELEMENT,
      'input-before'
    );
    for (let cycle = 0; cycle < 2; cycle += 1) {
      act(() => {
        f.instance.serviceManager.store.dispatch(
          actions.setHomeScreenIsOpen(false)
        );
      });
      await waitFor(() => expect(mounted).toHaveBeenCalledTimes(cycle + 1));
      expect(previousHome.isConnected).toBe(false);
      expect(region.querySelector('cds-aichat-home-screen')).toBeNull();
      expect(directRegion(f.shell, 'messages')).toBe(region);
      const messages = region.querySelector('.cds-aichat--messages');
      expect(messages).not.toBeNull();
      expectWritable(
        f,
        WriteableElementName.HEADER_BOTTOM_ELEMENT,
        'header-after'
      );
      expectWritable(
        f,
        WriteableElementName.BEFORE_INPUT_ELEMENT,
        'input-before'
      );
      act(() => {
        f.instance.serviceManager.store.dispatch(
          actions.setHomeScreenIsOpen(true)
        );
      });
      await waitFor(() => expect(unmounted).toHaveBeenCalledTimes(cycle + 1));
      expect(messages.isConnected).toBe(false);
      expect(region.querySelector('.cds-aichat--messages')).toBeNull();
      const home = region.querySelector('cds-aichat-home-screen');
      expect(home).not.toBeNull();
      expect(home).not.toBe(previousHome);
      expect(directRegion(f.shell, 'messages')).toBe(region);
      previousHome = home;
    }
  });

  it('keeps the message target and subtree through unrelated config and input updates', async () => {
    const mounted = jest.spyOn(
      MessagesComponentClass.prototype,
      'componentDidMount'
    );
    const unmounted = jest.spyOn(
      MessagesComponentClass.prototype,
      'componentWillUnmount'
    );
    const f = await boot(Wrapper);
    await act(async () => {
      await f.instance.messaging.addMessage({
        id: 'shell-retained-message',
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: 'Keep this message',
            },
          ],
        },
      });
    });
    const region = expectDirectRegion(f, 'messages');
    const messages = region.querySelector('.cds-aichat--messages');
    const message = region.querySelector('.cds-aichat--message');
    expect(messages).not.toBeNull();
    expect(message).not.toBeNull();
    const mounts = mounted.mock.calls.length;
    f.update({ assistantName: 'Updated assistant' });
    await waitFor(() =>
      expect(
        f.instance.serviceManager.store.getState().config.public.assistantName
      ).toBe('Updated assistant')
    );
    await act(async () => {
      await f.instance.input.updateContent(() => ({
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Draft' }] },
        ],
      }));
    });
    expect(directRegion(f.shell, 'messages')).toBe(region);
    expect(region.querySelector('.cds-aichat--messages')).toBe(messages);
    expect(region.querySelector('.cds-aichat--message')).toBe(message);
    expect(mounted).toHaveBeenCalledTimes(mounts);
    expect(unmounted).not.toHaveBeenCalled();
  });
});

it.each(['cds-aichat-container', 'cds-aichat-custom-element'])(
  'keeps the same direct slot graph through the standalone %s host',
  async (tag) => {
    let instance: ChatInstance;
    const after = jest.fn();
    const host = document.createElement(tag);
    Object.assign(host, {
      config: baseConfig(),
      onBeforeRender: (chat: ChatInstance) => {
        instance = chat;
      },
      onAfterRender: after,
    });
    document.body.append(host);
    await waitFor(() => expect(after).toHaveBeenCalledTimes(1), {
      timeout: 5000,
    });
    const f = readLayout(instance);
    await waitFor(() => expectGraph(f));
  }
);
