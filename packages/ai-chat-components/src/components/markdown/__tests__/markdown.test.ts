/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import CDSAIChatMarkdownElement from '../src/markdown.js';
const MARKDOWN_ELEMENT_TAG = 'cds-aichat-markdown';

const TEXT = `Carbon <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32" onclick="window.open('https://carbondesignsystem.com', '_blank')"><defs><style>.cls-1{fill:none;}</style></defs><title>If you click on this icon, it will go to https://carbondesignsystem.com. This is here to test "shouldSanitizeHTML". If true, the click shouldn't work!</title><path d="M13.5,30.8149a1.0011,1.0011,0,0,1-.4927-.13l-8.5-4.815A1,1,0,0,1,4,25V15a1,1,0,0,1,.5073-.87l8.5-4.815a1.0013,1.0013,0,0,1,.9854,0l8.5,4.815A1,1,0,0,1,23,15V25a1,1,0,0,1-.5073.87l-8.5,4.815A1.0011,1.0011,0,0,1,13.5,30.8149ZM6,24.417l7.5,4.2485L21,24.417V15.583l-7.5-4.2485L6,15.583Z"/><path d="M28,17H26V7.583L18.5,3.3345,10.4927,7.87,9.5073,6.13l8.5-4.815a1.0013,1.0013,0,0,1,.9854,0l8.5,4.815A1,1,0,0,1,28,7Z"/><rect class="cls-1" width="32" height="32" transform="translate(32 32) rotate(180)"/></svg> is a **chemical element** with the *atomic number* 6 and symbol **C**. \`C + O₂ → CO₂\` represents one of carbon's most fundamental reactions.

Carbon forms [covalent bonds](https://ibm.com) through electron sharing and creates [carbon chains](https://ibm.com){{target="_self"}} that are essential for organic molecules.
`;

const registeredConstructor = customElements.get(MARKDOWN_ELEMENT_TAG);

if (!registeredConstructor) {
  throw new Error('cds-aichat-markdown was not registered');
}

const MarkdownElementConstructor =
  (registeredConstructor as typeof CDSAIChatMarkdownElement) ??
  CDSAIChatMarkdownElement;

type MarkdownElementInstance = InstanceType<typeof MarkdownElementConstructor>;

