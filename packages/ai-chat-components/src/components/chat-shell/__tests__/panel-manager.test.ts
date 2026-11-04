/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect, fixture, html } from '@open-wc/testing';
import { PanelManager } from '../src/panel-manager.js';
import {
  composedContains,
  getDeepActiveElement,
  tryFocus,
} from '../../../globals/utils/focus-utils.js';

const settle = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );

describe('PanelManager focus restoration', () => {
  let manager: PanelManager;
  let host: HTMLDivElement;
  let trigger: HTMLButtonElement;
  let outside: HTMLButtonElement;
  let panel: HTMLElement;
  let action: HTMLButtonElement;
  let fallbackCount: number;

  beforeEach(async () => {
    host = await fixture<HTMLDivElement>(html`
      <div>
        <button slot="messages">Open panel</button>
        <button slot="outside">Outside</button>
        <div slot="panels">
          <cds-aichat-panel><button>Cancel</button></cds-aichat-panel>
        </div>
      </div>
    `);
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML =
      '<div><div data-panel-slot="messages"><slot name="messages"></slot></div><slot name="panels"></slot><slot name="outside"></slot></div>';
    trigger = host.querySelector('[slot="messages"]')!;
    outside = host.querySelector('[slot="outside"]')!;
    panel = host.querySelector('cds-aichat-panel')!;
    action = panel.querySelector('button')!;
    manager = new PanelManager(
      root.querySelector('slot[name="panels"]')!,
      root.querySelector('div')!
    );
    fallbackCount = 0;
    host.addEventListener(
      'cds-aichat-shell-panel-focus-fallback',
      () => fallbackCount++
    );
    manager.connect();
    trigger.focus();
    panel.setAttribute('open', '');
    await settle();
    action.focus();
  });

  afterEach(() => manager.disconnect());

  it('restores the trigger when the focused panel closes', async () => {
    panel.removeAttribute('open');
    await settle();
    expect(getDeepActiveElement()).to.equal(trigger);
    expect(fallbackCount).to.equal(0);
  });

  it('does not steal focus after the user leaves the panel', async () => {
    outside.focus();
    panel.removeAttribute('open');
    await settle();
    expect(getDeepActiveElement()).to.equal(outside);
    expect(fallbackCount).to.equal(0);
  });

  it('requests fallback when the trigger is disabled', async () => {
    trigger.disabled = true;
    panel.removeAttribute('open');
    await settle();
    expect(fallbackCount).to.equal(1);
  });

  it('requests fallback when the trigger is removed', async () => {
    trigger.remove();
    panel.removeAttribute('open');
    await settle();
    expect(fallbackCount).to.equal(1);
  });

  it('restores focus when a focused panel is removed', async () => {
    panel.remove();
    await settle();
    expect(getDeepActiveElement()).to.equal(trigger);
  });

  it('restores focus when a panel is removed inside an outer shadow root', async () => {
    panel.removeAttribute('open');
    await settle();
    const outer = document.createElement('div');
    host.parentElement!.append(outer);
    outer.attachShadow({ mode: 'open' }).append(host);
    trigger.focus();
    panel.setAttribute('open', '');
    await settle();
    action.focus();
    panel.remove();
    await settle();
    expect(getDeepActiveElement()).to.equal(trigger);
  });

  it('retains the original trigger across a higher-priority panel', async () => {
    const top = document.createElement('cds-aichat-panel');
    top.setAttribute('priority', '10');
    const topAction = document.createElement('button');
    topAction.textContent = 'Decline';
    top.append(topAction);
    panel.parentElement!.append(top);
    top.setAttribute('open', '');
    await settle();
    expect(panel.inert).to.equal(true);
    expect(fallbackCount).to.equal(0);
    topAction.focus();
    top.removeAttribute('open');
    await settle();
    expect(getDeepActiveElement()).to.equal(action);
    panel.removeAttribute('open');
    await settle();
    expect(getDeepActiveElement()).to.equal(trigger);
  });

  /** Moves the shell into a shadow root and slots a new button into `target`. */
  async function slotIntoPanel(target: HTMLElement, label: string) {
    const outer = document.createElement('div');
    host.parentElement!.append(outer);
    outer.attachShadow({ mode: 'open' }).append(host);
    const slot = document.createElement('slot');
    slot.name = 'panel-content';
    target.append(slot);
    const slotted = document.createElement('button');
    slotted.slot = 'panel-content';
    slotted.textContent = label;
    outer.append(slotted);
    return slotted;
  }

  it('restores the trigger when slotted panel content had focus', async () => {
    panel.removeAttribute('open');
    await settle();
    const slotted = await slotIntoPanel(panel, 'Close panel');
    trigger.focus();
    panel.setAttribute('open', '');
    await settle();
    slotted.focus();
    panel.removeAttribute('open');
    await settle();
    expect(getDeepActiveElement()).to.equal(trigger);
    expect(fallbackCount).to.equal(0);
  });

  it('requests fallback when nothing had focus at open', async () => {
    panel.removeAttribute('open');
    await settle();
    trigger.blur();
    expect(document.activeElement).to.equal(document.body);
    panel.setAttribute('open', '');
    await settle();
    action.focus();
    panel.removeAttribute('open');
    // Focus is already on the page body before the restore frame runs.
    action.blur();
    await settle();
    expect(fallbackCount).to.equal(1);
  });

  it('restores slotted content in the lower panel after a higher-priority panel closes', async () => {
    panel.removeAttribute('open');
    await settle();
    const slotted = await slotIntoPanel(panel, 'Counter');
    trigger.focus();
    panel.setAttribute('open', '');
    await settle();
    slotted.focus();
    const top = document.createElement('cds-aichat-panel');
    top.setAttribute('priority', '10');
    const topAction = document.createElement('button');
    topAction.textContent = 'Decline';
    top.append(topAction);
    panel.parentElement!.append(top);
    top.setAttribute('open', '');
    await settle();
    topAction.focus();
    top.removeAttribute('open');
    await settle();
    expect(getDeepActiveElement()).to.equal(slotted);
  });

  it('restores a trigger inside a nested shadow root', async () => {
    panel.removeAttribute('open');
    await settle();
    const buttonHost = document.createElement('div');
    buttonHost.slot = 'messages';
    const shadow = buttonHost.attachShadow({ mode: 'open' });
    const nestedTrigger = document.createElement('button');
    nestedTrigger.textContent = 'Open';
    shadow.append(nestedTrigger);
    host.append(buttonHost);
    nestedTrigger.focus();
    panel.setAttribute('open', '');
    await settle();
    action.focus();
    panel.removeAttribute('open');
    await settle();
    expect(getDeepActiveElement()).to.equal(nestedTrigger);
  });

  it('drops a pending restore when the closed panel opens again first', async () => {
    const other = document.createElement('button');
    other.textContent = 'Other action';
    panel.append(other);
    panel.removeAttribute('open');
    // Let the attribute observer schedule the restore, then reopen the panel
    // and give it new initial focus before the restore frame runs.
    await Promise.resolve();
    await Promise.resolve();
    panel.setAttribute('open', '');
    await Promise.resolve();
    other.focus();
    await settle();
    expect(getDeepActiveElement()).to.equal(other);
    expect(fallbackCount).to.equal(0);
  });

  it('drops a pending restore when another panel opens first', async () => {
    const next = document.createElement('cds-aichat-panel');
    const nextFirst = document.createElement('button');
    nextFirst.textContent = 'Next first';
    const nextAction = document.createElement('button');
    nextAction.textContent = 'Next action';
    next.append(nextFirst, nextAction);
    panel.parentElement!.append(next);
    await Promise.resolve();
    panel.removeAttribute('open');
    await Promise.resolve();
    await Promise.resolve();
    next.setAttribute('open', '');
    await Promise.resolve();
    nextAction.focus();
    await settle();
    expect(getDeepActiveElement()).to.equal(nextAction);
    expect(fallbackCount).to.equal(0);
  });

  it('drops a pending restore when another panel opens in the same batch', async () => {
    const next = document.createElement('cds-aichat-panel');
    const nextFirst = document.createElement('button');
    nextFirst.textContent = 'Next first';
    const nextAction = document.createElement('button');
    nextAction.textContent = 'Next action';
    next.append(nextFirst, nextAction);
    panel.parentElement!.append(next);
    await Promise.resolve();
    // Close one panel and open another in the same task, so one update sees
    // both changes. The new panel then sets its own initial focus.
    panel.removeAttribute('open');
    next.setAttribute('open', '');
    await Promise.resolve();
    await Promise.resolve();
    nextAction.focus();
    await settle();
    expect(getDeepActiveElement()).to.equal(nextAction);
    expect(fallbackCount).to.equal(0);
  });

  it('does not override focus moved outside while restoration is pending', async () => {
    panel.removeAttribute('open');
    panel.dispatchEvent(
      new CustomEvent('closestart', { bubbles: true, composed: true })
    );
    outside.focus();
    await settle();
    expect(getDeepActiveElement()).to.equal(outside);
    expect(fallbackCount).to.equal(0);
  });

  it('restores the lower panel trigger after its opening animation and initial focus', async () => {
    const anotherAction = document.createElement('button');
    anotherAction.textContent = 'Other action';
    panel.append(anotherAction);
    const top = document.createElement('cds-aichat-panel');
    top.setAttribute('priority', '10');
    const topAction = document.createElement('button');
    topAction.textContent = 'Decline';
    top.append(topAction);
    panel.parentElement!.append(top);
    top.setAttribute('open', '');
    await settle();
    topAction.focus();
    top.removeAttribute('open');
    top.dispatchEvent(
      new CustomEvent('closestart', { bubbles: true, composed: true })
    );
    panel.classList.add('panel-container--animating');
    await settle();
    anotherAction.focus();
    panel.classList.remove('panel-container--animating');
    await settle();
    expect(getDeepActiveElement()).to.equal(action);
  });
});

