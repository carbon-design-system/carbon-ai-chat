/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The app's slots project React render-prop hosts from the shared container's
 * shadow root. These cases read real slot assignment, so they run in a
 * browser; `wrapperSlots.test.tsx` covers the rest of the render-prop
 * lifecycle.
 */

import React, { useState } from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';

import '../../web-components/cds-aichat-container';
import { ChatContainer } from '../ChatContainer';
import { ChatCustomElement } from '../ChatCustomElement';
import { ChatInstance } from '../../types/instance/ChatInstance';
import {
  createBaseConfig,
  getChatHost,
  setupAfterEach,
  setupBeforeEach,
} from '../../chat/__tests__/helpers/chat';
import { untilCalled, untilDom } from '../../chat/__tests__/helpers/waits';

const config = { ...createBaseConfig(), openChatByDefault: true };

/** A stateful child, so a remount shows as a reset count. */
function Counter({ id }: { id: string }) {
  const [count, setCount] = useState(0);
  return (
    <button
      type="button"
      data-probe={id}
      onClick={() => setCount((value) => value + 1)}>
      {count}
    </button>
  );
}

function probe(id: string) {
  return document.querySelector<HTMLElement>(`[data-probe="${id}"]`);
}

describe('React render props through the shared container', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it.each([
    ['ChatContainer', ChatContainer],
    ['ChatCustomElement', ChatCustomElement],
  ] as const)(
    'keeps native home content and its assigned slot stable through %s',
    async (_name, Wrapper) => {
      let instance: ChatInstance;
      const after = vi.fn();
      const homescreen = { isOn: true, greeting: 'Welcome' };
      const host = (withPortal: boolean, greeting = 'Welcome') => (
        <Wrapper
          {...config}
          className=""
          homescreen={{ ...homescreen, greeting }}
          onBeforeRender={(chat) => {
            instance = chat;
          }}
          onAfterRender={after}
          renderWriteableElements={
            withPortal
              ? {
                  homeScreenAfterStartersElement: (
                    <Counter id="home-react-counter" />
                  ),
                }
              : undefined
          }
        />
      );
      const mounted = render(host(false));
      await untilCalled(after);
      expect(after).toHaveBeenCalledTimes(1);
      const chat = getChatHost();
      const native = chat.shadowRoot.querySelector('cds-aichat-home-screen');
      expect(native).not.toBeNull();
      expect(native.shadowRoot).toBeNull();
      const writable =
        instance.writeableElements.homeScreenAfterStartersElement;
      const slot = native.querySelector<HTMLSlotElement>(
        'slot[name="homeScreenAfterStartersElement"]'
      );
      const body = () => native.querySelector('.cds-aichat--home-screen__body');
      expect(writable.parentNode).toBe(chat);
      expect(writable.assignedSlot).toBe(slot);
      expect(slot.getRootNode()).toBe(chat.shadowRoot);
      expect(
        body().classList.contains(
          'cds-aichat--home-screen__body--no-custom-content'
        )
      ).toBe(true);

      const imperative = document.createElement('button');
      imperative.textContent = '0';
      imperative.onclick = () => {
        imperative.textContent = String(Number(imperative.textContent) + 1);
      };
      writable.appendChild(imperative);
      // The home screen samples writable content when it renders, as on main, so a settled DOM write alone leaves
      // the class.
      await Promise.resolve();
      await (native as HTMLElement & { updateComplete: Promise<boolean> })
        .updateComplete;
      expect(
        body().classList.contains(
          'cds-aichat--home-screen__body--no-custom-content'
        )
      ).toBe(true);
      mounted.rerender(host(false, 'With content'));
      await untilDom(chat.shadowRoot, () =>
        expect(
          body().classList.contains(
            'cds-aichat--home-screen__body--custom-content'
          )
        ).toBe(true)
      );
      imperative.click();
      imperative.remove();
      mounted.rerender(host(false, 'Without content'));
      await untilDom(chat.shadowRoot, () =>
        expect(
          body().classList.contains(
            'cds-aichat--home-screen__body--no-custom-content'
          )
        ).toBe(true)
      );
      writable.appendChild(imperative);
      mounted.rerender(host(false, 'Content again'));
      await untilDom(chat.shadowRoot, () =>
        expect(
          body().classList.contains(
            'cds-aichat--home-screen__body--custom-content'
          )
        ).toBe(true)
      );
      expect(imperative.textContent).toBe('1');

      mounted.rerender(host(true));
      await untilDom(document, () =>
        expect(probe('home-react-counter')).not.toBeNull()
      );
      const counter = probe('home-react-counter');
      fireEvent.click(counter);
      expect(counter.textContent).toBe('1');
      mounted.rerender(host(true, 'Updated greeting'));
      await untilDom(chat.shadowRoot, () =>
        expect(native.querySelector('h2')?.textContent).toBe('Updated greeting')
      );
      expect(probe('home-react-counter')).toBe(counter);
      expect(counter.textContent).toBe('1');
      expect(imperative.parentNode).toBe(writable);
      expect(imperative.textContent).toBe('1');
      expect(instance.writeableElements.homeScreenAfterStartersElement).toBe(
        writable
      );
      expect(writable.assignedSlot).toBe(slot);
      expect(
        native.querySelector('slot[name="homeScreenAfterStartersElement"]')
      ).toBe(slot);
      expect(after).toHaveBeenCalledTimes(1);
    }
  );

  it.each([
    ['ChatContainer', ChatContainer],
    ['ChatCustomElement', ChatCustomElement],
  ] as const)(
    'keeps native header slots and consumer state through %s updates and custom-header replacement',
    async (_name, Wrapper) => {
      let instance: ChatInstance;
      const after = vi.fn();
      const host = (custom = false, title = 'Original header') => (
        <Wrapper
          {...config}
          className=""
          header={{ title }}
          onBeforeRender={(chat) => {
            instance = chat;
          }}
          onAfterRender={after}
          renderWriteableElements={{
            headerFixedActionsElement: <Counter id="native-header-counter" />,
            ...(custom
              ? {
                  customHeader: (
                    <p data-probe="replacement-header">Custom header</p>
                  ),
                }
              : {}),
          }}
        />
      );
      const mounted = render(host());
      await waitFor(() => expect(after).toHaveBeenCalledTimes(1));
      const chat = getChatHost();
      const native = chat.shadowRoot.querySelector('cds-aichat-header-view');
      expect(native).not.toBeNull();
      expect(native.shadowRoot).toBeNull();
      const base = native.querySelector('cds-aichat-chat-header');
      const label = native.querySelector('cds-ai-label');
      expect(label.parentElement).toBe(base);
      expect(label.slot).toBe('decorator');
      const content = instance.writeableElements.explainabilityPopoverContent;
      const fixed = instance.writeableElements.headerFixedActionsElement;
      const slot = content.assignedSlot;
      expect(slot.getRootNode()).toBe(chat.shadowRoot);
      expect(slot.parentElement.slot).toBe('body-text');
      expect(slot.parentElement.parentElement).toBe(label);
      expect(fixed.assignedSlot.parentElement.slot).toBe('fixed-actions');
      const counter = probe('native-header-counter');
      fireEvent.click(counter);
      expect(counter.textContent).toBe('1');
      const customExplanation = document.createElement('button');
      customExplanation.textContent = 'Host explanation';
      content.appendChild(customExplanation);
      await waitFor(() =>
        expect(
          native.querySelector('.cds-aichat--header__slug-label')
        ).toBeNull()
      );

      mounted.rerender(host(false, 'Updated header'));
      await waitFor(() =>
        expect((base as any).headerTitle).toBe('Updated header')
      );
      expect(native.querySelector('cds-ai-label')).toBe(label);
      expect(content.assignedSlot).toBe(slot);
      expect(customExplanation.parentNode).toBe(content);
      expect(probe('native-header-counter')).toBe(counter);
      expect(counter.textContent).toBe('1');

      mounted.rerender(host(true));
      await waitFor(() => expect(probe('replacement-header')).not.toBeNull());
      expect(content.parentNode).toBe(chat);
      expect(fixed.parentNode).toBe(chat);
      expect(customExplanation.parentNode).toBe(content);
      expect(probe('native-header-counter')).toBe(counter);
      expect(counter.textContent).toBe('1');
      mounted.rerender(host(false));
      await waitFor(() => expect(content.assignedSlot).not.toBeNull());
      expect(instance.writeableElements.explainabilityPopoverContent).toBe(
        content
      );
      expect(instance.writeableElements.headerFixedActionsElement).toBe(fixed);
      expect(customExplanation.parentNode).toBe(content);
      expect(probe('native-header-counter')).toBe(counter);
      expect(counter.textContent).toBe('1');
      expect(after).toHaveBeenCalledTimes(1);
    }
  );
});
