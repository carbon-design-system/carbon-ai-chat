/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/// <reference types="mocha" />

import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import { resetMouse, sendKeys, sendMouse } from '@web/test-runner-commands';
import '@carbon/ai-chat-components/es/components/chat-history/src/history-panel-item.js';
import type HistoryPanelItem from '@carbon/ai-chat-components/es/components/chat-history/src/history-panel-item.js';
import type OverflowMenu from '@carbon/web-components/es/components/overflow-menu/overflow-menu.js';
import type Menu from '@carbon/web-components/es/components/menu/menu.js';
import type MenuItem from '@carbon/web-components/es/components/menu/menu-item.js';

describe('history panel item actions', () => {
  afterEach(() => resetMouse());

  async function setup(
    actions: unknown[] = [
      { text: 'Rename' },
      { text: 'Delete', delete: true, divider: true, disabled: true },
      { text: 'Archive', disabled: false },
    ]
  ) {
    const host = await fixture<HTMLDivElement>(html`
      <div data-floating-menu-container style="width: 320px; height: 320px">
        <cds-aichat-history-panel-item
          id="chat-1"
          name="My chat"
          show-actions
          .actions=${actions}></cds-aichat-history-panel-item>
      </div>
    `);
    const item = host.querySelector(
      'cds-aichat-history-panel-item'
    ) as HistoryPanelItem;
    await item.updateComplete;
    const overflow =
      item.shadowRoot!.querySelector<OverflowMenu>('cds-overflow-menu')!;
    const menu = overflow.querySelector<Menu>(':scope > cds-menu')!;
    const items = Array.from(menu.querySelectorAll<MenuItem>('cds-menu-item'));
    await Promise.all([
      overflow.updateComplete,
      menu.updateComplete,
      ...items.map((entry) => entry.updateComplete),
    ]);
    const trigger =
      overflow.shadowRoot!.querySelector<HTMLButtonElement>('button')!;
    const events: CustomEvent[] = [];
    const selections: Event[] = [];
    host.addEventListener('history-item-menu-action', (event) =>
      events.push(event as CustomEvent)
    );
    host.addEventListener('history-item-selected', (event) =>
      selections.push(event)
    );

    async function open() {
      trigger.focus();
      await sendKeys({ press: 'Enter' });
      await overflow.updateComplete;
      await waitUntil(() => {
        const surface =
          menu.shadowRoot?.querySelector<HTMLElement>('[role="menu"]');
        return (
          !!surface &&
          overflow.open &&
          menu.open &&
          getComputedStyle(surface).visibility === 'visible' &&
          surface.getBoundingClientRect().height > 0
        );
      });
      // Focus settles after the open render: the first enabled item, or the
      // trigger when every action is disabled.
      const firstEnabled = items.find(
        (entry) => !entry.hasAttribute('disabled')
      );
      await waitUntil(
        () =>
          firstEnabled
            ? firstEnabled.matches(':focus')
            : overflow.shadowRoot!.activeElement === trigger,
        'focus settles after opening'
      );
    }

    async function closed() {
      await overflow.updateComplete;
      await waitUntil(() => !overflow.open && !menu.open);
    }

    function triggerFocused() {
      return overflow.shadowRoot!.activeElement === trigger;
    }

    return {
      host,
      item,
      overflow,
      menu,
      items,
      trigger,
      events,
      selections,
      open,
      closed,
      triggerFocused,
    };
  }

  async function click(item: MenuItem) {
    const rect = item.getBoundingClientRect();
    await sendMouse({
      type: 'click',
      position: [
        Math.round(rect.x + rect.width / 2),
        Math.round(rect.y + rect.height / 2),
      ],
    });
  }

  it('keeps omitted and false actions enabled and renders disabled danger/divider/icon semantics', async () => {
    const state = await setup([
      { text: 'Rename' },
      {
        text: 'Delete',
        delete: true,
        divider: true,
        disabled: true,
        icon: html`<svg aria-hidden="true"></svg>`,
      },
      { text: 'Archive', disabled: false },
    ]);
    await state.open();
    expect(
      state.items.map((entry) => entry.getAttribute('label'))
    ).to.deep.equal(['Rename', 'Delete', 'Archive']);
    expect(state.items.map((entry) => Boolean(entry.disabled))).to.deep.equal([
      false,
      true,
      false,
    ]);
    expect(
      state.items.map((entry) => entry.hasAttribute('disabled'))
    ).to.deep.equal([false, true, false]);
    expect(
      state.items.map((entry) => entry.getAttribute('aria-disabled'))
    ).to.deep.equal([null, 'true', null]);
    expect(
      state.items.map((entry) => entry.getAttribute('tabindex'))
    ).to.deep.equal(['0', '-1', '0']);
    expect(state.items[1].getAttribute('role')).to.equal('menuitem');
    expect(
      state.menu.shadowRoot!.querySelector('[role="menu"]'),
      'the menu surface carries the menu role'
    ).to.exist;
    expect(state.items[1].getAttribute('kind')).to.equal('danger');
    expect(state.items[1].previousElementSibling?.tagName).to.equal(
      'CDS-MENU-ITEM-DIVIDER'
    );
    expect(state.items[1].querySelector('[slot="render-icon"] svg')).to.exist;
    expect(state.items[1].getBoundingClientRect().height).to.be.greaterThan(0);
  });

  for (const text of ['Rename', 'Delete', 'Archive']) {
    it(`emits the unchanged composed event for enabled ${text} on mouse click`, async () => {
      const state = await setup([{ text, delete: text === 'Delete' }]);
      await state.open();
      await click(state.items[0]);
      expect(state.events).to.have.length(1);
      expect(state.events[0].detail).to.deep.equal({
        action: text,
        itemId: 'chat-1',
        itemName: 'My chat',
        element: state.item,
      });
      expect(state.events[0].bubbles).to.be.true;
      expect(state.events[0].composed).to.be.true;
      expect(state.events[0].cancelable).to.be.false;
      expect(state.selections).to.have.length(0);
      await state.closed();
    });
  }

  it('blocks a real disabled Delete click and leaves Rename usable in the same menu', async () => {
    const state = await setup();
    await state.open();
    await click(state.items[1]);
    await state.overflow.updateComplete;
    expect(state.events).to.have.length(0);
    expect(state.selections).to.have.length(0);
    expect(state.overflow.open).to.be.true;
    expect(state.menu.open).to.be.true;
    await click(state.items[0]);
    expect(state.events.map((event) => event.detail.action)).to.deep.equal([
      'Rename',
    ]);
  });

  for (const origin of ['host', 'shadow content']) {
    it(`blocks a composed synthetic click from disabled ${origin} without closing or selecting the row`, async () => {
      const state = await setup();
      await state.open();
      const target =
        origin === 'host'
          ? state.items[1]
          : state.items[1].shadowRoot!.querySelector('.cds--menu-item__label')!;
      expect(target).to.exist;
      target.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          composed: true,
          cancelable: true,
        })
      );
      await state.overflow.updateComplete;
      expect(state.events).to.have.length(0);
      expect(state.selections).to.have.length(0);
      expect(state.overflow.open).to.be.true;
      expect(state.menu.open).to.be.true;
    });
  }

  for (const key of ['Enter', 'Space']) {
    it(`activates an enabled action once with real ${key} and closes the menu`, async () => {
      const state = await setup();
      await state.open();
      state.items[2].focus();
      await sendKeys({ press: key });
      expect(state.events.map((event) => event.detail.action)).to.deep.equal([
        'Archive',
      ]);
      await state.closed();
      await waitUntil(state.triggerFocused);
    });

    it(`blocks the direct ${key} dispatch path for disabled actions`, async () => {
      const state = await setup();
      await state.open();
      state.items[1].dispatchEvent(
        new KeyboardEvent('keydown', {
          key: key === 'Space' ? ' ' : key,
          bubbles: true,
          composed: true,
          cancelable: true,
        })
      );
      await state.overflow.updateComplete;
      expect(state.events).to.have.length(0);
      expect(state.selections).to.have.length(0);
      expect(state.overflow.open).to.be.true;
      expect(state.menu.open).to.be.true;
    });

    it(`cannot reach or activate disabled Delete with real ${key}`, async () => {
      const state = await setup([
        { text: 'Rename' },
        { text: 'Delete', delete: true, disabled: true },
      ]);
      await state.open();
      // Keyboard navigation never lands on the disabled item.
      expect(state.items[0].matches(':focus')).to.be.true;
      await sendKeys({ press: 'ArrowDown' });
      expect(state.items[1].matches(':focus')).to.be.false;
      // Even with focus forced onto it, a real key press does nothing.
      state.items[1].focus();
      await sendKeys({ press: key });
      await state.overflow.updateComplete;
      expect(state.events).to.have.length(0);
      expect(state.selections).to.have.length(0);
    });
  }

  it('skips disabled items, wraps arrow navigation, and restores trigger focus on Escape', async () => {
    const state = await setup();
    await state.open();
    expect(state.items[0].matches(':focus')).to.be.true;
    for (const [key, index] of [
      ['ArrowDown', 2],
      ['ArrowDown', 0],
      ['ArrowUp', 2],
    ] as const) {
      await sendKeys({ press: key });
      await waitUntil(
        () => state.items[index].matches(':focus'),
        `${key} focuses ${state.items[index].getAttribute('label')}`
      );
    }
    await sendKeys({ press: 'Escape' });
    await state.closed();
    await waitUntil(state.triggerFocused, 'Escape returns focus to trigger');
    expect(state.events).to.have.length(0);
  });

  it('focuses the first enabled item when the first action is disabled', async () => {
    const state = await setup([
      { text: 'Delete', disabled: true },
      { text: 'Rename' },
    ]);
    await state.open();
    expect(state.items[1].matches(':focus')).to.be.true;
    await sendKeys({ press: 'Enter' });
    expect(state.events.map((event) => event.detail.action)).to.deep.equal([
      'Rename',
    ]);
  });

  for (const whileOpen of [false, true]) {
    it(`updates the same Delete item in both directions while ${whileOpen ? 'open' : 'closed'}`, async () => {
      const state = await setup([
        { text: 'Rename' },
        { text: 'Delete', delete: true },
      ]);
      if (whileOpen) {
        await state.open();
        expect(state.items[0].matches(':focus')).to.be.true;
      } else {
        state.trigger.focus();
      }
      const deleteItem = state.items[1];
      for (const disabled of [true, false]) {
        state.item.actions = state.item.actions.map((action) => ({
          ...action,
          disabled: action.text === 'Delete' && disabled,
        }));
        await state.item.updateComplete;
        await deleteItem.updateComplete;
        await state.overflow.updateComplete;
        expect(state.menu.querySelectorAll('cds-menu-item')[1] === deleteItem)
          .to.be.true;
        expect(Boolean(deleteItem.disabled)).to.equal(disabled);
        expect(deleteItem.hasAttribute('disabled')).to.equal(disabled);
        expect(state.overflow.open).to.equal(whileOpen);
        if (whileOpen) {
          expect(state.items[0].matches(':focus')).to.be.true;
        } else {
          expect(state.triggerFocused()).to.be.true;
        }
        if (disabled) {
          deleteItem.click();
          for (const key of ['Enter', ' ']) {
            deleteItem.dispatchEvent(
              new KeyboardEvent('keydown', {
                key,
                bubbles: true,
                composed: true,
              })
            );
          }
          expect(state.events).to.have.length(0);
        }
      }
      if (!whileOpen) {
        await state.open();
        expect(deleteItem.getAttribute('aria-disabled')).to.be.null;
      }
      await click(deleteItem);
      expect(state.events.map((event) => event.detail.action)).to.deep.equal([
        'Delete',
      ]);
    });
  }

  it('can navigate away from a disabled item that receives a stale key event', async () => {
    const state = await setup();
    await state.open();
    state.items[1].dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        composed: true,
      })
    );
    await waitUntil(() => state.items[2].matches(':focus'));
    expect(state.events).to.have.length(0);
  });

  it('returns focus to the trigger when the focused action is disabled, and allows it again after an update', async () => {
    const state = await setup([
      { text: 'Rename' },
      { text: 'Delete', delete: true },
    ]);
    await state.open();
    state.items[1].focus();
    expect(state.items[1].matches(':focus')).to.be.true;
    for (const disabled of [true, false]) {
      state.item.actions = state.item.actions.map((action) => ({
        ...action,
        disabled: action.text === 'Delete' && disabled,
      }));
      await state.item.updateComplete;
      await state.items[1].updateComplete;
      if (disabled) {
        await state.closed();
        await waitUntil(state.triggerFocused, 'focus returns to the trigger');
        expect(state.item.shadowRoot!.activeElement === state.overflow).to.be
          .true;
        expect(document.activeElement === state.item).to.be.true;
        state.items[1].click();
        state.items[1].dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Enter',
            bubbles: true,
            composed: true,
          })
        );
        expect(state.events).to.have.length(0);
      }
    }
    await state.open();
    state.items[1].focus();
    await sendKeys({ press: 'Enter' });
    expect(state.events.map((event) => event.detail.action)).to.deep.equal([
      'Delete',
    ]);
  });

  it('keeps Delete focused and the menu open when another action becomes disabled', async () => {
    const state = await setup([
      { text: 'Rename' },
      { text: 'Delete', delete: true },
    ]);
    await state.open();
    state.items[1].focus();
    expect(state.items[1].matches(':focus')).to.be.true;
    state.item.actions = state.item.actions.map((action) => ({
      ...action,
      disabled: action.text === 'Rename',
    }));
    await state.item.updateComplete;
    await Promise.all(state.items.map((entry) => entry.updateComplete));
    await state.overflow.updateComplete;
    expect(state.overflow.open).to.be.true;
    expect(state.menu.open).to.be.true;
    expect(state.items[1].matches(':focus')).to.be.true;
    expect(state.events).to.have.length(0);
  });
});
