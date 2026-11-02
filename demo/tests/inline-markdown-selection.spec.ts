/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * A sent message whose paragraph mixes markdown, a chip, projected plugin
 * output, a custom node, and a custom node's fallback label renders inline and
 * selects as one run of text.
 * Page CSS reach for each kind is covered in `react-host-compatibility.spec.ts`;
 * this spec drives a native drag across all of them on every surface.
 *
 * Native keyboard copy/paste checks the browser clipboard, independently of
 * the composed-selection helper. Safari still has a manual pass in TEST_PLAN.md.
 */

import { test, expect, type Page } from '@playwright/test';

import type {} from '../types/window';

const SURFACES = [
  'react-container',
  'react-custom',
  'wc-container',
  'wc-custom',
] as const;

const PARAGRAPH = [
  { type: 'text', text: 'Start **bold** ' },
  { type: 'mention', attrs: { id: 'ada', label: 'Ada' } },
  { type: 'text', text: ' `plugin` ' },
  { type: 'taskCard', attrs: { label: 'Ship it' } },
  { type: 'text', text: ' ' },
  { type: 'fallbackCard', attrs: { label: 'Label' } },
  { type: 'text', text: ' end.' },
];

test.beforeEach(async ({ page }) => {
  await page.route(/.*ibm-common\.js$/, (route) => route.abort());
});

async function sendStructuredMessage(
  page: Page,
  surface: string,
  content = PARAGRAPH,
  pluginText: string | string[] = 'plugin'
) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`/host-compatibility.html?surface=${surface}`);
  const key = surface.startsWith('react') ? 'reactInstance' : 'wcInstance';
  await page.waitForFunction(
    (instanceKey) => Boolean(window.hostCompatibility?.[instanceKey]),
    key,
    { timeout: 20000 }
  );
  await page.evaluate(
    ({ instanceKey, content }) =>
      window.hostCompatibility[instanceKey as 'reactInstance'].send({
        id: 'selection',
        input: {
          message_type: 'text',
          text: 'Selection proof',
          display_content: {
            type: 'doc',
            content: [{ type: 'paragraph', content }],
          },
        },
      } as never),
    { instanceKey: key, content }
  );
  const paragraph = page
    .locator('span[slot="selection::paragraph.0"]')
    .filter({ hasText: 'Start' })
    .last();
  await expect(paragraph).toBeVisible({ timeout: 15000 });
  await expect(
    page.locator('.page-styled[data-kind="inline-plugin"]')
  ).toHaveText(pluginText);
  await expect(page.locator('.page-styled[data-kind="input-node"]')).toHaveText(
    'input-node'
  );
  await primeClipboard(page);
  return { paragraph, errors };
}

/**
 * The paragraph's text in composed order, and the selection's text measured
 * the same way. Endpoints come from `getComposedRanges` where the engine has
 * it, so a range that crosses a shadow boundary is read in full.
 */
