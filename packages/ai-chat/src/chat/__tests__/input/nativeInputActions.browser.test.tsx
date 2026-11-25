/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { act, waitFor } from '@testing-library/react';
import Add16 from '@carbon/icons/es/add--large/16.js';
import { page, userEvent } from 'vitest/browser';

import { PageObjectId, type InputConfig } from '../../../aiChatEntry';
import {
  accessibleName,
  byTestId,
  contractSetup,
  deepActiveElement,
  mainPanelText,
} from '../helpers/contract';
import {
  INPUT_HOSTS,
  mountInputHost,
  resetInputHostPage,
  type InputMount,
} from '../helpers/browserInput';

/**
 * Shown the way a user sees it: rendered, styled visible, and not empty. A
 * `display: contents` box shows when one of its children does.
 */
function isVisible(element: Element | null | undefined): boolean {
  if (!element?.isConnected) {
    return false;
  }
  if (getComputedStyle(element).display === 'contents') {
    return Array.from(element.children).some(isVisible);
  }
  const rect = element.getBoundingClientRect();
  return (
    element.checkVisibility({ visibilityProperty: true }) &&
    rect.width > 0 &&
    rect.height > 0
  );
}

/** The prompt-line slot wrapper that holds the named writable slot. */
function slotWrapper(mount: InputMount, name: string): HTMLElement | null {
  return (
    Array.from(
      mount.root.querySelectorAll<HTMLElement>('cds-aichat-prompt-line-slot')
    ).find((wrapper) => wrapper.querySelector(`slot[name="${name}"]`)) ?? null
  );
}

interface ActionsProbe {
  calls: string[];
  links: { url: string; target: string }[];
  input?: InputConfig;
}

function actionsFor(expanded: boolean, probe: ActionsProbe) {
  const icon = Add16;
  return expanded
    ? [
        ...Array.from({ length: 12 }, (_, index) => ({
          id: `action-${index}`,
          text: `Action ${index + 1}`,
          testId: `input-action-${index}`,
          icon,
          ...(index === 0
            ? { href: 'https://example.com/inline' }
            : index === 11
              ? { href: 'https://example.com/overflow', target: '_blank' }
              : { onClick: () => probe.calls.push(`action-${index}`) }),
        })),
        {
          id: 'fixed',
          text: 'Fixed action',
          testId: 'input-action-fixed',
          icon,
          fixed: true,
          onClick: () => probe.calls.push('fixed'),
        },
      ]
    : [
        {
          id: 'callback',
          text: 'Run action',
          testId: 'input-action-callback',
          icon,
          onClick: () => probe.calls.push('callback'),
        },
        {
          id: 'disabled',
          text: 'Disabled action',
          testId: 'input-action-disabled',
          icon,
          disabled: true,
          onClick: () => probe.calls.push('disabled'),
        },
        {
          id: 'link',
          text: 'Open link',
          testId: 'input-action-link',
          icon,
          href: 'https://example.com/compact',
        },
      ];
}

async function configureActions(mount: InputMount, expanded: boolean) {
  const probe: ActionsProbe = { calls: [], links: [] };
  vi.spyOn(window, 'open').mockImplementation((url, target) => {
    probe.links.push({ url: String(url), target });
    return null;
  });
  probe.input = { expanded, actions: actionsFor(expanded, probe) };
  await mount.update({ input: probe.input });
  await waitFor(() =>
    expect(
      isVisible(mount.root.querySelector('cds-aichat-input-actions'))
    ).toBe(true)
  );
  return probe;
}

async function updateInput(
  mount: InputMount,
  probe: ActionsProbe,
  patch: Partial<InputConfig>
) {
  probe.input = { ...probe.input, ...patch };
  await mount.update({ input: probe.input });
}

/** The inner `<button>` of a Carbon icon button. */
function innerButton(host: Element): HTMLButtonElement {
  return host.shadowRoot.querySelector('button');
}

afterEach(resetInputHostPage);

