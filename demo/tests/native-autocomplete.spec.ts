/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import {
  expectNoCspViolations,
  installCspGuard,
  installTestCsp,
} from './utils';
import type {} from '../types/window';

type Host = 'react' | 'wc';

async function prepare(page: Page, host: Host, width = 760, both = false) {
  let fixtureCss = '';
  await page.route('**/native-autocomplete-fixture.css', (route) =>
    route.fulfill({ contentType: 'text/css', body: fixtureCss })
  );
  await installTestCsp(page, (body) => {
    const style = body.match(/<style>([\s\S]*?)<\/style>/i);
    if (!style) {
      throw new Error('Host compatibility stylesheet was not found.');
    }
    fixtureCss = style[1];
    return body.replace(
      style[0],
      '<link rel="stylesheet" href="/native-autocomplete-fixture.css">'
    );
  });
  await installCspGuard(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto(
    `/host-compatibility.html?${both ? 'autocomplete=both' : `surface=${host === 'react' ? 'react' : 'wc'}-custom`}`
  );
  await page.waitForFunction((which) => {
    const container =
      which === 'wc'
        ? document
            .getElementById('host-compat-wc')
            ?.shadowRoot?.querySelector('cds-aichat-container')
        : document.querySelector('cds-aichat-container');
    const current = (
      container as HTMLElement & {
        current?: {
          viewState?: {
            serviceManager: {
              store: {
                getState(): { initialViewChangeComplete: boolean };
              };
            };
          };
        };
      }
    )?.current;
    return Boolean(
      current?.viewState?.serviceManager.store.getState()
        .initialViewChangeComplete
    );
  }, host);
  await page.evaluate((size) => {
    document.querySelectorAll<HTMLElement>('.sized').forEach((element) => {
      element.style.width = `${size}px`;
    });
  }, width);
}

async function mount(
  page: Page,
  host: Host,
  kind: 'builtin' | 'react' | 'element',
  delay = false
) {
  await page.evaluate(
    ({ host, kind, delay }) =>
      window.hostCompatibility.mountNativeAutocomplete(host, kind, delay),
    { host, kind, delay }
  );
  await expect(
    page
      .getByTestId(`native-autocomplete-prompt-${host}`)
      .locator('.ProseMirror')
  ).toBeVisible();
}

async function query(page: Page, host: Host, text: string) {
  await page.evaluate(
    ({ host, text }) =>
      window.hostCompatibility.nativeAutocompletes[host].query(text),
    { host, text }
  );
}

async function expectReactListPlacement(page: Page, host: Host) {
  const result = await page.evaluate((host) => {
    const probe = window.hostCompatibility.nativeAutocompletes[host];
    const { target, anchor } = probe.snapshot();
    const nativeRoot = probe.native.getRootNode() as ShadowRoot;
    const container = nativeRoot.host;
    const list = target.firstElementChild;
    const outerRoot =
      host === 'react'
        ? document
        : document.getElementById('host-compat-wc').shadowRoot;
    const pageReference = document.createElement('div');
    pageReference.className = 'page-styled';
    document.body.appendChild(pageReference);
    try {
      return {
        placement:
          target.parentElement === container &&
          target.getRootNode() === outerRoot &&
          list.getRootNode() === outerRoot &&
          anchor.getRootNode() === nativeRoot &&
          target.assignedSlot?.parentElement === anchor,
        color: getComputedStyle(list).color,
        inheritedColor: getComputedStyle(target).color,
        pageColor: getComputedStyle(pageReference).color,
      };
    } finally {
      pageReference.remove();
    }
  }, host);
  expect(result.placement).toBe(true);
  expect(result.pageColor).toBe('rgb(1, 2, 3)');
  if (host === 'react') {
    expect(result.color).toBe(result.pageColor);
  } else {
    expect(result.color).toBe(result.inheritedColor);
    expect(result.color).not.toBe(result.pageColor);
  }
}

test.afterEach(async ({ page }) => {
  await page.evaluate(() => {
    Object.values(window.hostCompatibility?.nativeAutocompletes ?? {}).forEach(
      (probe) => probe?.restore()
    );
  });
  await expectNoCspViolations(page);
});

for (const host of ['react', 'wc'] as const) {
  test(`${host} waits for React list commit and retains its tree through queries and root replacement`, async ({
    page,
  }) => {
    await prepare(page, host);
    await mount(page, host, 'react', true);
    const editor = page
      .getByTestId(`native-autocomplete-prompt-${host}`)
      .locator('.ProseMirror');
    const list = page.getByTestId('native-autocomplete-react-list');
    await expect(list).toBeVisible();
    await editor.focus();
    await editor.press('ArrowDown');
    expect(
      await page.evaluate(
        (host) => window.hostCompatibility.nativeAutocompletes[host].keys,
        host
      )
    ).toEqual([]);
    expect(
      await page.evaluate(
        (host) =>
          window.hostCompatibility.nativeAutocompletes[host].snapshot().ready,
        host
      )
    ).toBe(false);
    await page.evaluate(
      (host) =>
        window.hostCompatibility.nativeAutocompletes[host].releaseReady(),
      host
    );
    await expect
      .poll(() =>
        page.evaluate(
          (host) =>
            window.hostCompatibility.nativeAutocompletes[host].snapshot().ready,
          host
        )
      )
      .toBe(true);
    await editor.press('ArrowDown');
    await expect
      .poll(() =>
        page.evaluate(
          (host) => window.hostCompatibility.nativeAutocompletes[host].keys,
          host
        )
      )
      .toEqual(['ArrowDown']);
    const theme = host === 'react' ? 'light' : 'none';
    await list.getByRole('button', { name: `${theme}:0`, exact: true }).click();
    await expect(
      list.getByRole('button', { name: `${theme}:1`, exact: true })
    ).toBeVisible();
    await expect(editor).toBeFocused();
    await expectReactListPlacement(page, host);
    await page.evaluate((host) => {
      const probe = window.hostCompatibility.nativeAutocompletes[host];
      (
        window as Window & { autocompleteTarget?: HTMLElement }
      ).autocompleteTarget = probe.snapshot().target;
    }, host);
    await query(page, host, 'next');
    await page.evaluate(
      (host) =>
        window.hostCompatibility.nativeAutocompletes[host].replaceResults([
          'Gamma',
        ]),
      host
    );
    await expect(list).toHaveAttribute('data-query', 'next');
    await expect(
      list.getByRole('button', { name: 'Gamma', exact: true })
    ).toBeVisible();
    await expect(
      list.getByRole('button', { name: `${theme}:1`, exact: true })
    ).toBeVisible();
    expect(
      await page.evaluate(
        (host) =>
          window.hostCompatibility.nativeAutocompletes[host].snapshot()
            .target ===
          (window as Window & { autocompleteTarget?: HTMLElement })
            .autocompleteTarget,
        host
      )
    ).toBe(true);
    if (host === 'react') {
      await page.evaluate(() => window.hostCompatibility.setTheme('dark'));
      await expect(
        list.getByRole('button', { name: 'dark:1', exact: true })
      ).toBeVisible();
    }
    await list
      .getByRole('button', { name: 'Replace list root', exact: true })
      .click();
    await expect(list).toHaveJSProperty('tagName', 'SECTION');
    await expect
      .poll(() =>
        page.evaluate(
          (host) =>
            window.hostCompatibility.nativeAutocompletes[host].snapshot().ready,
          host
        )
      )
      .toBe(true);
    await editor.focus();
    await editor.press('ArrowDown');
    await editor.press('Enter');
    await expect
      .poll(() =>
        page.evaluate(
          (host) => window.hostCompatibility.nativeAutocompletes[host].selected,
          host
        )
      )
      .toEqual(['Gamma']);
    await expect(list).toHaveCount(0);
    await query(page, host, 'dismiss');
    await expect
      .poll(() =>
        page.evaluate(
          (host) =>
            window.hostCompatibility.nativeAutocompletes[host].snapshot().ready,
          host
        )
      )
      .toBe(true);
    await editor.press('Escape');
    await expect(list).toHaveCount(0);
    expect(
      await page.evaluate(
        (host) =>
          window.hostCompatibility.nativeAutocompletes[host].keys.at(-1),
        host
      )
    ).toBe('Escape');
  });

  for (const width of [320, 760]) {
    test(`${host} ${width}px custom lists keep direct slots, overlay geometry, and editor focus`, async ({
      page,
    }) => {
      await prepare(page, host, width);
      const editor = page
        .getByTestId(`native-autocomplete-prompt-${host}`)
        .locator('.ProseMirror');
      for (const kind of ['react', 'element'] as const) {
        await mount(page, host, kind);
        const list = page.getByTestId(
          kind === 'react'
            ? 'native-autocomplete-react-list'
            : 'native-autocomplete-borrowed-list'
        );
        await expect(list).toBeVisible();
        await expect
          .poll(() =>
            page.evaluate(
              ({ host, kind, width }) => {
                const probe =
                  window.hostCompatibility.nativeAutocompletes[host];
                const state = probe.snapshot();
                const anchor = state.anchor;
                const root =
                  kind === 'react'
                    ? (state.target?.firstElementChild as HTMLElement)
                    : probe.borrowed;
                const row = anchor?.assignedSlot?.parentElement;
                if (!anchor || !root || !row || !state.ready) {
                  return false;
                }
                const overlay = anchor.getBoundingClientRect();
                const containingRow = row.getBoundingClientRect();
                const withinPixel = (actual: number, expected: number) =>
                  Math.abs(actual - expected) < 1;
                return (
                  anchor.parentElement === probe.shell &&
                  anchor.assignedSlot.name === 'autocomplete-content' &&
                  !anchor.hasAttribute('attached') &&
                  getComputedStyle(anchor).position === 'absolute' &&
                  (state.breakpoint === 'wide') === (width === 760) &&
                  withinPixel(overlay.left, containingRow.left - 8) &&
                  withinPixel(overlay.width, containingRow.width + 24) &&
                  withinPixel(overlay.bottom, containingRow.top - 8) &&
                  root.style.getPropertyValue(
                    '--cds-aichat-autocomplete-max-height'
                  ) === `${Math.floor(state.chatHeight * 0.4)}px` &&
                  (kind !== 'react' ||
                    withinPixel(
                      root.getBoundingClientRect().width,
                      overlay.width
                    ))
                );
              },
              { host, kind, width }
            )
          )
          .toBe(true);
        if (kind === 'react') {
          await expectReactListPlacement(page, host);
        }
        await editor.click();
        await expect(list).toBeVisible();
        if (kind === 'react') {
          await list.getByRole('button').first().click();
        } else {
          await list.click();
        }
        await expect(editor).toBeFocused();
        await editor.press('ArrowDown');
        await expect
          .poll(() =>
            page.evaluate(
              (host) => window.hostCompatibility.nativeAutocompletes[host].keys,
              host
            )
          )
          .toEqual(['ArrowDown']);
        await page.evaluate(
          (host) => window.hostCompatibility.nativeAutocompletes[host].clear(),
          host
        );
        await expect(list).toHaveCount(0);
      }
    });
    test(`${host} ${width}px builtin list keeps direct slot, height cap, editor anchoring, and dismissal`, async ({
      page,
    }) => {
      await prepare(page, host, width);
      await mount(page, host, 'builtin');
      const shell = page.getByTestId(`native-autocomplete-shell-${host}`);
      const editor = page
        .getByTestId(`native-autocomplete-prompt-${host}`)
        .locator('.ProseMirror');
      const list = shell.locator('cds-aichat-autocomplete');
      await expect(list).toBeVisible();
      await page.evaluate(
        (host) =>
          window.hostCompatibility.nativeAutocompletes[host].replaceResults(
            Array.from({ length: 30 }, (_, index) => `Result ${index + 1}`)
          ),
        host
      );
      await expect(list.getByRole('option')).toHaveCount(30);
      await expect(list).toHaveAttribute('slot', 'autocomplete-content');
      await expect
        .poll(() =>
          page.evaluate((host) => {
            const probe = window.hostCompatibility.nativeAutocompletes[host];
            const list = probe.shell.querySelector<HTMLElement>(
              'cds-aichat-autocomplete'
            );
            const state = probe.snapshot();
            return {
              direct: list?.parentElement === probe.shell,
              assigned: Boolean(list?.assignedSlot),
              attached: list?.hasAttribute('attached'),
              cap: list?.style.getPropertyValue(
                '--cds-aichat-autocomplete-max-height'
              ),
              expected: `${Math.floor(state.chatHeight * 0.4)}px`,
              wide: state.breakpoint === 'wide',
            };
          }, host)
        )
        .toEqual({
          direct: true,
          assigned: true,
          attached: width !== 760,
          cap: expect.any(String),
          expected: expect.any(String),
          wide: width === 760,
        });
      expect(
        await page.evaluate((host) => {
          const probe = window.hostCompatibility.nativeAutocompletes[host];
          return (
            probe.shell
              .querySelector<HTMLElement>('cds-aichat-autocomplete')
              .style.getPropertyValue(
                '--cds-aichat-autocomplete-max-height'
              ) === `${Math.floor(probe.snapshot().chatHeight * 0.4)}px`
          );
        }, host)
      ).toBe(true);
      await expect
        .poll(() =>
          page.evaluate((host) => {
            const probe = window.hostCompatibility.nativeAutocompletes[host];
            const listbox = probe.shell
              .querySelector('cds-aichat-autocomplete')
              .shadowRoot.querySelector<HTMLElement>('[role="listbox"]');
            return (
              listbox.clientHeight > 0 &&
              listbox.scrollHeight > listbox.clientHeight &&
              listbox.getBoundingClientRect().height <=
                Math.floor(probe.snapshot().chatHeight * 0.4)
            );
          }, host)
        )
        .toBe(true);
      await editor.click();
      await expect(list).toBeVisible();
      await list.dispatchEvent('mousedown');
      await expect(editor).toBeFocused();
      await editor.press('ArrowDown');
      await expect
        .poll(() =>
          page.evaluate(
            (host) =>
              window.hostCompatibility.nativeAutocompletes[host].native
                .listNavigated,
            host
          )
        )
        .toBe(true);
      await editor.press('Escape');
      await expect(list).toHaveCount(0);
      await query(page, host, 'again');
      await expect(list).toBeVisible();
      await page.locator('body').click({ position: { x: 1100, y: 850 } });
      await expect(list).toHaveCount(0);
    });
  }

  test(`${host} borrows an element directly and retires late readiness after clear and detach`, async ({
    page,
  }) => {
    await prepare(page, host);
    await mount(page, host, 'element');
    const list = page.getByTestId('native-autocomplete-borrowed-list');
    await expect(list).toBeVisible();
    expect(
      await page.evaluate((host) => {
        const probe = window.hostCompatibility.nativeAutocompletes[host];
        const state = probe.snapshot();
        return (
          probe.borrowed === state.anchor?.firstElementChild &&
          probe.borrowed.getRootNode() === probe.native.getRootNode() &&
          state.anchor.parentElement === probe.shell &&
          Boolean(state.anchor.assignedSlot) &&
          !state.anchor.hasAttribute('attached')
        );
      }, host)
    ).toBe(true);
    await list.click();
    expect(
      await page.evaluate(
        (host) =>
          window.hostCompatibility.nativeAutocompletes[host].borrowedClicks,
        host
      )
    ).toBe(1);
    await page.evaluate(
      (host) => window.hostCompatibility.nativeAutocompletes[host].move(),
      host
    );
    await expect(list).toBeVisible();
    await page.evaluate(
      (host) => window.hostCompatibility.nativeAutocompletes[host].clear(),
      host
    );
    await expect(list).toHaveCount(0);
    await query(page, host, 'borrowed again');
    await expect(list).toBeVisible();
    await page.evaluate((host) => {
      const probe = window.hostCompatibility.nativeAutocompletes[host];
      document.body.appendChild(probe.borrowed);
      probe.replaceResults(['Adopted']);
    }, host);
    await expect
      .poll(() =>
        page.evaluate(
          (host) =>
            window.hostCompatibility.nativeAutocompletes[host].borrowed
              .parentElement === document.body,
          host
        )
      )
      .toBe(true);
    await page.evaluate(
      (host) => window.hostCompatibility.nativeAutocompletes[host].clear(),
      host
    );
    expect(
      await page.evaluate(
        (host) =>
          window.hostCompatibility.nativeAutocompletes[host].borrowed
            .parentElement === document.body,
        host
      )
    ).toBe(true);
    await mount(page, host, 'react', true);
    await expect(
      page.getByTestId('native-autocomplete-react-list')
    ).toBeVisible();
    await page.evaluate((host) => {
      const probe = window.hostCompatibility.nativeAutocompletes[host];
      probe.detach();
      probe.releaseReady();
    }, host);
    await expect(
      page.getByTestId('native-autocomplete-react-list')
    ).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(
          (host) =>
            window.hostCompatibility.nativeAutocompletes[host].snapshot().ready,
          host
        )
      )
      .toBe(false);
  });
}

