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
 * Copy/paste is not automated here. The manual pass lives in TEST_PLAN.md.
 */

import { test, expect, type Page } from '@playwright/test';

import type {} from '../types/window';

const SURFACES = [
  'react-container',
  'react-custom',
  'wc-container',
  'wc-custom',
] as const;

const CUSTOM_SLOT = 'selection::0.3';

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

async function sendStructuredMessage(page: Page, surface: string) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`/host-compatibility.html?surface=${surface}`);
  // The custom-node host is a block by default. Page CSS reaches it, so the
  // page keeps the paragraph on one line.
  await page.addStyleTag({
    content: `div[slot="${CUSTOM_SLOT}"] { display: inline; }`,
  });
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
    { instanceKey: key, content: PARAGRAPH }
  );
  const paragraph = page
    .locator('.cds-aichat--sent--bubble p')
    .filter({ hasText: 'Start' })
    .last();
  await expect(paragraph).toBeVisible({ timeout: 15000 });
  await expect(
    page.locator('.page-styled[data-kind="inline-plugin"]')
  ).toHaveText('plugin');
  await expect(page.locator('.page-styled[data-kind="input-node"]')).toHaveText(
    'input-node'
  );
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
      if (node instanceof HTMLStyleElement) {
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
      // A quarter glyph in from each edge still resolves the caret before
      // the first character and after the last, without overshooting.
      start: [start.left + start.width / 4, start.top + start.height / 2],
      end: [end.right - end.width / 4, end.top + end.height / 2],
    };
  });
}

for (const surface of SURFACES) {
  test(`dragging across a structured paragraph selects all of it on ${surface}`, async ({
    page,
  }) => {
    const { paragraph, errors } = await sendStructuredMessage(page, surface);
    // The request footer lands under the bubble and the list scrolls again;
    // measure once the paragraph rests.
    await expect(
      page.locator('.page-styled[data-kind="request-footer"]')
    ).toBeVisible();
    let edges = await paragraphEdges(paragraph);
    for (let settled = false; !settled;) {
      await page.waitForTimeout(300);
      const next = await paragraphEdges(paragraph);
      settled = JSON.stringify(next) === JSON.stringify(edges);
      edges = next;
    }
    const { start, end } = edges;

    await page.mouse.move(start[0], start[1]);
    await page.mouse.down();
    await page.mouse.move(end[0], end[1], { steps: 20 });
    await page.mouse.up();

    const { text, selected } = await readSelection(paragraph);
    expect(text).toMatch(/^Start bold .*Ada.* plugin input-node Label end\.$/);
    expect(selected).toBe(text);
    expect(errors).toEqual([]);
  });
}