describe.each(INPUT_HOSTS)('%s native input actions', (host) => {
  contractSetup();

  it(`${host} compact input actions keep labels, keys, disabled states, links, and focus`, async () => {
    const mount = await mountInputHost(host);
    const probe = await configureActions(mount, false);
    const actions = () =>
      mount.root.querySelector<HTMLElement>('cds-aichat-input-actions');
    const trigger = () =>
      byTestId('cds-aichat-input-actions-trigger', actions());
    const menu = () => actions()?.querySelector<HTMLElement>('cds-menu');
    const item = (testId: string) =>
      menu()?.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
    await expect
      .element(page.elementLocator(innerButton(trigger())))
      .toHaveAccessibleName('Add files and more');
    act(() => innerButton(trigger()).focus());
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(
        isVisible(menu()?.shadowRoot?.querySelector('[role="menu"]'))
      ).toBe(true)
    );
    const run = item('input-action-callback');
    expect(accessibleName(run)).toBe('Run action');
    expect(item('input-action-disabled')).toHaveAttribute('disabled', '');
    expect(run.querySelectorAll('svg')).toHaveLength(1);
    act(() => run.focus());
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => {
      const link = item('input-action-link');
      expect(link.matches(':focus-within') || link.matches(':focus')).toBe(
        true
      );
    });
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(menu()).toBeNull());
    await waitFor(() =>
      expect(deepActiveElement()).toBe(innerButton(trigger()))
    );
    await userEvent.click(trigger());
    await waitFor(() => expect(item('input-action-link')).toBeTruthy());
    await userEvent.click(item('input-action-link'));
    await waitFor(() => expect(menu()).toBeNull());
    expect(probe.links).toEqual([
      { url: 'https://example.com/compact', target: '_self' },
    ]);
    await userEvent.click(trigger());
    await waitFor(() => expect(item('input-action-callback')).toBeTruthy());
    await userEvent.click(item('input-action-callback'));
    expect(probe.calls).toEqual(['callback']);
    await updateInput(mount, probe, { isDisabled: true });
    await waitFor(() => expect(innerButton(trigger())).toBeDisabled());
    expect(byTestId(PageObjectId.INPUT, mount.root)).toBeDisabled();
    await updateInput(mount, probe, { isDisabled: false });
    await waitFor(() => expect(innerButton(trigger())).toBeEnabled());
    await userEvent.click(trigger());
    await waitFor(() =>
      expect(
        isVisible(menu()?.shadowRoot?.querySelector('[role="menu"]'))
      ).toBe(true)
    );
    await updateInput(mount, probe, { isVisible: false });
    await waitFor(() => expect(actions()).toBeNull());
    await updateInput(mount, probe, { isVisible: true });
    await waitFor(() => expect(trigger()).toBeTruthy());
    await userEvent.click(trigger());
    await waitFor(() => expect(item('input-action-callback')).toBeTruthy());
    await userEvent.click(item('input-action-callback'));
    expect(probe.calls).toEqual(['callback', 'callback']);
    const input = byTestId(PageObjectId.INPUT, mount.root);
    await userEvent.fill(input, 'Input actions send check');
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(mainPanelText()).toContain('Input actions send check')
    );
    mount.unmount();
  });

  it(`${host} expanded actions overflow at a real narrow width while fixed actions remain`, async () => {
    const mount = await mountInputHost(host);
    const probe = await configureActions(mount, true);
    const actions = mount.root.querySelector<HTMLElement>(
      'cds-aichat-input-actions'
    );
    const row = () =>
      actions.querySelector<HTMLElement>('.cds-aichat-input-inline-actions');
    const overflow = () =>
      byTestId('cds-aichat-input-actions-overflow-trigger', actions);
    const inRow = (testId: string) =>
      row().querySelector<HTMLElement>(`[data-testid="${testId}"]`);
    const menu = () => actions.querySelector<HTMLElement>('cds-menu');
    await waitFor(() => expect(row()).not.toHaveAttribute('data-measuring'));
    expect(isVisible(overflow())).toBe(false);
    for (let index = 0; index < 12; index += 1) {
      expect(isVisible(inRow(`input-action-${index}`))).toBe(true);
    }
    const wide = row().getBoundingClientRect().width;
    await userEvent.click(inRow('input-action-0'));
    await page.viewport(700, 900);
    await waitFor(() => expect(isVisible(overflow())).toBe(true));
    expect(isVisible(inRow('input-action-fixed'))).toBe(true);
    await waitFor(() =>
      expect(isVisible(inRow('input-action-11'))).toBe(false)
    );
    expect(row().getBoundingClientRect().width).toBeLessThan(wide);
    await userEvent.click(overflow());
    await waitFor(() =>
      expect(
        isVisible(menu()?.shadowRoot?.querySelector('[role="menu"]'))
      ).toBe(true)
    );
    expect(menu().querySelector('[data-testid="input-action-fixed"]')).toBe(
      null
    );
    const hiddenIds = Array.from(
      row().querySelectorAll(
        'cds-icon-button[data-hidden]:not([data-input-actions-trigger])'
      ),
      (node) => node.getAttribute('data-testid')
    );
    expect(hiddenIds.length).toBeGreaterThan(0);
    expect(
      Array.from(menu().querySelectorAll('cds-menu-item'), (node) =>
        node.getAttribute('data-testid')
      )
    ).toEqual(hiddenIds);
    await userEvent.click(
      menu().querySelector<HTMLElement>('[data-testid="input-action-11"]')
    );
    await waitFor(() => expect(menu()).toBeNull());
    expect(probe.links).toEqual([
      { url: 'https://example.com/inline', target: '_self' },
      { url: 'https://example.com/overflow', target: '_blank' },
    ]);
    await userEvent.click(overflow());
    await waitFor(() => expect(menu()).not.toBeNull());
    await page.viewport(1360, 900);
    await waitFor(() => expect(isVisible(overflow())).toBe(false));
    await waitFor(() => expect(menu()).toBeNull());
    await waitFor(() => expect(isVisible(inRow('input-action-11'))).toBe(true));
    await userEvent.click(inRow('input-action-fixed'));
    expect(probe.calls).toEqual(['fixed']);
    mount.unmount();
  });

  it(`${host} writable prompt slots keep empty layout, late text, borrowed identity, and reconnect`, async () => {
    const mount = await mountInputHost(host);
    await mount.update({ input: { expanded: true, isDisabled: false } });
    const actionsEnd = () => slotWrapper(mount, 'promptLineActionsEnd');
    const sendStart = () => slotWrapper(mount, 'promptLineSendButtonStart');
    await waitFor(() => expect(actionsEnd()).toHaveAttribute('hidden', ''));
    expect(sendStart()).toHaveAttribute('hidden', '');
    const calls: string[] = [];
    const wrapper = mount.instance.writeableElements.promptLineActionsEnd;
    expect(actionsEnd()).toHaveAttribute('hidden', '');
    wrapper.textContent = 'Late slot text';
    await waitFor(() => expect(actionsEnd()).not.toHaveAttribute('hidden'));
    expect(actionsEnd().getBoundingClientRect().height).toBe(32);
    expect(actionsEnd().parentElement?.localName).toBe(
      'cds-aichat-prompt-line-shell'
    );
    wrapper.textContent = '';
    const borrowed = document.createElement('button');
    borrowed.type = 'button';
    borrowed.dataset.testid = 'borrowed-input-action';
    borrowed.textContent = 'Borrowed action';
    borrowed.addEventListener('click', () => calls.push('borrowed'));
    wrapper.appendChild(borrowed);
    await waitFor(() => expect(isVisible(borrowed)).toBe(true));
    await userEvent.click(borrowed);
    const current = actionsEnd();
    current.parentElement.appendChild(current);
    await waitFor(() => expect(isVisible(actionsEnd())).toBe(true));
    expect(isVisible(borrowed)).toBe(true);
    expect(byTestId('borrowed-input-action', mount.slotHost)).toBe(borrowed);
    await mount.update({ input: { expanded: false, isDisabled: false } });
    await waitFor(() => expect(actionsEnd()).toBeNull());
    expect(borrowed.parentElement).toBe(wrapper);
    await mount.update({ input: { expanded: true, isDisabled: false } });
    await waitFor(() => expect(isVisible(borrowed)).toBe(true));
    await userEvent.click(borrowed);
    expect(calls).toEqual(['borrowed', 'borrowed']);
    wrapper.replaceChildren();
    await waitFor(() => expect(actionsEnd()).toHaveAttribute('hidden', ''));
    mount.instance.writeableElements.promptLineSendButtonStart.appendChild(
      document.createTextNode('Send slot text')
    );
    await waitFor(() => expect(sendStart()).not.toHaveAttribute('hidden'));
    expect(sendStart().getBoundingClientRect().height).toBe(32);
    mount.instance.writeableElements.promptLineSendButtonStart.replaceChildren();
    await waitFor(() => expect(sendStart()).toHaveAttribute('hidden', ''));
    mount.unmount();
  });

  it(`${host} late host-rendered prompt slots retain their consumer nodes on unrelated config`, async () => {
    const mount = await mountInputHost(host);
    await mount.update({ input: { expanded: true, isDisabled: false } });
    const actionsEnd = () => slotWrapper(mount, 'promptLineActionsEnd');
    await waitFor(() => expect(actionsEnd()).toHaveAttribute('hidden', ''));
    const consumer = () => {
      const buttons = mount.slotHost.querySelectorAll<HTMLButtonElement>(
        '[slot="promptLineActionsEnd"] button.slot-example'
      );
      return buttons[buttons.length - 1];
    };
    let wrapper: HTMLElement | undefined;
    if (host === 'web-component') {
      // The host supplies its own light-DOM node for this public slot.
      wrapper = document.createElement('div');
      wrapper.slot = 'promptLineActionsEnd';
      const content = document.createElement('test-prompt-slot-example');
      content.setAttribute('value', 'First value');
      wrapper.appendChild(content);
      mount.slotHost.appendChild(wrapper);
    } else {
      await mount.update({
        renderWriteableElements: {
          promptLineActionsEnd: <SlotExample value="First value" />,
        },
      });
    }
    await waitFor(() => expect(isVisible(consumer())).toBe(true));
    expect(actionsEnd()).not.toHaveAttribute('hidden');
    const original = consumer();
    await mount.update({ header: { title: 'Unrelated slot update' } });
    if (wrapper) {
      wrapper.firstElementChild.setAttribute('value', 'Second value');
    }
    await waitFor(() =>
      expect(byTestId('header_title', mount.root)?.textContent?.trim()).toBe(
        'Unrelated slot update'
      )
    );
    expect(isVisible(consumer())).toBe(true);
    expect(consumer()).toBe(original);
    expect(actionsEnd().getBoundingClientRect().height).toBe(32);
    act(() => consumer().focus());
    expect(deepActiveElement()).toBe(original);
    if (wrapper) {
      wrapper.remove();
    } else {
      await mount.update({ renderWriteableElements: {} });
    }
    await waitFor(() => expect(actionsEnd()).toHaveAttribute('hidden', ''));
    mount.unmount();
  });
});

/** A React host's late content for one writable slot. */
function SlotExample({ value }: { value: string }) {
  return (
    <button type="button" className="slot-example">
      {value}
    </button>
  );
}

/** A host custom element that keeps its button across attribute changes. */
class PromptSlotExample extends HTMLElement {
  static observedAttributes = ['value'];
  private button?: HTMLButtonElement;
  connectedCallback() {
    if (!this.button) {
      this.button = document.createElement('button');
      this.button.type = 'button';
      this.button.className = 'slot-example';
      this.appendChild(this.button);
    }
    this.render();
  }
  attributeChangedCallback() {
    this.render();
  }
  private render() {
    if (this.button) {
      this.button.textContent = this.getAttribute('value');
    }
  }
}
customElements.define('test-prompt-slot-example', PromptSlotExample);