async function readSelection(paragraph: ReturnType<Page['locator']>) {
  return paragraph.evaluate((root) => {
    const positions = new Map<Node, { start: number; end: number }>();
    const shadowRoots: ShadowRoot[] = [];
    let text = '';
    const visit = (node: Node) => {
      const start = text.length;
      if (
        node instanceof HTMLStyleElement ||
        (node instanceof HTMLElement && node.hidden)
      ) {
        positions.set(node, { start, end: start });
        return;
      }
      if (node.nodeType === Node.TEXT_NODE) {
        text += (node as Text).data;
      } else if (node instanceof HTMLSlotElement) {
        const assigned = node.assignedNodes({ flatten: true });
        (assigned.length ? assigned : [...node.childNodes]).forEach(visit);
      } else if (node instanceof Element && node.shadowRoot) {
        shadowRoots.push(node.shadowRoot);
        visit(node.shadowRoot);
      } else {
        node.childNodes.forEach(visit);
      }
      positions.set(node, { start, end: text.length });
    };
    visit(root);
    for (let node = root.getRootNode(); node instanceof ShadowRoot;) {
      shadowRoots.push(node);
      node = node.host.getRootNode();
    }
    const offsetAt = (node: Node, offset: number) => {
      if (!positions.has(node)) {
        throw new Error(
          `Selection ends outside the paragraph: ${node.nodeName} ${JSON.stringify(node.textContent)} in ${node.parentNode?.nodeName}`
        );
      }
      if (node.nodeType === Node.TEXT_NODE) {
        return positions.get(node).start + offset;
      }
      return offset === node.childNodes.length
        ? positions.get(node).end
        : positions.get(node.childNodes[offset]).start;
    };
    const selection = document.getSelection() as Selection & {
      getComposedRanges?: (options: {
        shadowRoots: ShadowRoot[];
      }) => StaticRange[];
    };
    const selected = selection.getComposedRanges
      ? selection
          .getComposedRanges({ shadowRoots })
          .map((range) =>
            text.slice(
              offsetAt(range.startContainer, range.startOffset),
              offsetAt(range.endContainer, range.endOffset)
            )
          )
          .join('')
      : selection.toString();
    return { text, selected };
  });
}

/** Viewport points inside the first and last characters. */
async function paragraphEdges(paragraph: ReturnType<Page['locator']>) {
  return paragraph.evaluate((root) => {
    const texts: Text[] = [];
    const collect = (node: Node) => {
      if (
        node instanceof HTMLStyleElement ||
        (node instanceof HTMLElement && node.hidden)
      ) {
        return;
      }
      if (node instanceof HTMLSlotElement) {
        const assigned = node.assignedNodes({ flatten: true });
        (assigned.length ? assigned : Array.from(node.childNodes)).forEach(
          collect
        );
        return;
      }
      if (node instanceof Element && node.shadowRoot) {
        collect(node.shadowRoot);
        return;
      }
      if (node.nodeType === Node.TEXT_NODE && (node as Text).data.trim()) {
        texts.push(node as Text);
      }
      node.childNodes.forEach(collect);
    };
    collect(root);
    const first = texts[0];
    const last = texts[texts.length - 1];
    const rect = (text: Text, offset: number) => {
      const range = document.createRange();
      range.setStart(text, offset);
      range.setEnd(text, offset + 1);
      return range.getBoundingClientRect();
    };
    const start = rect(first, first.data.indexOf('S'));
    const end = rect(last, last.data.length - 1);
    return {
      // WebKit resolves a point within the final period before the glyph.
      // End just beyond it to include the punctuation in the native drag.
      start: [start.left + start.width / 4, start.top + start.height / 2],
      end: [end.right + 1, end.top + end.height / 2],
    };
  });
}

async function primeClipboard(page: Page) {
  const clipboardPage = await page.context().newPage();
  try {
    await clipboardPage.setContent('<textarea>Clipboard sentinel</textarea>');
    await clipboardPage.getByRole('textbox').focus();
    await clipboardPage.keyboard.press('ControlOrMeta+a');
    await clipboardPage.keyboard.press('ControlOrMeta+c');
  } finally {
    await clipboardPage.close();
  }
}

async function pasteSelection(page: Page) {
  await page.keyboard.press('ControlOrMeta+c');
  // Paste in a separate document so its input selection cannot affect the
  // next word selection in the message's shadow root.
  const targetPage = await page.context().newPage();
  try {
    await targetPage.setContent(
      '<textarea aria-label="Native paste target"></textarea>'
    );
    const target = targetPage.getByRole('textbox');
    await target.focus();
    await targetPage.keyboard.press('ControlOrMeta+v');
    return await target.inputValue();
  } finally {
    await targetPage.close();
  }
}

