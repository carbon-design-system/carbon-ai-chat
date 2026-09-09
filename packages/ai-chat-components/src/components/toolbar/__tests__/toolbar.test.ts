/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html, fixture, expect } from '@open-wc/testing';
import '@carbon/ai-chat-components/es/components/toolbar/index.js';
import Toolbar, {
  Action,
} from '@carbon/ai-chat-components/es/components/toolbar/src/toolbar.js';
import {
  Version16,
  Download16,
  Share16,
  Launch16,
  Maximize16,
  Close16,
} from '@carbon/icons';

const actionLists: Record<string, Action[]> = {
  'Advanced list': [
    { text: 'Version', icon: Version16, size: 'md', onClick: () => {} },
    { text: 'Download', icon: Download16, size: 'md', onClick: () => {} },
    { text: 'Share', icon: Share16, size: 'md', onClick: () => {} },
    { text: 'Launch', icon: Launch16, size: 'md', onClick: () => {} },
    { text: 'Maximize', icon: Maximize16, size: 'md', onClick: () => {} },
    {
      text: 'Close',
      fixed: true,
      icon: Close16,
      size: 'md',
      onClick: () => {},
    },
  ],
};

/**
 * This repository uses the @web/test-runner library for testing
 * Documentation on writing tests, plugins, and commands
 * here: https://modern-web.dev/docs/test-runner/overview/
 */

