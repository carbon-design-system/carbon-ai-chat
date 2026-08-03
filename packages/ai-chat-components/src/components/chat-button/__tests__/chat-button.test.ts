/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html, fixture, expect } from '@open-wc/testing';
import '@carbon/ai-chat-components/es/components/chat-button/index.js';
import ChatButton from '@carbon/ai-chat-components/es/components/chat-button/src/chat-button.js';

/**
 * This repository uses the @web/test-runner library for testing
 * Documentation on writing tests, plugins, and commands
 * here: https://modern-web.dev/docs/test-runner/overview/
 */

// scope for testing: test only cds-aichat-button specific functionality, no need to test cds-button functionality.
describe('chat-button', function () {
  it('should render with cds-aichat-button minimum attributes', async () => {
    const el = await fixture<ChatButton>(
      html`<cds-aichat-button> button </cds-aichat-button>`
    );

    await expect(el).dom.to.equalSnapshot();
  });

  describe('quick action selected', function () {
    it('should not fire click events when isSelected=true', async () => {
      let clicked = 0;
      const el = await fixture<ChatButton>(
        html`<cds-aichat-button
          is-quick-action
          ?isSelected="${true}"
          @click="${() => clicked++}">
          quick action
        </cds-aichat-button>`
      );

      await el.updateComplete;
      el.click();
      expect(clicked).to.equal(0);
    });

    it('should fire click events when isSelected=false', async () => {
      let clicked = 0;
      const el = await fixture<ChatButton>(
        html`<cds-aichat-button
          is-quick-action
          ?isSelected="${false}"
          @click="${() => clicked++}">
          quick action
        </cds-aichat-button>`
      );

      await el.updateComplete;
      el.click();
      expect(clicked).to.equal(1);
    });

    it('should set inert and data-is-selected when isSelected=true, without touching disabled', async () => {
      const el = await fixture<ChatButton>(
        html`<cds-aichat-button is-quick-action ?isSelected="${true}">
          quick action
        </cds-aichat-button>`
      );

      await el.updateComplete;
      expect(el.inert).to.be.true;
      expect(el.hasAttribute('inert')).to.be.true;
      expect(el.hasAttribute('data-is-selected')).to.be.true;
      expect(el.disabled).to.be.false;
      expect(el.hasAttribute('disabled')).to.be.false;
    });

    it('should have tabIndex=-1 when isSelected=true and restore to 0 when de-selected', async () => {
      const el = await fixture<ChatButton>(
        html`<cds-aichat-button is-quick-action ?isSelected="${true}">
          quick action
        </cds-aichat-button>`
      );

      await el.updateComplete;
      expect(el.tabIndex).to.equal(-1);

      el.isSelected = false;
      await el.updateComplete;
      expect(el.tabIndex).to.equal(0);
    });

    it('should clear inert and data-is-selected when isSelected clears', async () => {
      const el = await fixture<ChatButton>(
        html`<cds-aichat-button is-quick-action ?isSelected="${true}">
          quick action
        </cds-aichat-button>`
      );

      await el.updateComplete;

      el.isSelected = false;
      await el.updateComplete;
      expect(el.inert).to.be.false;
      expect(el.hasAttribute('data-is-selected')).to.be.false;
    });

    it('should preserve consumer disabled=true when isSelected clears', async () => {
      const el = await fixture<ChatButton>(
        html`<cds-aichat-button
          is-quick-action
          ?disabled="${true}"
          ?isSelected="${true}">
          quick action
        </cds-aichat-button>`
      );

      await el.updateComplete;
      expect(el.disabled).to.be.true;
      expect(el.hasAttribute('data-is-selected')).to.be.true;

      el.isSelected = false;
      await el.updateComplete;
      expect(el.disabled).to.be.true;
      expect(el.hasAttribute('data-is-selected')).to.be.false;
    });

    it('should preserve consumer disabled=true when set while isSelected=true then isSelected clears', async () => {
      const el = await fixture<ChatButton>(
        html`<cds-aichat-button is-quick-action ?isSelected="${true}">
          quick action
        </cds-aichat-button>`
      );

      await el.updateComplete;

      el.disabled = true;
      await el.updateComplete;

      el.isSelected = false;
      await el.updateComplete;
      expect(el.disabled).to.be.true;
      expect(el.hasAttribute('data-is-selected')).to.be.false;
    });
  });
});