describe('cds-aichat-markdown smoke test', () => {
  it('renders markdown when markdown property is provided', async () => {
    const el = await fixture<MarkdownElementInstance>(
      html`<cds-aichat-markdown .markdown=${TEXT}></cds-aichat-markdown>`
    );

    await el.updateComplete;

    const root = el.shadowRoot;
    expect(root).to.not.equal(null);
    const textContent = (root?.textContent ?? '').replace(/\s+/g, ' ');
    expect(textContent).to.include('Carbon');
    expect(textContent).to.include('chemical element');
  });

  it('strips inline html when HTML removal attribute is set', async () => {
    const el = await fixture<MarkdownElementInstance>(
      html`<cds-aichat-markdown
        remove-html
        .markdown=${TEXT}></cds-aichat-markdown>`
    );

    await el.updateComplete;

    const root = el.shadowRoot;
    if (!root) {
      throw new Error('Expected shadow root to exist');
    }
    expect(root.innerHTML).to.not.include('<svg');
  });

  it('removes svg click handler when sanitize-html is enabled', async () => {
    const originalOpen = window.open;
    let openUrl: string | null = null;
    const mockOpen: typeof window.open = (
      input?: string | URL,
      _target?: string,
      _features?: string,
      _replace?: boolean
    ) => {
      if (!input) {
        openUrl = null;
        return null;
      }
      openUrl = typeof input === 'string' ? input : input.href;
      return null;
    };
    window.open = mockOpen;

    try {
      const unsafeEl = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown .markdown=${TEXT}></cds-aichat-markdown>`
      );

      await unsafeEl.updateComplete;

      const unsafeSvg = unsafeEl.shadowRoot?.querySelector('svg');
      if (!unsafeSvg) {
        throw new Error('Expected SVG element to exist');
      }
      expect(unsafeSvg.getAttribute('onclick') ?? '').to.include('window.open');
      unsafeSvg.dispatchEvent(
        new MouseEvent('click', { bubbles: true, composed: true })
      );

      expect(openUrl).to.equal('https://carbondesignsystem.com');

      openUrl = null;

      const safeEl = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          sanitize-html
          .markdown=${TEXT}></cds-aichat-markdown>`
      );
      await safeEl.updateComplete;

      const safeSvg = safeEl.shadowRoot?.querySelector('svg');
      expect(safeSvg).to.not.equal(null);
      if (!safeSvg) {
        throw new Error('Expected sanitized SVG element to exist');
      }
      expect(safeSvg.getAttribute('onclick')).to.equal(null);
      safeSvg.dispatchEvent(
        new MouseEvent('click', { bubbles: true, composed: true })
      );

      expect(openUrl).to.equal(null);
    } finally {
      window.open = originalOpen;
    }
  });

  it('preserves svg nesting with defs and title as children', async () => {
    const el = await fixture<MarkdownElementInstance>(
      html`<cds-aichat-markdown .markdown=${TEXT}></cds-aichat-markdown>`
    );

    await el.updateComplete;

    const root = el.shadowRoot;
    if (!root) {
      throw new Error('Expected shadow root to exist');
    }

    const svg = root.querySelector('svg');
    expect(svg, 'Expected inline SVG element').to.not.equal(null);

    const defs = svg?.querySelector('defs') ?? null;
    const title = svg?.querySelector('title') ?? null;

    expect(defs, 'Expected <defs> child inside SVG').to.not.equal(null);
    expect(title, 'Expected <title> child inside SVG').to.not.equal(null);

    if (defs) {
      expect(defs.parentElement, 'defs should be nested under svg').to.equal(
        svg
      );
    }
    if (title) {
      expect(title.parentElement, 'title should be nested under svg').to.equal(
        svg
      );
    }
  });

  it('correctly adds defined attributes to links', async () => {
    const el = await fixture<MarkdownElementInstance>(
      html`<cds-aichat-markdown .markdown=${TEXT}></cds-aichat-markdown>`
    );

    await el.updateComplete;

    const root = el.shadowRoot;
    if (!root) {
      throw new Error('Expected shadow root to exist');
    }

    const link = root.querySelector('a[target="_self"]');
    expect(link).to.not.equal(null);
    if (!link) {
      throw new Error(`Link did not get target="_self" applied`);
    }
  });

  xit('keeps raw HTML anchor text inside the link in a table cell', async () => {
    const markdown = `| Name |
| ---- |
| <a href="https://www.ibm.com">Carbon</a> |`;
    const el = await fixture<MarkdownElementInstance>(
      html`<cds-aichat-markdown .markdown=${markdown}></cds-aichat-markdown>`
    );

    await el.updateComplete;

    const root = el.shadowRoot;
    if (!root) {
      throw new Error('Expected shadow root to exist');
    }

    const table = root.querySelector('cds-aichat-table');
    expect(table).to.not.equal(null);
    if (!table) {
      throw new Error('Expected cds-aichat-table');
    }

    await table.updateComplete;
    await waitUntil(
      () => !!table.shadowRoot?.querySelector('a[href="https://www.ibm.com"]'),
      'Expected table link to render',
      { timeout: 5000 }
    );

    const link = table.shadowRoot?.querySelector(
      'a[href="https://www.ibm.com"]'
    );
    expect(link).to.not.equal(null);
    expect(link?.textContent?.trim()).to.equal('Carbon');
  });

  describe('linkify functionality', () => {
    it('automatically converts plain URLs to clickable links', async () => {
      const textWithUrl = 'Check out https://www.ibm.com for more info';
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .markdown=${textWithUrl}></cds-aichat-markdown>`
      );

      await el.updateComplete;

      const root = el.shadowRoot;
      if (!root) {
        throw new Error('Expected shadow root to exist');
      }

      const link = root.querySelector('a[href="https://www.ibm.com"]');
      expect(link).to.not.equal(null);
      expect(link?.textContent).to.equal('https://www.ibm.com');
      expect(link?.getAttribute('target')).to.equal('_blank');
    });

    it('converts multiple URLs in the same text', async () => {
      const textWithMultipleUrls =
        'Visit https://ibm.com and https://github.com for resources';
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .markdown=${textWithMultipleUrls}></cds-aichat-markdown>`
      );

      await el.updateComplete;

      const root = el.shadowRoot;
      if (!root) {
        throw new Error('Expected shadow root to exist');
      }

      const links = root.querySelectorAll('a');
      expect(links.length).to.be.at.least(2);

      const ibmLink = root.querySelector('a[href="https://ibm.com"]');
      const githubLink = root.querySelector('a[href="https://github.com"]');

      expect(ibmLink).to.not.equal(null);
      expect(githubLink).to.not.equal(null);
    });

    it('linkifies URLs with different protocols', async () => {
      const textWithProtocols = `
HTTP: http://example.com
      HTTPS: https://secure.example.com
      FTP: ftp://files.example.com
      `;
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .markdown=${textWithProtocols}></cds-aichat-markdown>`
      );

      await el.updateComplete;

      const root = el.shadowRoot;
      if (!root) {
        throw new Error('Expected shadow root to exist');
      }

      expect(root.querySelector('a[href="http://example.com"]')).to.not.equal(
        null
      );
      expect(
        root.querySelector('a[href="https://secure.example.com"]')
      ).to.not.equal(null);
      expect(
        root.querySelector('a[href="ftp://files.example.com"]')
      ).to.not.equal(null);
    });

    it('linkifies email addresses', async () => {
      const textWithEmail = 'Contact us at support@example.com for help';
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .markdown=${textWithEmail}></cds-aichat-markdown>`
      );

      await el.updateComplete;

      const root = el.shadowRoot;
      if (!root) {
        throw new Error('Expected shadow root to exist');
      }

      const emailLink = root.querySelector(
        'a[href="mailto:support@example.com"]'
      );
      expect(emailLink).to.not.equal(null);
      expect(emailLink?.textContent).to.equal('support@example.com');
    });

    it('linkifies URLs within markdown text alongside other formatting', async () => {
      const mixedText =
        'This is **bold** text with https://example.com and *italic* text';
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown .markdown=${mixedText}></cds-aichat-markdown>`
      );

      await el.updateComplete;

      const root = el.shadowRoot;
      if (!root) {
        throw new Error('Expected shadow root to exist');
      }

      const link = root.querySelector('a[href="https://example.com"]');
      const bold = root.querySelector('strong');
      const italic = root.querySelector('em');

      expect(link).to.not.equal(null);
      expect(bold).to.not.equal(null);
      expect(italic).to.not.equal(null);
    });

    it('does not linkify URLs inside code blocks', async () => {
      const codeWithUrl = '`https://example.com`';
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .markdown=${codeWithUrl}></cds-aichat-markdown>`
      );

      await el.updateComplete;

      const root = el.shadowRoot;
      if (!root) {
        throw new Error('Expected shadow root to exist');
      }

      const code = root.querySelector('code');
      expect(code).to.not.equal(null);
      expect(code?.textContent).to.equal('https://example.com');

      // Should not have a link inside the code element
      const link = code?.querySelector('a');
      expect(link).to.equal(null);
    });

    it('linkifies URLs with removeHTML enabled', async () => {
      const textWithUrl = 'Visit https://example.com for details';
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          remove-html
          .markdown=${textWithUrl}></cds-aichat-markdown>`
      );

      await el.updateComplete;

      const root = el.shadowRoot;
      if (!root) {
        throw new Error('Expected shadow root to exist');
      }

      const link = root.querySelector('a[href="https://example.com"]');
      expect(link).to.not.equal(null);
      expect(link?.textContent).to.equal('https://example.com');
    });

    it('sanitizes linkified URLs when sanitize-html is enabled', async () => {
      const textWithUrl = 'Check https://example.com';
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          sanitize-html
          .markdown=${textWithUrl}></cds-aichat-markdown>`
      );

      await el.updateComplete;

      const root = el.shadowRoot;
      if (!root) {
        throw new Error('Expected shadow root to exist');
      }

      const link = root.querySelector('a[href="https://example.com"]');
      expect(link).to.not.equal(null);
      // Should still have target="_blank" from renderer
      expect(link?.getAttribute('target')).to.equal('_blank');
    });

    describe('Light DOM content handling', () => {
      it('renders Light DOM content when markdown property is not set', async () => {
        const el = await fixture<MarkdownElementInstance>(
          html`<cds-aichat-markdown
            ># Hello from Light DOM</cds-aichat-markdown
          >`
        );

        await el.updateComplete;

        const root = el.shadowRoot;
        if (!root) {
          throw new Error('Expected shadow root to exist');
        }

        const h1 = root.querySelector('h1');
        expect(h1).to.not.equal(null);
        expect(h1?.textContent).to.equal('Hello from Light DOM');
      });

      it('updates when Light DOM content changes', async () => {
        const el = await fixture<MarkdownElementInstance>(
          html`<cds-aichat-markdown># Initial Content</cds-aichat-markdown>`
        );

        await el.updateComplete;

        let root = el.shadowRoot;
        if (!root) {
          throw new Error('Expected shadow root to exist');
        }

        let h1 = root.querySelector('h1');
        expect(h1?.textContent).to.equal('Initial Content');

        // Update Light DOM content
        el.textContent = '# Updated Content';
        await el.updateComplete;

        root = el.shadowRoot;
        if (!root) {
          throw new Error('Expected shadow root to exist after update');
        }

        h1 = root.querySelector('h1');
        expect(h1?.textContent).to.equal('Updated Content');
      });

      it('prefers markdown property over Light DOM content', async () => {
        const el = await fixture<MarkdownElementInstance>(
          html`<cds-aichat-markdown .markdown=${'# From Property'}
            ># From Light DOM</cds-aichat-markdown
          >`
        );

        await el.updateComplete;

        const root = el.shadowRoot;
        if (!root) {
          throw new Error('Expected shadow root to exist');
        }

        const h1 = root.querySelector('h1');
        expect(h1?.textContent).to.equal('From Property');
      });

      it('stops monitoring Light DOM when markdown property is set', async () => {
        const el = await fixture<MarkdownElementInstance>(
          html`<cds-aichat-markdown># Initial Light DOM</cds-aichat-markdown>`
        );

        await el.updateComplete;

        let root = el.shadowRoot;
        if (!root) {
          throw new Error('Expected shadow root to exist');
        }

        let h1 = root.querySelector('h1');
        expect(h1?.textContent).to.equal('Initial Light DOM');

        // Set markdown property explicitly
        el.markdown = '# From Property';
        await el.updateComplete;

        root = el.shadowRoot;
        if (!root) {
          throw new Error('Expected shadow root to exist after property set');
        }

        h1 = root.querySelector('h1');
        expect(h1?.textContent).to.equal('From Property');

        // Now update Light DOM - should be ignored
        el.textContent = '# Updated Light DOM';
        await el.updateComplete;

        root = el.shadowRoot;
        if (!root) {
          throw new Error(
            'Expected shadow root to exist after Light DOM update'
          );
        }

        h1 = root.querySelector('h1');
        // Should still show property value, not Light DOM
        expect(h1?.textContent).to.equal('From Property');
      });

      it('handles markdown property set before connectedCallback', async () => {
        const el = document.createElement(
          MARKDOWN_ELEMENT_TAG
        ) as MarkdownElementInstance;

        // Set markdown BEFORE adding to DOM
        el.markdown = '# Set Before Mount';

        // Now add to DOM
        document.body.appendChild(el);
        await el.updateComplete;

        const root = el.shadowRoot;
        if (!root) {
          throw new Error('Expected shadow root to exist');
        }

        const h1 = root.querySelector('h1');
        expect(h1).to.not.equal(null);
        expect(h1?.textContent).to.equal('Set Before Mount');

        // Cleanup
        document.body.removeChild(el);
      });

      it('handles empty Light DOM content gracefully', async () => {
        const el = await fixture<MarkdownElementInstance>(
          html`<cds-aichat-markdown></cds-aichat-markdown>`
        );

        await el.updateComplete;

        const root = el.shadowRoot;
        if (!root) {
          throw new Error('Expected shadow root to exist');
        }

        // Should render without errors, just empty
        expect(root.textContent?.trim()).to.equal('');
      });

      it('handles Light DOM with only whitespace', async () => {
        const el = await fixture<MarkdownElementInstance>(
          html`<cds-aichat-markdown> </cds-aichat-markdown>`
        );

        await el.updateComplete;

        const root = el.shadowRoot;
        if (!root) {
          throw new Error('Expected shadow root to exist');
        }

        // Should treat whitespace-only as empty
        expect(root.textContent?.trim()).to.equal('');
      });

      it('cleans up MutationObserver on disconnect', async () => {
        const el = await fixture<MarkdownElementInstance>(
          html`<cds-aichat-markdown># Light DOM Content</cds-aichat-markdown>`
        );

        await el.updateComplete;

        // Verify it's working
        const root = el.shadowRoot;
        if (!root) {
          throw new Error('Expected shadow root to exist');
        }

        const h1 = root.querySelector('h1');
        expect(h1?.textContent).to.equal('Light DOM Content');

        // Remove from DOM (triggers disconnectedCallback)
        el.remove();

        // Try to update Light DOM after disconnect - should not cause errors
        el.textContent = '# Should Not Update';

        // Wait a bit to ensure no async errors
        await new Promise((resolve) => setTimeout(resolve, 100));

        // If we got here without errors, the observer was properly cleaned up
        expect(true).to.equal(true);
      });

      it('handles rapid Light DOM changes', async () => {
        const el = await fixture<MarkdownElementInstance>(
          html`<cds-aichat-markdown># Initial</cds-aichat-markdown>`
        );

        await el.updateComplete;

        // Make multiple rapid changes
        el.textContent = '# Change 1';
        el.textContent = '# Change 2';
        el.textContent = '# Change 3';
        el.textContent = '# Final Change';

        await el.updateComplete;

        const root = el.shadowRoot;
        if (!root) {
          throw new Error('Expected shadow root to exist');
        }

        const h1 = root.querySelector('h1');
        expect(h1?.textContent).to.equal('Final Change');
      });
    });
  });

  describe('markdown between HTML tags', () => {
    const detailsWithTableMarkdown = `<details open>

### Carbon elements
| Allotrope | Form | Notes |
|----------|------|-------|
| Diamond | Crystalline | Hardest natural material |
| Graphite | Layered | Used in pencils and lubricants |
| Graphene | Single layer | Excellent conductivity |

</details>`;

    async function renderMarkdown(markdown: string) {
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown .markdown=${markdown}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      const root = el.shadowRoot;
      if (!root) {
        throw new Error('Expected shadow root to exist');
      }
      return root;
    }

    it('renders markdown tables inside details elements', async () => {
      const root = await renderMarkdown(detailsWithTableMarkdown);
      const details = root.querySelector('details');

      expect(details).to.not.equal(null);
      expect(details?.open).to.equal(true);
      expect(details?.querySelector('h3')?.textContent).to.equal(
        'Carbon elements'
      );
      const table = details?.querySelector('cds-aichat-table');
      expect(table).to.not.equal(null);
      if (!table) {
        throw new Error('Expected cds-aichat-table inside details');
      }

      await table.updateComplete;
      await waitUntil(
        () => table.shadowRoot?.textContent?.includes('Diamond') ?? false,
        'Expected carbon allotrope table to render inside details',
        { timeout: 5000 }
      );
    });
  });
  describe('custom attribute syntax', () => {
    async function renderMarkdown(markdown: string) {
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown .markdown=${markdown}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      const root = el.shadowRoot;
      if (!root) {
        throw new Error('Expected shadow root to exist');
      }
      return root;
    }

    it('applies id to a heading and strips the attribute syntax from rendered text', async () => {
      const root = await renderMarkdown('# Heading {{id=foo}}');
      const h1 = root.querySelector('h1');
      expect(h1).to.not.equal(null);
      expect(h1?.getAttribute('id')).to.equal('foo');
      expect(h1?.textContent).to.equal('Heading');
    });

    it('applies class to a paragraph', async () => {
      const root = await renderMarkdown('A paragraph {{class=bar}}');
      const p = root.querySelector('p');
      expect(p).to.not.equal(null);
      expect(p?.getAttribute('class')).to.equal('bar');
      expect(p?.textContent).to.equal('A paragraph');
    });

    it('applies multiple attributes to a single link', async () => {
      const root = await renderMarkdown(
        '[link](https://example.com){{target=_blank rel=noopener}}'
      );
      const link = root.querySelector('a');
      expect(link).to.not.equal(null);
      expect(link?.getAttribute('target')).to.equal('_blank');
      expect(link?.getAttribute('rel')).to.equal('noopener');
    });

    it('supports unquoted attribute values on links', async () => {
      const root = await renderMarkdown(
        '[link](https://example.com){{target=_blank}}'
      );
      const link = root.querySelector('a[href="https://example.com"]');
      expect(link).to.not.equal(null);
      expect(link?.getAttribute('target')).to.equal('_blank');
    });

    it('rejects disallowed attributes while still applying allowed ones', async () => {
      const root = await renderMarkdown(
        `[link](https://example.com){{onclick=alert(1) target=_blank}}`
      );
      const link = root.querySelector('a[href="https://example.com"]');
      expect(link).to.not.equal(null);
      expect(link?.getAttribute('target')).to.equal('_blank');
      expect(link?.getAttribute('onclick')).to.equal(null);
    });

    it('applies attributes independently to multiple links on the same line', async () => {
      const root = await renderMarkdown(
        '[a](https://a.example){{target=_self}} and [b](https://b.example){{rel=noopener}}'
      );
      const linkA = root.querySelector('a[href="https://a.example"]');
      const linkB = root.querySelector('a[href="https://b.example"]');
      expect(linkA?.getAttribute('target')).to.equal('_self');
      expect(linkA?.getAttribute('rel')).to.equal(null);
      expect(linkB?.getAttribute('rel')).to.equal('noopener');
    });

    it('renders unclosed attribute syntax literally without applying attributes', async () => {
      const root = await renderMarkdown('Some {{not closed text');
      const p = root.querySelector('p');
      expect(p).to.not.equal(null);
      expect(p?.getAttribute('class')).to.equal(null);
      expect(p?.getAttribute('id')).to.equal(null);
      expect(p?.textContent).to.equal('Some {{not closed text');
    });
  });

  describe('markdownItPlugins', () => {
    // Plugin that pretends to be `markdown-it-emoji`: adds a `nesting=0` leaf
    // token (`smile_emoji`) and registers a renderer rule for it. Exercises the
    // leaf-token branch of the `md.renderer.render()` fallback.
    function smileEmojiPlugin(md: any) {
      md.inline.ruler.before(
        'text',
        'smile_emoji',
        (state: any, silent: boolean) => {
          const src = state.src.slice(state.pos);
          if (!src.startsWith(':smile:')) {
            return false;
          }
          if (!silent) {
            const token = state.push('smile_emoji', '', 0);
            token.markup = ':smile:';
            token.content = '😀';
          }
          state.pos += ':smile:'.length;
          return true;
        }
      );
      md.renderer.rules.smile_emoji = (tokens: any[], idx: number) =>
        `<span class="cds-test-emoji" data-emoji="${tokens[idx].content}">${tokens[idx].content}</span>`;
    }

    // Plugin that pretends to be `markdown-it-footnote`'s paired-container side:
    // recognizes lines like `::note paragraph contents` and emits a paired
    // `note_open`/`note_close` block with the paragraph nested inside. Exercises
    // the paired-container branch of `sliceForFallback`.
    function noteContainerPlugin(md: any) {
      md.block.ruler.before(
        'paragraph',
        'note_container',
        (state: any, startLine: number, endLine: number, silent: boolean) => {
          const pos = state.bMarks[startLine] + state.tShift[startLine];
          const max = state.eMarks[startLine];
          const line = state.src.slice(pos, max);
          if (!line.startsWith('::note ')) {
            return false;
          }
          if (silent) {
            return true;
          }
          const content = line.slice('::note '.length);
          const openToken = state.push('note_open', 'div', 1);
          openToken.markup = '::note';
          openToken.block = true;
          openToken.map = [startLine, startLine + 1];
          openToken.attrSet('class', 'cds-test-note');
          const para = state.push('paragraph_open', 'p', 1);
          para.block = true;
          para.map = [startLine, startLine + 1];
          const inline = state.push('inline', '', 0);
          inline.content = content;
          inline.map = [startLine, startLine + 1];
          inline.children = [];
          state.push('paragraph_close', 'p', -1);
          state.push('note_close', 'div', -1);
          state.line = startLine + 1;
          return true;
        }
      );
    }

    it('applies a parse-only plugin without breaking rendering', async () => {
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .markdownItPlugins=${[]}
          .markdown=${'Hello **world**'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      const text = el.shadowRoot?.textContent?.replace(/\s+/g, ' ');
      expect(text).to.include('Hello');
      expect(text).to.include('world');
      const strong = el.shadowRoot?.querySelector('strong');
      expect(strong?.textContent).to.equal('world');
    });

    it('renders unknown leaf tokens via md.renderer.render fallback', async () => {
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .markdownItPlugins=${[smileEmojiPlugin]}
          .markdown=${'Hi :smile: there'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      // Plugin output lives in a light-DOM slot host so consumer CSS can reach it.
      const emoji = el.querySelector('.cds-test-emoji');
      expect(emoji, "fallback should render the plugin's HTML").to.not.equal(
        null
      );
      expect(emoji?.getAttribute('data-emoji')).to.equal('😀');
    });

    it('renders paired-container plugin output via the fallback', async () => {
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .markdownItPlugins=${[noteContainerPlugin]}
          .markdown=${'::note Pay attention to this'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      const note = el.querySelector('.cds-test-note');
      expect(note, 'fallback should render the paired container').to.not.equal(
        null
      );
      expect(note?.textContent?.trim()).to.equal('Pay attention to this');
    });

    it('neutralizes HTML when removeHTML is set without breaking plugins', async () => {
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          remove-html
          .markdownItPlugins=${[smileEmojiPlugin]}
          .markdown=${'Hi <b>raw</b> :smile:'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      // `<b>` is escaped to inert text under html:false, so no <b> element.
      expect(el.shadowRoot?.querySelector('b')).to.equal(null);
      expect(el.querySelector('b')).to.equal(null);
      // Plugin still works with HTML neutralized (now mounted in light DOM).
      expect(el.querySelector('.cds-test-emoji')).to.not.equal(null);
    });

    it('preserves block-level HTML content when removeHTML is set', async () => {
      // Regression: stripping html_block tokens deleted their inner content
      // entirely. With html:false the block is inert text, content preserved.
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          remove-html
          .markdown=${'<div>\nhello\n</div>'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      const root = el.shadowRoot;
      if (!root) {
        throw new Error('Expected shadow root to exist');
      }
      expect(
        root.querySelector('div.cds-aichat-markdown-html-container')
      ).to.equal(null);
      expect(root.textContent).to.include('hello');
    });

    it('does not execute or strip-leak script content when removeHTML is set', async () => {
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          remove-html
          .markdown=${'before <script>alert(1)</script> after'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      const root = el.shadowRoot;
      if (!root) {
        throw new Error('Expected shadow root to exist');
      }
      // No live <script> element; the tag is inert escaped text.
      expect(root.querySelector('script')).to.equal(null);
      expect(root.textContent).to.include('before');
      expect(root.textContent).to.include('after');
    });
  });

  describe('markdown-it renderer-rule overrides', () => {
    // Mermaid-like wrapper: delegates non-mermaid fences back to the original.
    function fenceWrapPlugin(md: any) {
      const originalFence = md.renderer.rules.fence;
      md.renderer.rules.fence = (
        tokens: any[],
        idx: number,
        opts: any,
        env: any,
        self: any
      ) => {
        const token = tokens[idx];
        if (token.info.trim() === 'mermaid') {
          return `<div class="cds-test-mermaid">${token.content.trim()}</div>`;
        }
        return originalFence?.(tokens, idx, opts, env, self) ?? '';
      };
    }

    // Replaces fence outright (no closure-captured original).
    function fenceReplacePlugin(md: any) {
      md.renderer.rules.fence = (tokens: any[], idx: number) =>
        `<div class="cds-test-fence-replaced">${tokens[idx].content.trim()}</div>`;
    }

    // Image override like markdown-it-image-figures.
    function imageFigurePlugin(md: any) {
      md.renderer.rules.image = (tokens: any[], idx: number) => {
        const token = tokens[idx];
        const src =
          token.attrs?.find(([k]: [string, string]) => k === 'src')?.[1] ?? '';
        const alt = token.content ?? '';
        return `<figure class="cds-test-figure"><img src="${src}" alt="${alt}" /><figcaption>${alt}</figcaption></figure>`;
      };
    }

    function codeInlineOverridePlugin(md: any) {
      md.renderer.rules.code_inline = (tokens: any[], idx: number) =>
        `<kbd class="cds-test-kbd">${tokens[idx].content}</kbd>`;
    }

    // Paragraph override — should be IGNORED (containers not in allow-list).
    function paragraphOverridePlugin(md: any) {
      md.renderer.rules.paragraph_open = () =>
        `<section class="cds-test-section">`;
      md.renderer.rules.paragraph_close = () => `</section>`;
    }

    it('routes fence through a closure-wrapping plugin rule', async () => {
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .markdownItPlugins=${[fenceWrapPlugin]}
          .markdown=${'```mermaid\ngraph TD; A-->B\n```'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      const mermaid = el.querySelector('.cds-test-mermaid');
      expect(mermaid, 'plugin output should render').to.not.equal(null);
      expect(mermaid?.textContent).to.include('graph TD');
      // Native cds-aichat-code-snippet is bypassed for the overridden fence.
      expect(el.shadowRoot?.querySelector('cds-aichat-code-snippet')).to.equal(
        null
      );
    });

    it('routes fence through a plugin rule that replaces it outright', async () => {
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .markdownItPlugins=${[fenceReplacePlugin]}
          .markdown=${'```ts\nconst x = 1;\n```'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      expect(el.querySelector('.cds-test-fence-replaced')).to.not.equal(null);
      expect(el.shadowRoot?.querySelector('cds-aichat-code-snippet')).to.equal(
        null
      );
    });

    it('customRenderers.codeBlock slot wins over a plugin fence rule', async () => {
      const codeBlockCalls: string[] = [];
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .markdownItPlugins=${[fenceWrapPlugin]}
          .customRenderers=${{
            codeBlock: ({ slotName }: { slotName: string }) => {
              codeBlockCalls.push(slotName);
              const div = document.createElement('div');
              div.className = 'cds-test-codeblock-override';
              return div;
            },
          }}
          .markdown=${'```mermaid\ngraph TD; A-->B\n```'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      // Consumer's most specific intent wins: the codeBlock callback is
      // invoked and its element is adopted, not the plugin's mermaid HTML.
      expect(codeBlockCalls.length).to.be.greaterThanOrEqual(1);
      expect(
        el.querySelector('.cds-test-codeblock-override'),
        'codeBlock override should be adopted as a light-DOM slot host'
      ).to.not.equal(null);
    });

    it('routes image through a plugin rule', async () => {
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .markdownItPlugins=${[imageFigurePlugin]}
          .markdown=${'![alt text](https://example.com/x.png)'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      const figure = el.querySelector('.cds-test-figure');
      expect(figure, 'plugin should wrap the image in <figure>').to.not.equal(
        null
      );
      expect(figure?.querySelector('img')?.getAttribute('src')).to.equal(
        'https://example.com/x.png'
      );
      expect(figure?.querySelector('figcaption')?.textContent).to.equal(
        'alt text'
      );
    });

    it('routes images inside table cells through a plugin rule', async () => {
      // Spy on the image rule. The cell content is rendered inside
      // cds-aichat-table's own shadow DOM (via .rows templates), so the most
      // robust assertion is "the plugin rule actually fired for the cell
      // image", which proves delegation reached into the table-cell path.
      const imageCalls: string[] = [];
      function spyingImagePlugin(md: any) {
        md.renderer.rules.image = (tokens: any[], idx: number) => {
          const token = tokens[idx];
          const src =
            token.attrs?.find(([k]: [string, string]) => k === 'src')?.[1] ??
            '';
          imageCalls.push(src);
          return `<figure class="cds-test-figure"><img src="${src}" alt="${token.content}" /></figure>`;
        };
      }
      const md = `| h |\n| --- |\n| ![cell](https://example.com/cell.png) |\n\ntrailer`;
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .markdownItPlugins=${[spyingImagePlugin]}
          .markdown=${md}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      expect(el.shadowRoot?.querySelector('cds-aichat-table')).to.not.equal(
        null
      );
      // The delegation path reached the cell. Initial-mount throttling can
      // fire renderTokenTree on the cell more than once before
      // updateComplete resolves; the streaming-cache test below verifies
      // the cache invariant on a direct top-level fence path.
      expect(imageCalls.length).to.be.greaterThanOrEqual(1);
      expect(new Set(imageCalls).size).to.equal(1);
      expect(imageCalls[0]).to.equal('https://example.com/cell.png');
    });

    it('routes code_inline through a plugin rule', async () => {
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .markdownItPlugins=${[codeInlineOverridePlugin]}
          .markdown=${'Press `enter`.'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      const kbd = el.querySelector('.cds-test-kbd');
      expect(kbd, 'plugin override should render').to.not.equal(null);
      expect(kbd?.textContent).to.equal('enter');
    });

    it('ignores plugin overrides on container tokens (paragraph_open)', async () => {
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .markdownItPlugins=${[paragraphOverridePlugin]}
          .markdown=${'Hello world'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      const root = el.shadowRoot;
      // Container overrides are intentionally NOT honored — native <p> wins.
      expect(root?.querySelector('p')).to.not.equal(null);
      expect(root?.querySelector('.cds-test-section')).to.equal(null);
    });

    it('preserves sanitization on plugin-emitted HTML', async () => {
      function unsafeFencePlugin(md: any) {
        md.renderer.rules.fence = (tokens: any[], idx: number) =>
          `<div class="cds-test-mermaid">${tokens[idx].content}</div><script>window.__pluginRanScript = true;</script>`;
      }
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          sanitize-html
          .markdownItPlugins=${[unsafeFencePlugin]}
          .markdown=${'```mermaid\nA-->B\n```'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      expect(el.querySelector('.cds-test-mermaid')).to.not.equal(null);
      // Sanitizer strips <script> from the plugin's output before it lands in
      // the light-DOM slot host.
      expect(el.querySelector('script')).to.equal(null);
    });

    it('removeHTML does not block plugin renderer output', async () => {
      // removeHTML selects the html:false markdown-it variant; user plugins are
      // applied to it identically, so plugin renderer-rule output is unaffected,
      // matching the existing leaf-fallback behavior for new token types.
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          remove-html
          .markdownItPlugins=${[fenceReplacePlugin]}
          .markdown=${'```ts\nconst x = 1;\n```'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      expect(
        el.querySelector('.cds-test-fence-replaced'),
        'plugin output is emitted even when removeHTML is true'
      ).to.not.equal(null);
    });

    it('delegates to a plugin while neutralizing block HTML with removeHTML', async () => {
      // A fence-overriding plugin runs on the html:false variant, the block tag
      // is inert text (no container element), and its content survives.
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          remove-html
          .markdownItPlugins=${[fenceReplacePlugin]}
          .markdown=${'<div>x</div>\n\n```ts\nconst y = 1;\n```'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      const root = el.shadowRoot;
      if (!root) {
        throw new Error('Expected shadow root to exist');
      }
      expect(el.querySelector('.cds-test-fence-replaced')).to.not.equal(null);
      expect(
        root.querySelector('div.cds-aichat-markdown-html-container')
      ).to.equal(null);
      expect(root.textContent).to.include('x');
    });

    it('caches fence renders across streaming chunks for stable subtrees', async () => {
      // Spy on the fence rule to count plugin invocations. Memoization should
      // skip the call on chunks where the fence's content is unchanged.
      const fenceCalls: string[] = [];
      function spyingFencePlugin(md: any) {
        md.renderer.rules.fence = (tokens: any[], idx: number) => {
          fenceCalls.push(tokens[idx].content);
          return `<div class="cds-test-mermaid">${tokens[idx].content.trim()}</div>`;
        };
      }
      // Reusing the same plugins array reference across renders so the cached
      // MarkdownIt instance (and its overridden-rules set) stays stable.
      const plugins = [spyingFencePlugin];
      const baseMermaid = '```mermaid\ngraph TD; A-->B\n```\n\n';

      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          streaming
          .markdownItPlugins=${plugins}
          .markdown=${baseMermaid + 'tail'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      expect(fenceCalls.length, 'fence rule called on first render').to.equal(
        1
      );

      // Extend the trailing paragraph (the fence's content + token map are
      // unchanged because the fence sits at lines 0..2 and the new text only
      // grows the line range of the paragraph that follows it).
      el.markdown = baseMermaid + 'tail and more and more content here';
      await el.updateComplete;
      expect(
        fenceCalls.length,
        'cached fence subtree should skip the plugin rule on the second chunk'
      ).to.equal(1);
    });

    it('invalidates the fence cache when its content changes', async () => {
      const fenceCalls: string[] = [];
      function spyingFencePlugin(md: any) {
        md.renderer.rules.fence = (tokens: any[], idx: number) => {
          fenceCalls.push(tokens[idx].content);
          return `<div class="cds-test-mermaid">${tokens[idx].content.trim()}</div>`;
        };
      }
      const plugins = [spyingFencePlugin];

      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .markdownItPlugins=${plugins}
          .markdown=${'```mermaid\nA-->B\n```'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      expect(fenceCalls.length).to.equal(1);

      el.markdown = '```mermaid\nA-->C\n```';
      await el.updateComplete;
      expect(
        fenceCalls.length,
        'content change must invalidate the cache and re-run the plugin'
      ).to.equal(2);
    });

    it('invalidates the fence cache when the language (info) changes', async () => {
      // Fence content stays the same; only the language string changes.
      // diffTokenTree must NOT inherit the cached HTML because the rule's
      // output depends on info (e.g. mermaid vs syntax-highlighted code).
      const fenceCalls: Array<{ info: string; content: string }> = [];
      function spyingFencePlugin(md: any) {
        md.renderer.rules.fence = (tokens: any[], idx: number) => {
          const token = tokens[idx];
          fenceCalls.push({ info: token.info, content: token.content });
          return `<div class="cds-test-fence" data-lang="${token.info}">${token.content.trim()}</div>`;
        };
      }
      const plugins = [spyingFencePlugin];

      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .markdownItPlugins=${plugins}
          .markdown=${'```ts\nconst x = 1;\n```'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      expect(fenceCalls.length).to.equal(1);
      expect(fenceCalls[0].info).to.equal('ts');

      el.markdown = '```js\nconst x = 1;\n```';
      await el.updateComplete;
      expect(
        fenceCalls.length,
        'language change must invalidate the cache and re-run the plugin'
      ).to.equal(2);
      expect(fenceCalls[1].info).to.equal('js');
      expect(el.querySelector('.cds-test-fence[data-lang="js"]')).to.not.equal(
        null
      );
    });

    it('invalidates the fence cache when the plugin array is swapped', async () => {
      // First plugin: wraps mermaid fences in <div class="v1">.
      function pluginV1(md: any) {
        md.renderer.rules.fence = (tokens: any[], idx: number) =>
          `<div class="cds-test-mermaid-a">${tokens[idx].content.trim()}</div>`;
      }
      // Second plugin: wraps the SAME fence content in <div class="v2">.
      function pluginV2(md: any) {
        md.renderer.rules.fence = (tokens: any[], idx: number) =>
          `<div class="cds-test-mermaid-b">${tokens[idx].content.trim()}</div>`;
      }

      const fenceMarkdown = '```mermaid\nA-->B\n```\n\ntrailing paragraph';
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .markdownItPlugins=${[pluginV1]}
          .markdown=${fenceMarkdown}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      expect(
        el.querySelector('.cds-test-mermaid-a'),
        'first plugin output renders'
      ).to.not.equal(null);

      // Swap the plugins array reference. The fence content is unchanged, so
      // diffTokenTree would carry forward the old cache — but the cache is
      // tagged with the prior md instance and must be re-rendered with v2.
      el.markdownItPlugins = [pluginV2];
      await el.updateComplete;
      expect(
        el.querySelector('.cds-test-mermaid-b'),
        'second plugin output should render after swap'
      ).to.not.equal(null);
      expect(
        el.querySelector('.cds-test-mermaid-a'),
        'stale cached output from the first plugin must be invalidated'
      ).to.equal(null);
    });
  });

  describe('custom renderer callback API', () => {
    const tableMarkdown = `| h1 | h2 |\n| --- | --- |\n| a | b |\n\nTrailing paragraph so the table is not the streaming tail.`;

    it('invokes the table callback with parsed data when registered', async () => {
      const calls: Array<{
        headers: string[];
        rowCount: number;
        slotName: string;
      }> = [];
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .customRenderers=${{
            table: ({
              headers,
              rows,
              slotName,
            }: {
              headers: { text: string }[];
              rows: unknown[][];
              slotName: string;
            }) => {
              calls.push({
                headers: headers.map((h) => h.text),
                rowCount: rows.length,
                slotName,
              });
              const div = document.createElement('div');
              div.className = 'cds-test-table-override';
              return div;
            },
          }}
          .markdown=${tableMarkdown}></cds-aichat-markdown>`
      );
      await el.updateComplete;

      expect(calls.length).to.be.greaterThanOrEqual(1);
      const last = calls[calls.length - 1];
      expect(last.headers).to.deep.equal(['h1', 'h2']);
      expect(last.rowCount).to.equal(1);
      expect(last.slotName).to.match(/^cds-aichat-markdown-renderer-table-/);

      // The returned element is adopted as a light-DOM slot host.
      expect(
        el.querySelector('.cds-test-table-override'),
        'callback result should be adopted as a light-DOM slot host'
      ).to.not.equal(null);
    });

    it('does not pass the internal token tree to any callback', async () => {
      // `node` was a `TokenTree` escape hatch on all five arg types. TokenTree is
      // the streaming-diff structure and is not a consumer contract, so it must
      // stay out of the payload — nothing else would catch it being re-added.
      const source = [
        '| h1 | h2 |',
        '| --- | --- |',
        '| a | b |',
        '',
        '```ts',
        'const x = 1;',
        '```',
        '',
        '[label](https://example.com "link title")',
        '',
        '![alt text](https://example.com/i.png "image title")',
        '',
        '- [ ] Task',
      ].join('\n');
      const keysByKind: Record<string, string[]> = {};
      const capture =
        (kind: string) =>
        (args: Record<string, unknown>): null => {
          keysByKind[kind] = Object.keys(args);
          return null;
        };

      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .customRenderers=${{
            table: capture('table'),
            codeBlock: capture('codeBlock'),
            link: capture('link'),
            image: capture('image'),
            checklist: {
              onToggle: () => {},
              getChecked: capture('checklistItem'),
            },
          }}
          .markdown=${source}></cds-aichat-markdown>`
      );
      await el.updateComplete;

      expect(Object.keys(keysByKind).sort()).to.deep.equal([
        'checklistItem',
        'codeBlock',
        'image',
        'link',
        'table',
      ]);
      for (const [kind, keys] of Object.entries(keysByKind)) {
        expect(
          keys,
          `${kind} args should not carry the token tree`
        ).to.not.include('node');
        expect(
          keys,
          `${kind} args should still carry the markdown-it token`
        ).to.include('token');
      }
    });

    it('re-invokes the callback after each render', async () => {
      const calls: string[] = [];
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .customRenderers=${{
            codeBlock: ({ language }: { language: string }) => {
              calls.push(language);
              const div = document.createElement('div');
              return div;
            },
          }}></cds-aichat-markdown>`
      );
      el.markdown = '```ts\nconst x = 1;\n```\n\nafter';
      await el.updateComplete;
      expect(calls.some((lang) => lang === 'ts')).to.equal(true);
    });

    it('keeps the slot name stable when streaming chunks grow a non-tail table', async () => {
      const partA = `| h1 | h2 |\n| --- | --- |\n| a | b |\n\ntrailer`;
      const partB = `| h1 | h2 |\n| --- | --- |\n| a | b |\n| c | d |\n\ntrailer`;
      const slotNames: string[] = [];

      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          streaming
          .customRenderers=${{
            table: ({ slotName }: { slotName: string }) => {
              slotNames.push(slotName);
              const div = document.createElement('div');
              return div;
            },
          }}
          .markdown=${partA}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      const firstSlotName = slotNames[slotNames.length - 1];
      expect(firstSlotName).to.be.a('string');

      el.markdown = partB;
      await el.updateComplete;
      const secondSlotName = slotNames[slotNames.length - 1];
      expect(secondSlotName, 'slot name must stay stable').to.equal(
        firstSlotName
      );
    });

    it('exposes streaming + loading state to the table callback', async () => {
      const partial = `| h1 |\n| --- |\n| a |\n\ntrailer`;
      const calls: Array<{ isStreaming: boolean; isLoading: boolean }> = [];
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          streaming
          .customRenderers=${{
            table: ({
              isStreaming,
              isLoading,
            }: {
              isStreaming: boolean;
              isLoading: boolean;
            }) => {
              calls.push({ isStreaming, isLoading });
              const div = document.createElement('div');
              return div;
            },
          }}
          .markdown=${partial}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      expect(calls.length).to.be.greaterThanOrEqual(1);
      const last = calls[calls.length - 1];
      expect(last.isStreaming).to.equal(true);
      expect(typeof last.isLoading).to.equal('boolean');
    });

    it('falls back to the default renderer when the callback returns null', async () => {
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .customRenderers=${{ table: () => null }}
          .markdown=${tableMarkdown}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      // No light-DOM host created; the slot's fallback (cds-aichat-table) shows.
      expect(el.querySelector(':scope > div[slot]')).to.equal(null);
      expect(el.shadowRoot?.querySelector('cds-aichat-table')).to.not.equal(
        null
      );
    });

    it('removes slot hosts on disconnect', async () => {
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .customRenderers=${{
            table: () => {
              const div = document.createElement('div');
              div.className = 'cds-test-disconnect-host';
              return div;
            },
          }}
          .markdown=${tableMarkdown}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      const host = el.querySelector('.cds-test-disconnect-host');
      expect(host?.parentElement?.getAttribute('slot')).to.match(
        /^cds-aichat-markdown-renderer-table-/
      );
      el.remove();
      expect(el.querySelector('.cds-test-disconnect-host')).to.equal(null);
    });
  });

  // Slot hosts are hoisted out of the markdown element into one shared
  // page-level container (see the chat containers in `@carbon/ai-chat`) and
  // projected back by name, so slot names have to be unique across every
  // markdown element on the page — not just within one element. When they
  // weren't, two messages whose code block both started on line 0 minted the
  // same name: the first element's slot gathered both hosts and the second
  // gathered none. See issue #2099.
  describe('slot names across markdown elements', () => {
    const HARNESS_TAG = 'cds-test-markdown-relocation-host';
    const codeMarkdown = '```json\n{ "name": "Alice" }\n```';

    // Minimal inline plugin whose output goes through the plugin-fallback slot
    // path (the same page-level hoisting, a separate slot-name mint site).
    function tagPlugin(md: any) {
      md.inline.ruler.before(
        'text',
        'cds_test_tag',
        (state: any, silent: boolean) => {
          if (!state.src.slice(state.pos).startsWith(':tag:')) {
            return false;
          }
          if (!silent) {
            state.push('cds_test_tag', '', 0);
          }
          state.pos += ':tag:'.length;
          return true;
        }
      );
      md.renderer.rules.cds_test_tag = () =>
        `<span class="cds-test-tag">tag</span>`;
    }

    if (!customElements.get(HARNESS_TAG)) {
      customElements.define(
        HARNESS_TAG,
        class extends HTMLElement {
          connectedCallback() {
            if (!this.shadowRoot) {
              this.attachShadow({ mode: 'open' });
            }
          }
        }
      );
    }

    /**
     * Stands in for a chat container: accepts every host-mount offer, relocates
     * the host into its own light DOM, and renders one `<slot name=X slot=X>`
     * forwarder per slot name — deduplicated by name, exactly as the real
     * containers dedupe `_pluginSlotNames`. Mirrors `ChatContainer.tsx` and
     * `cds-aichat-container`.
     */
    async function createRelocationHarness() {
      const harness = await fixture<HTMLElement>(
        html`<cds-test-markdown-relocation-host></cds-test-markdown-relocation-host>`
      );
      const mounted: Array<{
        owner: Element;
        slotName: string;
        host: HTMLElement;
      }> = [];
      const forwarderOwners = new Map<string, Element>();
      const pluginHosts = new Map<string, HTMLElement>();

      harness.addEventListener(
        'cds-aichat-markdown-plugin-host-mount',
        (event) => {
          const detail = (
            event as CustomEvent<{
              slotName: string;
              html?: string;
              element?: HTMLElement;
              isInline: boolean;
            }>
          ).detail;
          const owner = event.composedPath()[0] as Element;
          event.preventDefault();

          // Custom renderers forward a live element; plugin fallbacks forward
          // an HTML string the container hosts itself, keyed by slot name.
          let host = detail.element;
          if (!host) {
            host =
              pluginHosts.get(detail.slotName) ??
              document.createElement(detail.isInline ? 'span' : 'div');
            host.innerHTML = detail.html ?? '';
            pluginHosts.set(detail.slotName, host);
          }
          host.setAttribute('slot', detail.slotName);
          if (host.parentElement !== harness) {
            harness.appendChild(host);
          }

          if (!forwarderOwners.has(detail.slotName)) {
            forwarderOwners.set(detail.slotName, owner);
            // Both attributes carry weight, and both mirror what the real
            // containers render (`<slot name=${slot} slot=${slot}>`). `name`
            // makes the forwarder gather the hoisted host back out of the
            // harness light DOM; `slot` assigns the forwarder itself into the
            // markdown element's own shadow slot, which is the second hop the
            // `assignedElements({ flatten: true })` assertion below resolves
            // through. Without `slot`, nothing is assigned to that shadow slot
            // and `flatten` yields its fallback content instead of the host.
            const forwarder = document.createElement('slot');
            forwarder.setAttribute('name', detail.slotName);
            forwarder.setAttribute('slot', detail.slotName);
            owner.appendChild(forwarder);
          }
          mounted.push({ owner, slotName: detail.slotName, host });
        }
      );
      harness.addEventListener(
        'cds-aichat-markdown-plugin-host-unmount',
        (event) => {
          const { slotName } = (event as CustomEvent<{ slotName: string }>)
            .detail;
          forwarderOwners.delete(slotName);
          pluginHosts.get(slotName)?.remove();
          pluginHosts.delete(slotName);
        }
      );

      /** Mounts a markdown element inside the harness's shadow root. */
      async function addMarkdown(
        markdown: string,
        props: Partial<MarkdownElementInstance> = {}
      ) {
        const el = document.createElement(
          MARKDOWN_ELEMENT_TAG
        ) as MarkdownElementInstance;
        Object.assign(el, props, { markdown });
        harness.shadowRoot?.appendChild(el);
        await el.updateComplete;
        return el;
      }

      return { harness, mounted, forwarderOwners, pluginHosts, addMarkdown };
    }

    /** Returns a `codeBlock` renderer stamping its result with `owner`. */
    function taggedCodeBlockRenderer(owner: string) {
      return ({ code }: { code: string }) => {
        const div = document.createElement('div');
        div.className = 'cds-test-code-override';
        div.dataset.owner = owner;
        div.textContent = code;
        return div;
      };
    }

    it('mints a different slot name in each markdown element', async () => {
      const slotNames: string[] = [];
      const capture = ({ slotName }: { slotName: string }) => {
        slotNames.push(slotName);
        return document.createElement('div');
      };
      const markdown = `| h1 | h2 |\n| --- | --- |\n| a | b |\n\ntrailer`;

      const first = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .customRenderers=${{ table: capture }}
          .markdown=${markdown}></cds-aichat-markdown>`
      );
      await first.updateComplete;
      const firstName = slotNames[slotNames.length - 1];

      const second = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .customRenderers=${{ table: capture }}
          .markdown=${markdown}></cds-aichat-markdown>`
      );
      await second.updateComplete;
      const secondName = slotNames[slotNames.length - 1];

      expect(
        secondName,
        'identical markdown in two elements must not share a slot name'
      ).to.not.equal(firstName);
      // The prefix stays targetable by `[slot^=…]` selectors.
      expect(firstName).to.match(/^cds-aichat-markdown-renderer-table-/);
      expect(secondName).to.match(/^cds-aichat-markdown-renderer-table-/);
    });

    it('projects exactly one hoisted host into each markdown element', async () => {
      const { harness, mounted, forwarderOwners, addMarkdown } =
        await createRelocationHarness();

      await addMarkdown(codeMarkdown, {
        customRenderers: { codeBlock: taggedCodeBlockRenderer('a') },
      } as Partial<MarkdownElementInstance>);
      await addMarkdown(codeMarkdown, {
        customRenderers: { codeBlock: taggedCodeBlockRenderer('b') },
      } as Partial<MarkdownElementInstance>);

      expect(mounted.length, 'both elements should offer a host').to.equal(2);
      const [a, b] = mounted;
      expect(a.slotName).to.not.equal(b.slotName);

      // The name-keyed forwarder dedupe must never starve the second element.
      expect(forwarderOwners.get(a.slotName)).to.equal(a.owner);
      expect(forwarderOwners.get(b.slotName)).to.equal(b.owner);

      for (const { owner, slotName, host } of [a, b]) {
        expect(
          harness.querySelectorAll(`[slot="${slotName}"]`).length,
          'exactly one hoisted host per slot name'
        ).to.equal(1);
        const slot = owner.shadowRoot?.querySelector(
          `slot[name="${slotName}"]`
        ) as HTMLSlotElement | null;
        expect(
          slot,
          'the element should render a placeholder slot'
        ).to.not.equal(null);
        // Compared by identity rather than `deep.equal`: deep-comparing DOM
        // nodes walks the whole node graph on failure.
        const assigned = slot?.assignedElements({ flatten: true }) ?? [];
        expect(
          assigned.length,
          'each element must project exactly one host — not both, not none'
        ).to.equal(1);
        expect(assigned[0], 'each element must project its own host').to.equal(
          host
        );
      }
    });

    it('namespaces plugin-fallback slot names per element', async () => {
      const { mounted, pluginHosts, addMarkdown } =
        await createRelocationHarness();
      const plugins = [tagPlugin];

      const first = await addMarkdown('Hi :tag:', {
        markdownItPlugins: plugins,
      } as Partial<MarkdownElementInstance>);
      await addMarkdown('Bye :tag:', {
        markdownItPlugins: plugins,
      } as Partial<MarkdownElementInstance>);

      expect(mounted.length).to.equal(2);
      const [a, b] = mounted;
      expect(
        b.slotName,
        'plugin-fallback names must not collide across elements'
      ).to.not.equal(a.slotName);
      expect(a.slotName).to.match(
        /^cds-aichat-markdown-renderer-pluginFallback-/
      );
      expect(pluginHosts.size, 'each element gets its own host').to.equal(2);

      // Removing the first element must not tear down the second's host.
      first.remove();
      expect(pluginHosts.has(b.slotName)).to.equal(true);
      expect(pluginHosts.get(b.slotName)?.isConnected).to.equal(true);
    });

    it('keeps the same slot name across a disconnect and reconnect', async () => {
      const slotNames: string[] = [];
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .customRenderers=${{
            codeBlock: ({ slotName }: { slotName: string }) => {
              slotNames.push(slotName);
              return document.createElement('div');
            },
          }}
          .markdown=${codeMarkdown}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      const before = slotNames[slotNames.length - 1];

      const parent = el.parentElement as HTMLElement;
      el.remove();
      parent.appendChild(el);
      await el.updateComplete;

      expect(
        slotNames[slotNames.length - 1],
        'the namespace is minted at construction, so it survives a move'
      ).to.equal(before);
    });
  });

  describe('link / image attribute transforms', () => {
    it('link callback rewrites href and target', async () => {
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .customRenderers=${{
            link: ({ href }: { href: string }) => ({
              href: `${href}?utm_source=test`,
              target: '_self',
            }),
          }}
          .markdown=${'[link](https://example.com)'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      const link = el.shadowRoot?.querySelector('a');
      expect(link?.getAttribute('href')).to.equal(
        'https://example.com?utm_source=test'
      );
      expect(link?.getAttribute('target')).to.equal('_self');
    });

    it('link callback returning null keeps the default target=_blank', async () => {
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .customRenderers=${{ link: () => null }}
          .markdown=${'[link](https://example.com)'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      const link = el.shadowRoot?.querySelector('a');
      expect(link?.getAttribute('href')).to.equal('https://example.com');
      expect(link?.getAttribute('target')).to.equal('_blank');
    });

    it('passes link text + href to the callback and still renders rich children', async () => {
      const seen: Array<{ href: string; text: string }> = [];
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .customRenderers=${{
            link: (args: { href: string; text: string }) => {
              seen.push({ href: args.href, text: args.text });
              return null;
            },
          }}
          .markdown=${'[**bold** link](https://example.com)'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      expect(seen.length).to.be.greaterThanOrEqual(1);
      expect(seen[0].href).to.equal('https://example.com');
      expect(seen[0].text).to.equal('bold link');
      // The framework still renders the inline children of the link.
      expect(el.shadowRoot?.querySelector('a strong')).to.not.equal(null);
    });

    it('re-sanitizes consumer-added link attributes when sanitize-html is set', async () => {
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          sanitize-html
          .customRenderers=${{
            link: () => ({
              attributes: { onclick: 'alert(1)', 'data-safe': 'ok' },
            }),
          }}
          .markdown=${'[link](https://example.com)'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      const link = el.shadowRoot?.querySelector('a');
      expect(link?.hasAttribute('onclick'), 'unsafe attr stripped').to.equal(
        false
      );
      expect(link?.getAttribute('data-safe')).to.equal('ok');
    });

    it('onClick fires with the correct MouseEvent and is never set as an HTML attribute', async () => {
      let receivedEvent: MouseEvent | null = null;
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .customRenderers=${{
            link: () => ({
              onClick: (event: MouseEvent) => {
                event.preventDefault();
                receivedEvent = event;
              },
            }),
          }}
          .markdown=${'[link](https://example.com)'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      const link = el.shadowRoot?.querySelector('a');
      link!.click();
      expect(receivedEvent, 'handler called').to.be.instanceOf(MouseEvent);
      expect(
        link?.hasAttribute('onclick'),
        'onClick must not be serialised as an attribute'
      ).to.equal(false);
    });

    it('onClick works alongside other link result fields', async () => {
      let clicked = false;
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .customRenderers=${{
            link: ({ href }: { href: string }) => ({
              href: `${href}?utm=test`,
              target: '_self',
              rel: 'noopener',
              onClick: (event: MouseEvent) => {
                event.preventDefault();
                clicked = true;
              },
            }),
          }}
          .markdown=${'[link](https://example.com)'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      const link = el.shadowRoot?.querySelector('a');
      expect(link?.getAttribute('href')).to.equal(
        'https://example.com?utm=test'
      );
      expect(link?.getAttribute('target')).to.equal('_self');
      expect(link?.getAttribute('rel')).to.equal('noopener');
      link!.click();
      expect(clicked, 'onClick fired').to.equal(true);
    });

    it('renders links with no click listener when no custom renderer is set', async () => {
      const clickListenerAdds: EventTarget[] = [];
      const originalAdd = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function (
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions
      ) {
        if (type === 'click' && this instanceof HTMLAnchorElement) {
          clickListenerAdds.push(this);
        }
        return originalAdd.call(this, type, listener, options);
      };
      try {
        const el = await fixture<MarkdownElementInstance>(
          html`<cds-aichat-markdown .markdown=${'[link](https://example.com)'}>
          </cds-aichat-markdown>`
        );
        await el.updateComplete;
        const link = el.shadowRoot?.querySelector('a');
        expect(link, 'anchor rendered').to.not.equal(null);
        expect(link?.hasAttribute('onclick')).to.equal(false);
        expect(clickListenerAdds.length, 'no click listener added').to.equal(0);
      } finally {
        EventTarget.prototype.addEventListener = originalAdd;
      }
    });

    it('adds no click listener when the renderer result omits onClick', async () => {
      const clickListenerAdds: EventTarget[] = [];
      const originalAdd = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function (
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions
      ) {
        if (type === 'click' && this instanceof HTMLAnchorElement) {
          clickListenerAdds.push(this);
        }
        return originalAdd.call(this, type, listener, options);
      };
      try {
        const el = await fixture<MarkdownElementInstance>(
          html`<cds-aichat-markdown
            .customRenderers=${{
              link: () => ({
                target: '_self',
                attributes: { 'data-tracked': 'true' },
              }),
            }}
            .markdown=${'[link](https://example.com)'}>
          </cds-aichat-markdown>`
        );
        await el.updateComplete;
        const link = el.shadowRoot?.querySelector('a');
        expect(link?.getAttribute('target')).to.equal('_self');
        expect(link?.getAttribute('data-tracked')).to.equal('true');
        expect(link?.hasAttribute('onclick')).to.equal(false);
        expect(clickListenerAdds.length, 'no click listener added').to.equal(0);
      } finally {
        EventTarget.prototype.addEventListener = originalAdd;
      }
    });

    it('onClick still fires when sanitize-html is set', async () => {
      let clicked = false;
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          sanitize-html
          .customRenderers=${{
            link: () => ({
              attributes: { 'data-safe': 'ok' },
              onClick: (event: MouseEvent) => {
                event.preventDefault();
                clicked = true;
              },
            }),
          }}
          .markdown=${'[link](https://example.com)'}>
        </cds-aichat-markdown>`
      );
      await el.updateComplete;
      const link = el.shadowRoot?.querySelector('a');
      expect(link?.getAttribute('data-safe')).to.equal('ok');
      link!.click();
      expect(clicked, 'onClick fired despite sanitize pass').to.equal(true);
      expect(link?.hasAttribute('onclick')).to.equal(false);
    });

    it('image callback rewrites src', async () => {
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .customRenderers=${{
            image: ({ src }: { src: string }) => ({
              src: `https://cdn.example.com/${src}`,
            }),
          }}
          .markdown=${'![alt](logo.png)'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      const img = el.shadowRoot?.querySelector('img');
      expect(img?.getAttribute('src')).to.equal(
        'https://cdn.example.com/logo.png'
      );
    });

    it('image callback returning null keeps the original src', async () => {
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .customRenderers=${{ image: () => null }}
          .markdown=${'![alt](logo.png)'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      const img = el.shadowRoot?.querySelector('img');
      expect(img?.getAttribute('src')).to.equal('logo.png');
    });
  });

  describe('checklist behavior hook', () => {
    const dispatchToggle = (checkbox: Element, checked: boolean) =>
      checkbox.dispatchEvent(
        new CustomEvent('cds-checkbox-changed', {
          detail: { checked },
          bubbles: true,
          composed: true,
        })
      );

    it('onToggle fires with the item id, label, and new checked state', async () => {
      const toggles: Array<{ id: string; label: string; checked: boolean }> =
        [];
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .customRenderers=${{
            checklist: {
              onToggle: (args: {
                id: string;
                label: string;
                checked: boolean;
              }) => toggles.push(args),
            },
          }}
          .markdown=${'- [ ] First\n- [x] Second'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      const checkbox = el.shadowRoot?.querySelector('cds-checkbox');
      expect(checkbox, 'task-list checkbox rendered').to.not.equal(null);

      dispatchToggle(checkbox as Element, true);
      expect(toggles.length).to.equal(1);
      expect(toggles[0].checked).to.equal(true);
      expect(toggles[0].id).to.be.a('string');
      expect(toggles[0].label).to.include('First');
    });

    it('getChecked overrides the markdown-parsed checked state', async () => {
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .customRenderers=${{
            checklist: {
              onToggle: () => {},
              getChecked: () => true,
            },
          }}
          .markdown=${'- [ ] Unchecked in source'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      const checkbox = el.shadowRoot?.querySelector('cds-checkbox');
      expect(checkbox?.hasAttribute('checked')).to.equal(true);
    });

    it('ignores checkbox toggles when no checklist renderer is configured', async () => {
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .markdown=${'- [ ] First'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      const checkbox = el.shadowRoot?.querySelector('cds-checkbox');
      // No handler registered — dispatching must not throw.
      dispatchToggle(checkbox as Element, true);
      expect(checkbox).to.not.equal(null);
    });
  });

  describe('light DOM mutation observer ignores slotted descendants', () => {
    it("does not reparse markdown when a slotted child's content changes", async () => {
      let hostElement: HTMLDivElement | undefined;
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .customRenderers=${{
            table: () => {
              const div = document.createElement('div');
              div.textContent = 'initial override';
              hostElement = div;
              return div;
            },
          }}
          .markdown=${'| h1 |\n| --- |\n| a |\n\ntrailer'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      expect(hostElement, 'callback should have run').to.not.equal(undefined);

      const markdownBefore = el.markdown;
      hostElement!.textContent =
        'mutated override — should not become markdown source';
      // Wait long enough for any MutationObserver fallout to flush.
      await el.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 0));
      await el.updateComplete;

      expect(
        el.markdown,
        'slotted-child mutations must not contaminate markdown source'
      ).to.equal(markdownBefore);
    });

    it('ignores slotted children when adopting light-DOM markdown', async () => {
      // Author markdown via light DOM (no explicit `markdown` property).
      const el = document.createElement(
        'cds-aichat-markdown'
      ) as MarkdownElementInstance;
      el.textContent = 'Hello **light** dom';
      const host = document.createElement('div');
      host.setAttribute('slot', 'renderer-x');
      host.textContent = 'should be ignored';
      el.appendChild(host);
      document.body.appendChild(el);

      await el.updateComplete;
      // The slotted child contributes its text to `el.textContent` but the
      // slot filter must drop it from the adopted markdown source.
      expect(el.markdown).to.equal('Hello **light** dom');
      expect(el.markdown.includes('should be ignored')).to.equal(false);

      el.remove();
    });
  });
});

describe('cds-aichat-markdown thematic break (hr) rendering', () => {
  const HR_DOC = `Intro paragraph.

- one
- two

---

## After break`;

  // Successive snapshots simulating streaming: a paragraph, then the thematic
  // break appears, then content after it. The break is always preceded by a
  // (non-heading) paragraph, so its settled top gap is spacing-05 (1rem).
  const HR_PREFIXES = [
    'Para A.\n\nPara B.\n\n',
    'Para A.\n\nPara B.\n\n---',
    'Para A.\n\nPara B.\n\n---\n\n## After break',
    'Para A.\n\nPara B.\n\n---\n\n## After break\n\nPara C.',
  ];

  const getStack = (el: MarkdownElementInstance) =>
    el.shadowRoot?.querySelector('.cds-aichat-markdown-stack') ?? null;

  it('renders `---` as a real <hr> directly in the markdown stack (not a plugin-fallback slot host)', async () => {
    const el = await fixture<MarkdownElementInstance>(
      html`<cds-aichat-markdown .markdown=${HR_DOC}></cds-aichat-markdown>`
    );
    await el.updateComplete;

    const stack = getStack(el);
    expect(stack, 'markdown stack should exist').to.not.equal(null);

    const hr = stack?.querySelector('hr');
    expect(hr, 'a real <hr> should be rendered in the stack').to.not.equal(
      null
    );

    // The regression routed `hr` through the plugin-fallback path, which emits
    // a <slot> placeholder and a light-DOM `<div slot=…>` host. Guard against
    // that: no fallback slot/host should exist for the thematic break.
    expect(
      stack?.querySelector('slot[name^="cds-aichat-markdown-renderer-"]'),
      'hr must not render via a fallback <slot>'
    ).to.equal(null);
    expect(
      el.querySelector('[slot^="cds-aichat-markdown-renderer-pluginFallback"]'),
      'hr must not create a light-DOM fallback host'
    ).to.equal(null);
  });

  it('keeps the <hr> a stable stack child with steady top spacing across streaming ticks', async () => {
    const el = await fixture<MarkdownElementInstance>(
      html`<cds-aichat-markdown
        .markdown=${HR_PREFIXES[0]}></cds-aichat-markdown>`
    );
    await el.updateComplete;

    for (const prefix of HR_PREFIXES) {
      el.markdown = prefix;
      await el.updateComplete;

      const stack = getStack(el);
      const hr = stack?.querySelector('hr') as HTMLElement | null;

      // Whenever the parse yields a thematic break it must be a real <hr> in
      // the stack — never a torn-down/re-added fallback host (the source of the
      // "margin goes away and comes back" hop).
      expect(
        el.querySelector(
          '[slot^="cds-aichat-markdown-renderer-pluginFallback"]'
        ),
        `no fallback host should exist for prefix: ${JSON.stringify(prefix)}`
      ).to.equal(null);

      if (hr) {
        // hr follows a (non-heading) list, so it gets the default inter-block
        // gap (spacing-05 = 1rem = 16px) — and that value must not flip.
        const marginTop = getComputedStyle(hr).marginBlockStart;
        expect(
          marginTop,
          `hr top margin should be the settled 16px, got ${marginTop}`
        ).to.equal('16px');
      }
    }
  });

  it('preserves element identity for blocks above the streaming frontier (stable repeat key)', async () => {
    const el = await fixture<MarkdownElementInstance>(
      html`<cds-aichat-markdown
        .markdown=${'Para A.\n\nPara B.\n\n---\n'}></cds-aichat-markdown>`
    );
    await el.updateComplete;

    const firstHr = getStack(el)?.querySelector('hr') ?? null;
    expect(firstHr).to.not.equal(null);

    // Append more content after the hr (as streaming would). The hr's start
    // line is unchanged, so its repeat key is stable and Lit must reuse the
    // same DOM node rather than remounting it.
    el.markdown = 'Para A.\n\nPara B.\n\n---\n\n## After break\n\nMore text.';
    await el.updateComplete;

    const secondHr = getStack(el)?.querySelector('hr') ?? null;
    expect(secondHr).to.not.equal(null);
    expect(secondHr, 'hr element should be reused, not remounted').to.equal(
      firstHr
    );
  });

  // Inline plugin (à la markdown-it-emoji): a `nesting=0` inline leaf rendered
  // through the fallback path as a `<span slot=…>` host. Guards that the
  // `.cds-aichat-markdown-stack > slot { display: block }` rule (added so block
  // fallback hosts get stack spacing) does NOT affect inline plugin output:
  // inline fallback slots live inside the paragraph, never as a direct child of
  // the stack, so the child-combinator rule can't match them.
  function inlineEmojiPlugin(md: any) {
    md.inline.ruler.before(
      'text',
      'cds_test_emoji',
      (state: any, silent: boolean) => {
        if (!state.src.slice(state.pos).startsWith(':smile:')) {
          return false;
        }
        if (!silent) {
          const token = state.push('cds_test_emoji', '', 0);
          token.content = '😀';
        }
        state.pos += ':smile:'.length;
        return true;
      }
    );
    md.renderer.rules.cds_test_emoji = () =>
      `<span class="cds-test-emoji">😀</span>`;
  }

  it('does not make inline plugin-fallback slots display:block', async () => {
    const el = await fixture<MarkdownElementInstance>(
      html`<cds-aichat-markdown
        .markdownItPlugins=${[inlineEmojiPlugin]}
        .markdown=${'Hi :smile: there'}></cds-aichat-markdown>`
    );
    await el.updateComplete;

    // The inline plugin output is hosted in a light-DOM <span slot=…> (inline),
    // not a <div>.
    const host = el.querySelector(
      '[slot^="cds-aichat-markdown-renderer-pluginFallback"]'
    );
    expect(host, 'inline fallback host should exist').to.not.equal(null);
    expect(host?.tagName, 'inline host should be a <span>').to.equal('SPAN');

    // The slot placeholder sits inside the paragraph, never as a direct child
    // of the markdown stack, so `> slot { display: block }` cannot match it.
    const slot = el.shadowRoot?.querySelector(
      'slot[name^="cds-aichat-markdown-renderer-pluginFallback"]'
    ) as HTMLSlotElement | null;
    expect(slot, 'inline fallback slot should exist').to.not.equal(null);
    expect(
      slot?.parentElement?.tagName,
      'inline fallback slot must be nested in the paragraph, not the stack'
    ).to.equal('P');
    expect(
      getStack(el)?.contains(slot ?? null) &&
        slot?.parentElement?.classList.contains('cds-aichat-markdown-stack'),
      'inline slot must not be a direct child of the stack'
    ).to.not.equal(true);
    expect(
      getComputedStyle(slot as Element).display,
      'inline fallback slot should stay display:contents (inline flow), not block'
    ).to.equal('contents');
  });
});

describe('streaming table loading mode', () => {
  const TABLE = `| h1 | h2 |\n| --- | --- |\n| a | b |`;

  it('renders the newest content on the tick that leaves loading mode', async () => {
    // While a trailing table is streaming the element stages each tree instead of
    // rendering it. On the tick that leaves loading mode it must render the tree it
    // just parsed — rendering the staged one instead dropped the final chunk, which
    // stuck permanently when that tick was the last.
    const el = await fixture<MarkdownElementInstance>(
      html`<cds-aichat-markdown
        streaming
        .markdown=${TABLE}></cds-aichat-markdown>`
    );
    await el.updateComplete;

    el.markdown = `${TABLE}\n| c | d |`;
    await el.updateComplete;

    el.markdown = `${TABLE}\n| c | d |\n\nAfter the table.`;
    await el.updateComplete;

    // Table cell text lives in the table element's own shadow root, so assert on the
    // trailing paragraph — it only exists in the tree parsed on this tick.
    expect(el.shadowRoot?.textContent ?? '').to.contain('After the table.');
    expect(el.shadowRoot?.querySelector('cds-aichat-table')).to.not.equal(null);
  });

  it('renders the staged tree when streaming stops without a reparse', async () => {
    // Leaving loading mode by dropping `streaming` does not reparse, so this tick
    // renders whatever `previousTreeForDiff` seeds from — the staged tree. It is the
    // only path that reads `stagedStreamingTokenTree`, so it is what stops that field
    // from looking like dead state, and it is where a dropped final row would show up.
    const calls: Array<{ isLoading: boolean; rowCount: number }> = [];
    const el = await fixture<MarkdownElementInstance>(
      html`<cds-aichat-markdown
        streaming
        .customRenderers=${{
          table: ({
            isLoading,
            rows,
          }: {
            isLoading: boolean;
            rows: unknown[][];
          }) => {
            calls.push({ isLoading, rowCount: rows.length });
            return document.createElement('div');
          },
        }}
        .markdown=${TABLE}></cds-aichat-markdown>`
    );
    await el.updateComplete;
    expect(calls.at(-1)?.isLoading).to.equal(true);

    // Staged, not rendered — the element is holding the table in its loading frame.
    el.markdown = `${TABLE}\n| c | d |`;
    await el.updateComplete;

    el.streaming = false;
    await el.updateComplete;

    expect(calls.at(-1)?.isLoading).to.equal(false);
    expect(calls.at(-1)?.rowCount).to.equal(2);
  });
});