for (const surface of SURFACES) {
  test(`dragging across a structured paragraph copies all of it on ${surface}`, async ({
    page,
  }) => {
    const { paragraph, errors } = await sendStructuredMessage(page, surface);
    // The request footer lands under the bubble and the list scrolls again;
    // measure once the paragraph rests.
    await expect(
      page.locator('.page-styled[data-kind="request-footer"]')
    ).toBeVisible();
    let edges = await paragraphEdges(paragraph);
    await expect
      .poll(
        async () => {
          const next = await paragraphEdges(paragraph);
          const settled = JSON.stringify(next) === JSON.stringify(edges);
          edges = next;
          return settled;
        },
        { intervals: [300] }
      )
      .toBe(true);
    const { start, end } = edges;

    await page.mouse.move(start[0], start[1]);
    await page.mouse.down();
    await page.mouse.move(end[0], end[1], { steps: 20 });
    await page.mouse.up();

    const { text, selected } = await readSelection(paragraph);
    expect(text).toMatch(/^Start bold .*Ada.* plugin input-node Label end\.$/);
    expect(selected).toBe(text);
    expect(await pasteSelection(page)).toBe(
      'Start bold Ada plugin input-node Label end.'
    );
    expect(errors).toEqual([]);
  });
}

for (const surface of SURFACES) {
  test(`structured fallback preserves blank lines on ${surface}`, async ({
    page,
  }) => {
    const source = 'Start first\n\nsecond ';
    const { paragraph, errors } = await sendStructuredMessage(page, surface, [
      { type: 'text', text: source },
      ...PARAGRAPH.slice(1),
    ]);
    const fallback = paragraph.locator('.cds-aichat--inline-markdown-fallback');
    await expect(fallback).toBeVisible();
    await expect(fallback).toHaveJSProperty('textContent', source);
    await expect(fallback).toHaveCSS('white-space', 'pre-wrap');
    const lineGap = await fallback.evaluate((element) => {
      const text = [...element.childNodes].find(
        (node) => node.nodeType === Node.TEXT_NODE
      ) as Text;
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, 1);
      const firstLine = range.getBoundingClientRect().top;
      const secondStart = text.data.indexOf('second');
      range.setStart(text, secondStart);
      range.setEnd(text, secondStart + 1);
      return (
        (range.getBoundingClientRect().top - firstLine) /
        parseFloat(getComputedStyle(element).lineHeight)
      );
    });
    expect(lineGap).toBeCloseTo(2, 1);
    expect(errors).toEqual([]);
  });
}

for (const surface of SURFACES) {
  test(`double-click copies words across inline boundaries on ${surface}`, async ({
    page,
  }) => {
    const { paragraph, errors } = await sendStructuredMessage(page, surface, [
      ...PARAGRAPH,
      { type: 'text', text: ' cross**bound**ary' },
    ]);
    await expect(
      page.locator('.page-styled[data-kind="request-footer"]')
    ).toBeVisible();
    for (const [word, expected] of [
      [paragraph.locator('strong').last(), 'crossboundary'],
      [page.locator('.page-styled[data-kind="inline-plugin"]'), 'plugin'],
    ] as const) {
      await word.dblclick();
      expect(await pasteSelection(page)).toBe(expected);
    }
    const node = page.locator('.page-styled[data-kind="input-node"]');
    await node.dblclick({ position: { x: 5, y: 5 } });
    expect(await pasteSelection(page)).toMatch(/^(input|input-node)$/);
    expect(errors).toEqual([]);
  });
}

for (const surface of SURFACES) {
  for (const [source, expected, pluginText = 'plugin'] of [
    [' `plugin words` ', 'plugin', 'plugin words'],
    [' pre`plugin`post ', 'prepluginpost'],
    [' pre`plugin` ', 'preplugin'],
    [' `plugin`post ', 'pluginpost'],
    [' `plugin`**post** ', 'pluginpost'],
    [
      ' pre`plugin`**mid**`plugin`post ',
      'prepluginmidpluginpost',
      ['plugin', 'plugin'],
    ],
  ] as const) {
    test(`double-click copies ${source} as ${expected} on ${surface}`, async ({
      page,
    }) => {
      const content = PARAGRAPH.map((node, index) =>
        index === 2 ? { type: 'text', text: source } : node
      );
      const { errors } = await sendStructuredMessage(
        page,
        surface,
        content,
        pluginText
      );
      await expect(
        page.locator('.page-styled[data-kind="request-footer"]')
      ).toBeVisible();
      const plugin = page
        .locator('.page-styled[data-kind="inline-plugin"]')
        .first();
      await plugin.dblclick({ position: { x: 5, y: 5 } });
      expect(await pasteSelection(page)).toBe(expected);
      expect(errors).toEqual([]);
    });
  }
}

