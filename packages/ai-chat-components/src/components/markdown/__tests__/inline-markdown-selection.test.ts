/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { expect } from '@open-wc/testing';
import { resetMouse, sendMouse, sendKeys } from '@web/test-runner-commands';
import { html, render } from 'lit';
import { renderInlineMarkdown } from '../src/inline-markdown.js';
import { renderTokenChip } from '../../prompt-line/src/tiptap/render-token-chip.js';

import {
  point,
  selectedText,
  drag,
  selectionFixture,
  wordPlugin,
} from './inline-selection-fixture.js';

// Firefox resets the selection anchor across slots: https://github.com/carbon-design-system/carbon-ai-chat/issues/2394
const isFirefox = navigator.userAgent.includes('Firefox/');

interface BoundaryCase {
  depth: number;
  slotted: boolean;
  partial: boolean;
  reverse: boolean;
}

const BOUNDARY_CASES: BoundaryCase[] = [0, 1, 2].flatMap((depth) =>
  [false, true].flatMap((slotted) =>
    [false, true].flatMap((partial) =>
      [false, true].map((reverse) => ({ depth, slotted, partial, reverse }))
    )
  )
);

/** The approved Firefox skips: a full reverse drag into a slot inside a shadow root. */
function firefoxSkipsBoundary({
  depth,
  slotted,
  partial,
  reverse,
}: BoundaryCase) {
  return depth > 0 && slotted && !partial && reverse;
}

/** A paragraph of text, a chip, and a custom span, `depth` shadow roots deep. */
function boundaryParagraph(
  host: HTMLElement,
  roots: ShadowRoot[],
  depth: number,
  slotted: boolean
) {
  let root: HTMLElement | ShadowRoot = host;
  for (let index = 0; index < depth; index += 1) {
    const container = document.createElement('div');
    root.appendChild(container);
    const shadow = container.attachShadow({ mode: 'open' });
    roots.push(shadow);
    root = shadow;
  }
  const paragraph = document.createElement('p');
  const first = document.createTextNode('before ');
  const last = document.createTextNode(' after');
  const custom = document.createElement('span');
  custom.textContent = 'custom';
  const chip = renderTokenChip({
    attrs: { label: 'chip' },
    type: 'mention',
    context: 'historical',
  });
  paragraph.append(first, chip, ' ');
  if (slotted && root instanceof ShadowRoot) {
    custom.slot = 'custom';
    root.host.appendChild(custom);
    const slot = document.createElement('slot');
    slot.name = 'custom';
    paragraph.append(slot);
  } else {
    paragraph.append(custom);
  }
  paragraph.append(last);
  root.appendChild(paragraph);
  return { first, last, custom };
}

/** The live selection, for an assertion message. */
function describeSelection(roots: ShadowRoot[]) {
  const selection = window.getSelection() as
    | (Selection & {
        getComposedRanges?: (options: {
          shadowRoots: ShadowRoot[];
        }) => StaticRange[];
      })
    | null;
  return {
    native: selection?.toString(),
    anchor: selection?.anchorNode?.textContent,
    anchorOffset: selection?.anchorOffset,
    focus: selection?.focusNode?.textContent,
    focusOffset: selection?.focusOffset,
    composed: selection
      ?.getComposedRanges?.({ shadowRoots: roots })
      .map((range: StaticRange) => ({
        start: range.startContainer.textContent,
        startOffset: range.startOffset,
        end: range.endContainer.textContent,
        endOffset: range.endOffset,
      })),
  };
}

describe('inline paragraph native selection boundary prerequisite', () => {
  let host: HTMLDivElement;
  const roots: ShadowRoot[] = [];

  afterEach(async () => {
    await resetMouse();
    window.getSelection()?.removeAllRanges();
    host.remove();
    roots.length = 0;
  });

  for (const testCase of BOUNDARY_CASES) {
    const { depth, slotted, partial, reverse } = testCase;
    const test = isFirefox && firefoxSkipsBoundary(testCase) ? it.skip : it;
    test(`selects across a custom span at depth ${depth} (slotted: ${slotted}, partial: ${partial}, reverse: ${reverse})`, async () => {
      host = document.createElement('div');
      host.style.cssText = 'font: 20px monospace; margin: 40px;';
      document.body.append(host);
      const { first, last, custom } = boundaryParagraph(
        host,
        roots,
        depth,
        slotted
      );
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve())
      );
      const start = point(first, 0);
      const end = partial
        ? point(custom.firstChild as Text, 3)
        : point(last, last.length - 1);
      if (!partial) {
        const endRange = document.createRange();
        endRange.selectNodeContents(last);
        end[0] = Math.floor(endRange.getBoundingClientRect().right) - 1;
      }
      await drag(reverse ? end : start, reverse ? start : end);
      expect(
        selectedText(host, roots),
        JSON.stringify({ ...describeSelection(roots), start, end })
      ).to.equal(partial ? 'before chip cus' : 'before chip custom after');
    });
  }
});

