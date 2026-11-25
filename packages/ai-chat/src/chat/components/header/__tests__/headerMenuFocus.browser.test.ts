/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';
import { userEvent } from 'vitest/browser';

import { PageObjectId } from '../../../../aiChatEntry';
import {
  allByRole,
  byRole,
  byTestId,
} from '../../../__tests__/helpers/contract';
import {
  HOSTS,
  FOCUS_WAIT,
  focusSetup,
  focusPath,
  hasFocus,
  isVisible,
  openChat,
} from '../../../__tests__/helpers/browserFocus';

focusSetup();

/** The text of the focused header menu item, or `null` when none has focus. */
function focusedMenuItemText(): string | null {
  const item = focusPath().find(
    (element) =>
      element.localName === 'cds-overflow-menu-item' ||
      element.getAttribute('role') === 'menuitem'
  );
  return item ? item.textContent?.trim() || null : null;
}

/** The header's overflow menu items, in order, once they show. */
function shownMenuItems(): HTMLElement[] {
  return ['Help', 'Documentation', 'Settings'].map(
    (name) => allByRole('menuitem', name).find(isVisible) ?? null
  );
}

for (const framework of HOSTS) {
  it(`${framework} header menu keys and focus return`, async () => {
    const instance = await openChat(
      framework,
      framework === 'react' ? 'ltr' : 'rtl',
      {
        header: {
          title: 'Test Chat',
          menuOptions: [
            { text: 'Help', handler: vi.fn() },
            {
              text: 'Documentation',
              href: 'https://example.com',
              target: '_blank',
            },
            { text: 'Settings', handler: vi.fn() },
          ],
        },
      }
    );
    // The AI label's popover shows the page's explainability content.
    const explained = document.createElement('div');
    const heading = document.createElement('h2');
    heading.textContent = 'Name of feature';
    explained.append(heading);
    instance.writeableElements.explainabilityPopoverContent.append(explained);

    const options = byRole('button', 'Options');
    await userEvent.click(options);
    await expect
      .poll(() => shownMenuItems().every((item) => item !== null), FOCUS_WAIT)
      .toBe(true);
    const [help] = shownMenuItems();
    help.focus();
    expect(focusedMenuItemText()).toBe('Help');

    await userEvent.keyboard('{ArrowDown}');
    await expect.poll(focusedMenuItemText, FOCUS_WAIT).toBe('Documentation');
    await userEvent.keyboard('{Escape}');
    await expect.poll(focusedMenuItemText, FOCUS_WAIT).toBeNull();
    // Escape returns focus to the overflow menu's own trigger.
    await expect.poll(() => hasFocus(options), FOCUS_WAIT).toBe(true);
    expect(document.documentElement.dir).toBe(
      framework === 'react' ? 'ltr' : 'rtl'
    );
    expect(document.querySelectorAll('cds-aichat-custom-element')).toHaveLength(
      framework === 'react' ? 0 : 1
    );

    const aiLabel = byRole('button', 'AI - Show information');
    aiLabel.focus();
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => isVisible(heading), FOCUS_WAIT).toBe(true);
    aiLabel.focus();
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => isVisible(heading), FOCUS_WAIT).toBe(false);

    const opener = byRole('button', 'Close the chat window');
    opener.focus();
    expect(hasFocus(opener)).toBe(true);
    const panel = instance.customPanels.getPanel();
    const panelButton = document.createElement('button');
    panelButton.textContent = 'Panel focus proof';
    panelButton.addEventListener('click', () => panel.close());
    instance.writeableElements.customPanelElement.appendChild(panelButton);
    await act(async () => {
      panel.open({ title: 'Header focus proof', disableAnimation: true });
    });
    await expect.poll(() => hasFocus(panelButton), FOCUS_WAIT).toBe(true);
    await userEvent.click(panelButton);
    await expect.poll(() => isVisible(panelButton), FOCUS_WAIT).toBe(false);
    // Closing the panel from its slotted content returns focus to its opener.
    await expect.poll(() => hasFocus(opener), FOCUS_WAIT).toBe(true);

    // Start from outside the header, so the header's own focus result shows.
    byTestId(PageObjectId.INPUT).focus();
    // No public API reaches the header's focus handle, so walk out from the
    // close button to the header view element, as the demo did.
    let node: Element | null = opener;
    let header: (HTMLElement & { requestFocus(): boolean }) | null = null;
    while (node && !header) {
      if (node.localName === 'cds-aichat-header-view') {
        header = node as HTMLElement & { requestFocus(): boolean };
      }
      const root = node.getRootNode();
      node =
        node.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
    }
    expect(header).not.toBeNull();
    // Navigation comes first, so the header focuses the Options trigger
    // inside the overflow menu's shadow root and counts that as success.
    expect(header.requestFocus()).toBe(true);
    await expect.poll(() => hasFocus(options), FOCUS_WAIT).toBe(true);
  });
}
