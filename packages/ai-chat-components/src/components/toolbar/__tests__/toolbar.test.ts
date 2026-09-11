/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html, fixture, expect, waitUntil } from '@open-wc/testing';
import { LitElement } from 'lit';
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

    it('should set aria-pressed="true" on inner button when isSelected is true', async () => {
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
      const btn = el.shadowRoot!.querySelector<LitElement & HTMLElement>(
        'cds-icon-button'
      )!;
      expect(btn).to.exist;
      expect(btn.hasAttribute('data-selected')).to.be.true;
      // Wait for cds-icon-button to finish its own update so our updated()
      // hook has run after Carbon's aria-pressed binding.
      await btn.updateComplete;
      const inner = btn.shadowRoot!.querySelector('button')!;
      expect(inner.getAttribute('aria-pressed')).to.equal('true');
    });

    it('should set aria-pressed="false" on inner button when isSelected is false', async () => {
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
      const btn = el.shadowRoot!.querySelector<LitElement & HTMLElement>(
        'cds-icon-button'
      )!;
      expect(btn).to.exist;
      expect(btn.hasAttribute('data-selected')).to.be.false;
      await btn.updateComplete;
      const inner = btn.shadowRoot!.querySelector('button')!;
      expect(inner.getAttribute('aria-pressed')).to.equal('false');
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
      let btn = el.shadowRoot!.querySelector<LitElement & HTMLElement>(
        'cds-icon-button'
      )!;
      await btn.updateComplete;
      let inner = btn.shadowRoot!.querySelector('button')!;
      expect(inner.getAttribute('aria-pressed')).to.equal('false');

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

      btn = el.shadowRoot!.querySelector<LitElement & HTMLElement>(
        'cds-icon-button'
      )!;
      await btn.updateComplete;
      inner = btn.shadowRoot!.querySelector('button')!;
      expect(btn.hasAttribute('data-selected')).to.be.true;
      expect(inner.getAttribute('aria-pressed')).to.equal('true');
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

    it('should not set role="menuitemcheckbox" or aria-checked on overflow item when isSelected is absent', async () => {
      const el = await fixtureWithOverflow(undefined);
      await waitUntil(
        () =>
          el.shadowRoot!.querySelectorAll('cds-overflow-menu-item').length > 0
      );
      const items = el.shadowRoot!.querySelectorAll('cds-overflow-menu-item');
      // Carbon sets role="menuitem" on all items via connectedCallback;
      // we must not override that with "menuitemcheckbox" when isSelected is absent.
      items.forEach((item) => {
        expect(item.getAttribute('role')).to.not.equal('menuitemcheckbox');
        expect(item.hasAttribute('aria-checked')).to.be.false;
      });
    });

    it('should set role="menuitemcheckbox" and aria-checked="true" on overflow item when isSelected is true', async () => {
      const el = await fixtureWithOverflow(true);
      await waitUntil(
        () =>
          el.shadowRoot!.querySelectorAll('cds-overflow-menu-item').length > 0
      );
      const items = Array.from(
        el.shadowRoot!.querySelectorAll('cds-overflow-menu-item')
      );
      const toggleItem = items.find(
        (item) => item.textContent?.trim() === 'Toggle'
      );
      expect(toggleItem, 'overflow item not rendered').to.exist;
      expect(toggleItem!.getAttribute('role')).to.equal('menuitemcheckbox');
      expect(toggleItem!.getAttribute('aria-checked')).to.equal('true');
      expect(toggleItem!.hasAttribute('data-selected')).to.be.true;
    });

    it('should set role="menuitemcheckbox" and aria-checked="false" on overflow item when isSelected is false', async () => {
      const el = await fixtureWithOverflow(false);
      await waitUntil(
        () =>
          el.shadowRoot!.querySelectorAll('cds-overflow-menu-item').length > 0
      );
      const items = Array.from(
        el.shadowRoot!.querySelectorAll('cds-overflow-menu-item')
      );
      const toggleItem = items.find(
        (item) => item.textContent?.trim() === 'Toggle'
      );
      expect(toggleItem, 'overflow item not rendered').to.exist;
      expect(toggleItem!.getAttribute('role')).to.equal('menuitemcheckbox');
      expect(toggleItem!.getAttribute('aria-checked')).to.equal('false');
      expect(toggleItem!.hasAttribute('data-selected')).to.be.false;
    });
  });
});
