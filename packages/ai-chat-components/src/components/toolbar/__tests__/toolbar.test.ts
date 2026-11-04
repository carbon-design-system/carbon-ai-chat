/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html, fixture, expect, waitUntil } from '@open-wc/testing';
import { sendKeys, sendMouse, resetMouse } from '@web/test-runner-commands';
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

async function clickMenuItem(item: HTMLElement) {
  const { x, y, width, height } = item.getBoundingClientRect();
  await sendMouse({
    type: 'click',
    position: [Math.round(x + width / 2), Math.round(y + height / 2)],
  });
}

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

  it('composes its overflow menu the way the v12 structure expects', async () => {
    // The menu only renders once actions actually overflow, and the overflow
    // measurement only runs when `overflow` is set, so squeeze a toolbar that
    // has it until the actions spill.
    const wrapper = await fixture<HTMLDivElement>(
      html`<div style="width: 120px;">
        <cds-aichat-toolbar
          overflow
          .actions=${actionLists['Advanced list'] as Action[]}></cds-aichat-toolbar>
      </div>`
    );
    const el = wrapper.querySelector('cds-aichat-toolbar') as Toolbar;
    await el.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await el.updateComplete;

    const overflowMenu = el.shadowRoot!.querySelector(
      'cds-overflow-menu'
    ) as HTMLElement;
    expect(overflowMenu, 'actions should have overflowed into a menu').to.exist;

    // In Carbon v12 the menu only opens off a direct `cds-menu` child.
    // Anything else leaves it dead and only warns in development.
    expect(
      overflowMenu.querySelector(':scope > cds-menu'),
      'cds-menu must be a direct child of cds-overflow-menu'
    ).to.exist;
    expect(overflowMenu.querySelector('cds-overflow-menu-body')).to.not.exist;
    expect(overflowMenu.getAttribute('menu-alignment')).to.equal('bottom-end');
  });

  it('opens an overflowing toolbar and accepts keyboard input', async () => {
    const originalWarn = console.warn;
    const menuWarnings: string[] = [];
    console.warn = (...args: unknown[]) => {
      const message = args.map(String).join(' ');
      if (message.includes('expects a direct')) {
        menuWarnings.push(message);
      }
      originalWarn.apply(console, args);
    };
    try {
      let activations = 0;
      const actions = actionLists['Advanced list'].map((item) => ({
        ...item,
        disabled: item.text === 'Share',
        onClick: () => {
          activations += 1;
        },
      }));
      const wrapper = await fixture<HTMLDivElement>(html`
        <div style="width: 120px;">
          <cds-aichat-toolbar overflow .actions=${actions}></cds-aichat-toolbar>
        </div>
      `);
      const el = wrapper.querySelector('cds-aichat-toolbar') as Toolbar;
      await waitUntil(
        () => !!el.shadowRoot!.querySelector('cds-overflow-menu')
      );
      const overflowMenu = el.shadowRoot!.querySelector(
        'cds-overflow-menu'
      ) as HTMLElement & {
        updateComplete: Promise<boolean>;
      };

      const menu = overflowMenu.querySelector(
        ':scope > cds-menu'
      ) as HTMLElement & {
        open: boolean;
      };
      expect(customElements.get('cds-menu')).to.exist;
      expect(customElements.get('cds-menu-item')).to.exist;
      await overflowMenu.updateComplete;
      const trigger = overflowMenu.shadowRoot!.querySelector('button')!;
      trigger.click();
      await waitUntil(() => {
        const surface =
          menu.shadowRoot?.querySelector<HTMLElement>('[role="menu"]');
        return (
          !!surface &&
          menu.open &&
          getComputedStyle(surface).visibility === 'visible' &&
          getComputedStyle(surface).display !== 'none' &&
          surface.getBoundingClientRect().height > 0
        );
      });
      const items = Array.from(
        menu.querySelectorAll<HTMLElement>('cds-menu-item:not([disabled])')
      );
      expect(items.length).to.be.greaterThan(1);
      await waitUntil(() => items[0].matches(':focus'));
      await sendKeys({ press: 'ArrowUp' });
      await waitUntil(() => items[items.length - 1].matches(':focus'));
      await sendKeys({ press: 'ArrowDown' });
      await waitUntil(() => items[0].matches(':focus'));
      await sendKeys({ press: 'ArrowDown' });
      await waitUntil(() => items[1].matches(':focus'));
      await sendKeys({ press: 'Escape' });
      await waitUntil(() => !menu.open && trigger.matches(':focus'));
      for (const activation of ['Enter', 'Space']) {
        trigger.click();
        await waitUntil(() => menu.open && items[0].matches(':focus'));
        await sendKeys({ press: activation });
        await waitUntil(() => !menu.open && trigger.matches(':focus'));
      }
      expect(activations).to.equal(2);
      trigger.click();
      await waitUntil(() => menu.open && items[0].matches(':focus'));
      const disabled = menu.querySelector<HTMLElement>(
        'cds-menu-item[disabled]'
      )!;
      expect(disabled).to.exist;
      await clickMenuItem(disabled);
      await overflowMenu.updateComplete;
      expect(activations).to.equal(2);
      expect(menu.open).to.be.true;
      expect(overflowMenu.hasAttribute('open')).to.be.true;
      await clickMenuItem(items[0]);
      await waitUntil(() => !menu.open && trigger.matches(':focus'));
      expect(activations).to.equal(3);
      await resetMouse();

      expect(
        menuWarnings,
        'Carbon must accept the menu composition'
      ).to.deep.equal([]);
    } finally {
      console.warn = originalWarn;
    }
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
        () => el.shadowRoot!.querySelectorAll('cds-menu-item').length > 0
      );
      const items = el.shadowRoot!.querySelectorAll('cds-menu-item');
      items.forEach((item) => {
        expect(item.getAttribute('role')).to.equal('menuitem');
        expect(item.hasAttribute('aria-checked')).to.be.false;
      });
    });

    it('preserves menu semantics when an open item changes between toggle and plain action', async () => {
      const el = await fixtureWithOverflow(true);
      await waitUntil(
        () => !!el.shadowRoot!.querySelector('cds-menu-item[label="Toggle"]')
      );
      const overflowMenu = el.shadowRoot!.querySelector(
        'cds-overflow-menu'
      ) as LitElement & HTMLElement;
      await overflowMenu.updateComplete;
      const menu = overflowMenu.querySelector(
        ':scope > cds-menu'
      ) as HTMLElement & { open: boolean };
      const trigger = overflowMenu.shadowRoot!.querySelector('button')!;
      trigger.click();
      await waitUntil(() => {
        const surface =
          menu.shadowRoot?.querySelector<HTMLElement>('[role="menu"]');
        return (
          !!surface &&
          menu.open &&
          getComputedStyle(surface).visibility === 'visible' &&
          getComputedStyle(surface).display !== 'none' &&
          surface.getBoundingClientRect().height > 0
        );
      });
      const item = menu.querySelector(
        'cds-menu-item[label="Toggle"]'
      ) as LitElement & HTMLElement;
      await item.updateComplete;
      item.focus();
      await waitUntil(() => item.matches(':focus'));

      for (const isSelected of [false, undefined, true, undefined]) {
        el.actions = el.actions.map((action) =>
          action.text === 'Toggle' ? { ...action, isSelected } : action
        );
        await el.updateComplete;
        await item.updateComplete;
        expect(menu.querySelector('cds-menu-item[label="Toggle"]')).to.equal(
          item
        );
        expect(menu.open).to.be.true;
        expect(item.matches(':focus')).to.be.true;
        expect(item.getAttribute('role')).to.equal(
          isSelected === undefined ? 'menuitem' : 'menuitemcheckbox'
        );
        expect(item.getAttribute('aria-checked')).to.equal(
          isSelected === undefined ? null : String(isSelected)
        );
        expect(item.hasAttribute('data-selected')).to.equal(
          isSelected === true
        );
      }

      await sendKeys({ press: 'Escape' });
      await waitUntil(() => !menu.open && trigger.matches(':focus'));
    });

    it('should set role="menuitemcheckbox" and aria-checked="true" on overflow item when isSelected is true', async () => {
      const el = await fixtureWithOverflow(true);
      await waitUntil(
        () => el.shadowRoot!.querySelectorAll('cds-menu-item').length > 0
      );
      const items = Array.from(
        el.shadowRoot!.querySelectorAll('cds-menu-item')
      );
      const toggleItem = items.find(
        (item) => item.getAttribute('label') === 'Toggle'
      ) as (LitElement & HTMLElement) | undefined;
      expect(toggleItem, 'overflow item not rendered').to.exist;
      expect(toggleItem!.getAttribute('role')).to.equal('menuitemcheckbox');
      expect(toggleItem!.getAttribute('aria-checked')).to.equal('true');
      expect(toggleItem!.hasAttribute('data-selected')).to.be.true;
      // Carbon fills in role="menuitem" only when no role is set, so the
      // checkbox role has to survive the item's first update.
      await toggleItem!.updateComplete;
      expect(toggleItem!.getAttribute('role')).to.equal('menuitemcheckbox');
    });

    it('should set role="menuitemcheckbox" and aria-checked="false" on overflow item when isSelected is false', async () => {
      const el = await fixtureWithOverflow(false);
      await waitUntil(
        () => el.shadowRoot!.querySelectorAll('cds-menu-item').length > 0
      );
      const items = Array.from(
        el.shadowRoot!.querySelectorAll('cds-menu-item')
      );
      const toggleItem = items.find(
        (item) => item.getAttribute('label') === 'Toggle'
      ) as (LitElement & HTMLElement) | undefined;
      expect(toggleItem, 'overflow item not rendered').to.exist;
      expect(toggleItem!.getAttribute('role')).to.equal('menuitemcheckbox');
      expect(toggleItem!.getAttribute('aria-checked')).to.equal('false');
      expect(toggleItem!.hasAttribute('data-selected')).to.be.false;
      // Carbon fills in role="menuitem" only when no role is set, so the
      // checkbox role has to survive the item's first update.
      await toggleItem!.updateComplete;
      expect(toggleItem!.getAttribute('role')).to.equal('menuitemcheckbox');
    });
  });
});