describe('renderInlineMarkdown native selection', () => {
  let fixture: Awaited<ReturnType<typeof selectionFixture>>;

  afterEach(async () => {
    await resetMouse();
    window.getSelection()?.removeAllRanges();
    fixture?.dispose();
  });

  for (const depth of [0, 1, 2]) {
    for (const reverse of [false, true]) {
      const test = isFirefox && depth > 0 && reverse ? it.skip : it;
      test(`selects the composed message at depth ${depth}, reverse ${reverse}`, async () => {
        fixture = await selectionFixture(depth);
        const before = document.createElement('div');
        before.textContent = 'outside before';
        const after = document.createElement('div');
        after.textContent = 'outside after';
        fixture.paragraph.parentNode!.insertBefore(before, fixture.paragraph);
        fixture.paragraph.after(after);
        const first = Array.from(fixture.paragraph.childNodes).find(
          (node) => node.nodeType === Node.TEXT_NODE
        ) as Text;
        const last = document
          .createTreeWalker(
            fixture.paragraph.lastElementChild!,
            NodeFilter.SHOW_TEXT
          )
          .nextNode() as Text;
        const start = point(first, 0);
        const end = point(last, last.length - 1);
        const range = document.createRange();
        range.selectNodeContents(last);
        end[0] = Math.floor(range.getBoundingClientRect().right) - 1;
        await drag(reverse ? end : start, reverse ? start : end);
        expect(selectedText(fixture.paragraph, fixture.roots)).to.equal(
          'before styled chip host custom after'
        );
      });
    }
    for (const styled of [false, true]) {
      it(`selects only part of ${styled ? 'styled' : 'plain'} text at depth ${depth}`, async () => {
        fixture = await selectionFixture(depth);
        render(
          renderInlineMarkdown(styled ? '**abcdef**' : 'abcdef'),
          fixture.paragraph
        );
        const text = document
          .createTreeWalker(
            (fixture.paragraph.querySelector('strong') ??
              fixture.paragraph.querySelector('span'))!,
            NodeFilter.SHOW_TEXT
          )
          .nextNode() as Text;
        await drag(point(text, 1), point(text, 4));
        expect(selectedText(fixture.paragraph, fixture.roots)).to.equal('bcd');
      });
    }
    it(`wraps adjacent runs without gaps at depth ${depth}`, async () => {
      fixture = await selectionFixture(depth);
      fixture.paragraph.style.width = '90px';
      render(
        html`${renderInlineMarkdown('inter')}${renderInlineMarkdown('national longer text')}`,
        fixture.paragraph
      );
      expect(fixture.paragraph.textContent).to.equal(
        'international longer text'
      );
      const spans = fixture.paragraph.querySelectorAll('span');
      expect(getComputedStyle(spans[0]).display).to.equal('inline');
      expect(spans[1].getClientRects().length).to.be.greaterThan(1);
    });
  }

  for (const projected of [false, true]) {
    it(`styles plugin output in two roots (projected: ${projected})`, async () => {
      fixture = await selectionFixture(2, projected);
      render(
        html`before
        ${renderInlineMarkdown('`plugin`', { markdownItPlugins: [wordPlugin], projectPluginOutput: projected })}
        after`,
        fixture.paragraph
      );
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve())
      );
      const plugin = (
        projected ? fixture.host : fixture.paragraph
      ).querySelector('.selection-plugin')!;
      expect(plugin).to.exist;
      expect(getComputedStyle(plugin).color).to.equal('rgb(1, 2, 3)');
      expect(getComputedStyle(plugin).display).to.equal('inline');
      expect(plugin.getBoundingClientRect().height).to.be.greaterThan(0);
    });
  }

  for (const depth of [0, 1, 2]) {
    it(`selects all paragraphs and chip labels in an isolated frame at depth ${depth}`, async () => {
      fixture = await selectionFixture(depth);
      const frame = document.createElement('iframe');
      frame.style.cssText = 'width: 900px; height: 300px;';
      document.body.appendChild(frame);
      try {
        const doc = frame.contentDocument!;
        const second = document.createElement('p');
        second.textContent = 'ending';
        fixture.paragraph.after(second);
        doc.body.appendChild(fixture.host);
        const first = document
          .createTreeWalker(fixture.paragraph, NodeFilter.SHOW_TEXT)
          .nextNode() as Text;
        const local = point(first, 1);
        const frameRect = frame.getBoundingClientRect();
        await sendMouse({
          type: 'click',
          position: [
            Math.round(frameRect.left + frame.clientLeft + local[0]),
            Math.round(frameRect.top + frame.clientTop + local[1]),
          ],
        });
        await sendKeys({
          press: navigator.platform.includes('Mac') ? 'Meta+A' : 'Control+A',
        });
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        );
        expect(
          selectedText(doc.documentElement, fixture.roots),
          JSON.stringify({
            native: doc.getSelection()?.toString(),
            anchor: doc.getSelection()?.anchorNode?.textContent,
            anchorOffset: doc.getSelection()?.anchorOffset,
            focus: doc.getSelection()?.focusNode?.textContent,
            focusOffset: doc.getSelection()?.focusOffset,
          })
        ).to.equal('before styled chip host custom after\n\nending');
      } finally {
        frame.remove();
      }
    });
  }
});
