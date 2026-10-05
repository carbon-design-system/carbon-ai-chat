/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import { drawSelection, EditorView } from '@codemirror/view';

import { createCarbonTheme } from '../src/codemirror/theme.js';

describe('Carbon editor theme', () => {
  it('preserves horizontal scrolling when the widest line leaves the viewport', async () => {
    const container = await fixture<HTMLElement>(html`
      <div
        style="width: 400px; height: 300px; overflow: auto; --cds-snippet-max-height: none;"></div>
    `);
    const lines = Array.from({ length: 2000 }, (_, index) => `// row ${index}`);
    lines[3] = 'x'.repeat(1200);
    const view = new EditorView({
      parent: container,
      doc: lines.join('\n'),
      extensions: [createCarbonTheme()],
    });

    try {
      await waitUntil(() => view.scrollDOM.scrollWidth > 5000);
      await new Promise<void>((resolve) => {
        view.requestMeasure({ read: () => undefined, write: () => resolve() });
      });
      const originalWidth = view.scrollDOM.scrollWidth;
      const widestLine = view.state.doc.line(4);
      view.scrollDOM.scrollLeft = 1000;
      await waitUntil(() => view.scrollDOM.scrollLeft === 1000);
      container.scrollTop = 10000;
      view.requestMeasure();
      await waitUntil(() => view.viewport.from > widestLine.to);
      expect(view.scrollDOM.scrollLeft).to.equal(1000);
      expect(view.scrollDOM.scrollWidth).to.be.at.least(originalWidth - 1);

      view.dispatch({
        changes: {
          from: widestLine.from,
          to: widestLine.to,
          insert: '// short',
        },
      });
      await waitUntil(
        () => view.scrollDOM.scrollWidth === view.scrollDOM.clientWidth
      );
      expect(view.scrollDOM.scrollLeft).to.equal(0);
    } finally {
      view.destroy();
    }
  });

  it('uses the Carbon highlight color for a focused selection', async () => {
    const container = await fixture<HTMLElement>(html`
      <div style="--cds-highlight: rgb(12, 34, 56);"></div>
    `);
    const view = new EditorView({
      parent: container,
      doc: 'selected text',
      selection: { anchor: 0, head: 8 },
      extensions: [
        drawSelection(),
        EditorView.theme({}, { dark: true }),
        createCarbonTheme(),
      ],
    });

    try {
      view.focus();
      await waitUntil(
        () =>
          view.dom.classList.contains('cm-focused') &&
          !!view.dom.querySelector('.cm-selectionBackground')
      );
      const selection = view.dom.querySelector('.cm-selectionBackground')!;
      expect(getComputedStyle(selection).backgroundColor).to.equal(
        'rgb(12, 34, 56)'
      );
    } finally {
      view.destroy();
    }
  });
});
