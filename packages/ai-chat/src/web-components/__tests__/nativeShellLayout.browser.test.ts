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

import '../cds-aichat-container';
import '../cds-aichat-custom-element';
import { ChatContainer } from '../../react/ChatContainer';

import { ChatCustomElement } from '../../react/ChatCustomElement';

import { MessagesComponentClass } from '../../chat/components-legacy/MessagesComponent';

import type { ChatContainerProps } from '../../types/component/ChatContainer';

import type { ChatInstance } from '../../types/instance/ChatInstance';

import type { PublicConfig } from '../../types/config/PublicConfig';

import { WriteableElementName } from '../../types/instance/WriteableElements';

import {
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../../chat/__tests__/helpers/chat';

import { viewActions } from '../../chat/state';

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
  const after = vi.fn();
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

beforeEach(setupBeforeEach);
afterEach(() => {
  setupAfterEach();
  vi.restoreAllMocks();
});

describe.each(wrappers)('shell layout through %s', (_name, Wrapper) => {
  it('unmounts messages when home opens and preserves the messages region across each switch', async () => {
    const mounted = vi.spyOn(
      MessagesComponentClass.prototype,
      'componentDidMount'
    );
    const unmounted = vi.spyOn(
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
          viewActions.setHomeScreenIsOpen(false)
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
          viewActions.setHomeScreenIsOpen(true)
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
});
