/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html, fixture, expect, waitUntil } from '@open-wc/testing';
import { sendKeys, sendMouse, resetMouse } from '@web/test-runner-commands';
import '../index.js';

async function clickMenuItem(item: HTMLElement) {
  const { x, y, width, height } = item.getBoundingClientRect();
  await sendMouse({
    type: 'click',
    position: [Math.round(x + width / 2), Math.round(y + height / 2)],
  });
}

describe('history delete focus restore', () => {
  it('delete panel _getFocusDetailForDeletedItem picks next row and selected state', async () => {
    const host = await fixture(html`
      <cds-aichat-history-shell>
        <cds-aichat-history-content>
          <cds-aichat-history-panel>
            <cds-aichat-history-panel-items>
              <cds-aichat-history-panel-menu expanded title="T">
                <cds-aichat-history-panel-item
                  id="a"
                  name="A"
                  selected></cds-aichat-history-panel-item>
                <cds-aichat-history-panel-item
                  id="b"
                  name="B"></cds-aichat-history-panel-item>
              </cds-aichat-history-panel-menu>
            </cds-aichat-history-panel-items>
          </cds-aichat-history-panel>
        </cds-aichat-history-content>
        <cds-aichat-history-delete-panel></cds-aichat-history-delete-panel>
      </cds-aichat-history-shell>
    `);

    const deletePanel = host.querySelector(
      'cds-aichat-history-delete-panel'
    ) as HTMLElement;
    const detail = (deletePanel as any)._getFocusDetailForDeletedItem('a');
    expect(detail.itemId).to.equal('a');
    expect(detail.nextItemId).to.equal('b');
    expect(detail.deletedItemWasSelected).to.be.true;
  });

  it('cds-aichat-history-shell dispatches history-item-selected on next item after delete', async () => {
    const shell = await fixture(html`
      <cds-aichat-history-shell>
        <cds-aichat-history-content>
          <cds-aichat-history-panel>
            <cds-aichat-history-panel-items>
              <cds-aichat-history-panel-menu expanded title="T">
                <cds-aichat-history-panel-item
                  id="first"
                  name="First"
                  selected></cds-aichat-history-panel-item>
                <cds-aichat-history-panel-item
                  id="second"
                  name="Second"></cds-aichat-history-panel-item>
              </cds-aichat-history-panel-menu>
            </cds-aichat-history-panel-items>
          </cds-aichat-history-panel>
        </cds-aichat-history-content>
        <cds-aichat-history-delete-panel
          item-id="first"></cds-aichat-history-delete-panel>
      </cds-aichat-history-shell>
    `);

    const deletePanel = shell.querySelector('cds-aichat-history-delete-panel')!;

    deletePanel.addEventListener('history-delete-confirm', () => {
      shell
        .querySelector(`cds-aichat-history-panel-item[id="first"]`)
        ?.remove();
    });

    let selectedDetail;
    const onSelected = (e: Event) => {
      selectedDetail = (e as CustomEvent).detail;
    };
    shell.addEventListener('history-item-selected', onSelected);

    const dangerBtn = deletePanel.shadowRoot?.querySelector(
      'cds-aichat-button[kind=danger]'
    ) as HTMLElement;
    expect(dangerBtn).to.exist;
    dangerBtn.click();

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

    expect(selectedDetail?.itemId).to.equal('second');
    expect(selectedDetail?.itemName).to.equal('Second');

    shell.removeEventListener('history-item-selected', onSelected);
  });
});

describe('history panel item overflow menu', () => {
  it('renders its actions through a cds-menu child, as the v12 overflow menu expects', async () => {
    const host = await fixture(html`
      <cds-aichat-history-content>
        <cds-aichat-history-panel-item
          id="with-menu"
          name="With menu"></cds-aichat-history-panel-item>
      </cds-aichat-history-content>
    `);
    const item = host.querySelector(
      'cds-aichat-history-panel-item'
    ) as HTMLElement & {
      actions: unknown[];
      updateComplete: Promise<boolean>;
    };
    item.actions = [{ text: 'Rename' }, { text: 'Delete', delete: true }];
    await item.updateComplete;

    const overflowMenu = item.shadowRoot?.querySelector(
      'cds-overflow-menu'
    ) as HTMLElement;
    expect(overflowMenu).to.exist;

    // The v12 overflow menu drives a direct `cds-menu` child. Anything else
    // leaves the menu unopenable and only warns in development.
    const menu = overflowMenu.querySelector(':scope > cds-menu');
    expect(menu, 'cds-menu must be a direct child of cds-overflow-menu').to
      .exist;
    expect(overflowMenu.querySelector('cds-overflow-menu-body')).to.not.exist;

    expect(overflowMenu.getAttribute('menu-alignment')).to.equal('bottom-end');

    const items = Array.from(menu!.querySelectorAll('cds-menu-item'));
    expect(items.map((el) => el.getAttribute('label'))).to.deep.equal([
      'Rename',
      'Delete',
    ]);
    expect(items[1].getAttribute('kind')).to.equal('danger');
  });

  it('opens history actions, wraps focus and keeps activation separate from row selection', async () => {
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
      let selections = 0;
      const item = await fixture<
        HTMLElement & {
          actions: unknown[];
          updateComplete: Promise<boolean>;
        }
      >(html`
        <cds-aichat-history-panel-item
          id="with-menu"
          name="With menu"
          show-actions></cds-aichat-history-panel-item>
      `);
      item.actions = [
        { text: 'Rename' },
        { text: 'Delete', delete: true, divider: true },
      ];
      item.addEventListener('history-item-menu-action', (event) => {
        activations += 1;
        expect((event as CustomEvent).detail.action).to.equal('Rename');
      });
      item.addEventListener('history-item-selected', () => {
        selections += 1;
      });
      await item.updateComplete;
      const overflowMenu = item.shadowRoot!.querySelector(
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
      await clickMenuItem(items[0]);
      await waitUntil(() => !menu.open && trigger.matches(':focus'));
      expect(activations).to.equal(3);
      await resetMouse();

      expect(selections).to.equal(0);
      expect(
        menuWarnings,
        'Carbon must accept the menu composition'
      ).to.deep.equal([]);
    } finally {
      console.warn = originalWarn;
    }
  });
});

describe('history panel item rename invalid state', () => {
  it('passes rename-invalid and rename-invalid-message through to the input element', async () => {
    const item = await fixture(html`
      <cds-aichat-history-panel-item
        id="item-1"
        name="My chat"
        rename></cds-aichat-history-panel-item>
    `);

    const panelItem = item as HTMLElement & {
      renameInvalid: boolean;
      renameInvalidMessage: string;
      updateComplete: Promise<boolean>;
    };

    panelItem.renameInvalid = true;
    panelItem.renameInvalidMessage = 'Title cannot exceed 75 characters.';
    await panelItem.updateComplete;

    const inputEl = panelItem.shadowRoot?.querySelector(
      'cds-aichat-history-panel-item-input'
    ) as HTMLElement & { invalid: boolean; invalidMessage: string };

    expect(inputEl).to.exist;
    expect(inputEl.invalid).to.be.true;
    expect(inputEl.invalidMessage).to.equal(
      'Title cannot exceed 75 characters.'
    );
  });
});