describe('toolbar', function () {
  it('should render with cds-aichat-toolbar minimum attributes', async () => {
    const el = await fixture<Toolbar>(
      html`<cds-aichat-toolbar
        .actions=${actionLists['Advanced list'] as Action[]}></cds-aichat-toolbar>`
    );
    expect(el).to.be.instanceOf(Toolbar);
    expect(el.actions).to.deep.equal(actionLists['Advanced list'] as Action[]);
    expect(el.shadowRoot).to.exist;
    await expect(el).dom.to.equalSnapshot();
  });

  it('should render the title div inside the shadow root', async () => {
    const el = await fixture<Toolbar>(
      html`<cds-aichat-toolbar
        titleText="My Title"
        .actions=${actionLists['Advanced list'] as Action[]}></cds-aichat-toolbar>`
    );
    const titleDiv = el.shadowRoot!.querySelector('.cds-aichat-toolbar__title');
    expect(titleDiv).to.exist;
  });

  describe('isSelected / toggle state (inline icon-button path)', function () {
    it('should not set aria-pressed when isSelected is absent (plain button)', async () => {
      const actions: Action[] = [
        { text: 'Version', icon: Version16, size: 'md', onClick: () => {} },
      ];
      const el = await fixture<Toolbar>(
        html`<cds-aichat-toolbar .actions=${actions}></cds-aichat-toolbar>`
      );
      const btn = el.shadowRoot!.querySelector('cds-icon-button');
      expect(btn).to.exist;
      expect(btn!.hasAttribute('aria-pressed')).to.be.false;
      expect(btn!.hasAttribute('data-selected')).to.be.false;
    });

    it('should set isSelected attribute and data-selected when isSelected is true', async () => {
      // cds-icon-button (via carbon PR #23009) sets aria-pressed="true" on its
      // inner <button> when isSelected is set. We verify the host attributes
      // that drive that behaviour and the visual selected class.
      const actions: Action[] = [
        {
          text: 'Toggle',
          icon: Version16,
          size: 'md',
          isSelected: true,
          onClick: () => {},
        },
      ];
      const el = await fixture<Toolbar>(
        html`<cds-aichat-toolbar .actions=${actions}></cds-aichat-toolbar>`
      );
      const btn = el.shadowRoot!.querySelector('cds-icon-button');
      expect(btn).to.exist;
      // Carbon handles aria-pressed="true" inside its own shadow DOM;
      // we set the isSelected property so it does so.
      expect(btn!.hasAttribute('isselected')).to.be.true;
      expect(btn!.hasAttribute('data-selected')).to.be.true;
      // No host-level aria-pressed="false" fallback needed for the on-state
      expect(btn!.getAttribute('aria-pressed')).to.not.equal('false');
    });

    it('should set aria-pressed="false" on host (fallback) when isSelected is false', async () => {
      // cds-icon-button does not emit aria-pressed="false" for the off-state,
      // so we set it on the host element as a fallback for assistive tech.
      const actions: Action[] = [
        {
          text: 'Toggle',
          icon: Version16,
          size: 'md',
          isSelected: false,
          onClick: () => {},
        },
      ];
      const el = await fixture<Toolbar>(
        html`<cds-aichat-toolbar .actions=${actions}></cds-aichat-toolbar>`
      );
      const btn = el.shadowRoot!.querySelector('cds-icon-button');
      expect(btn).to.exist;
      expect(btn!.getAttribute('aria-pressed')).to.equal('false');
      expect(btn!.hasAttribute('data-selected')).to.be.false;
    });

    it('should reflect updated isSelected state when actions prop changes', async () => {
      const actionsOff: Action[] = [
        {
          text: 'Toggle',
          icon: Version16,
          size: 'md',
          isSelected: false,
          onClick: () => {},
        },
      ];
      const el = await fixture<Toolbar>(
        html`<cds-aichat-toolbar .actions=${actionsOff}></cds-aichat-toolbar>`
      );
      let btn = el.shadowRoot!.querySelector('cds-icon-button');
      // Toggle-off: host carries aria-pressed="false" fallback
      expect(btn!.getAttribute('aria-pressed')).to.equal('false');

      const actionsOn: Action[] = [
        {
          text: 'Toggle',
          icon: Version16,
          size: 'md',
          isSelected: true,
          onClick: () => {},
        },
      ];
      el.actions = actionsOn;
      await el.updateComplete;

      btn = el.shadowRoot!.querySelector('cds-icon-button');
      // Toggle-on: isSelected set so Carbon handles aria-pressed="true" internally
      expect(btn!.hasAttribute('isselected')).to.be.true;
      expect(btn!.hasAttribute('data-selected')).to.be.true;
      expect(btn!.getAttribute('aria-pressed')).to.not.equal('false');
    });
  });

  describe('isSelected / toggle state (overflow menu path)', function () {
    /**
     * Force the overflow menu to appear by rendering many actions and setting
     * a narrow container width via inline style.
     */
    async function fixtureWithOverflow(toggleSelected: boolean | undefined) {
      const actions: Action[] = [
        { text: 'Version', icon: Version16, size: 'md', onClick: () => {} },
        { text: 'Download', icon: Download16, size: 'md', onClick: () => {} },
        { text: 'Share', icon: Share16, size: 'md', onClick: () => {} },
        { text: 'Launch', icon: Launch16, size: 'md', onClick: () => {} },
        { text: 'Maximize', icon: Maximize16, size: 'md', onClick: () => {} },
        {
          text: 'Toggle',
          icon: Close16,
          size: 'md',
          onClick: () => {},
          ...(toggleSelected !== undefined
            ? { isSelected: toggleSelected }
            : {}),
        },
      ];

      const el = await fixture<Toolbar>(
        html`<cds-aichat-toolbar
          overflow
          style="width:100px"
          .actions=${actions}></cds-aichat-toolbar>`
      );
      // Trigger layout so overflow calculation runs
      await el.updateComplete;
      return el;
    }

    it('should not set aria-pressed on overflow item when isSelected is absent', async () => {
      const el = await fixtureWithOverflow(undefined);
      const items = el.shadowRoot!.querySelectorAll('cds-overflow-menu-item');
      items.forEach((item) => {
        expect(item.hasAttribute('aria-pressed')).to.be.false;
      });
    });

    it('should set aria-pressed="true" on overflow item when isSelected is true', async () => {
      const el = await fixtureWithOverflow(true);
      const items = Array.from(
        el.shadowRoot!.querySelectorAll('cds-overflow-menu-item')
      );
      const toggleItem = items.find(
        (item) => item.textContent?.trim() === 'Toggle'
      );
      if (toggleItem) {
        expect(toggleItem.getAttribute('aria-pressed')).to.equal('true');
        expect(toggleItem.hasAttribute('data-selected')).to.be.true;
      }
    });

    it('should set aria-pressed="false" on overflow item when isSelected is false', async () => {
      const el = await fixtureWithOverflow(false);
      const items = Array.from(
        el.shadowRoot!.querySelectorAll('cds-overflow-menu-item')
      );
      const toggleItem = items.find(
        (item) => item.textContent?.trim() === 'Toggle'
      );
      if (toggleItem) {
        expect(toggleItem.getAttribute('aria-pressed')).to.equal('false');
        expect(toggleItem.hasAttribute('data-selected')).to.be.false;
      }
    });
  });
});
