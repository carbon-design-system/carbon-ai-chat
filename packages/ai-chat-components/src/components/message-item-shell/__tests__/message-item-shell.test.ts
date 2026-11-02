/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { fixture, html, expect } from '@open-wc/testing';
import prefix from '../../../globals/settings.js';
import '../index.js';
import type CDSAIChatMessageItemShell from '../src/message-item-shell.js';

const blockClass = `${prefix}-message-item-shell`;
const rowTypes = ['request', 'response'] as const;

/** Renders a shell of the given row type. */
function renderShell(rowType: (typeof rowTypes)[number]) {
  return fixture<CDSAIChatMessageItemShell>(html`
    <cds-aichat-message-item-shell row-type=${rowType}>
    </cds-aichat-message-item-shell>
  `);
}

describe('cds-aichat-message-item-shell', () => {
  rowTypes.forEach((rowType) => {
    describe(`row-type="${rowType}"`, () => {
      it('renders all four slots', async () => {
        const el = await renderShell(rowType);
        const root = el.shadowRoot!;

        expect(root.querySelector('slot[name="byline"]')).to.exist;
        expect(root.querySelector('slot:not([name])')).to.exist;
        expect(root.querySelector('slot[name="attachment"]')).to.exist;
        expect(root.querySelector('slot[name="footer"]')).to.exist;
      });

      it('wraps each slot in a div instead of using it as a direct child', async () => {
        const el = await renderShell(rowType);

        ['byline', 'content', 'attachment', 'footer'].forEach((name) => {
          const wrapper = el.shadowRoot!.querySelector(
            `.${blockClass}__${name}`
          )!;
          expect(wrapper).to.exist;
          expect(wrapper.tagName).to.equal('DIV');
          expect(wrapper.querySelector('slot')).to.exist;
        });
        expect(
          Array.from(el.shadowRoot!.children).some(
            (child) => child.tagName === 'SLOT'
          )
        ).to.be.false;
      });

      it('assigns slotted children to their slots', async () => {
        const el = await fixture<CDSAIChatMessageItemShell>(html`
          <cds-aichat-message-item-shell row-type=${rowType}>
            <span slot="byline" id="byline"></span>
            <span id="content"></span>
            <span slot="attachment" id="attachment"></span>
            <span slot="footer" id="footer"></span>
          </cds-aichat-message-item-shell>
        `);
        await el.updateComplete;

        const assigned = (selector: string) =>
          el
            .shadowRoot!.querySelector<HTMLSlotElement>(selector)!
            .assignedElements();

        expect(el.querySelector('#byline')).to.not.be.null;
        expect(assigned('slot[name="byline"]')[0].id).to.equal('byline');
        expect(assigned('slot:not([name])')[0].id).to.equal('content');
        expect(assigned('slot[name="attachment"]')[0].id).to.equal(
          'attachment'
        );
        expect(assigned('slot[name="footer"]')[0].id).to.equal('footer');
      });

      it('reflects hide-avatar without hiding the byline wrapper', async () => {
        const el = await renderShell(rowType);
        const wrapper = el.shadowRoot!.querySelector<HTMLElement>(
          `.${blockClass}__byline`
        )!;

        el.hideAvatar = true;
        await el.updateComplete;

        // The byline wrapper stays visible — only the avatar image inside is hidden.
        expect(getComputedStyle(wrapper).display).to.not.equal('none');
        expect(el.hasAttribute('hide-avatar')).to.be.true;
      });

      it('hides and shows a directly slotted avatar', async () => {
        const el = await fixture<CDSAIChatMessageItemShell>(html`
          <cds-aichat-message-item-shell row-type=${rowType}>
            <span
              slot="byline"
              id="avatar"
              class="${blockClass}__byline-avatar"></span>
            <span slot="byline" id="text">Assistant</span>
          </cds-aichat-message-item-shell>
        `);
        const avatar = el.querySelector<HTMLElement>('#avatar')!;
        const text = el.querySelector<HTMLElement>('#text')!;

        el.hideAvatar = true;
        await el.updateComplete;
        expect(getComputedStyle(avatar).display).to.equal('none');
        expect(getComputedStyle(text).display).to.not.equal('none');

        el.hideAvatar = false;
        await el.updateComplete;
        expect(getComputedStyle(avatar).display).to.not.equal('none');
      });

      it('hides an avatar added after the first render', async () => {
        const el = await fixture<CDSAIChatMessageItemShell>(html`
          <cds-aichat-message-item-shell row-type=${rowType} hide-avatar>
          </cds-aichat-message-item-shell>
        `);
        const avatar = document.createElement('span');
        avatar.slot = 'byline';
        avatar.className = `${blockClass}__byline-avatar`;
        el.appendChild(avatar);
        await el.updateComplete;

        expect(getComputedStyle(avatar).display).to.equal('none');
      });

      it('leaves a host-set inline display untouched after un-hiding', async () => {
        const el = await fixture<CDSAIChatMessageItemShell>(html`
          <cds-aichat-message-item-shell row-type=${rowType} hide-avatar>
            <span
              slot="byline"
              id="avatar"
              class="${blockClass}__byline-avatar"
              style="display: inline-flex"></span>
          </cds-aichat-message-item-shell>
        `);
        const avatar = el.querySelector<HTMLElement>('#avatar')!;

        el.hideAvatar = false;
        await el.updateComplete;

        expect(avatar.style.display).to.equal('inline-flex');
      });
    });
  });

  it('reflects row-type', async () => {
    const el = await renderShell('response');
    expect(el.getAttribute('row-type')).to.equal('response');

    el.rowType = 'request';
    await el.updateComplete;
    expect(el.getAttribute('row-type')).to.equal('request');
  });

  describe('layout', () => {
    it('limits the row width unless full-width is set', async () => {
      const el = await renderShell('response');
      expect(getComputedStyle(el).maxInlineSize).to.not.equal('none');

      el.fullWidth = true;
      await el.updateComplete;
      expect(getComputedStyle(el).maxInlineSize).to.equal('none');

      el.fullWidth = false;
      await el.updateComplete;
      expect(getComputedStyle(el).maxInlineSize).to.not.equal('none');
    });

    it('aligns a response to the start and a request to the end', async () => {
      const response = await renderShell('response');
      const request = await renderShell('request');

      expect(getComputedStyle(response).alignItems).to.equal('flex-start');
      expect(getComputedStyle(request).alignItems).to.equal('flex-end');
    });

    it('reduces the response body inset when hide-avatar is set', async () => {
      const el = await renderShell('response');
      const body = el.shadowRoot!.querySelector<HTMLElement>(
        `.${blockClass}__body`
      )!;
      const withAvatar = getComputedStyle(body).paddingInlineStart;

      el.hideAvatar = true;
      await el.updateComplete;

      expect(getComputedStyle(body).paddingInlineStart).to.not.equal(
        withAvatar
      );
    });
  });

  (
    [
      ['fullWidth', 'full-width'],
      ['hideAvatar', 'hide-avatar'],
    ] as const
  ).forEach(([property, attribute]) => {
    it(`reflects ${property} as ${attribute}`, async () => {
      const el = await renderShell('response');
      expect(el.hasAttribute(attribute)).to.be.false;

      el[property] = true;
      await el.updateComplete;
      expect(el.hasAttribute(attribute)).to.be.true;

      el[property] = false;
      await el.updateComplete;
      expect(el.hasAttribute(attribute)).to.be.false;
    });
  });
});
