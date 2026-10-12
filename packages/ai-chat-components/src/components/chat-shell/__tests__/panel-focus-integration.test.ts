/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect, fixture, html } from '@open-wc/testing';
import CDSAIChatPanel from '../src/panel.js';
import '../src/panel.js';
import { PanelManager } from '../src/panel-manager.js';
import { getDeepActiveElement } from '../../../globals/utils/focus-utils.js';

const settle = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );

describe('Panel focus with Lit lifecycle events', () => {
  let manager: PanelManager;
  let trigger: HTMLButtonElement;
  let outside: HTMLButtonElement;
  let lower: CDSAIChatPanel;
  let higher: CDSAIChatPanel;
  let lowerAction: HTMLButtonElement;
  let higherAction: HTMLButtonElement;
  let reactivations: boolean[];

  beforeEach(async () => {
    const host = await fixture<HTMLDivElement>(html`
      <div>
        <button slot="messages">Open panel</button>
        <button slot="outside">Outside</button>
        <div slot="panels">
          <cds-aichat-panel
            ><button slot="body">Lower action</button></cds-aichat-panel
          >
          <cds-aichat-panel priority="10"
            ><button slot="body">Higher action</button></cds-aichat-panel
          >
        </div>
      </div>
    `);
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML =
      '<div style="position: relative; width: 400px; height: 400px"><div data-panel-slot="messages"><slot name="messages"></slot></div><slot name="panels"></slot></div><slot name="outside"></slot>';
    trigger = host.querySelector('[slot="messages"]')!;
    outside = host.querySelector('[slot="outside"]')!;
    [lower, higher] = Array.from(
      host.querySelectorAll<CDSAIChatPanel>('cds-aichat-panel')
    );
    lowerAction = lower.querySelector('button')!;
    higherAction = higher.querySelector('button')!;
    reactivations = [];
    lower.addEventListener(
      'openend',
      (event: CustomEvent<{ isReactivation: boolean }>) => {
        reactivations.push(event.detail.isReactivation);
        if (!event.detail.isReactivation) {
          lowerAction.focus();
        }
      }
    );
    higher.addEventListener(
      'openend',
      (event: CustomEvent<{ isReactivation: boolean }>) => {
        if (!event.detail.isReactivation) {
          higherAction.focus();
        }
      }
    );
    manager = new PanelManager(
      root.querySelector('slot[name="panels"]')!,
      root.querySelector('div')!
    );
    manager.connect();
    trigger.focus();
    lower.open = true;
    await lower.updateComplete;
    await settle();
    expect(getDeepActiveElement()).to.equal(lowerAction);
    higher.open = true;
    await higher.updateComplete;
    await settle();
    expect(getDeepActiveElement()).to.equal(higherAction);
  });

  afterEach(() => manager.disconnect());

  it('keeps outside focus when an asynchronous close reveals the lower panel', async () => {
    outside.focus();
    await new Promise<void>((resolve) =>
      setTimeout(() => {
        higher.open = false;
        resolve();
      })
    );
    await higher.updateComplete;
    await settle();
    expect(reactivations).to.deep.equal([false, true]);
    expect(getDeepActiveElement()).to.equal(outside);
  });

  it('restores each trigger as the focused panels close', async () => {
    higher.open = false;
    await higher.updateComplete;
    await settle();
    expect(getDeepActiveElement()).to.equal(lowerAction);
    lower.open = false;
    await lower.updateComplete;
    await settle();
    expect(getDeepActiveElement()).to.equal(trigger);
  });

  it('focuses a remaining action when the lower panel trigger becomes disabled', async () => {
    lowerAction.disabled = true;
    const fallback = document.createElement('button');
    fallback.slot = 'body';
    fallback.textContent = 'Remaining action';
    lower.append(fallback);
    higher.open = false;
    await higher.updateComplete;
    await settle();
    expect(getDeepActiveElement()).to.equal(fallback);
  });

  it('focuses the remaining dialog when its trigger was its only control', async () => {
    lowerAction.remove();
    higher.open = false;
    await higher.updateComplete;
    await settle();
    const dialog =
      lower.shadowRoot!.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(getDeepActiveElement()).to.equal(dialog);
    expect(dialog.tabIndex).to.equal(-1);
  });
});
