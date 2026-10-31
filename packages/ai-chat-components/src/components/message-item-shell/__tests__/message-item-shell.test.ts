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
    });
  });

  it('reflects row-type', async () => {
    const el = await renderShell('response');
    expect(el.getAttribute('row-type')).to.equal('response');

    el.rowType = 'request';
    await el.updateComplete;
    expect(el.getAttribute('row-type')).to.equal('request');
  });

  (
    [
      ['fullWidth', 'full-width'],
      ['firstItem', 'first-item'],
      ['lastItem', 'last-item'],
      ['history', 'history'],
      ['hideAvatar', 'hide-avatar'],
      ['streaming', 'streaming'],
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

  it('exposes row-id and group-id as properties', async () => {
    const el = await renderShell('response');
    expect(el.rowId).to.equal('');
    expect(el.groupId).to.equal('');

    el.rowId = 'row-1';
    el.groupId = 'group-1';
    await el.updateComplete;

    expect(el.rowId).to.equal('row-1');
    expect(el.groupId).to.equal('group-1');
  });

  it('reads attributes into row-id and group-id', async () => {
    const el = await fixture<CDSAIChatMessageItemShell>(html`
      <cds-aichat-message-item-shell
        row-type="response"
        row-id="row-2"
        group-id="group-2">
      </cds-aichat-message-item-shell>
    `);

    expect(el.rowId).to.equal('row-2');
    expect(el.groupId).to.equal('group-2');
  });

  it('exposes streaming as a readable property', async () => {
    const el = await renderShell('response');
    el.streaming = true;
    await el.updateComplete;

    expect(el.streaming).to.be.true;
  });
});
