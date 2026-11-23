/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mounts the chat through each host for the panel browser tests. A React or
 * element host floats, or fills a sized sidebar element as a page's sidebar
 * does. Every mount opens the main window with no welcome request.
 */

import { act } from '@testing-library/react';

import { deepQuerySelector } from '@carbon/ai-chat-components/es/globals/utils/dom-utils.js';

import type { ChatInstance } from '../../../types/instance/ChatInstance';
import type { PublicConfig } from '../../../types/config/PublicConfig';
import {
  contractChat,
  contractCustomElementChat,
  contractElement,
} from './contract';

export type HostFramework = 'react' | 'web-component';
export type HostLayout = 'float' | 'sidebar';

/** The class that sizes a sidebar host: 360px wide and the page's height. */
const SIDEBAR_CLASS = 'panel-port-sidebar';

function ensureSidebarStyle() {
  if (document.getElementById(SIDEBAR_CLASS)) {
    return;
  }
  const style = document.createElement('style');
  style.id = SIDEBAR_CLASS;
  style.textContent = `.${SIDEBAR_CLASS} { position: fixed; inset-block: 0; inset-inline-end: 0; width: 360px; height: 100%; }`;
  document.head.appendChild(style);
}

export interface PanelHost {
  instance: ChatInstance;
  /** The `cds-aichat-container` that renders the chat. */
  container: HTMLElement;
  /** That container's shadow root, where the chat's shell renders. */
  root: ShadowRoot;
  /** Changes the host's config, as a page does through props or properties. */
  update: (config: Partial<PublicConfig>) => Promise<void>;
  /** Removes the host. */
  unmount: () => Promise<void>;
}

/**
 * Mounts one host. `react` uses `ChatContainer` (float) or
 * `ChatCustomElement` (sidebar); `web-component` uses `cds-aichat-container`
 * (float) or `cds-aichat-custom-element` (sidebar).
 */
export async function mountPanelHost(
  framework: HostFramework,
  layout: HostLayout,
  config: Partial<PublicConfig> = {}
): Promise<PanelHost> {
  const props = {
    openChatByDefault: true,
    ...config,
    messaging: { skipWelcome: true, ...config.messaging },
  };
  if (layout === 'sidebar') {
    ensureSidebarStyle();
  }
  let instance: ChatInstance;
  let remove: () => void;
  let update: PanelHost['update'];
  if (framework === 'react') {
    let current: Partial<PublicConfig> = props;
    const withClass = () =>
      layout === 'float' ? current : { ...current, className: SIDEBAR_CLASS };
    const mount =
      layout === 'float'
        ? await contractChat(current)
        : await contractCustomElementChat(withClass());
    instance = mount.instance;
    remove = mount.unmount;
    update = async (next) => {
      current = { ...current, ...next };
      await mount.rerender(withClass());
    };
  } else {
    const mount = await contractElement(
      layout === 'float' ? 'cds-aichat-container' : 'cds-aichat-custom-element',
      {
        properties: props,
        attributes: layout === 'sidebar' ? { class: SIDEBAR_CLASS } : {},
      }
    );
    instance = mount.instance;
    remove = mount.remove;
    update = async (next) => {
      await act(async () => {
        Object.assign(mount.element, next);
      });
    };
  }
  const container = deepQuerySelector(
    document,
    'cds-aichat-container'
  ) as HTMLElement;
  return {
    instance,
    container,
    root: container.shadowRoot,
    update,
    unmount: async () => {
      await act(async () => remove());
    },
  };
}

/** The first match for `selector`, searching through open shadow roots. */
export function deep<T extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document
): T | null {
  return deepQuerySelector(root as Element, selector) as T | null;
}

/** Every match for `selector`, searching through open shadow roots. */
export function deepAll<T extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document
): T[] {
  const found: T[] = [];
  const visit = (node: ParentNode) => {
    found.push(...Array.from(node.querySelectorAll<T>(selector)));
    node.querySelectorAll('*').forEach((element) => {
      if (element.shadowRoot) {
        visit(element.shadowRoot);
      }
    });
  };
  visit(root);
  return found;
}

/**
 * Whether a user sees `element`, as Playwright's `toBeVisible` decides: it
 * renders in the flat tree with a non-empty box and isn't
 * `visibility: hidden`.
 */
export function isVisible(element: Element | null): boolean {
  if (!element?.isConnected) {
    return false;
  }
  const box = element.getBoundingClientRect();
  return (
    box.width > 0 &&
    box.height > 0 &&
    element.checkVisibility({ visibilityProperty: true })
  );
}

/** The focused element, looking through open shadow roots. */
export function deepActive(): Element | null {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active;
}
