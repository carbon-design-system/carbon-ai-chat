/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Three-surface parity for the footer slot below a user message.
 *
 * `renderCustomRequestFooter` is implemented once per surface — React
 * `ChatContainer`, `cds-aichat-container`, and `cds-aichat-custom-element`,
 * which only forwards to the inner container — and the unit specs cover the
 * pieces rather than the wiring. This one boots each surface for real, sends a
 * message through the instance it hands back, and looks for the footer in the
 * DOM.
 *
 * It also holds the two properties no unit spec can reach: returning the same
 * element must leave the node where it is, and a callback that arrives after
 * boot must still get footers.
 */

import { waitFor } from '@testing-library/react';
import React from 'react';
import { createRoot } from 'react-dom/client';

import '../../../src/web-components/cds-aichat-container';
import '../../../src/web-components/cds-aichat-custom-element';
import { ChatContainer } from '../../../src/react/ChatContainer';
import { ChatInstance } from '../../../src/types/instance/ChatInstance';
import {
  RenderCustomRequestFooter,
  RenderCustomRequestFooterState,
} from '../../../src/types/component/ChatContainer';
import { createBaseConfig, createBaseTestProps } from '../../test_helpers';

// `cds-aichat-custom-element` spreads `root.adoptedStyleSheets` in its
// `createRenderRoot`, and jsdom's ShadowRoot has no such property, so
// connecting it throws before anything is wired. Same environment gap the
// plugin-host parity spec patches.
const adopted = new WeakMap<ShadowRoot, unknown[]>();
if (!('adoptedStyleSheets' in ShadowRoot.prototype)) {
  Object.defineProperty(ShadowRoot.prototype, 'adoptedStyleSheets', {
    configurable: true,
    get(this: ShadowRoot) {
      return adopted.get(this) ?? [];
    },
    set(this: ShadowRoot, sheets: unknown[]) {
      adopted.set(this, sheets);
    },
  });
}

const FOOTER_SELECTOR = 'div[slot^="request-footer-"]';

/**
 * One booted surface: the instance to send through, and the element whose
 * light DOM receives the wrappers.
 */
interface Surface {
  name: string;
  instance: ChatInstance;
  host: HTMLElement;
  /** The wrappers this surface has created, wherever it puts them. */
  footers: () => Element[];
  settle: () => Promise<void>;
}

/** The element a web-component callback hands back, one per slot. */
function footerElementFor(
  cache: Map<string, HTMLElement>,
  state: RenderCustomRequestFooterState
) {
  let element = cache.get(state.slotName);
  if (!element) {
    element = document.createElement('span');
    element.className = 'request-footer-content';
    cache.set(state.slotName, element);
  }
  element.textContent = state.message.input.text ?? '';
  return element;
}

async function bootWebComponent(
  tagName: string,
  renderCustomRequestFooter?: (
    state: RenderCustomRequestFooterState
  ) => HTMLElement | null
): Promise<Surface> {
  let instance!: ChatInstance;
  const element = document.createElement(tagName);
  const asHost = element as unknown as Record<string, unknown>;
  asHost.config = createBaseConfig();
  asHost.onBeforeRender = (chatInstance: ChatInstance) => {
    instance = chatInstance;
  };
  if (renderCustomRequestFooter) {
    asHost.renderCustomRequestFooter = renderCustomRequestFooter;
  }
  document.body.appendChild(element);

  await waitFor(() => expect(instance).toBeDefined(), { timeout: 8000 });

  return {
    name: tagName,
    instance,
    host: element,
    // cds-aichat-custom-element renders the inner container into its shadow
    // root and owns no slot of its own, so the wrappers land one level in.
    footers: () => {
      const owner =
        element.shadowRoot?.querySelector('cds-aichat-container') ?? element;
      return [...owner.querySelectorAll(FOOTER_SELECTOR)];
    },
    settle: async () => {
      await (element as unknown as { updateComplete: Promise<void> })
        .updateComplete;
    },
  };
}

async function bootReact(
  renderCustomRequestFooter: RenderCustomRequestFooter
): Promise<Surface> {
  let instance!: ChatInstance;
  const mount = document.createElement('div');
  document.body.appendChild(mount);

  createRoot(mount).render(
    React.createElement(ChatContainer, {
      ...createBaseTestProps(),
      onBeforeRender: (chatInstance: ChatInstance) => {
        instance = chatInstance;
      },
      renderCustomRequestFooter,
    } as never)
  );

  await waitFor(() => expect(instance).toBeDefined(), { timeout: 8000 });

  return {
    name: 'ChatContainer',
    instance,
    host: mount,
    footers: () => [...mount.querySelectorAll(FOOTER_SELECTOR)],
    settle: async () => undefined,
  };
}

describe('custom request footer across host surfaces', () => {
  it('renders a footer under a user message on every surface', async () => {
    const caches = [new Map<string, HTMLElement>(), new Map()];

    const container = await bootWebComponent('cds-aichat-container', (state) =>
      footerElementFor(caches[0], state)
    );
    const customElement = await bootWebComponent(
      'cds-aichat-custom-element',
      (state) => footerElementFor(caches[1], state)
    );
    const react = await bootReact((_slotName, message) =>
      React.createElement(
        'span',
        { className: 'request-footer-content' },
        message.input.text
      )
    );

    for (const surface of [container, customElement, react]) {
      await surface.instance.send('hello from the user');
      await surface.settle();

      await waitFor(
        () => {
          expect(surface.footers()).toHaveLength(1);
        },
        { timeout: 8000 }
      );

      expect(surface.footers()[0].textContent).toBe('hello from the user');
    }
  }, 40000);

  it('leaves the node alone when the callback returns the same element', async () => {
    const cache = new Map<string, HTMLElement>();
    const surface = await bootWebComponent('cds-aichat-container', (state) =>
      footerElementFor(cache, state)
    );

    await surface.instance.send('first');
    await surface.settle();

    await waitFor(() => {
      expect(surface.footers()).toHaveLength(1);
    });

    const [slotName] = [...cache.keys()];
    const element = cache.get(slotName);
    let disconnects = 0;
    // `replaceChildren` on an unchanged child detaches and re-attaches it. A
    // MutationObserver on the wrapper sees exactly that.
    const wrapper = surface.host.querySelector(
      `div[slot="${slotName}"]`
    ) as HTMLElement;
    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        record.removedNodes.forEach((node) => {
          if (node === element) {
            disconnects += 1;
          }
        });
      });
    });
    observer.observe(wrapper, { childList: true });

    // A second send re-renders the container and calls the callback again for
    // the slot above, which hands back the element it already returned.
    await surface.instance.send('second');
    await surface.settle();

    await waitFor(() => {
      expect(surface.footers()).toHaveLength(2);
    });

    observer.disconnect();
    expect(disconnects).toBe(0);
    expect(wrapper.firstChild).toBe(element);
  }, 40000);

  it('renders footers for a callback set after the chat booted', async () => {
    const surface = await bootWebComponent('cds-aichat-container');

    await surface.instance.send('sent before the callback existed');
    await surface.settle();

    expect(surface.footers()).toHaveLength(0);

    const cache = new Map<string, HTMLElement>();
    (
      surface.host as unknown as Record<string, unknown>
    ).renderCustomRequestFooter = (state: RenderCustomRequestFooterState) =>
      footerElementFor(cache, state);

    await surface.instance.send('sent after');
    await surface.settle();

    await waitFor(() => {
      expect(surface.footers()).toHaveLength(1);
    });
  }, 40000);
});
