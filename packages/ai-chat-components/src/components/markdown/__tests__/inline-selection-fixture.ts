/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { expect } from '@open-wc/testing';
import { sendMouse } from '@web/test-runner-commands';
import { html, render } from 'lit';
import type MarkdownIt from 'markdown-it';
import {
  renderInlineMarkdown,
  inlineMarkdownStyles,
} from '../src/inline-markdown.js';
import { renderTokenChip } from '../../prompt-line/src/tiptap/render-token-chip.js';
import { createMarkdownPluginHostController } from '../src/utils/plugin-host-container.js';

export const wordPlugin = (md: MarkdownIt) => {
  md.renderer.rules.code_inline = (tokens, index) =>
    `<span class="selection-plugin">${tokens[index].content}</span>`;
};

export async function selectionFixture(depth: number, projected = false) {
  const host = document.createElement('div');
  host.style.cssText = 'font: 20px monospace; margin: 40px;';
  document.body.append(host);
  let root: HTMLElement | ShadowRoot = host;
  const roots: ShadowRoot[] = [];
  for (let index = 0; index < depth; index += 1) {
    const container = index === 0 ? host : document.createElement('div');
    if (index > 0) {
      root.appendChild(container);
    }
    root = container.attachShadow({ mode: 'open' });
    roots.push(root);
  }
  const style = document.createElement('style');
  style.textContent = inlineMarkdownStyles.cssText;
  root.appendChild(style);
  const pluginStyle = document.createElement('style');
  pluginStyle.textContent =
    '.selection-plugin { color: rgb(1, 2, 3); font-style: italic; }';
  (projected ? host : root).appendChild(pluginStyle);
  const controller = createMarkdownPluginHostController(host, {
    onSlotNamesChange(names) {
      for (let index = 1; index < roots.length; index += 1) {
        roots[index].host
          .querySelectorAll('slot[data-forward]')
          .forEach((node) => node.remove());
        for (const name of names) {
          const slot = document.createElement('slot');
          slot.name = name;
          slot.slot = name;
          slot.dataset.forward = '';
          roots[index].host.appendChild(slot);
        }
      }
    },
  });
  controller.connect();
  const paragraph = document.createElement('p');
  paragraph.style.margin = '0';
  const message = document.createElement('div');
  root.appendChild(message);
  message.appendChild(paragraph);
  const chip = renderTokenChip({
    attrs: { label: 'chip' },
    type: 'mention',
    context: 'historical',
  });
  const custom = document.createElement('span');
  custom.textContent = 'custom';
  if (root instanceof ShadowRoot) {
    custom.slot = 'custom';
    root.host.appendChild(custom);
  }
  render(
    html`${['before ', renderInlineMarkdown('**styled**'), ' ', chip, ' ', html`<span>host</span>`, ' ', root instanceof ShadowRoot ? html`<slot name="custom"></slot>` : custom, ' ', renderInlineMarkdown('after')]}`,
    paragraph
  );
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  return {
    host,
    root,
    roots,
    paragraph,
    controller,
    dispose() {
      render(null, paragraph);
      controller.disconnect();
      host.remove();
    },
  };
}

export function point(text: Text, offset: number): [number, number] {
  const range = document.createRange();
  range.setStart(text, offset);
  range.setEnd(text, offset + 1);
  const rect = range.getBoundingClientRect();
  return [Math.round(rect.left), Math.round(rect.top + rect.height / 2)];
}

export function selectedText(host: HTMLElement, roots: ShadowRoot[]): string {
  const selection = host.ownerDocument.getSelection();
  const composed = selection as Selection & {
    getComposedRanges?: (options: {
      shadowRoots: ShadowRoot[];
    }) => StaticRange[];
  };
  if (!composed?.getComposedRanges) {
    return selection?.toString() ?? '';
  }
  const positions = new Map<Node, { start: number; end: number }>();
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
      (assigned.length ? assigned : Array.from(node.childNodes)).forEach(visit);
    } else if (node instanceof Element && node.shadowRoot) {
      visit(node.shadowRoot);
    } else {
      node.childNodes.forEach(visit);
    }
    positions.set(node, { start, end: text.length });
    if (node.nodeName === 'P' && node.nextSibling?.nodeName === 'P') {
      text += '\n\n';
    }
  };
  visit(host);
  const offsetAt = (node: Node, offset: number) => {
    const position = positions.get(node);
    expect(
      position,
      `Selection endpoint missing from composed tree: ${node.nodeName}`
    ).to.exist;
    if (node.nodeType === Node.TEXT_NODE) {
      return position!.start + offset;
    }
    if (offset === node.childNodes.length) {
      return position!.end;
    }
    return positions.get(node.childNodes[offset])!.start;
  };
  return composed
    .getComposedRanges({ shadowRoots: roots })
    .map((range) =>
      text.slice(
        offsetAt(range.startContainer, range.startOffset),
        offsetAt(range.endContainer, range.endOffset)
      )
    )
    .join('');
}

export async function drag(start: [number, number], end: [number, number]) {
  await new Promise((resolve) => setTimeout(resolve, 600));
  await sendMouse({ type: 'move', position: start });
  await sendMouse({ type: 'down' });
  for (let step = 1; step <= 20; step += 1) {
    await sendMouse({
      type: 'move',
      position: [
        Math.round(start[0] + ((end[0] - start[0]) * step) / 20),
        end[1],
      ],
    });
  }
  await sendMouse({ type: 'up' });
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );
}
