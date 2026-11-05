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
import '../../user-avatar/index.js';
import '../../message-item-shell/index.js';
import type CDSAIChatMessageByline from '../src/message-byline.js';

const blockClass = `${prefix}-message-byline`;

describe(blockClass, () => {
  describe('label and timestamp', () => {
    it('renders the label and timestamp in one element', async () => {
      const el = await fixture<CDSAIChatMessageByline>(html`
        <cds-aichat-message-byline label="Assistant" timestamp="10:42 AM">
        </cds-aichat-message-byline>
      `);
      expect(
        el.shadowRoot!.querySelector(`.${blockClass}__label`)!.textContent
      ).to.equal('Assistant 10:42 AM');
    });

    it('renders only the label when there is no timestamp', async () => {
      const el = await fixture<CDSAIChatMessageByline>(
        html`<cds-aichat-message-byline
          label="You"></cds-aichat-message-byline>`
      );
      expect(
        el.shadowRoot!.querySelector(`.${blockClass}__label`)!.textContent
      ).to.equal('You');
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
    const getAvatarSlot = (el: CDSAIChatMessageByline) =>
      el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="avatar"]')!;

    const getAvatarBox = (el: CDSAIChatMessageByline) =>
      el.shadowRoot!.querySelector<HTMLElement>(`.${blockClass}__avatar`)!;

    /** Waits for the observer callback and the re-render that follows. */
    const settle = async (el: CDSAIChatMessageByline) => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      await el.updateComplete;
    };

    it('does not render the box when the avatar slot is empty', async () => {
      const el = await fixture<CDSAIChatMessageByline>(
        html`<cds-aichat-message-byline
          label="You"></cds-aichat-message-byline>`
      );
      await el.updateComplete;
      expect(getAvatarBox(el)).to.be.null;
      expect(getAvatarSlot(el)).to.be.null;
    });

    it('renders a fixed 32px box around a slotted avatar', async () => {
      const el = await fixture<CDSAIChatMessageByline>(html`
        <cds-aichat-message-byline label="Assistant">
          <span
            slot="avatar"
            id="avatar"
            style="display:block;inline-size:24px;block-size:24px"></span>
        </cds-aichat-message-byline>
      `);
      await el.updateComplete;
      const box = getAvatarBox(el);
      expect(getAvatarSlot(el).assignedElements()[0].id).to.equal('avatar');
      const boxRect = box.getBoundingClientRect();
      expect(boxRect.width).to.equal(32);
      expect(boxRect.height).to.equal(32);
      // The 24px avatar keeps its size and is centered in the box.
      const avatarRect = el.querySelector('#avatar')!.getBoundingClientRect();
      expect(avatarRect.width).to.equal(24);
      expect(avatarRect.left - boxRect.left).to.equal(4);
      expect(avatarRect.top - boxRect.top).to.equal(4);
    });

    it('keeps the box the same size for different avatar sizes', async () => {
      const el = await fixture<CDSAIChatMessageByline>(html`
        <cds-aichat-message-byline label="Assistant">
          <span
            slot="avatar"
            style="display:block;inline-size:16px;block-size:16px"></span>
        </cds-aichat-message-byline>
      `);
      await el.updateComplete;
      expect(getAvatarBox(el).getBoundingClientRect().width).to.equal(32);
    });

    it('removes the box when the avatar is removed', async () => {
      const el = await fixture<CDSAIChatMessageByline>(html`
        <cds-aichat-message-byline label="Assistant">
          <span slot="avatar" id="avatar"></span>
        </cds-aichat-message-byline>
      `);
      await el.updateComplete;
      expect(getAvatarBox(el)).to.exist;

      el.querySelector('#avatar')!.remove();
      await settle(el);

      expect(getAvatarBox(el)).to.be.null;
    });

    it('adds the box when an avatar is slotted later', async () => {
      const el = await fixture<CDSAIChatMessageByline>(
        html`<cds-aichat-message-byline
          label="Assistant"></cds-aichat-message-byline>`
      );
      const avatar = document.createElement('span');
      avatar.slot = 'avatar';
      el.appendChild(avatar);
      await settle(el);

      expect(getAvatarBox(el)).to.exist;
    });

    it('removes the box and the slot while the avatar is hidden', async () => {
      const el = await fixture<CDSAIChatMessageByline>(html`
        <cds-aichat-message-byline label="Assistant">
          <cds-aichat-user-avatar
            slot="avatar"
            id="avatar"
            name="Assistant"></cds-aichat-user-avatar>
        </cds-aichat-message-byline>
      `);
      await el.updateComplete;
      const avatar = el.querySelector<HTMLElement>('#avatar')!;

      avatar.hidden = true;
      await settle(el);
      expect(getAvatarBox(el)).to.be.null;
      expect(getAvatarSlot(el)).to.be.null;
      expect(avatar.assignedSlot).to.be.null;

      avatar.hidden = false;
      await settle(el);
      expect(getAvatarBox(el)).to.exist;
    });

    it('does not render the box for an initially hidden avatar', async () => {
      const el = await fixture<CDSAIChatMessageByline>(html`
        <cds-aichat-message-byline label="Assistant">
          <span slot="avatar" hidden></span>
        </cds-aichat-message-byline>
      `);
      await el.updateComplete;

      expect(getAvatarBox(el)).to.be.null;
    });

    it('gives the avatar the primary text color, not the label color', async () => {
      const el = await fixture<CDSAIChatMessageByline>(html`
        <cds-aichat-message-byline label="Assistant">
          <span slot="avatar" id="avatar"></span>
        </cds-aichat-message-byline>
      `);
      await el.updateComplete;
      const label = el.shadowRoot!.querySelector(`.${blockClass}__label`)!;

      expect(getComputedStyle(el.querySelector('#avatar')!).color).to.not.equal(
        getComputedStyle(label).color
      );
    });
  });

  describe('reasoning slot', () => {
    it('renders a decorative separator before slotted controls', async () => {
      const el = await fixture<CDSAIChatMessageByline>(html`
        <cds-aichat-message-byline label="Assistant">
          <button slot="reasoning">Show reasoning</button>
        </cds-aichat-message-byline>
      `);
      await el.updateComplete;
      const separator = el.shadowRoot!.querySelector(
        `.${blockClass}__reasoning-separator`
      )!;
      expect(separator.getAttribute('aria-hidden')).to.equal('true');
    });

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
