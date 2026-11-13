/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { fixture, html, expect } from '@open-wc/testing';
import type { JSONContent } from '@tiptap/core';
import prefix from '../../../globals/settings.js';
import '../index.js';
import type CDSAIChatUserMessageContent from '../src/user-message-content.js';

const blockClass = `${prefix}-user-message-content`;

const text = (value: string): JSONContent => ({ type: 'text', text: value });
const paragraph = (...content: JSONContent[]): JSONContent => ({
  type: 'paragraph',
  content,
});
const doc = (...content: JSONContent[]): JSONContent => ({
  type: 'doc',
  content,
});
const mention = (label: string): JSONContent => ({
  type: 'mention',
  attrs: { id: label, label },
});

async function render(
  content: JSONContent,
  attributes: Partial<CDSAIChatUserMessageContent> = {}
) {
  const el = await fixture<CDSAIChatUserMessageContent>(html`
    <cds-aichat-user-message-content
      slot-prefix="msg-1"
      .content=${content}
      .markdownItPlugins=${attributes.markdownItPlugins}
      .customRenderers=${attributes.customRenderers}>
    </cds-aichat-user-message-content>
  `);
  await el.updateComplete;
  return el;
}

describe(blockClass, () => {
  it('renders nothing without content', async () => {
    const el = await fixture<CDSAIChatUserMessageContent>(
      html`<cds-aichat-user-message-content></cds-aichat-user-message-content>`
    );
    expect(el.shadowRoot!.querySelector('cds-aichat-markdown')).to.be.null;
    expect(el.shadowRoot!.querySelector('slot')).to.be.null;
  });

  describe('text-only documents', () => {
    it('uses the block markdown element', async () => {
      const el = await render(
        doc(paragraph(text('Hello **world**')), paragraph(text('Second line')))
      );
      const markdown = el.shadowRoot!.querySelector('cds-aichat-markdown')!;
      expect(markdown).to.exist;
      expect((markdown as any).markdown).to.equal(
        'Hello **world**\nSecond line'
      );
      expect(el.shadowRoot!.querySelector(`.${blockClass}__content`)).to.be
        .null;
    });

    it('joins hard breaks as newlines', async () => {
      const el = await render(
        doc(paragraph(text('one'), { type: 'hardBreak' }, text('two')))
      );
      const markdown = el.shadowRoot!.querySelector('cds-aichat-markdown')!;
      expect((markdown as any).markdown).to.equal('one\ntwo');
    });
  });

  describe('documents with chips and custom nodes', () => {
    const content = doc(
      paragraph(
        text('Ask '),
        mention('Alice'),
        text(' to **review** '),
        { type: 'widget', attrs: { label: 'Chart 4', id: 'w1' } },
        text(' today')
      )
    );

    it('renders text, a chip, and a custom node in document order', async () => {
      const el = await render(content);
      const root = el.shadowRoot!;
      expect(root.querySelector('cds-aichat-markdown')).to.be.null;

      const paragraphEl = root.querySelector('p')!;
      const flow = paragraphEl.textContent!.replace(/\s+/g, ' ').trim();
      expect(flow).to.equal('Ask Alice to review Chart 4 today');
      expect(paragraphEl.querySelector('.cds-aichat--token')).to.exist;
      expect(paragraphEl.querySelector('strong')!.textContent).to.equal(
        'review'
      );

      const slots = Array.from(root.querySelectorAll('slot')).map((slot) =>
        slot.getAttribute('name')
      );
      expect(slots).to.deep.equal(['msg-1::0.1', 'msg-1::0.3']);
    });

    it('shows the node label when a custom slot is empty', async () => {
      const el = await render(content);
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>(
        'slot[name="msg-1::0.3"]'
      )!;
      expect(slot.assignedNodes()).to.have.length(0);
      expect(slot.textContent).to.equal('Chart 4');
    });

    it('falls back to the value attribute when there is no label', async () => {
      const el = await render(
        doc(
          paragraph(text('See '), {
            type: 'widget',
            attrs: { value: 'raw-value' },
          })
        )
      );
      const slot = el.shadowRoot!.querySelector('slot[name="msg-1::0.1"]')!;
      expect(slot.textContent).to.equal('raw-value');
    });

    it('lets the host fill a slot', async () => {
      const el = await fixture<CDSAIChatUserMessageContent>(html`
        <cds-aichat-user-message-content
          slot-prefix="msg-1"
          .content=${content}>
          <span slot="msg-1::0.3" id="host-widget">Host chart</span>
        </cds-aichat-user-message-content>
      `);
      await el.updateComplete;
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>(
        'slot[name="msg-1::0.3"]'
      )!;
      expect(slot.assignedElements()[0].id).to.equal('host-widget');
    });

    it('slots a top-level unknown node by its index', async () => {
      const el = await render(
        doc(paragraph(text('Intro'), mention('Bob')), {
          type: 'codeBlock',
          attrs: { label: 'snippet' },
        })
      );
      const slot = el.shadowRoot!.querySelector('slot[name="msg-1::1"]')!;
      expect(slot).to.exist;
      expect(slot.textContent).to.equal('snippet');
    });

    it('keeps a line break next to a chip', async () => {
      const el = await render(
        doc(paragraph(text('first'), { type: 'hardBreak' }, mention('Alice')))
      );
      const paragraphEl = el.shadowRoot!.querySelector('p')!;
      const br = paragraphEl.querySelector('br')!;
      const chip = paragraphEl.querySelector('.cds-aichat--token')!;
      expect(
        br.compareDocumentPosition(chip) & Node.DOCUMENT_POSITION_FOLLOWING
      ).to.be.greaterThan(0);
    });

    it('renders one break between two chips', async () => {
      const el = await render(
        doc(paragraph(mention('Alice'), { type: 'hardBreak' }, mention('Bob')))
      );
      expect(el.shadowRoot!.querySelectorAll('p br')).to.have.length(1);
    });

    it('drops a break at the end of a paragraph', async () => {
      const el = await render(
        doc(paragraph(mention('Alice'), { type: 'hardBreak' }))
      );
      expect(el.shadowRoot!.querySelectorAll('p br')).to.have.length(0);
    });

    it('shows a run the inline renderer rejects as plain text', async () => {
      const el = await render(
        doc(paragraph(text('# not inline '), mention('Alice')))
      );
      const plain = el.shadowRoot!.querySelector(`.${blockClass}__plain`)!;
      expect(plain.textContent).to.equal('# not inline ');
    });
  });

  describe('markdown settings', () => {
    const withChip = (value: string) =>
      doc(paragraph(text(value), mention('Alice')));

    it('works with defaults', async () => {
      const el = await render(withChip('A **bold** word '));
      expect(el.shadowRoot!.querySelector('strong')!.textContent).to.equal(
        'bold'
      );
    });

    it('shows HTML as escaped source in the inline path', async () => {
      const el = await render(withChip('<b>raw</b> '));
      const paragraphEl = el.shadowRoot!.querySelector('p')!;
      expect(paragraphEl.querySelector('b')).to.be.null;
      expect(paragraphEl.textContent).to.contain('<b>raw</b>');
    });

    it('forwards custom link renderers to the inline path', async () => {
      const el = await render(withChip('[docs](https://example.com) '), {
        customRenderers: {
          link: () => ({ href: 'https://rewritten.example' }),
        },
      });
      expect(el.shadowRoot!.querySelector('a')!.getAttribute('href')).to.equal(
        'https://rewritten.example'
      );
    });

    it('forwards plugins to the inline path', async () => {
      const markdownItPlugins = [
        (md: any) => {
          md.renderer.rules.code_inline = () => '<span id="plugged">x</span>';
        },
      ];
      const el = await render(withChip('`code` '), { markdownItPlugins });
      expect(el.shadowRoot!.querySelector('#plugged')).to.exist;
    });

    it('forwards settings to the block markdown element', async () => {
      const customRenderers = { link: () => null };
      const markdownItPlugins = [() => undefined];
      const el = await render(doc(paragraph(text('plain'))), {
        markdownItPlugins,
        customRenderers,
      });
      const markdown = el.shadowRoot!.querySelector(
        'cds-aichat-markdown'
      ) as any;
      expect(markdown.sanitizeHTML).to.be.true;
      expect(markdown.removeHTML).to.be.true;
      expect(markdown.markdownItPlugins).to.equal(markdownItPlugins);
      expect(markdown.customRenderers).to.equal(customRenderers);
    });
  });
});