test('two chats keep separate custom-list targets and keyboard listeners', async ({
  page,
}) => {
  await prepare(page, 'wc', 400, true);
  await mount(page, 'react', 'react');
  await mount(page, 'wc', 'react');
  await expect(page.getByTestId('native-autocomplete-react-list')).toHaveCount(
    2
  );
  await expect
    .poll(() =>
      page.evaluate(() =>
        ['react', 'wc'].every(
          (host: Host) =>
            window.hostCompatibility.nativeAutocompletes[host].snapshot().ready
        )
      )
    )
    .toBe(true);
  await page
    .getByTestId('native-autocomplete-prompt-react')
    .locator('.ProseMirror')
    .focus();
  await page
    .getByTestId('native-autocomplete-prompt-react')
    .locator('.ProseMirror')
    .press('ArrowDown');
  expect(
    await page.evaluate(() => ({
      react: window.hostCompatibility.nativeAutocompletes.react.keys,
      wc: window.hostCompatibility.nativeAutocompletes.wc.keys,
      separate:
        window.hostCompatibility.nativeAutocompletes.react.snapshot().target !==
        window.hostCompatibility.nativeAutocompletes.wc.snapshot().target,
    }))
  ).toEqual({ react: ['ArrowDown'], wc: [], separate: true });
  await page.evaluate(() =>
    window.hostCompatibility.nativeAutocompletes.react.detach()
  );
  await expect(page.getByTestId('native-autocomplete-react-list')).toHaveCount(
    1
  );
  await expect(
    page
      .getByTestId('native-autocomplete-react-list')
      .getByRole('button', { name: 'none:0', exact: true })
  ).toBeVisible();
});
