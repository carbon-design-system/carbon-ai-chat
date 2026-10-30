/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { fixture, html, expect, oneEvent } from '@open-wc/testing';
import prefix from '../../../globals/settings.js';
import '../index.js';
import type CDSAIChatUserAvatar from '../src/user-avatar.js';

const blockClass = `${prefix}-user-avatar`;
const imageSelector = `.${blockClass}__image`;
const initialSelector = `.${blockClass}__initial`;
const iconSelector = `.${blockClass}__icon`;
const avatarSelector = `.${blockClass}__avatar`;

// A 1x1 PNG that always decodes.
const VALID_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
// A PNG header with no body, so the browser fires an error event.
const BROKEN_IMAGE = 'data:image/png;base64,AAAA';

/** Waits for the rendered image to fail, then for the element to re-render. */
async function waitForImageError(el: CDSAIChatUserAvatar) {
  const img = el.shadowRoot!.querySelector<HTMLImageElement>(imageSelector)!;
  await oneEvent(img, 'error');
  await el.updateComplete;
}

describe(blockClass, () => {
  describe('fallback chain', () => {
    it('shows the image first', async () => {
      const el = await fixture<CDSAIChatUserAvatar>(html`
        <cds-aichat-user-avatar name="Alice" image=${VALID_IMAGE} label="Alice">
        </cds-aichat-user-avatar>
      `);
      const root = el.shadowRoot!;
      expect(root.querySelector(imageSelector)).to.exist;
      expect(root.querySelector(initialSelector)).to.not.exist;
      expect(root.querySelector(iconSelector)).to.not.exist;
    });

    it('shows the first character when there is no image', async () => {
      const el = await fixture<CDSAIChatUserAvatar>(
        html`<cds-aichat-user-avatar name="Alice"></cds-aichat-user-avatar>`
      );
      const initial = el.shadowRoot!.querySelector(initialSelector)!;
      expect(initial.textContent!.trim()).to.equal('A');
      expect(el.shadowRoot!.querySelector(imageSelector)).to.not.exist;
    });

    it('shows the initial when the image fails to load', async () => {
      const el = await fixture<CDSAIChatUserAvatar>(html`
        <cds-aichat-user-avatar name="Alice" image=${BROKEN_IMAGE}>
        </cds-aichat-user-avatar>
      `);
      await waitForImageError(el);
      expect(el.shadowRoot!.querySelector(imageSelector)).to.not.exist;
      expect(
        el.shadowRoot!.querySelector(initialSelector)!.textContent!.trim()
      ).to.equal('A');
    });

    it('shows the icon when the image fails and the name is not Latin', async () => {
      const el = await fixture<CDSAIChatUserAvatar>(html`
        <cds-aichat-user-avatar name="王小明" image=${BROKEN_IMAGE}>
        </cds-aichat-user-avatar>
      `);
      await waitForImageError(el);
      expect(el.shadowRoot!.querySelector(iconSelector)).to.exist;
      expect(el.shadowRoot!.querySelector(initialSelector)).to.not.exist;
    });

    it('shows the icon for a name outside U+0020–U+00FE', async () => {
      const el = await fixture<CDSAIChatUserAvatar>(
        html`<cds-aichat-user-avatar name="王小明"></cds-aichat-user-avatar>`
      );
      expect(el.shadowRoot!.querySelector(iconSelector)).to.exist;
      expect(el.shadowRoot!.querySelector(initialSelector)).to.not.exist;
    });

    it('shows the icon when a Latin name is mixed with other characters', async () => {
      const el = await fixture<CDSAIChatUserAvatar>(
        html`<cds-aichat-user-avatar name="Al王"></cds-aichat-user-avatar>`
      );
      expect(el.shadowRoot!.querySelector(iconSelector)).to.exist;
    });

    it('shows the icon when there is no name or image', async () => {
      const el = await fixture<CDSAIChatUserAvatar>(
        html`<cds-aichat-user-avatar></cds-aichat-user-avatar>`
      );
      expect(el.shadowRoot!.querySelector(iconSelector)).to.exist;
    });
  });

  describe('image changes', () => {
    it('clears the earlier failure when the image URL changes', async () => {
      const el = await fixture<CDSAIChatUserAvatar>(html`
        <cds-aichat-user-avatar name="Alice" image=${BROKEN_IMAGE}>
        </cds-aichat-user-avatar>
      `);
      await waitForImageError(el);
      expect(el.shadowRoot!.querySelector(imageSelector)).to.not.exist;

      el.image = VALID_IMAGE;
      await el.updateComplete;

      expect(el.shadowRoot!.querySelector(imageSelector)).to.exist;
    });
  });

  describe('accessible label', () => {
    it('uses the label as the image alt text', async () => {
      const el = await fixture<CDSAIChatUserAvatar>(html`
        <cds-aichat-user-avatar image=${VALID_IMAGE} label="Agent photo">
        </cds-aichat-user-avatar>
      `);
      expect(
        el.shadowRoot!.querySelector(imageSelector)!.getAttribute('alt')
      ).to.equal('Agent photo');
    });

    it('labels the initial as an image', async () => {
      const el = await fixture<CDSAIChatUserAvatar>(html`
        <cds-aichat-user-avatar name="Alice" label="Agent avatar">
        </cds-aichat-user-avatar>
      `);
      const initial = el.shadowRoot!.querySelector(initialSelector)!;
      expect(initial.getAttribute('role')).to.equal('img');
      expect(initial.getAttribute('aria-label')).to.equal('Agent avatar');
    });

    it('labels the icon as an image', async () => {
      const el = await fixture<CDSAIChatUserAvatar>(html`
        <cds-aichat-user-avatar label="Agent avatar"> </cds-aichat-user-avatar>
      `);
      const icon = el.shadowRoot!.querySelector(iconSelector)!;
      expect(icon.getAttribute('role')).to.equal('img');
      expect(icon.getAttribute('aria-label')).to.equal('Agent avatar');
    });

    it('omits the role and label when no label is given', async () => {
      const el = await fixture<CDSAIChatUserAvatar>(
        html`<cds-aichat-user-avatar name="Alice"></cds-aichat-user-avatar>`
      );
      const initial = el.shadowRoot!.querySelector(initialSelector)!;
      expect(initial.hasAttribute('role')).to.be.false;
      expect(initial.hasAttribute('aria-label')).to.be.false;
    });
  });

  describe('size', () => {
    it('has a default size', async () => {
      const el = await fixture<CDSAIChatUserAvatar>(
        html`<cds-aichat-user-avatar name="Alice"></cds-aichat-user-avatar>`
      );
      const rect = el
        .shadowRoot!.querySelector(avatarSelector)!
        .getBoundingClientRect();
      expect(rect.width).to.be.greaterThan(0);
      expect(rect.width).to.equal(rect.height);
    });

    it('applies the host width and height', async () => {
      const el = await fixture<CDSAIChatUserAvatar>(html`
        <cds-aichat-user-avatar name="Alice" width="64px" height="48px">
        </cds-aichat-user-avatar>
      `);
      const rect = el
        .shadowRoot!.querySelector(avatarSelector)!
        .getBoundingClientRect();
      expect(rect.width).to.equal(64);
      expect(rect.height).to.equal(48);
    });

    it('updates when width and height change', async () => {
      const el = await fixture<CDSAIChatUserAvatar>(html`
        <cds-aichat-user-avatar name="Alice" width="64px" height="64px">
        </cds-aichat-user-avatar>
      `);
      el.width = '40px';
      el.height = '40px';
      await el.updateComplete;
      const rect = el
        .shadowRoot!.querySelector(avatarSelector)!
        .getBoundingClientRect();
      expect(rect.width).to.equal(40);
      expect(rect.height).to.equal(40);
    });

    it('returns to the default size when width and height are cleared', async () => {
      const el = await fixture<CDSAIChatUserAvatar>(html`
        <cds-aichat-user-avatar name="Alice" width="64px" height="64px">
        </cds-aichat-user-avatar>
      `);
      el.width = '';
      el.height = '';
      await el.updateComplete;
      // The shared sheet rewrites on a microtask.
      await Promise.resolve();
      const rect = el
        .shadowRoot!.querySelector(avatarSelector)!
        .getBoundingClientRect();
      expect(rect.width).to.not.equal(64);
    });

    it('keeps its size after the element moves in the DOM', async () => {
      const box = await fixture<HTMLElement>(html`
        <div>
          <cds-aichat-user-avatar name="Alice" width="64px" height="64px">
          </cds-aichat-user-avatar>
        </div>
      `);
      const el = box.querySelector<CDSAIChatUserAvatar>(
        'cds-aichat-user-avatar'
      )!;
      box.removeChild(el);
      box.appendChild(el);
      await el.updateComplete;
      await Promise.resolve();
      const rect = el
        .shadowRoot!.querySelector(avatarSelector)!
        .getBoundingClientRect();
      expect(rect.width).to.equal(64);
    });
  });
});
