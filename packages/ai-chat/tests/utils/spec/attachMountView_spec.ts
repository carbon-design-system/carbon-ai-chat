/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatViewState } from '../../../src/chat/services/chatViewState';
import { ExtensionHosts } from '../../../src/chat/services/extensionHosts';
import { attachMountView } from '../../../src/chat/utils/attachMountView';
import {
  bootPrebuiltChat,
  mergePublicConfig,
} from '../../../src/chat/utils/chatBoot';
import { createBaseTestProps } from '../../test_helpers';

async function bootChat() {
  return bootPrebuiltChat({
    publicConfig: mergePublicConfig(createBaseTestProps()),
  });
}

function attach(
  chat: Awaited<ReturnType<typeof bootChat>>,
  customHostElement?: HTMLElement
) {
  const chatElement = document.createElement('div');
  const renderTarget = document.createElement('div');
  const view = attachMountView({
    ...chat,
    chatElement,
    renderTarget,
    customHostElement,
    isRequestFooterEnabled: () => false,
  });
  return { view, renderTarget };
}

afterEach(() => {
  jest.restoreAllMocks();
});

it('fills the host element when there is one', async () => {
  const chat = await bootChat();
  const host = document.createElement('div');
  const { view, renderTarget } = attach(chat, host);
  expect(renderTarget.classList.contains('cds-aichat--boot-container')).toBe(
    true
  );
  expect(
    renderTarget.classList.contains('cds-aichat--boot-container--filled')
  ).toBe(true);
  expect(
    renderTarget.classList.contains('cds-aichat--boot-container--collapsed')
  ).toBe(false);
  expect(view.viewState.customHostElement).toBe(host);
  view.detach();
  await chat.serviceManager.shutdown();
});

it('stays collapsed with no host element', async () => {
  const chat = await bootChat();
  const { view, renderTarget } = attach(chat);
  expect(
    renderTarget.classList.contains('cds-aichat--boot-container--collapsed')
  ).toBe(true);
  expect(
    renderTarget.classList.contains('cds-aichat--boot-container--filled')
  ).toBe(false);
  expect(view.viewState.customHostElement).toBeUndefined();
  view.detach();
  await chat.serviceManager.shutdown();
});

it('attaches the view ports and takes everything off in order, once', async () => {
  const chat = await bootChat();
  const order: string[] = [];
  jest
    .spyOn(ExtensionHosts.prototype, 'disconnect')
    .mockImplementation(() => order.push('hosts'));
  jest
    .spyOn(ChatViewState.prototype, 'disconnect')
    .mockImplementation(() => order.push('viewState'));
  const removeListener = jest.spyOn(window, 'removeEventListener');

  expect(chat.serviceManager.view.current).toBeUndefined();
  const { view } = attach(chat);
  expect(chat.serviceManager.view.current?.messaging).toBeDefined();

  const root = document.createElement('div').attachShadow({ mode: 'open' });
  view.connectAnnouncer(root);
  view.connectAnnouncer(root);
  expect(root.querySelectorAll('.cds-aichat--aria-announcer')).toHaveLength(1);

  const unmountApp = jest.fn(() => {
    order.push('unmount');
    // The app unmounts while the view's ports are still attached.
    expect(chat.serviceManager.view.current).toBeDefined();
  });
  view.detach(unmountApp);
  view.detach(unmountApp);
  expect(order).toEqual(['hosts', 'viewState', 'unmount']);
  expect(unmountApp).toHaveBeenCalledTimes(1);
  expect(removeListener).toHaveBeenCalledWith('resize', expect.any(Function));
  expect(root.querySelector('.cds-aichat--aria-announcer')).toBeNull();
  expect(chat.serviceManager.view.current).toBeUndefined();
  await chat.serviceManager.shutdown();
});

it('undoes what it started when a step throws', async () => {
  const chat = await bootChat();
  const failure = new Error('hosts failed');
  jest.spyOn(ExtensionHosts.prototype, 'connect').mockImplementation(() => {
    throw failure;
  });
  const disconnect = jest.spyOn(ChatViewState.prototype, 'disconnect');
  expect(() => attach(chat)).toThrow(failure);
  expect(disconnect).toHaveBeenCalledTimes(1);
  expect(chat.serviceManager.view.current).toBeUndefined();
  await chat.serviceManager.shutdown();
});
