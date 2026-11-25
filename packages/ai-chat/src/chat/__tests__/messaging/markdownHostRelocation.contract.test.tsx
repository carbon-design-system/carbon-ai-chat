/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import type MarkdownIt from 'markdown-it';
import {
  type ChatInstance,
  type MarkdownItPlugin,
  PageObjectId,
} from '../../../aiChatEntry';
import {
  allByRole,
  byTestId,
  contractSetup,
  getByTestId,
  isShownWithin,
  openElement,
  textResponse,
} from '../helpers/contract';

const PROBE_TAG = 'contract-relocation-probe';

/** Each probe's first connect, and whether it showed in the main panel then. */
const firstConnects: Array<{ probe: HTMLElement; shown: boolean }> = [];

/**
 * Stands in for consumer content that measures itself when it connects, such
 * as a chart or a Carbon component.
 */
class RelocationProbe extends HTMLElement {
  connectedCallback() {
    if (firstConnects.some(({ probe }) => probe === this)) {
      return;
    }
    const panel = byTestId(PageObjectId.MAIN_PANEL);
    firstConnects.push({
      probe: this,
      shown: Boolean(panel) && isShownWithin(this, panel),
    });
  }
}

if (!customElements.get(PROBE_TAG)) {
  customElements.define(PROBE_TAG, RelocationProbe);
}

/** A plugin that renders a fenced code block as a probe holding its code. */
function fenceAsProbe(md: MarkdownIt): void {
  md.renderer.rules.fence = (tokens, index) =>
    `<p><${PROBE_TAG}>${tokens[index].content.trim()}</${PROBE_TAG}></p>`;
}

/** A plugin that renders a fenced code block as a link to its code. */
function fenceAsLink(md: MarkdownIt): void {
  md.renderer.rules.fence = (tokens, index) => {
    const content = tokens[index].content.trim();
    return `<p><a href="https://example.com/${content}">${content}</a></p>`;
  };
}

const asPlugins = (...plugins: unknown[]) => plugins as MarkdownItPlugin[];

/** Adds an assistant response with this text inside `act`. */
async function addText(instance: ChatInstance, id: string, text: string) {
  await act(() => instance.messaging.addMessage(textResponse(text, id)));
}

function shownInMainPanel(node: Node): boolean {
  return isShownWithin(node, getByTestId(PageObjectId.MAIN_PANEL));
}

describe('public markdown host relocation on cds-aichat-custom-element', () => {
  contractSetup();

  beforeEach(() => {
    firstConnects.length = 0;
  });

  it('shows a markdown plugin’s block output in the main panel from its first connect', async () => {
    const mount = await openElement('cds-aichat-custom-element', {
      markdown: { markdownItPlugins: asPlugins(fenceAsProbe) },
    });
    try {
      await addText(
        mount.instance,
        'fallback-probe',
        '```\nFallback probe\n```'
      );
      await waitFor(() => expect(firstConnects.length).toBeGreaterThan(0));
      const [{ probe }] = firstConnects;
      expect(probe.textContent).toBe('Fallback probe');
      expect(firstConnects.map(({ shown }) => shown)).not.toContain(false);
      expect(shownInMainPanel(probe)).toBe(true);
      // The element hosts it in its light DOM, so page CSS reaches it.
      expect(mount.element.contains(probe)).toBe(true);
    } finally {
      await act(async () => mount.remove());
    }
  });

  it('shows a codeBlock renderer’s element in the main panel from its first connect, from the element’s own light DOM', async () => {
    const out = document.createElement(PROBE_TAG);
    out.textContent = 'Renderer probe';
    const codeBlock = vi.fn(() => out);
    const mount = await openElement('cds-aichat-custom-element', {
      markdown: { customRenderers: { codeBlock } },
    });
    try {
      await addText(mount.instance, 'renderer-probe', '```js\nlet x = 1;\n```');
      await waitFor(() => expect(firstConnects).toHaveLength(1));
      expect(codeBlock).toHaveBeenCalled();
      expect(firstConnects[0].probe).toBe(out);
      expect(firstConnects[0].shown).toBe(true);
      expect(shownInMainPanel(out)).toBe(true);
      expect(mount.element.contains(out)).toBe(true);
    } finally {
      await act(async () => mount.remove());
    }
  });

  it('hosts a markdown plugin’s block output once, in the element’s own light DOM, and shows it in the main panel', async () => {
    const mount = await openElement('cds-aichat-custom-element', {
      markdown: { markdownItPlugins: asPlugins(fenceAsLink) },
    });
    try {
      await addText(
        mount.instance,
        'hosted-block',
        '```\nhosted-block-link\n```'
      );
      const shownLinks = () =>
        allByRole('link', 'hosted-block-link').filter(shownInMainPanel);
      await waitFor(() => expect(shownLinks()).toHaveLength(1));
      expect(allByRole('link', 'hosted-block-link')).toHaveLength(1);
      const [link] = shownLinks();
      // Page CSS, such as a KaTeX stylesheet, reaches only the page's own
      // light DOM.
      expect(mount.element.contains(link)).toBe(true);
    } finally {
      await act(async () => mount.remove());
    }
  });
});
