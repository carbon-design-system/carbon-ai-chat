/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect, fixture, html, oneEvent } from '@open-wc/testing';
import { resetMouse, sendKeys, sendMouse } from '@web/test-runner-commands';

import '../send-control.js';
import '../prompt-line-shell.js';
import type InputSendControlElement from '../send-control.js';

function fireNavigated(target: EventTarget, navigated: boolean): void {
  target.dispatchEvent(
    new CustomEvent('cds-aichat-autocomplete-navigated', {
      detail: { navigated },
      bubbles: true,
      composed: true,
    })
  );
}

describe('<cds-aichat-input-send-control>', () => {
  afterEach(() => resetMouse());

  describe('send blocking during autocomplete navigation', () => {
    it('blocks a real click while navigated and prevents focus loss', async () => {
      const wrapper = await fixture(html`
        <cds-aichat-prompt-line-shell>
          <input slot="editor" aria-label="Editor" />
          <span slot="autocomplete-content"></span>
          <cds-aichat-input-send-control
            slot="send-control"
            has-valid-input></cds-aichat-input-send-control>
        </cds-aichat-prompt-line-shell>
      `);
      const el = wrapper.querySelector('cds-aichat-input-send-control')!;
      const input = wrapper.querySelector('input')!;
      const autocomplete = wrapper.querySelector('span')!;
      let sends = 0;
      let blurred = false;
      el.addEventListener('cds-aichat-input-send', () => sends++);
      input.addEventListener('focusout', () => {
        blurred = true;
      });
      input.focus();
      fireNavigated(autocomplete, true);
      await el.updateComplete;
      const button = el.shadowRoot!.querySelector('cds-button')!;
      await button.updateComplete;
      const { x, y, width, height } = button.getBoundingClientRect();
      const position: [number, number] = [
        Math.round(x + width / 2),
        Math.round(y + height / 2),
      ];
      // First click while navigated — send is blocked, editor stays focused.
      await sendMouse({ type: 'click', position });
      expect(blurred).to.equal(
        false,
        'editor must retain focus while autocomplete is navigated'
      );
      expect(sends).to.equal(0);
      // Dismiss navigation, then the next click should send.
      fireNavigated(autocomplete, false);
      await el.updateComplete;
      await button.updateComplete;
      await sendMouse({ type: 'click', position });
      expect(sends).to.equal(1);
    });

    it('allows keyboard activation after a pointer gesture is abandoned', async () => {
      const wrapper = await fixture<HTMLDivElement>(html`
        <div>
          <cds-aichat-input-send-control
            has-valid-input></cds-aichat-input-send-control>
        </div>
      `);
      const el = wrapper.querySelector('cds-aichat-input-send-control')!;
      const button = el.shadowRoot!.querySelector('cds-button')!;
      let sends = 0;
      el.addEventListener('cds-aichat-input-send', () => sends++);
      fireNavigated(wrapper, true);
      await el.updateComplete;
      button.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, composed: true })
      );
      fireNavigated(wrapper, false);
      button.dispatchEvent(
        new PointerEvent('pointercancel', { bubbles: true, composed: true })
      );
      await el.updateComplete;
      await button.updateComplete;
      button.focus();
      await sendKeys({ press: 'Enter' });
      expect(sends).to.equal(1);
    });

    it('does not fire cds-aichat-input-send when the gesture starts while navigated', async () => {
      const wrapper = await fixture<HTMLDivElement>(html`
        <div>
          <cds-aichat-input-send-control
            has-valid-input></cds-aichat-input-send-control>
        </div>
      `);
      const el = wrapper.querySelector(
        'cds-aichat-input-send-control'
      ) as InputSendControlElement;

      fireNavigated(wrapper, true);
      await el.updateComplete;

      let fired = false;
      el.addEventListener('cds-aichat-input-send', () => {
        fired = true;
      });

      // Simulate the race: pointerdown starts the gesture, then focusout
      // dismisses the list (clearing navigated), then click fires.
      const cdsButton = el.shadowRoot!.querySelector('cds-button')!;
      cdsButton.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, composed: true })
      );
      fireNavigated(wrapper, false);
      await el.updateComplete;
      cdsButton.dispatchEvent(
        new MouseEvent('click', { bubbles: true, composed: true, detail: 1 })
      );
      await el.updateComplete;

      expect(fired).to.equal(false);
    });

    it('fires cds-aichat-input-send after navigation ends cleanly (no pending gesture)', async () => {
      const wrapper = await fixture<HTMLDivElement>(html`
        <div>
          <cds-aichat-input-send-control
            has-valid-input></cds-aichat-input-send-control>
        </div>
      `);
      const el = wrapper.querySelector(
        'cds-aichat-input-send-control'
      ) as InputSendControlElement;

      // Navigate in, then out cleanly — no click gesture started.
      fireNavigated(wrapper, true);
      await el.updateComplete;
      fireNavigated(wrapper, false);
      await el.updateComplete;

      setTimeout(() =>
        el.shadowRoot!.querySelector('cds-button')!.dispatchEvent(
          new MouseEvent('click', {
            bubbles: true,
            composed: true,
            detail: 1,
          })
        )
      );
      const event = await oneEvent(el, 'cds-aichat-input-send');
      expect(event).to.exist;
    });

    it('fires cds-aichat-input-send on a second click after the latch is consumed', async () => {
      const wrapper = await fixture<HTMLDivElement>(html`
        <div>
          <cds-aichat-input-send-control
            has-valid-input></cds-aichat-input-send-control>
        </div>
      `);
      const el = wrapper.querySelector(
        'cds-aichat-input-send-control'
      ) as InputSendControlElement;

      const cdsButton = el.shadowRoot!.querySelector('cds-button')!;

      // First gesture: navigated → blocked.
      fireNavigated(wrapper, true);
      await el.updateComplete;
      cdsButton.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, composed: true })
      );
      fireNavigated(wrapper, false);
      await el.updateComplete;
      cdsButton.dispatchEvent(
        new MouseEvent('click', { bubbles: true, composed: true, detail: 1 })
      );
      await el.updateComplete;

      // Second gesture: no navigation → should send.
      setTimeout(() =>
        cdsButton.dispatchEvent(
          new MouseEvent('click', { bubbles: true, composed: true, detail: 1 })
        )
      );
      const event = await oneEvent(el, 'cds-aichat-input-send');
      expect(event).to.exist;
    });

    it('visually disables cds-button while navigated', async () => {
      const wrapper = await fixture<HTMLDivElement>(html`
        <div>
          <cds-aichat-input-send-control
            has-valid-input></cds-aichat-input-send-control>
        </div>
      `);
      const el = wrapper.querySelector(
        'cds-aichat-input-send-control'
      ) as InputSendControlElement;

      const cdsButton = el.shadowRoot!.querySelector('cds-button')!;
      expect(cdsButton.hasAttribute('disabled')).to.equal(false);

      fireNavigated(wrapper, true);
      await el.updateComplete;
      expect(cdsButton.hasAttribute('disabled')).to.equal(true);

      fireNavigated(wrapper, false);
      await el.updateComplete;
      expect(cdsButton.hasAttribute('disabled')).to.equal(false);
    });
  });
});
