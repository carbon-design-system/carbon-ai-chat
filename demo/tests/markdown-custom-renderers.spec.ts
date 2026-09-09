/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { test, expect } from '@playwright/test';

import {
  destroyChatSession,
  openChatViaLauncher,
  sendChatMessage,
  waitForChatReady,
} from './utils';

// Import types for window.chatInstance without emitting runtime code
import type {} from '../types/window';

/**
 * A `customRenderers.table` result has to end up somewhere a consumer's own
 * stylesheet can reach, which means out of the chat's shadow DOM and into the
 * tree the consumer put the chat element in — the markdown element's own light
 * DOM sits several chat-owned boundaries below that, where a consumer rule
 * stops. No unit harness can see this: jsdom does not flatten slots and has no
 * cascade, and the property is about where in the consumer's page the node
 * lives, not what the element rendered.
 *
 * That tree is not always the document. This demo renders its web-component
 * surfaces inside `<demo-app>`'s shadow root, so there the consumer's
 * stylesheet is one that lives in that shadow root — a boundary the host page
 * owns and the chat must not cross. Each case therefore anchors on the
 * outermost chat element's own root rather than on `document`, which is also
 * what keeps the assertion honest: an implementation that hoisted hosts to
 * `document.body` instead of to the chat element would fail it.
 *
 * The four demo container shapes stack a different number of *chat* shadow
 * boundaries between the markdown element and that root, so each one is a
 * different chance for the chain to break.
 */
const TOPOLOGIES = [
  {
    framework: 'react',
    layout: 'float',
    surface: 'React ChatContainer',
    chatElement: 'cds-aichat-react',
  },
  {
    framework: 'react',
    layout: 'fullscreen',
    surface: 'React ChatCustomElement',
    chatElement: 'cds-aichat-react',
  },
  {
    framework: 'web-component',
    layout: 'float',
    surface: 'cds-aichat-container',
    chatElement: 'cds-aichat-container',
  },
  {
    framework: 'web-component',
    layout: 'fullscreen',
    surface: 'cds-aichat-custom-element',
    chatElement: 'cds-aichat-custom-element',
  },
] as const;

// Distinctive enough that a match cannot be a Carbon default, and set by
// nothing else on the page.
const PAGE_RULE_COLOR = 'rgb(255, 0, 255)';

test.beforeEach(async ({ page }) => {
  // Block analytics script BEFORE navigation to avoid cookie consent issues
  await page.route(/.*ibm-common\.js$/, (route) => route.abort());
});

test.afterEach(async ({ page }) => {
  await destroyChatSession(page);
});

for (const { framework, layout, surface, chatElement } of TOPOLOGIES) {
  test(`a page stylesheet reaches the customRenderers.table node (${surface})`, async ({
    page,
  }) => {
    test.slow();

    const settings = encodeURIComponent(
      JSON.stringify({ framework, layout, markdownCustomRenderers: 'true' })
    );
    await page.goto(`/?settings=${settings}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => Boolean(window.chatInstance), {
      timeout: 10000,
    });

    // The consumer's stylesheet, added to the tree the chat element itself
    // sits in, so it reaches nothing inside the chat's shadow roots — and
    // added before the table renders, so the node is never briefly unstyled
    // for reasons of ordering.
    const chat = page.locator(chatElement);
    await expect(chat).toBeAttached({ timeout: 10000 });
    await chat.evaluate((element, color) => {
      const root = element.getRootNode();
      const style = document.createElement('style');
      style.textContent = `.demo-markdown-custom-table { background-color: ${color}; }`;
      (root instanceof Document ? root.head : (root as ShadowRoot)).appendChild(
        style
      );
    }, PAGE_RULE_COLOR);

    await openChatViaLauncher(page);
    await waitForChatReady(page, { panelTestId: PageObjectId.MAIN_PANEL });

    await sendChatMessage(page, 'table');

    const customTable = page.getByTestId('demo_markdown_custom_table').first();
    await expect(customTable).toBeVisible({ timeout: 15000 });

    // Asserted first because it names the cause: when the chat leaves the host
    // in its own shadow root, the computed-style assertion below fails with
    // nothing to say about why. A root holding the chat element is the
    // consumer's tree; a root holding none is one of the chat's own.
    await expect
      .poll(() =>
        customTable.evaluate(
          (node, tag) =>
            (node.getRootNode() as Document | ShadowRoot).querySelector(tag) !==
            null,
          chatElement
        )
      )
      .toBe(true);

    await expect
      .poll(() =>
        customTable.evaluate((node) => getComputedStyle(node).backgroundColor)
      )
      .toBe(PAGE_RULE_COLOR);
  });
}
