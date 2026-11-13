/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { fixture, html, expect } from '@open-wc/testing';
import CheckmarkFilled16 from '@carbon/icons/es/checkmark--filled/16.js';
import prefix from '../../../globals/settings.js';
import '../index.js';
import type CDSAIChatSystemMessage from '../src/system-message.js';

const blockClass = `${prefix}-system-message`;

describe(blockClass, () => {
  describe('accessibility', () => {
    it('sets role="status" on the host and no aria-live', async () => {
      const el = await fixture<CDSAIChatSystemMessage>(
        html`<cds-aichat-system-message
          >Agent joined</cds-aichat-system-message
        >`
      );
      expect(el.getAttribute('role')).to.equal('status');
      expect(el.hasAttribute('aria-live')).to.be.false;
      expect(el.shadowRoot!.querySelector('[aria-live]')).to.not.exist;
      expect(el.shadowRoot!.querySelector('[role]')).to.not.exist;
    });

    it('keeps a role the host already set', async () => {
      const el = await fixture<CDSAIChatSystemMessage>(
        html`<cds-aichat-system-message role="note"
          >Note</cds-aichat-system-message
        >`
      );
      expect(el.getAttribute('role')).to.equal('note');
    });
  });

  describe('text', () => {
    it('renders the default slot', async () => {
      const el = await fixture<CDSAIChatSystemMessage>(
        html`<cds-aichat-system-message
          >Agent joined</cds-aichat-system-message
        >`
      );
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>(
        `.${blockClass}__text slot`
      )!;
      expect(slot.assignedNodes()[0].textContent).to.equal('Agent joined');
    });
  });

  describe('standalone', () => {
    it('defaults to true and adds outer spacing', async () => {
      const el = await fixture<CDSAIChatSystemMessage>(
        html`<cds-aichat-system-message>Between</cds-aichat-system-message>`
      );
      expect(el.standalone).to.equal(true);
      expect(el.hasAttribute('standalone')).to.be.true;
      expect(getComputedStyle(el).marginBlockStart).to.not.equal('0px');
      expect(getComputedStyle(el).marginInlineStart).to.not.equal('0px');
    });

    it('adds no outer spacing when standalone is false', async () => {
      const el = await fixture<CDSAIChatSystemMessage>(
        html`<cds-aichat-system-message .standalone=${false}
          >Inside</cds-aichat-system-message
        >`
      );
      expect(el.hasAttribute('standalone')).to.be.false;
      const style = getComputedStyle(el);
      expect(style.marginBlockStart).to.equal('0px');
      expect(style.marginInlineStart).to.equal('0px');
    });
  });

  describe('divider', () => {
    it('defaults to false with no divider line', async () => {
      const el = await fixture<CDSAIChatSystemMessage>(
        html`<cds-aichat-system-message>Plain</cds-aichat-system-message>`
      );
      expect(el.divider).to.equal(false);
      expect(getComputedStyle(el).borderBlockStartWidth).to.equal('0px');
    });

    it('draws a line above the text when divider is true', async () => {
      const el = await fixture<CDSAIChatSystemMessage>(
        html`<cds-aichat-system-message divider
          >Divider</cds-aichat-system-message
        >`
      );
      expect(el.divider).to.equal(true);
      const style = getComputedStyle(el);
      expect(style.borderBlockStartWidth).to.equal('1px');
      expect(style.borderBlockStartStyle).to.equal('solid');
    });
  });

  describe('responseStopped', () => {
    it('defaults to false', async () => {
      const el = await fixture<CDSAIChatSystemMessage>(
        html`<cds-aichat-system-message>Plain</cds-aichat-system-message>`
      );
      expect(el.responseStopped).to.equal(false);
      const text = el.shadowRoot!.querySelector(`.${blockClass}__text`)!;
      expect(getComputedStyle(text).fontStyle).to.equal('normal');
    });

    it('renders italic text and renders icon when responseStopped is true', async () => {
      const el = await fixture<CDSAIChatSystemMessage>(
        html`<cds-aichat-system-message
          response-stopped
          .icon=${CheckmarkFilled16}
          >Response stopped</cds-aichat-system-message
        >`
      );
      expect(el.responseStopped).to.equal(true);
      expect(el.shadowRoot!.querySelector(`.${blockClass}__icon`)).to.exist;
      const text = el.shadowRoot!.querySelector(`.${blockClass}__text`)!;
      expect(getComputedStyle(text).fontStyle).to.equal('italic');
    });
  });

  describe('icon', () => {
    it('renders no icon by default', async () => {
      const el = await fixture<CDSAIChatSystemMessage>(
        html`<cds-aichat-system-message>No icon</cds-aichat-system-message>`
      );
      expect(el.shadowRoot!.querySelector(`.${blockClass}__icon`)).to.not.exist;
    });

    it('renders a decorative icon before the text', async () => {
      const el = await fixture<CDSAIChatSystemMessage>(
        html`<cds-aichat-system-message .icon=${CheckmarkFilled16}
          >Done</cds-aichat-system-message
        >`
      );
      const icon = el.shadowRoot!.querySelector(`.${blockClass}__icon`)!;
      const text = el.shadowRoot!.querySelector(`.${blockClass}__text`)!;
      expect(icon.querySelector('svg')!.getAttribute('aria-hidden')).to.equal(
        'true'
      );
      expect(
        icon.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING
      ).to.be.greaterThan(0);
    });
  });
});
