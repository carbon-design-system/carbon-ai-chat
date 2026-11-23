/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mounts for the input browser tests. `react` is the `ChatCustomElement`
 * wrapper and `web-component` the `cds-aichat-custom-element` element. Each
 * is sized as the demo's full-screen layout sizes it, beside a 320px side
 * panel and below a 48px header, in a 1360x900 page.
 */

import { act, waitFor } from '@testing-library/react';
import { page } from 'vitest/browser';

import type {
  ChatCustomElementProps,
  ChatInstance,
  PublicConfig,
} from '../../../aiChatEntry';
import {
  contractCustomElementChat,
  contractElement,
  type ContractElementMount,
} from './contract';

/** The two host kinds the input tests mount. */
type InputHost = 'react' | 'web-component';

/** Both hosts, for `describe.each`. */
export const INPUT_HOSTS: InputHost[] = ['react', 'web-component'];

/** The class that sizes each host to fill the page. */
const HOST_CLASS = 'input-browser-host';

let hostStyle: HTMLStyleElement | null = null;

function installHostStyle() {
  if (hostStyle?.isConnected) {
    return;
  }
  hostStyle = document.createElement('style');
  hostStyle.textContent = `.${HOST_CLASS} { position: fixed; bottom: 0; inset-inline-end: 0; height: calc(100vh - 48px); width: calc(100vw - 320px - 2rem); }`;
  document.head.appendChild(hostStyle);
}

/** A mounted host and the parts of it the input tests reach. */
export interface InputMount {
  host: InputHost;
  instance: ChatInstance;
  /** The `cds-aichat-container` that holds the chat's shadow root. */
  container: HTMLElement;
  /** The element the host's slot content goes in. */
  slotHost: HTMLElement;
  root: ShadowRoot;
  /**
   * Merges `patch` over the current config, as a host update does: new props
   * for `react`, new properties for `web-component`.
   */
  update: (patch: Partial<ChatCustomElementProps>) => Promise<void>;
  unmount: () => void;
}

/**
 * Mounts `host` open with `config`, ltr for `react` and rtl for
 * `web-component`, and waits for the built-in input.
 */
export async function mountInputHost(
  host: InputHost,
  config: Partial<PublicConfig> = {}
): Promise<InputMount> {
  installHostStyle();
  await page.viewport(1360, 900);
  document.documentElement.dir = host === 'react' ? 'ltr' : 'rtl';
  let current: Partial<ChatCustomElementProps> = {
    openChatByDefault: true,
    messaging: { skipWelcome: true, customSendMessage: () => undefined },
    homescreen: { isOn: false },
    header: { isOn: true },
    upload: { isOn: false },
    ...config,
    input: { expanded: false, isDisabled: false, ...config.input },
  };
  let mount: InputMount;
  if (host === 'react') {
    const props = (): Partial<ChatCustomElementProps> => ({
      ...current,
      className: HOST_CLASS,
    });
    const react = await contractCustomElementChat(props());
    mount = {
      host,
      instance: react.instance,
      container: react.host,
      slotHost: react.host,
      root: react.host.shadowRoot,
      update: async (patch) => {
        current = { ...current, ...patch };
        await react.rerender(props());
      },
      unmount: react.unmount,
    };
  } else {
    const element: ContractElementMount = await contractElement(
      'cds-aichat-custom-element',
      { properties: current, attributes: { class: HOST_CLASS } }
    );
    const container = element.element.shadowRoot.querySelector<HTMLElement>(
      'cds-aichat-container'
    );
    mount = {
      host,
      instance: element.instance,
      container,
      slotHost: element.element,
      root: container.shadowRoot,
      update: async (patch) => {
        current = { ...current, ...patch };
        await act(async () => {
          Object.assign(element.element, patch);
        });
      },
      unmount: element.remove,
    };
  }
  await waitFor(() =>
    expect(mount.root.querySelector('cds-aichat-chat-input')).not.toBeNull()
  );
  return mount;
}

/** Restores the page direction and size a mount set. */
export async function resetInputHostPage() {
  document.documentElement.removeAttribute('dir');
  await page.viewport(800, 600);
}
