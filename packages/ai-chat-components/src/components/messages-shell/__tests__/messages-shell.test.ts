/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { fixture, html, expect, oneEvent } from '@open-wc/testing';
import { sendKeys } from '@web/test-runner-commands';
import prefix from '../../../globals/settings.js';
import '../index.js';
import type CDSAIChatMessagesShell from '../src/messages-shell.js';

const blockClass = `${prefix}-messages-shell`;
const scrollerSelector = `.${blockClass}__scroller`;
const handleSelector = `.${blockClass}__scroll-handle`;
const scrollEvent = `${blockClass}-scroll`;

/** Renders an empty shell and returns its shadow root. */
async function renderShell() {
  const el = await fixture<CDSAIChatMessagesShell>(
    html`<cds-aichat-messages-shell></cds-aichat-messages-shell>`
  );
  return el.shadowRoot!;
}

/** Renders a shell with both handles and returns the shell. */
function renderShellWithHandles() {
  return fixture<CDSAIChatMessagesShell>(html`
    <cds-aichat-messages-shell
      top-handle-label="Top"
      bottom-handle-label="Bottom">
    </cds-aichat-messages-shell>
  `);
}

/**
 * Renders a shell in a 200px-tall box so its content can overflow.
 * Pass the row height to control whether the content scrolls.
 */
async function renderInBox(rowHeight: number, extraContent = html``) {
  const box = await fixture<HTMLElement>(html`
    <div style="block-size:200px;inline-size:200px">
      <cds-aichat-messages-shell>
        <div style="block-size:${rowHeight}px"></div>
        ${extraContent}
      </cds-aichat-messages-shell>
    </div>
  `);
  const shell = box.querySelector<CDSAIChatMessagesShell>(
    'cds-aichat-messages-shell'
  )!;
  const scroller =
    shell.shadowRoot!.querySelector<HTMLElement>(scrollerSelector)!;
  return { shell, scroller };
}

/** Returns the position of each shadow-root child, to compare their order. */
function indexOfChildren(root: ShadowRoot) {
  const children = Array.from(root.children);
  const slotIndex = (name: string) =>
    children.findIndex(
      (child) => child.tagName === 'SLOT' && child.getAttribute('name') === name
    );
  return {
    children,
    notifications: slotIndex('notifications'),
    error: slotIndex('error'),
    scroller: children.findIndex((child) =>
      child.classList.contains(`${blockClass}__scroller`)
    ),
  };
}

