/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { fixture, html, expect, oneEvent } from '@open-wc/testing';
import '../index.js';

describe('cds-aichat-messages-shell', () => {
  // --------------------------------------------------------------------------
  // Rendering
  // --------------------------------------------------------------------------

  it('renders without error', async () => {
    const el = await fixture(
      html`<cds-aichat-messages-shell></cds-aichat-messages-shell>`
    );
    expect(el).to.exist;
  });

  it('renders all named slots in shadow DOM', async () => {
    const el = await fixture(
      html`<cds-aichat-messages-shell></cds-aichat-messages-shell>`
    );
    const root = el.shadowRoot!;
    expect(root.querySelector('slot[name="notifications"]')).to.exist;
    expect(root.querySelector('slot:not([name])')).to.exist;
    expect(root.querySelector('slot[name="processing"]')).to.exist;
    expect(root.querySelector('slot[name="scroll-down"]')).to.exist;
    expect(root.querySelector('slot[name="error"]')).to.exist;
  });

  it('renders the spacer element inside the scroller', async () => {
    const el = await fixture(
      html`<cds-aichat-messages-shell></cds-aichat-messages-shell>`
    );
    const spacer = el.shadowRoot!.querySelector(
      '.cds-aichat-messages-shell__spacer'
    );
    expect(spacer).to.exist;
    const scroller = el.shadowRoot!.querySelector(
      '.cds-aichat-messages-shell__scroller'
    );
    expect(scroller!.contains(spacer)).to.be.true;
  });

  // --------------------------------------------------------------------------
  // Slot order — issue requirement: persistent notices above the scroller,
  // footer errors below the scroller, rows/processing/spacer/scroll-down inside
  // --------------------------------------------------------------------------

  it('notifications slot is above the scroller', async () => {
    const el = await fixture(
      html`<cds-aichat-messages-shell></cds-aichat-messages-shell>`
    );
    const root = el.shadowRoot!;
    const children = Array.from(root.children);
    const notificationsIdx = children.findIndex(
      (c) => c.tagName === 'SLOT' && c.getAttribute('name') === 'notifications'
    );
    const scrollerIdx = children.findIndex((c) =>
      c.classList.contains('cds-aichat-messages-shell__scroller')
    );
    expect(notificationsIdx).to.be.lessThan(scrollerIdx);
  });

  it('error slot is below the scroller', async () => {
    const el = await fixture(
      html`<cds-aichat-messages-shell></cds-aichat-messages-shell>`
    );
    const root = el.shadowRoot!;
    const children = Array.from(root.children);
    const errorIdx = children.findIndex(
      (c) => c.tagName === 'SLOT' && c.getAttribute('name') === 'error'
    );
    const scrollerIdx = children.findIndex((c) =>
      c.classList.contains('cds-aichat-messages-shell__scroller')
    );
    expect(errorIdx).to.be.greaterThan(scrollerIdx);
  });

  it('default, processing, spacer, and scroll-down are inside the scroller', async () => {
    const el = await fixture(
      html`<cds-aichat-messages-shell></cds-aichat-messages-shell>`
    );
    const scroller = el.shadowRoot!.querySelector(
      '.cds-aichat-messages-shell__scroller'
    )!;
    expect(scroller.querySelector('slot:not([name])')).to.exist;
    expect(scroller.querySelector('slot[name="processing"]')).to.exist;
    expect(scroller.querySelector('.cds-aichat-messages-shell__spacer')).to
      .exist;
    expect(scroller.querySelector('slot[name="scroll-down"]')).to.exist;
  });

  // --------------------------------------------------------------------------
  // Scroll handles
  // --------------------------------------------------------------------------

  it('renders scroll handles when labels are provided', async () => {
    const el = await fixture(html`
      <cds-aichat-messages-shell
        top-handle-label="Start of messages"
        bottom-handle-label="End of messages">
      </cds-aichat-messages-shell>
    `);
    const handles = el.shadowRoot!.querySelectorAll(
      '.cds-aichat-messages-shell__scroll-handle'
    );
    expect(handles.length).to.equal(2);
    expect(handles[0].getAttribute('aria-label')).to.equal('Start of messages');
    expect(handles[1].getAttribute('aria-label')).to.equal('End of messages');
  });

  it('renders no scroll handles when labels are empty', async () => {
    const el = await fixture(
      html`<cds-aichat-messages-shell></cds-aichat-messages-shell>`
    );
    const handles = el.shadowRoot!.querySelectorAll(
      '.cds-aichat-messages-shell__scroll-handle'
    );
    expect(handles.length).to.equal(0);
  });

  it('top handle is before the scroller, bottom handle is after the scroller', async () => {
    const el = await fixture(html`
      <cds-aichat-messages-shell
        top-handle-label="Top"
        bottom-handle-label="Bottom">
      </cds-aichat-messages-shell>
    `);
    const root = el.shadowRoot!;
    const children = Array.from(root.children);
    const handles = root.querySelectorAll(
      '.cds-aichat-messages-shell__scroll-handle'
    );
    const scrollerIdx = children.findIndex((c) =>
      c.classList.contains('cds-aichat-messages-shell__scroller')
    );
    const topIdx = children.indexOf(handles[0] as HTMLElement);
    const bottomIdx = children.indexOf(handles[1] as HTMLElement);
    expect(topIdx).to.be.lessThan(scrollerIdx);
    expect(bottomIdx).to.be.greaterThan(scrollerIdx);
  });

  it('Escape on a scroll handle blurs it', async () => {
    const el = await fixture(html`
      <cds-aichat-messages-shell
        top-handle-label="Top"
        bottom-handle-label="Bottom">
      </cds-aichat-messages-shell>
    `);
    const handle = el.shadowRoot!.querySelector<HTMLButtonElement>(
      '.cds-aichat-messages-shell__scroll-handle'
    )!;
    handle.focus();
    handle.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      })
    );
    expect(document.activeElement).to.not.equal(handle);
  });

  // --------------------------------------------------------------------------
  // Scroll event
  // --------------------------------------------------------------------------

  it('fires cds-aichat-messages-shell-scroll with correct detail shape', async () => {
    const el = await fixture<HTMLElement>(html`
      <div style="block-size:200px;inline-size:200px">
        <cds-aichat-messages-shell>
          <div style="block-size:600px"></div>
        </cds-aichat-messages-shell>
      </div>
    `);
    const shell = el.querySelector('cds-aichat-messages-shell')!;
    const scroller = shell.shadowRoot!.querySelector<HTMLElement>(
      '.cds-aichat-messages-shell__scroller'
    )!;

    const eventPromise = oneEvent(shell, 'cds-aichat-messages-shell-scroll');
    scroller.dispatchEvent(new Event('scroll'));
    const { detail } = await eventPromise;

    expect(detail).to.have.property('scrollTop');
    expect(detail).to.have.property('scrollHeight');
    expect(detail).to.have.property('clientHeight');
    expect(detail).to.have.property('isScrollable');
    expect(detail).to.have.property('isAtBottom');
  });

  it('isAtBottom is true when scroller is at the bottom', async () => {
    const el = await fixture<HTMLElement>(html`
      <div style="block-size:200px;inline-size:200px">
        <cds-aichat-messages-shell>
          <div style="block-size:600px"></div>
        </cds-aichat-messages-shell>
      </div>
    `);
    const shell = el.querySelector('cds-aichat-messages-shell')!;
    const scroller = shell.shadowRoot!.querySelector<HTMLElement>(
      '.cds-aichat-messages-shell__scroller'
    )!;

    // Scroll to the bottom
    scroller.scrollTop = scroller.scrollHeight - scroller.clientHeight;

    const eventPromise = oneEvent(shell, 'cds-aichat-messages-shell-scroll');
    scroller.dispatchEvent(new Event('scroll'));
    const { detail } = await eventPromise;

    expect(detail.isAtBottom).to.be.true;
  });
});
