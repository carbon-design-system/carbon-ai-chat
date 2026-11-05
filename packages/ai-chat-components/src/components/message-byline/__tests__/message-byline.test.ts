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
import '../../message-item-shell/index.js';
import type CDSAIChatMessageByline from '../src/message-byline.js';

const blockClass = `${prefix}-message-byline`;

describe(blockClass, () => {
  describe('label and timestamp', () => {
    it('renders the label and timestamp', async () => {
      const el = await fixture<CDSAIChatMessageByline>(html`
        <cds-aichat-message-byline label="Assistant" timestamp="10:42 AM">
        </cds-aichat-message-byline>
      `);
      const root = el.shadowRoot!;
      expect(root.querySelector(`.${blockClass}__label`)!.textContent).to.equal(
        'Assistant'
      );
      expect(
        root.querySelector(`.${blockClass}__timestamp`)!.textContent
      ).to.equal('10:42 AM');
    });

    it('omits the timestamp element when there is no timestamp', async () => {
      const el = await fixture<CDSAIChatMessageByline>(
        html`<cds-aichat-message-byline
          label="You"></cds-aichat-message-byline>`
      );
      expect(el.shadowRoot!.querySelector(`.${blockClass}__timestamp`)).to.not
        .exist;
    });

    it('exposes the label in exactly one node', async () => {
      const el = await fixture<CDSAIChatMessageByline>(html`
        <cds-aichat-message-byline label="Assistant" timestamp="10:42 AM">
          <img slot="avatar" alt="" src="data:," />
        </cds-aichat-message-byline>
      `);
      const nodesWithLabel = Array.from(
        el.shadowRoot!.querySelectorAll('*')
      ).filter((node) => node.textContent?.includes('Assistant'));
      // Only the label span holds the text. No aria-label repeats it.
      expect(nodesWithLabel.map((node) => node.className)).to.deep.equal([
        `${blockClass}__label`,
      ]);
      expect(el.shadowRoot!.querySelector('[aria-label]')).to.not.exist;
      expect(el.hasAttribute('aria-label')).to.be.false;
    });
  });

  describe('avatar slot', () => {
    it('renders no avatar wrapper and no has-avatar attribute when empty', async () => {
      const el = await fixture<CDSAIChatMessageByline>(
        html`<cds-aichat-message-byline
          label="You"></cds-aichat-message-byline>`
      );
      await el.updateComplete;
      expect(el.shadowRoot!.querySelector(`.${blockClass}__avatar`)).to.not
        .exist;
      expect(el.hasAttribute('has-avatar')).to.be.false;
    });

    it('sets has-avatar when an avatar is slotted', async () => {
      const el = await fixture<CDSAIChatMessageByline>(html`
        <cds-aichat-message-byline label="Assistant">
          <span slot="avatar" id="avatar"></span>
        </cds-aichat-message-byline>
      `);
      await el.updateComplete;
      expect(el.hasAttribute('has-avatar')).to.be.true;
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>(
        'slot[name="avatar"]'
      )!;
      expect(slot.assignedElements()[0].id).to.equal('avatar');
    });

    it('clears has-avatar when the avatar is removed', async () => {
      const el = await fixture<CDSAIChatMessageByline>(html`
        <cds-aichat-message-byline label="Assistant">
          <span slot="avatar" id="avatar"></span>
        </cds-aichat-message-byline>
      `);
      await el.updateComplete;
      el.querySelector('#avatar')!.remove();
      // slotchange fires asynchronously.
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(el.hasAttribute('has-avatar')).to.be.false;
    });
  });

  describe('reasoning slot', () => {
    it('hides the reasoning wrapper when the slot is empty', async () => {
      const el = await fixture<CDSAIChatMessageByline>(
        html`<cds-aichat-message-byline label="Assistant">
        </cds-aichat-message-byline>`
      );
      await el.updateComplete;
      const wrapper = el.shadowRoot!.querySelector<HTMLElement>(
        `.${blockClass}__reasoning`
      )!;
      expect(wrapper.hidden).to.be.true;
    });

    it('shows slotted reasoning controls after the label', async () => {
      const el = await fixture<CDSAIChatMessageByline>(html`
        <cds-aichat-message-byline label="Assistant">
          <button slot="reasoning" id="toggle">Show reasoning</button>
        </cds-aichat-message-byline>
      `);
      await el.updateComplete;
      const wrapper = el.shadowRoot!.querySelector<HTMLElement>(
        `.${blockClass}__reasoning`
      )!;
      expect(wrapper.hidden).to.be.false;
      const label = el.shadowRoot!.querySelector(`.${blockClass}__label`)!;
      expect(
        label.compareDocumentPosition(wrapper) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).to.be.greaterThan(0);
    });

    it('renders reasoning controls above the message content', async () => {
      const row = await fixture<HTMLElement>(html`
        <cds-aichat-message-item-shell row-type="response">
          <cds-aichat-message-byline slot="byline" label="Assistant">
            <button slot="reasoning" id="toggle">Show reasoning</button>
          </cds-aichat-message-byline>
          <div id="content">Content</div>
        </cds-aichat-message-item-shell>
      `);
      const toggle = row.querySelector('#toggle')!.getBoundingClientRect();
      const content = row.querySelector('#content')!.getBoundingClientRect();
      expect(toggle.height).to.be.greaterThan(0);
      expect(toggle.bottom).to.be.at.most(content.top);
    });
  });
});
