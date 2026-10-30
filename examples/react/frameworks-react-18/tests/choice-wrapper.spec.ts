/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Proves the real ChatButton Boolean boundary on React 18.
 * Both published trees retain click, keyboard, and cleared-selection behavior.
 */
import { expect, test } from '@playwright/test';

for (const tree of ['es', 'es-custom']) {
  test(`${tree} choices block repeats and recover after clearing`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/?choice-probe&choice-tree=${tree}`);
    await expect(page.getByTestId('choice-react-version')).toHaveText(/^18\./);

    const first = page.getByTestId('choice-0');
    const second = page.getByTestId('choice-1');
    const calls = page.getByTestId('choice-calls');
    const before = page.getByRole('button', { name: 'Before choices' });
    const clear = page.getByRole('button', { name: 'Clear selection' });

    for (const choice of [first, second]) {
      await expect(choice).toHaveJSProperty('isSelected', false);
      await expect(choice).toHaveJSProperty('inert', false);
      await expect(choice).toHaveJSProperty('tabIndex', 0);
      await expect(choice).toHaveJSProperty('disabled', false);
    }
    await expect(calls).toHaveText('0,0');

    await page
      .getByRole('button', { name: 'First choice', exact: true })
      .click();
    await expect(calls).toHaveText('1,0');
    await expect(first).toHaveJSProperty('isSelected', true);
    await expect(first).toHaveJSProperty('inert', true);
    await expect(first).toHaveJSProperty('tabIndex', -1);
    await expect(first).toHaveJSProperty('disabled', false);

    await first.evaluate((element) => {
      if (!(element instanceof HTMLElement)) {
        throw new Error('The choice must be an HTML element.');
      }
      element.click();
    });
    await expect(calls).toHaveText('1,0');

    await before.focus();
    await page.keyboard.press('Tab');
    await expect(second).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(calls).toHaveText('1,1');
    await expect(second).toHaveJSProperty('isSelected', true);
    await expect(second).toHaveJSProperty('inert', true);
    await expect(second).toHaveJSProperty('tabIndex', -1);
    await expect(first).toHaveJSProperty('isSelected', false);
    await expect(first).toHaveJSProperty('inert', false);
    await expect(first).toHaveJSProperty('tabIndex', 0);

    await clear.click();
    await expect(second).toHaveJSProperty('isSelected', false);
    await expect(second).toHaveJSProperty('inert', false);
    await expect(second).toHaveJSProperty('tabIndex', 0);
    await before.focus();
    await page.keyboard.press('Tab');
    await expect(first).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(second).toBeFocused();
    await page
      .getByRole('button', { name: 'Second choice', exact: true })
      .click();
    await expect(calls).toHaveText('1,2');
    await expect(second).toHaveJSProperty('isSelected', true);

    await clear.click();
    await before.focus();
    await page.keyboard.press('Tab');
    await expect(first).toBeFocused();
    await page.keyboard.press('Space');
    await expect(calls).toHaveText('2,2');
    await expect(first).toHaveJSProperty('isSelected', true);
    await page.keyboard.press('Tab');
    await expect(second).toBeFocused();
    await expect(calls).toHaveText('2,2');
  });
}
