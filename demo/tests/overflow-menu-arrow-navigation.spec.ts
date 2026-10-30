/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { test, expect } from './fixtures';
import { PageObjectId } from '@carbon/ai-chat/server';
import {
  prepareDemoPage,
  destroyChatSession,
  expectNoCspViolations,
  openChatWindow,
  waitForChatReady,
  waitForSetChatConfigApplied,
} from './utils';

// Import types for window.setChatConfig without emitting runtime code
import type {} from '../types/window';

// Setup common to all tests
test.beforeEach(async ({ page }) => {
  // Load demo in setChatConfig mode and block analytics pop-ups
  await prepareDemoPage(page, { setChatConfig: true });
});

// Clear session between all tests to ensure clean state, and assert that the
// page rendered without tripping the test-time strict CSP. Run the CSP check
// before destroyChatSession so the assertion fires against the test's own
// interactions, not the cleanup tear-down.
test.afterEach(async ({ page }) => {
  await expectNoCspViolations(page);
  await destroyChatSession(page);
});

/**
 * Helper function to find the currently focused overflow menu item by traversing shadow DOM.
 * Returns the text content of the focused item, or null if no item is focused.
 */
async function getFocusedMenuItemText(page: any): Promise<string | null> {
  return await page.evaluate(() => {
    function findFocusedElement(root: Document | ShadowRoot): Element | null {
      const activeElement = root.activeElement;

      if (!activeElement) {
        return null;
      }

      // Check if this is an overflow menu item
      if (
        activeElement.tagName.toLowerCase() === 'cds-overflow-menu-item' ||
        activeElement.getAttribute('role') === 'menuitem'
      ) {
        return activeElement;
      }

      // Traverse into shadow DOM if it exists
      if (activeElement.shadowRoot) {
        return findFocusedElement(activeElement.shadowRoot);
      }

      return null;
    }

    const focusedItem = findFocusedElement(document);
    return focusedItem ? focusedItem.textContent?.trim() || null : null;
  });
}

/**
 * Helper function to open the overflow menu and wait for it to be visible.
 */
async function openOverflowMenu(page: any) {
  // Find and click the overflow menu button in the navigation slot
  const overflowMenuButton = page.locator('cds-overflow-menu').first();
  await overflowMenuButton.click();

  // Wait for the first menu item to be visible
  await page
    .locator('cds-overflow-menu-item')
    .first()
    .waitFor({ state: 'visible' });
}

/**
 * Helper function to focus the first menu item in the overflow menu.
 */
async function focusFirstMenuItem(page: any) {
  // Focus the first menu item
  const firstMenuItem = page.locator('cds-overflow-menu-item').first();
  await firstMenuItem.focus();
}

for (const framework of ['react', 'web-component']) {
  test(`${framework} header menu keys and focus return`, async ({ page }) => {
    await prepareDemoPage(page, {
      settings: {
        framework,
        layout: framework === 'react' ? 'float' : 'sidebar',
        direction: framework === 'react' ? 'ltr' : 'rtl',
        writeableElements: 'false',
      },
    });
    await page.waitForFunction(
      () =>
        window.chatInstance?.serviceManager?.store.getState()
          .initialViewChangeComplete
    );
    // Configure chat with menu options enabled
    await page.evaluate(async () => {
      if (!window.setChatConfig) {
        throw new Error('setChatConfig is not available');
      }
      await window.setChatConfig({
        header: {
          title: 'Test Chat',
          menuOptions: [
            {
              text: 'Help',
              handler: () => alert('Help clicked!'),
            },
            {
              text: 'Documentation',
              href: 'https://example.com',
              target: '_blank',
            },
            {
              text: 'Settings',
              handler: () => alert('Settings clicked!'),
            },
          ],
        },
        launcher: { isOn: false },
        openChatByDefault: true,
      });
    });

    await waitForSetChatConfigApplied(page);

    // Open the chat interface and wait for it to be ready
    await openChatWindow(page);
    await waitForChatReady(page, { panelTestId: PageObjectId.MAIN_PANEL });

    // Open the overflow menu
    await openOverflowMenu(page);

    // Focus the first menu item
    await focusFirstMenuItem(page);

    // Verify first item is focused
    let focusedText = await getFocusedMenuItemText(page);
    expect(focusedText).toBe('Help');

    // Press ArrowDown key
    await page.keyboard.press('ArrowDown');

    await expect.poll(() => getFocusedMenuItemText(page)).toBe('Documentation');

    // Verify second item is now focused
    focusedText = await getFocusedMenuItemText(page);
    expect(focusedText).toBe('Documentation');
    await page.keyboard.press('Escape');
    await expect.poll(() => getFocusedMenuItemText(page)).toBeNull();
    await expect
      .poll(() =>
        page
          .locator('cds-overflow-menu')
          .first()
          .evaluate((node) => node.matches(':focus-within'))
      )
      .toBe(true);
    await expect(page.locator('html')).toHaveAttribute(
      'dir',
      framework === 'react' ? 'ltr' : 'rtl'
    );
    await expect(page.locator('cds-aichat-custom-element')).toHaveCount(
      framework === 'react' ? 0 : 1
    );
    const aiLabel = page.getByRole('button', {
      name: 'AI - Show information',
      exact: true,
    });
    await aiLabel.focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('heading', { name: 'Name of feature', exact: true })
    ).toBeVisible();
    await aiLabel.press('Enter');
    await expect(
      page.getByRole('heading', { name: 'Name of feature', exact: true })
    ).toBeHidden();

    const opener = page.getByRole('button', {
      name: 'Close the chat window',
      exact: true,
    });
    await opener.focus();
    await expect(opener).toBeFocused();
    await page.evaluate(() => {
      const panel = window.chatInstance.customPanels.getPanel();
      const button = document.createElement('button');
      button.textContent = 'Panel focus proof';
      button.addEventListener('click', () => panel.close());
      window.chatInstance.writeableElements.customPanelElement.appendChild(
        button
      );
      panel.open({ title: 'Header focus proof', disableAnimation: true });
    });
    const panelButton = page.getByRole('button', { name: 'Panel focus proof' });
    await expect(panelButton).toBeFocused();
    await panelButton.click();
    await expect(panelButton).toBeHidden();
    // The parent header also leaves page focus after this programmatic panel flow.
    await expect(page.locator('body')).toBeFocused();
    await opener.evaluate((button) => {
      let node: Element | null = button;
      while (node) {
        if (node.localName === 'cds-aichat-header-view') {
          (node as HTMLElement & { requestFocus(): boolean }).requestFocus();
          return;
        }
        const root = node.getRootNode();
        node =
          node.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
      }
      throw new Error('Native header focus handle is missing');
    });
    await expect(opener).toBeFocused();
  });
}
