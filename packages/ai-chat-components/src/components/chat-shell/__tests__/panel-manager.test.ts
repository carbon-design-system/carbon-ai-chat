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
import { getDeepActiveElement } from '../../../globals/utils/focus-utils.js';

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
