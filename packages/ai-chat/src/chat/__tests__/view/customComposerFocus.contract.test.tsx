/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import { WriteableElementName, type ChatInstance } from '../../../aiChatEntry';
import { contractChat, contractSetup } from '../helpers/contract';

function activeElement(): Element | null {
  let element = document.activeElement;
  while (element?.shadowRoot?.activeElement) {
    element = element.shadowRoot.activeElement;
  }
  return element;
}

// Only supplied host controls get a rectangle. This establishes tabbability in
// JSDOM; it makes no assertion about browser layout or production geometry.
function suppliedInput(): HTMLInputElement {
  const input = document.createElement('input');
  input.setAttribute('aria-label', 'Utility custom composer');
  Object.defineProperty(input, 'getClientRects', {
    configurable: true,
    value: () => [new DOMRect(0, 0, 120, 24)] as unknown as DOMRectList,
  });
  return input;
}

async function finishStartup(instance: ChatInstance): Promise<void> {
  await waitFor(() => expect(instance.state.get().status).not.toBe('loading'));
  for (let frame = 0; frame < 2; frame++) {
    await act(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        })
    );
  }
}

describe('public custom composer focus', () => {
  contractSetup();

  it('focuses supplied input content only while the public visibility override permits it', async () => {
    const mount = await contractChat({
      openChatByDefault: true,
      input: { isVisible: false },
      messaging: { skipWelcome: true },
    });
    const outside = document.createElement('button');
    document.body.append(outside);
    const input = suppliedInput();
    try {
      await act(async () => {
        mount.instance.writeableElements[
          WriteableElementName.CUSTOM_PROMPT_LINE
        ].append(input);
      });
      await finishStartup(mount.instance);
      outside.focus();
      expect(mount.instance.requestFocus()).toBe(false);
      expect(activeElement()).toBe(outside);
      await act(async () => mount.instance.updateInputFieldVisibility(true));
      expect(mount.instance.requestFocus()).toBe(true);
      expect(activeElement()).toBe(input);
      expect(mount.instance.requestFocus()).toBe(true);
      expect(activeElement()).toBe(input);
      outside.focus();
      await act(async () => mount.instance.updateInputFieldVisibility(false));
      expect(mount.instance.requestFocus()).toBe(false);
      expect(activeElement()).toBe(outside);
    } finally {
      outside.remove();
      await act(async () => mount.unmount());
    }
  });

  it('reaches supplied controls through nested shadow roots and leaves focus outside nonfocusable replacement content', async () => {
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
    });
    const outside = document.createElement('button');
    document.body.append(outside);
    const outer = document.createElement('div');
    const inner = document.createElement('div');
    const input = suppliedInput();
    outer.attachShadow({ mode: 'open' }).append(inner);
    inner.attachShadow({ mode: 'open' }).append(input);
    try {
      const slot =
        mount.instance.writeableElements[
          WriteableElementName.CUSTOM_PROMPT_LINE
        ];
      await act(async () => slot.append(outer));
      await finishStartup(mount.instance);
      outside.focus();
      expect(mount.instance.requestFocus()).toBe(true);
      expect(activeElement()).toBe(input);
      expect(mount.instance.requestFocus()).toBe(true);
      expect(activeElement()).toBe(input);
      await act(async () =>
        slot.replaceChildren(
          'Utility plain custom content',
          document.createElement('span')
        )
      );
      outside.focus();
      expect(mount.instance.requestFocus()).toBe(false);
      expect(activeElement()).toBe(outside);
    } finally {
      outside.remove();
      await act(async () => mount.unmount());
    }
  });
});