describe(blockClass, () => {
  describe('layout', () => {
    it('renders all named slots in shadow DOM', async () => {
      const root = await renderShell();
      expect(root.querySelector('slot[name="notifications"]')).to.exist;
      expect(root.querySelector('slot:not([name])')).to.exist;
      expect(root.querySelector('slot[name="processing"]')).to.exist;
      expect(root.querySelector('slot[name="scroll-down"]')).to.exist;
      expect(root.querySelector('slot[name="error"]')).to.exist;
    });

    it('notifications slot is above the scroller', async () => {
      const order = indexOfChildren(await renderShell());
      expect(order.notifications).to.be.lessThan(order.scroller);
    });

    it('error slot is below the scroller', async () => {
      const order = indexOfChildren(await renderShell());
      expect(order.error).to.be.greaterThan(order.scroller);
    });

    it('default, processing, spacer, and scroll-down are inside the scroller', async () => {
      const root = await renderShell();
      const scroller = root.querySelector(scrollerSelector)!;
      expect(scroller.querySelector('slot:not([name])')).to.exist;
      expect(scroller.querySelector('slot[name="processing"]')).to.exist;
      expect(scroller.querySelector(`.${blockClass}__spacer`)).to.exist;
      expect(scroller.querySelector('slot[name="scroll-down"]')).to.exist;
    });

    it('keeps the processing slot height when its content is hidden', async () => {
      const el = await fixture(html`
        <cds-aichat-messages-shell>
          <div slot="processing" style="visibility:hidden">Typing</div>
        </cds-aichat-messages-shell>
      `);
      const slot = el.shadowRoot!.querySelector<HTMLElement>(
        'slot[name="processing"]'
      )!;
      expect(slot.getBoundingClientRect().height).to.be.greaterThan(0);
    });

    it('keeps the scroll-down slot inside the scroller while it scrolls', async () => {
      const { shell, scroller } = await renderInBox(
        600,
        html`<div slot="scroll-down" style="block-size:20px">Down</div>`
      );
      const control = shell.querySelector<HTMLElement>('[slot="scroll-down"]')!;

      // Scroll part of the way down. A sticky control stays in view, and a
      // control that is not sticky would move 150px up and out of view.
      scroller.scrollTop = 150;

      const scrollerRect = scroller.getBoundingClientRect();
      const controlRect = control.getBoundingClientRect();
      expect(controlRect.bottom).to.be.at.most(scrollerRect.bottom);
      expect(controlRect.top).to.be.at.least(scrollerRect.top);
    });
  });

  describe('scroll handles', () => {
    it('renders handles with the supplied labels', async () => {
      const el = await renderShellWithHandles();
      const handles = el.shadowRoot!.querySelectorAll(handleSelector);
      expect(handles.length).to.equal(2);
      expect(handles[0].getAttribute('aria-label')).to.equal('Top');
      expect(handles[1].getAttribute('aria-label')).to.equal('Bottom');
    });

    it('renders no handles when labels are empty', async () => {
      const root = await renderShell();
      expect(root.querySelectorAll(handleSelector).length).to.equal(0);
    });

    it('puts the top handle before the scroller and the bottom handle after it', async () => {
      const el = await renderShellWithHandles();
      const { children, scroller } = indexOfChildren(el.shadowRoot!);
      const [top, bottom] = el.shadowRoot!.querySelectorAll(handleSelector);
      expect(children.indexOf(top)).to.be.lessThan(scroller);
      expect(children.indexOf(bottom)).to.be.greaterThan(scroller);
    });

    it('puts the focus ring on the scroller while a handle has focus', async () => {
      const el = await renderShellWithHandles();
      const scroller = el.shadowRoot!.querySelector(scrollerSelector)!;
      const handle =
        el.shadowRoot!.querySelector<HTMLButtonElement>(handleSelector)!;
      const ringClass = `${blockClass}__scroller--handle-focused`;

      handle.focus();
      expect(scroller.classList.contains(ringClass)).to.be.true;

      handle.blur();
      expect(scroller.classList.contains(ringClass)).to.be.false;
    });

    for (const [index, position] of ['top', 'bottom'].entries()) {
      it(`keeps the full ${position} handle label visible when focused`, async () => {
        const label =
          'Chat history begin. Select this button to focus the first message then use the arrow keys to move between messages. Press escape to exit the message list. Press the keyboard shortcut to toggle between the message list and the input field.';
        const box = await fixture<HTMLElement>(html`
          <div style="block-size:400px;inline-size:600px">
            <cds-aichat-messages-shell
              .topHandleLabel=${label}
              .bottomHandleLabel=${label}>
              <div slot="notifications" style="block-size:56px">Notice</div>
              <div style="block-size:600px">Messages</div>
              <div slot="error" style="block-size:56px">Error</div>
            </cds-aichat-messages-shell>
          </div>
        `);
        const shell = box.querySelector<CDSAIChatMessagesShell>(
          'cds-aichat-messages-shell'
        )!;
        const handle =
          shell.shadowRoot!.querySelectorAll<HTMLButtonElement>(handleSelector)[
            index
          ];

        await sendKeys({ press: 'Tab' });
        handle.focus();

        expect(handle.matches(':focus-visible')).to.be.true;
        expect(handle.clientHeight).to.be.at.least(handle.scrollHeight);
      });
    }

    it('blurs a handle when Escape is pressed', async () => {
      const el = await renderShellWithHandles();
      const handle =
        el.shadowRoot!.querySelector<HTMLButtonElement>(handleSelector)!;
      handle.focus();
      expect(el.shadowRoot!.activeElement).to.equal(handle);

      handle.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
          cancelable: true,
        })
      );
      expect(el.shadowRoot!.activeElement).to.equal(null);
    });
  });

  describe('scroll event', () => {
    it('reports scroll position, geometry, and scrollability', async () => {
      const { shell, scroller } = await renderInBox(600);

      const eventPromise = oneEvent(shell, scrollEvent);
      scroller.scrollTop = 50;
      const { detail } = await eventPromise;

      expect(detail.scrollTop).to.equal(50);
      expect(detail.scrollHeight).to.equal(scroller.scrollHeight);
      expect(detail.clientHeight).to.equal(scroller.clientHeight);
      expect(detail.isScrollable).to.be.true;
      expect(detail.isAtBottom).to.be.false;
    });

    it('reports isAtBottom when the scroller is at the bottom', async () => {
      const { shell, scroller } = await renderInBox(600);

      const eventPromise = oneEvent(shell, scrollEvent);
      scroller.scrollTop = scroller.scrollHeight - scroller.clientHeight;
      const { detail } = await eventPromise;

      expect(detail.isScrollable).to.be.true;
      expect(detail.isAtBottom).to.be.true;
    });

    it('reports isScrollable as false when the content fits', async () => {
      const { shell, scroller } = await renderInBox(20);

      // Nothing can scroll, so send the event by hand.
      const eventPromise = oneEvent(shell, scrollEvent);
      scroller.dispatchEvent(new Event('scroll'));
      const { detail } = await eventPromise;

      expect(detail.isScrollable).to.be.false;
      expect(detail.isAtBottom).to.be.true;
    });

    it('keeps reporting scroll after the element is moved in the DOM', async () => {
      const { shell, scroller } = await renderInBox(600);
      const parent = shell.parentElement!;
      parent.removeChild(shell);
      parent.appendChild(shell);

      const eventPromise = oneEvent(shell, scrollEvent);
      scroller.scrollTop = 50;
      const { detail } = await eventPromise;

      expect(detail.scrollTop).to.equal(50);
    });
  });
});