describe('flat-tree focus checks', () => {
  it('counts slotted and nested shadow content as inside a container', async () => {
    const outer = await fixture<HTMLDivElement>(html`
      <div><button id="slotted">Slotted</button></div>
    `);
    const root = outer.attachShadow({ mode: 'open' });
    root.innerHTML =
      '<div id="container"><slot></slot><div id="nested"></div></div><div id="sibling"></div>';
    const container = root.querySelector<HTMLElement>('#container')!;
    const deep = document.createElement('button');
    root.querySelector('#nested')!.attachShadow({ mode: 'open' }).append(deep);

    expect(composedContains(container, outer.querySelector('#slotted'))).to.be
      .true;
    expect(composedContains(container, deep)).to.be.true;
    expect(composedContains(container, container)).to.be.true;
    expect(composedContains(container, root.querySelector('#sibling'))).to.be
      .false;
  });

  it('reports success when a host delegates focus into its shadow root', async () => {
    class DelegatingHost extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({ mode: 'open', delegatesFocus: true }).append(
          document.createElement('input')
        );
      }
    }
    customElements.define('panel-manager-delegating-host', DelegatingHost);
    const delegating = await fixture<DelegatingHost>(
      html`<panel-manager-delegating-host></panel-manager-delegating-host>`
    );

    expect(tryFocus(delegating)).to.be.true;
    expect(getDeepActiveElement()).to.equal(
      delegating.shadowRoot!.querySelector('input')
    );
  });
});
