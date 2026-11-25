/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatMountState } from '../../services/chatMountState';
import { ExtensionHosts } from '../../services/extensionHosts';
import { attachMountView } from '../attachMountView';
import { bootPrebuiltChat, mergePublicConfig } from '../chatBoot';
import { createBaseTestProps } from '../../__tests__/helpers/chat';

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
  vi.restoreAllMocks();
});

it('attaches the view ports and takes everything off in order, once', async () => {
  const chat = await bootChat();
  const order: string[] = [];
  vi.spyOn(ExtensionHosts.prototype, 'disconnect').mockImplementation(() =>
    order.push('hosts')
  );
  vi.spyOn(ChatMountState.prototype, 'disconnect').mockImplementation(() =>
    order.push('viewState')
  );
  const removeListener = vi.spyOn(window, 'removeEventListener');

  expect(chat.serviceManager.view.current).toBeUndefined();
  const { view } = attach(chat);
  expect(chat.serviceManager.view.current?.messaging).toBeDefined();

  const root = document.createElement('div').attachShadow({ mode: 'open' });
  view.connectAnnouncer(root);
  view.connectAnnouncer(root);
  expect(root.querySelectorAll('.cds-aichat--aria-announcer')).toHaveLength(1);

  const unmountApp = vi.fn(() => {
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
  vi.spyOn(ExtensionHosts.prototype, 'connect').mockImplementation(() => {
    throw failure;
  });
  const disconnect = vi.spyOn(ChatMountState.prototype, 'disconnect');
  expect(() => attach(chat)).toThrow(failure);
  expect(disconnect).toHaveBeenCalledTimes(1);
  expect(chat.serviceManager.view.current).toBeUndefined();
  await chat.serviceManager.shutdown();
});