for (const surface of SURFACES) {
  test(`double-click joins custom-node text with surrounding text on ${surface}`, async ({
    page,
  }) => {
    await sendStructuredMessage(page, surface, [
      { type: 'text', text: 'Start pre' },
      { type: 'taskCard', attrs: { label: 'Ship it' } },
      { type: 'text', text: 'post `plugin` end.' },
    ]);
    const node = page.locator('.page-styled[data-kind="input-node"]');
    await node.dblclick({ position: { x: 5, y: 5 } });
    // Engines differ on hyphen segmentation; both native words include the prefix.
    expect(await pasteSelection(page)).toMatch(/^preinput(?:-nodepost)?$/);
  });
}

for (const surface of SURFACES) {
  test(`core markdown copies full paragraphs and words across plugins on ${surface}`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/host-compatibility.html?surface=${surface}`);
    const key = surface.startsWith('react') ? 'reactInstance' : 'wcInstance';
    await page.waitForFunction(
      (instanceKey) => Boolean(window.hostCompatibility?.[instanceKey]),
      key
    );
    await page.evaluate(
      (instanceKey) =>
        window.hostCompatibility[
          instanceKey as 'reactInstance'
        ].messaging.addMessage({
          id: 'core-selection',
          output: {
            generic: [
              {
                response_type: 'text',
                text: 'Start core **bold** `plugin`**post** and pre`again`**mid**`last`end.',
              },
            ],
          },
        }),
      key
    );
    const paragraph = page
      .locator('cds-aichat-markdown p')
      .filter({ hasText: 'Start core' })
      .last();
    await expect(paragraph).toBeVisible();
    const plugins = page.locator('.page-styled[data-kind="inline-plugin"]');
    await expect(plugins).toHaveText(['plugin', 'again', 'last']);
    await primeClipboard(page);
    let edges = await paragraphEdges(paragraph);
    await expect
      .poll(
        async () => {
          const next = await paragraphEdges(paragraph);
          const settled = JSON.stringify(next) === JSON.stringify(edges);
          edges = next;
          return settled;
        },
        { intervals: [300] }
      )
      .toBe(true);
    await page.mouse.move(edges.start[0], edges.start[1]);
    await page.mouse.down();
    await page.mouse.move(edges.end[0], edges.end[1], { steps: 20 });
    await page.mouse.up();
    expect(await pasteSelection(page)).toBe(
      'Start core bold pluginpost and preagainmidlastend.'
    );
    // Dragging within the existing selection can start a native text drag.
    await page.evaluate(() => document.getSelection()?.removeAllRanges());
    const start = await plugins.first().boundingBox();
    const end = await plugins.last().boundingBox();
    await page.mouse.move(start.x + 1, start.y + start.height / 2);
    await page.mouse.down();
    await page.mouse.move(end.x + end.width + 1, end.y + end.height / 2, {
      steps: 20,
    });
    await page.mouse.up();
    expect(await pasteSelection(page)).toBe('pluginpost and preagainmidlast');
    for (const [index, expected] of [
      [0, 'pluginpost'],
      [1, 'preagainmidlastend'],
    ] as const) {
      await plugins.nth(index).dblclick({ position: { x: 5, y: 5 } });
      expect(await pasteSelection(page)).toBe(expected);
    }
    expect(errors).toEqual([]);
  });
}
