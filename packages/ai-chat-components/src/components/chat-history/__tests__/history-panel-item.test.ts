/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/// <reference types="mocha" />

import { expect, fixture, html, nextFrame, waitUntil } from '@open-wc/testing';
import { resetMouse, sendKeys, sendMouse } from '@web/test-runner-commands';
import '@carbon/ai-chat-components/es/components/chat-history/src/history-panel-item.js';
import type HistoryPanelItem from '@carbon/ai-chat-components/es/components/chat-history/src/history-panel-item.js';
import type OverflowMenu from '@carbon/web-components/es/components/overflow-menu/overflow-menu.js';
import type OverflowMenuBody from '@carbon/web-components/es/components/overflow-menu/overflow-menu-body.js';
import type OverflowMenuItem from '@carbon/web-components/es/components/overflow-menu/overflow-menu-item.js';

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
    const menu =
      item.shadowRoot!.querySelector<OverflowMenu>('cds-overflow-menu')!;
    const body = menu.querySelector<OverflowMenuBody>(
      'cds-overflow-menu-body'
    )!;
    const items = Array.from(
      body.querySelectorAll<OverflowMenuItem>('cds-overflow-menu-item')
    );
    await Promise.all([
      menu.updateComplete,
      body.updateComplete,
      ...items.map((entry) => entry.updateComplete),
    ]);
    const trigger =
      menu.shadowRoot!.querySelector<HTMLButtonElement>('button')!;
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
      await menu.updateComplete;
      await body.updateComplete;
      await waitUntil(
        () => body.open && body.getBoundingClientRect().height > 0
      );
    }

    return { host, item, menu, body, items, trigger, events, selections, open };
  }

  function button(item: OverflowMenuItem) {
    return item.shadowRoot!.querySelector<HTMLButtonElement>('button')!;
  }

  async function click(item: OverflowMenuItem) {
    const rect = button(item).getBoundingClientRect();
    await sendMouse({
      type: 'click',
      position: [
        Math.round(rect.x + rect.width / 2),
        Math.round(rect.y + rect.height / 2),
      ],
    });
  }

  it('keeps omitted and false actions enabled and renders native disabled danger/divider/icon semantics', async () => {
    const state = await setup([
      { text: 'Rename' },
      {
        text: 'Delete',
        delete: true,
        divider: true,
        disabled: true,
        icon: html`<svg slot="icon" aria-hidden="true"></svg>`,
      },
      { text: 'Archive', disabled: false },
    ]);
    await state.open();
    expect(state.items.map((entry) => entry.textContent!.trim())).to.deep.equal(
      ['Rename', 'Delete', 'Archive']
    );
    expect(state.items.map((entry) => entry.disabled)).to.deep.equal([
      false,
      true,
      false,
    ]);
    expect(state.items.map((entry) => button(entry).disabled)).to.deep.equal([
      false,
      true,
      false,
    ]);
    expect(state.items[1].getAttribute('role')).to.equal('menuitem');
    expect(state.body.getAttribute('role')).to.equal('menu');
    expect(button(state.items[1]).matches(':disabled')).to.be.true;
    expect(button(state.items[1]).tabIndex).to.equal(-1);
    expect(state.items[1].danger).to.be.true;
    expect(state.items[1].divider).to.be.true;
    expect(state.items[1].querySelector('svg[slot="icon"]')).to.exist;
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
      await state.menu.updateComplete;
      expect(state.menu.open).to.be.false;
    });
  }

  it('blocks a real disabled Delete click and leaves Rename usable in the same menu', async () => {
    const state = await setup();
    await state.open();
    await click(state.items[1]);
    expect(state.events).to.have.length(0);
    expect(state.selections).to.have.length(0);
    // WebKit blurs the focused item on a disabled pointer click; Carbon closes on blur.
    if (!state.menu.open) {
      await state.open();
    }
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
          : button(state.items[1]).firstElementChild!;
      target.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          composed: true,
          cancelable: true,
        })
      );
      await state.menu.updateComplete;
      expect(state.events).to.have.length(0);
      expect(state.selections).to.have.length(0);
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
      await state.menu.updateComplete;
      expect(state.menu.open).to.be.false;
    });

    it(`blocks the direct ${key} dispatch path for disabled actions`, async () => {
      const state = await setup();
      await state.open();
      button(state.items[1]).dispatchEvent(
        new KeyboardEvent('keydown', {
          key: key === 'Space' ? ' ' : key,
          bubbles: true,
          composed: true,
          cancelable: true,
        })
      );
      await state.menu.updateComplete;
      expect(state.events).to.have.length(0);
      expect(state.selections).to.have.length(0);
      expect(state.menu.open).to.be.true;
    });

    it(`cannot focus or activate disabled Delete with real ${key}`, async () => {
      const state = await setup([
        { text: 'Delete', delete: true, disabled: true },
      ]);
      await state.open();
      state.trigger.blur();
      state.items[0].focus();
      expect(state.items[0].matches(':focus-within')).to.be.false;
      await sendKeys({ press: key });
      expect(state.events).to.have.length(0);
    });
  }

  it('skips disabled items, wraps arrow navigation, and restores trigger focus on Escape', async () => {
    const state = await setup();
    await state.open();
    expect(state.items[0].matches(':focus-within')).to.be.true;
    for (const [key, index] of [
      ['ArrowDown', 2],
      ['ArrowDown', 0],
      ['ArrowUp', 2],
    ] as const) {
      await sendKeys({ press: key });
      expect(state.items[index].matches(':focus-within')).to.be.true;
    }
    await sendKeys({ press: 'Escape' });
    await state.menu.updateComplete;
    await nextFrame();
    expect(state.menu.open).to.be.false;
    expect(state.body.open).to.be.false;
    expect(state.menu.shadowRoot!.activeElement === state.trigger).to.be.true;
    expect(state.events).to.have.length(0);
  });

  it('focuses the first enabled item when the first action is disabled', async () => {
    const state = await setup([
      { text: 'Delete', disabled: true },
      { text: 'Rename' },
    ]);
    await state.open();
    expect(state.items[1].matches(':focus-within')).to.be.true;
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
      }
      const deleteItem = state.items[1];
      for (const disabled of [true, false]) {
        state.item.actions = state.item.actions.map((action) => ({
          ...action,
          disabled: action.text === 'Delete' && disabled,
        }));
        await state.item.updateComplete;
        await deleteItem.updateComplete;
        expect(
          state.body.querySelectorAll('cds-overflow-menu-item')[1] ===
            deleteItem
        ).to.be.true;
        expect(deleteItem.disabled).to.equal(disabled);
        expect(button(deleteItem).disabled).to.equal(disabled);
        expect(state.menu.open).to.equal(whileOpen);
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
    expect(state.items[2].matches(':focus-within')).to.be.true;
    expect(state.events).to.have.length(0);
  });

  it('can close an all-disabled menu with its trigger and tab away', async () => {
    const state = await setup([{ text: 'Delete', disabled: true }]);
    // Text inputs participate in WebKit's default Tab order on macOS.
    const nextControl = document.createElement('input');
    nextControl.setAttribute('aria-label', 'Next control');
    state.host.append(nextControl);
    const escapes: Event[] = [];
    state.host.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        escapes.push(event);
      }
    });
    for (const key of ['Escape', 'Enter']) {
      await state.open();
      expect(
        state.menu.shadowRoot!.activeElement === state.trigger,
        `trigger retains focus when all actions are disabled (${key})`
      ).to.be.true;
      await sendKeys({ press: key });
      await state.menu.updateComplete;
      expect(state.menu.open).to.be.false;
    }
    expect(escapes).to.have.length(0);
    await sendKeys({ press: 'Escape' });
    expect(escapes).to.have.length(1);
    expect(escapes[0].defaultPrevented).to.be.false;
    await sendKeys({ press: 'Tab' });
    expect(
      document.activeElement === nextControl,
      `Tab moves to the next control; focused ${document.activeElement?.tagName}`
    ).to.be.true;
    expect(state.events).to.have.length(0);
  });

  it('blocks an action disabled while focused and allows it again after an update', async () => {
    const state = await setup([
      { text: 'Rename' },
      { text: 'Delete', delete: true },
    ]);
    await state.open();
    state.items[1].focus();
    for (const disabled of [true, false]) {
      state.item.actions = state.item.actions.map((action) => ({
        ...action,
        disabled: action.text === 'Delete' && disabled,
      }));
      await state.item.updateComplete;
      await state.items[1].updateComplete;
      if (disabled) {
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
    state.trigger.focus();
    state.menu.open = false;
    await state.menu.updateComplete;
    await state.open();
    state.items[1].focus();
    await sendKeys({ press: 'Enter' });
    expect(state.events.map((event) => event.detail.action)).to.deep.equal([
      'Delete',
    ]);
  });
});
