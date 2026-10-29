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
import {
  createMarkdownPluginHostController,
  resolveMarkdownPluginHostMountDetail,
} from '../src/utils/plugin-host-container.js';
import type {
  MarkdownCustomRendererMountDetail,
  MarkdownPluginHostMountDetail,
  MarkdownPluginHostMountDetailInput,
} from '../src/utils/plugin-host-container.js';
const MARKDOWN_ELEMENT_TAG = 'cds-aichat-markdown';

const TEXT = `Carbon <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32" onclick="window.open('https://carbondesignsystem.com', '_blank')"><defs><style>.cls-1{fill:none;}</style></defs><title>If you click on this icon, it will go to https://carbondesignsystem.com. This is here to test "shouldSanitizeHTML". If true, the click shouldn't work!</title><path d="M13.5,30.8149a1.0011,1.0011,0,0,1-.4927-.13l-8.5-4.815A1,1,0,0,1,4,25V15a1,1,0,0,1,.5073-.87l8.5-4.815a1.0013,1.0013,0,0,1,.9854,0l8.5,4.815A1,1,0,0,1,23,15V25a1,1,0,0,1-.5073.87l-8.5,4.815A1.0011,1.0011,0,0,1,13.5,30.8149ZM6,24.417l7.5,4.2485L21,24.417V15.583l-7.5-4.2485L6,15.583Z"/><path d="M28,17H26V7.583L18.5,3.3345,10.4927,7.87,9.5073,6.13l8.5-4.815a1.0013,1.0013,0,0,1,.9854,0l8.5,4.815A1,1,0,0,1,28,7Z"/><rect class="cls-1" width="32" height="32" transform="translate(32 32) rotate(180)"/></svg> is a **chemical element** with the *atomic number* 6 and symbol **C**. \`C + O₂ → CO₂\` represents one of carbon's most fundamental reactions.

Carbon forms [covalent bonds](https://ibm.com) through electron sharing and creates [carbon chains](https://ibm.com){{target="_self"}} that are essential for organic molecules.
`;

const registeredConstructor = customElements.get(MARKDOWN_ELEMENT_TAG);

if (!registeredConstructor) {
  throw new Error('cds-aichat-markdown was not registered');
}

const _MarkdownElementConstructor =
  (registeredConstructor as typeof CDSAIChatMarkdownElement) ??
  CDSAIChatMarkdownElement;

type MarkdownElementInstance = InstanceType<typeof _MarkdownElementConstructor>;

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
        { timeout: 15000 }
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

    // Break override — should be IGNORED (breaks not in allow-list).
    function breakOverridePlugin(md: any) {
      md.renderer.rules.hardbreak = () => `<i class="cds-test-hardbreak"></i>`;
      md.renderer.rules.softbreak = () => `<i class="cds-test-softbreak"></i>`;
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
      // The table renders its cells after its runtime chunk loads, which can
      // trail markdown's updateComplete on slower engines, so wait for it.
      await waitUntil(
        () => imageCalls.length >= 1,
        'Expected the image plugin rule to fire for the table cell image',
        { timeout: 15000 }
      );
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

    it('ignores plugin overrides on break tokens (hardbreak/softbreak)', async () => {
      const el = await fixture<MarkdownElementInstance>(
        html`<cds-aichat-markdown
          .markdownItPlugins=${[breakOverridePlugin]}
          .markdown=${'line one  \nline two\nline three'}></cds-aichat-markdown>`
      );
      await el.updateComplete;
      // Delegation is priced per token, so a break override would mint a slot
      // host and a mount/unmount event pair for every line break. Native <br>
      // wins instead.
      expect(el.shadowRoot?.querySelectorAll('br').length).to.equal(2);
      expect(
        el.querySelectorAll('.cds-test-hardbreak, .cds-test-softbreak').length,
        'plugin break HTML should not be adopted as a light-DOM host'
      ).to.equal(0);
      expect(
        el.shadowRoot?.querySelectorAll('slot[name*="pluginFallback"]')
          .length ?? 0,
        'break tokens must not mint a plugin-fallback slot'
      ).to.equal(0);
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
      await Promise.resolve();
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
  // Minimal inline plugin whose output goes through the plugin-fallback slot
  // path (the same page-level hoisting, a separate slot-name mint site). Shared
  // by the two describes below; both need a plugin-fallback descriptor.
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

  /** Renders a `::tag::` line as block plugin output. */
  function blockTagPlugin(md: any) {
    md.block.ruler.before(
      'paragraph',
      'cds_test_block_tag',
      (state: any, startLine: number, _endLine: number, silent: boolean) => {
        const start = state.bMarks[startLine] + state.tShift[startLine];
        if (state.src.slice(start, state.eMarks[startLine]) !== '::tag::') {
          return false;
        }
        if (!silent) {
          const token = state.push('cds_test_block_tag', '', 0);
          token.map = [startLine, startLine + 1];
          token.block = true;
        }
        state.line = startLine + 1;
        return true;
      }
    );
    md.renderer.rules.cds_test_block_tag = () =>
      `<div class="cds-test-block-tag">tag</div>`;
  }

  describe('slot names across markdown elements', () => {
    const HARNESS_TAG = 'cds-test-markdown-relocation-host';
    const codeMarkdown = '```json\n{ "name": "Alice" }\n```';

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
     * A whole delegating topology in one object: the shipped container
     * controller does the hosting, and a second listener adds the React
     * `Markdown` wrapper's forwarder on top. It cannot drift from the
     * containers, because it runs their code.
     *
     * The two halves belong to different layers. Hosting is a container's job;
     * the `<slot name=X slot=X>` forwarder into the markdown element's own
     * light DOM is the wrapper's, and is the only hop that crosses that
     * element's shadow boundary.
     *
     * `hops` is how many forwarders stand between the relocated host and the
     * markdown element's own shadow slot, and therefore how many nested shadow
     * roots the harness builds. It matches the three shipped topologies: 1 is
     * the React `ChatContainer`, 2 is `cds-aichat-container`, 3 is
     * `cds-aichat-custom-element` wrapping that container. The outermost level
     * hosts, every level below it defers and forwards the name inward, and the
     * innermost holds the markdown element.
     */
    async function createRelocationHarness(hops = 1) {
      const harness = await fixture<HTMLElement>(
        html`<cds-test-markdown-relocation-host></cds-test-markdown-relocation-host>`
      );
      const levels: HTMLElement[] = [harness];
      for (let depth = 1; depth < hops; depth += 1) {
        const level = document.createElement(HARNESS_TAG);
        levels[depth - 1].shadowRoot?.appendChild(level);
        levels.push(level);
      }
      const innermost = levels[levels.length - 1];
      const mounted: Array<{
        owner: Element;
        slotName: string;
        host: HTMLElement;
      }> = [];

      /**
       * Stands in for a container's `${slotNames.map(...)}` render: one
       * `<slot name=X slot=X>` per live name, in the next level's light DOM.
       */
      const forwardInto = (level: HTMLElement) => (slotNames: string[]) => {
        for (const child of [...level.children]) {
          if (
            child instanceof HTMLSlotElement &&
            !slotNames.includes(child.getAttribute('name') ?? '')
          ) {
            child.remove();
          }
        }
        for (const slotName of slotNames) {
          if (!level.querySelector(`:scope > slot[name="${slotName}"]`)) {
            const forwarder = document.createElement('slot');
            forwarder.setAttribute('name', slotName);
            forwarder.setAttribute('slot', slotName);
            level.appendChild(forwarder);
          }
        }
      };

      // The container half is the shipped one, so this harness cannot drift
      // from the surfaces it stands in for.
      const controller = createMarkdownPluginHostController(
        harness,
        hops > 1 ? { onSlotNamesChange: forwardInto(levels[1]) } : {}
      );
      controller.connect();

      // Levels between the host and the markdown element host nothing but
      // still forward the name inward — a `cds-aichat-container` nested in a
      // `cds-aichat-custom-element`.
      for (let depth = 1; depth < levels.length - 1; depth += 1) {
        createMarkdownPluginHostController(levels[depth], {
          onSlotNamesChange: forwardInto(levels[depth + 1]),
          shouldDefer: () => true,
        }).connect();
      }

      // Bookkeeping only. Nothing here mints a forwarder: the markdown element
      // mints the innermost hop itself, for both claim kinds, in the pass that
      // reads the claim. A second `<slot name=X>` in this tree would compete
      // with it for the same assignment.
      harness.addEventListener(
        'cds-aichat-markdown-plugin-host-mount',
        (event) => {
          const detail = resolveMarkdownPluginHostMountDetail(
            (event as CustomEvent<MarkdownPluginHostMountDetailInput>).detail
          );
          const owner = event.composedPath()[0] as Element;

          if (detail.kind === 'customRenderer') {
            mounted.push({
              owner,
              slotName: detail.slotName,
              host: detail.element,
            });
            return;
          }

          const host = controller.hosts.get(detail.slotName);
          if (host) {
            mounted.push({ owner, slotName: detail.slotName, host });
          }
        }
      );

      /** Mounts a markdown element inside the innermost shadow root. */
      async function addMarkdown(
        markdown: string,
        props: Partial<MarkdownElementInstance> = {}
      ) {
        const el = document.createElement(
          MARKDOWN_ELEMENT_TAG
        ) as MarkdownElementInstance;
        Object.assign(el, props, { markdown });
        innermost.shadowRoot?.appendChild(el);
        await el.updateComplete;
        return el;
      }

      return {
        harness,
        levels,
        mounted,
        pluginHosts: controller.hosts,
        addMarkdown,
      };
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

    it('projects exactly one host into each markdown element', async () => {
      const { harness, mounted, addMarkdown } = await createRelocationHarness();

      const elA = await addMarkdown(codeMarkdown, {
        customRenderers: { codeBlock: taggedCodeBlockRenderer('a') },
      } as Partial<MarkdownElementInstance>);
      const elB = await addMarkdown(codeMarkdown, {
        customRenderers: { codeBlock: taggedCodeBlockRenderer('b') },
      } as Partial<MarkdownElementInstance>);

      expect(mounted.length, 'both elements should offer a host').to.equal(2);
      const [a, b] = mounted;
      expect(a.slotName).to.not.equal(b.slotName);

      // custom-renderer hosts: relocated into the harness light DOM and
      // projected back through the forwarder the element minted. Each element
      // still projects only its own host — the names are namespaced.
      for (const [{ slotName, host }, el] of [
        [a, elA],
        [b, elB],
      ] as Array<[{ slotName: string; host: HTMLElement }, HTMLElement]>) {
        expect(
          host.parentElement,
          'host should be relocated into the container light DOM'
        ).to.equal(harness);
        const slot = el.shadowRoot?.querySelector(
          `slot[name="${slotName}"]`
        ) as HTMLSlotElement | null;
        expect(slot, 'the element should render a named slot').to.not.equal(
          null
        );
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

    describe('first connect of plugin output', () => {
      const PROBE_TAG = 'cds-test-flat-tree-probe';
      const connects: boolean[] = [];

      /** Whether `node` reaches the document through the flat tree. */
      function isInFlatTree(node: Node) {
        let current: Node | null = node;
        while (current) {
          const parent: Node | null = current.parentNode;
          if (parent === document) {
            return true;
          }
          if (parent instanceof Element && parent.shadowRoot) {
            current = (current as Element).assignedSlot;
          } else if (parent instanceof ShadowRoot) {
            current = parent.host;
          } else {
            current = parent;
          }
        }
        return false;
      }

      if (!customElements.get(PROBE_TAG)) {
        customElements.define(
          PROBE_TAG,
          class extends HTMLElement {
            connectedCallback() {
              connects.push(isInFlatTree(this));
            }
          }
        );
      }

      /** Renders `:probe:` inline and a `::probe::` line as a probe element. */
      function probePlugin(md: any) {
        md.inline.ruler.before(
          'text',
          'cds_test_probe',
          (state: any, silent: boolean) => {
            if (!state.src.slice(state.pos).startsWith(':probe:')) {
              return false;
            }
            if (!silent) {
              state.push('cds_test_probe', '', 0);
            }
            state.pos += ':probe:'.length;
            return true;
          }
        );
        md.block.ruler.before(
          'paragraph',
          'cds_test_probe_block',
          (
            state: any,
            startLine: number,
            _endLine: number,
            silent: boolean
          ) => {
            const start = state.bMarks[startLine] + state.tShift[startLine];
            if (
              state.src.slice(start, state.eMarks[startLine]) !== '::probe::'
            ) {
              return false;
            }
            if (!silent) {
              const token = state.push('cds_test_probe_block', '', 0);
              token.map = [startLine, startLine + 1];
              token.block = true;
            }
            state.line = startLine + 1;
            return true;
          }
        );
        md.renderer.rules.cds_test_probe = () =>
          `<${PROBE_TAG}></${PROBE_TAG}>`;
        md.renderer.rules.cds_test_probe_block = () =>
          `<${PROBE_TAG}></${PROBE_TAG}>`;
      }

      for (const hops of [1, 2, 3]) {
        for (const [label, source] of [
          ['inline', 'Hi :probe:'],
          ['block', '::probe::'],
        ]) {
          it(`slots ${label} plugin output before it connects, ${hops} hop(s) out`, async () => {
            connects.length = 0;
            const { addMarkdown } = await createRelocationHarness(hops);
            await addMarkdown(source, {
              markdownItPlugins: [probePlugin],
            } as Partial<MarkdownElementInstance>);

            expect(connects.length, 'the probe should connect').to.be.above(0);
            expect(
              connects[0],
              'its first connect should already be in the flat tree'
            ).to.equal(true);
          });
        }
      }
    });

    // Booleans, not nodes: a failed assertion on a DOM node walks its whole
    // graph to print it.
    it("drops a removed element's plugin host and name on the next offer", async () => {
      const { harness, levels, pluginHosts, addMarkdown } =
        await createRelocationHarness(2);
      const forwarded = (name: string) =>
        Boolean(levels[1].querySelector(`:scope > slot[name="${name}"]`));
      const plugins = [blockTagPlugin];
      const first = await addMarkdown('::tag::', {
        markdownItPlugins: plugins,
      } as Partial<MarkdownElementInstance>);
      const [firstName] = [...pluginHosts.keys()];
      expect(firstName, 'the block output gets a host').to.be.a('string');
      expect(forwarded(firstName)).to.equal(true);

      // Its unmount fires from its own disconnect and never reaches us.
      first.remove();
      await addMarkdown('::tag::', {
        markdownItPlugins: plugins,
      } as Partial<MarkdownElementInstance>);

      expect(pluginHosts.has(firstName)).to.equal(false);
      expect(pluginHosts.size).to.equal(1);
      expect(
        Boolean(harness.querySelector(`:scope > [slot="${firstName}"]`))
      ).to.equal(false);
      expect(forwarded(firstName)).to.equal(false);
    });

    it('leaves a moved plugin host in its new parent when its sender retires', async () => {
      const { levels, pluginHosts, addMarkdown } =
        await createRelocationHarness(2);
      const first = await addMarkdown('::tag::', {
        markdownItPlugins: [blockTagPlugin],
      } as Partial<MarkdownElementInstance>);
      const [firstName, host] = [...pluginHosts.entries()][0];
      const elsewhere = await fixture<HTMLElement>(html`<aside></aside>`);
      elsewhere.appendChild(host);

      first.remove();
      await addMarkdown('::tag::', {
        markdownItPlugins: [blockTagPlugin],
      } as Partial<MarkdownElementInstance>);

      expect(host.parentElement === elsewhere).to.equal(true);
      expect(host.isConnected).to.equal(true);
      expect(pluginHosts.has(firstName)).to.equal(false);
      expect(
        Boolean(levels[1].querySelector(`slot[name="${firstName}"]`))
      ).to.equal(false);
    });

    it('keeps an inline run slotted across a same-task move and interleaved offer', async () => {
      const { levels, mounted, pluginHosts, addMarkdown } =
        await createRelocationHarness(2);
      const first = await addMarkdown('Hi :tag:', {
        markdownItPlugins: [tagPlugin],
      } as Partial<MarkdownElementInstance>);
      const [{ slotName: firstName, host }] = mounted;

      first.remove();
      levels[1].dispatchEvent(
        new CustomEvent('cds-aichat-markdown-plugin-host-mount', {
          bubbles: true,
          composed: true,
          cancelable: true,
          detail: {
            kind: 'pluginFallback',
            slotName: 'interleaved-offer',
            html: '<i>second</i>',
            isInline: false,
          },
        })
      );
      expect(pluginHosts.has('interleaved-offer')).to.equal(true);
      expect(
        Boolean(levels[1].querySelector('slot[name="interleaved-offer"]'))
      ).to.equal(true);
      levels[1].shadowRoot?.appendChild(first);
      await first.updateComplete;
      await Promise.resolve();

      expect(host.isConnected).to.equal(true);
      expect(host.assignedSlot !== null).to.equal(true);
      expect(
        Boolean(levels[1].querySelector(`slot[name="${firstName}"]`))
      ).to.equal(true);
      expect(
        mounted.filter(({ slotName }) => slotName === firstName).length
      ).to.equal(1);
    });

    it('leaves an adopted inline run in its new parent after markdown disconnects', async () => {
      const { mounted, addMarkdown } = await createRelocationHarness(2);
      const el = await addMarkdown('Hi :tag:', {
        markdownItPlugins: [tagPlugin],
      } as Partial<MarkdownElementInstance>);
      const [{ host }] = mounted;
      const owner = await fixture<HTMLElement>(html`<aside></aside>`);
      const text = host.textContent;
      owner.appendChild(host);

      el.remove();
      await Promise.resolve();

      expect(host.parentElement === owner).to.equal(true);
      expect(host.isConnected).to.equal(true);
      expect(host.textContent).to.equal(text);
    });

    it("drops a removed element's inline-run name on the next offer", async () => {
      const { levels, mounted, addMarkdown } = await createRelocationHarness(2);
      const forwarded = () =>
        Array.from(
          levels[1].querySelectorAll<HTMLSlotElement>(':scope > slot[name]'),
          (slot) => slot.name
        );
      const plugins = [tagPlugin];
      const first = await addMarkdown('Hi :tag:', {
        markdownItPlugins: plugins,
      } as Partial<MarkdownElementInstance>);
      const [{ slotName: firstName }] = mounted;
      expect(forwarded()).to.include(firstName);

      first.remove();
      await addMarkdown('Bye :tag:', {
        markdownItPlugins: plugins,
      } as Partial<MarkdownElementInstance>);

      expect(forwarded()).to.not.include(firstName);
      expect(forwarded().length).to.equal(1);
    });

    it('namespaces plugin-fallback slot names per element', async () => {
      const { harness, mounted, addMarkdown } = await createRelocationHarness();
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
      expect(
        harness.querySelectorAll(':scope > span[slot]').length,
        'each element gets its own live run host'
      ).to.equal(2);

      // Removing the first element must not tear down the second's host.
      first.remove();
      await Promise.resolve();
      expect(a.host.isConnected).to.equal(false);
      expect(b.host.parentElement).to.equal(harness);
      expect(b.host.isConnected).to.equal(true);
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

    // ── customRenderers.table — container topology ──────────────────────────
    // These tests use createRelocationHarness so the mount event is seen by a
    // container-like ancestor. The container claims the live element and
    // re-parents it into its own light DOM; the markdown element mints
    // `<slot name=X slot=X>` into its own light DOM in the same updated()
    // pass, so the shadow slot resolves through two hops.

    const tableMarkdown = `| h1 | h2 |\n| --- | --- |\n| a | b |\n\nTrailer`;

    it('customRenderers.table: host is relocated and forwarded from the element', async () => {
      const { harness, mounted, addMarkdown } = await createRelocationHarness();

      const el = await addMarkdown(tableMarkdown, {
        customRenderers: {
          table: () => {
            const div = document.createElement('div');
            div.className = 'cds-test-table-host';
            return div;
          },
        },
      } as Partial<MarkdownElementInstance>);

      expect(
        mounted.length,
        'container should receive one mount event'
      ).to.equal(1);
      const { host, slotName } = mounted[0];

      expect(
        host.parentElement,
        'host should be relocated into the container light DOM'
      ).to.equal(harness);
      expect(
        host.getAttribute('slot'),
        'host should carry the slot name attribute'
      ).to.equal(slotName);
      expect(
        host.style.marginBlockStart,
        'no inline style may outrank the page CSS this relocation admits'
      ).to.equal('');
      expect(
        el.querySelectorAll(`slot[name="${slotName}"][slot="${slotName}"]`)
          .length,
        'the element mints exactly one hop back to it'
      ).to.equal(1);

      const slotEl = el.shadowRoot?.querySelector(
        `slot[name="${slotName}"]`
      ) as HTMLSlotElement | null;
      expect(slotEl, 'named slot should exist in shadow DOM').to.not.equal(
        null
      );
      const assigned = slotEl?.assignedElements({ flatten: true }) ?? [];
      expect(assigned.length).to.equal(1);
      expect(
        assigned[0],
        'the slot must resolve to the relocated host, not to its fallback'
      ).to.equal(host);
    });

    it('customRenderers.table: restores default table when callback returns null (container topology)', async () => {
      const { harness, addMarkdown } = await createRelocationHarness();

      const el = await addMarkdown(tableMarkdown, {
        customRenderers: {
          table: () => {
            const div = document.createElement('div');
            div.className = 'cds-test-table-toggle';
            return div;
          },
        },
      } as Partial<MarkdownElementInstance>);

      const slotEl = el.shadowRoot?.querySelector(
        'slot[name*="cds-aichat-markdown-renderer-table"]'
      ) as HTMLSlotElement | null;
      expect(slotEl, 'named slot should exist on first render').to.not.equal(
        null
      );
      const slotName = slotEl?.getAttribute('name') as string;
      const host = harness.querySelector<HTMLElement>(
        `[slot="${slotName}"]:not(slot)`
      );
      expect(
        slotEl?.assignedElements({ flatten: true })[0],
        'custom host should be projected on first render'
      ).to.equal(host);

      // Switch to null. The element removes the host wherever it lives and
      // retires its own forwarder in the same pass — a surviving forwarder is
      // an assigned node, and an assigned node suppresses the slot's fallback,
      // so the default table would never come back.
      el.customRenderers = { table: () => null };
      await el.updateComplete;

      expect(
        slotEl?.assignedNodes().length,
        'nothing may stay assigned, or the fallback stays suppressed'
      ).to.equal(0);
      expect(
        el.querySelector(`slot[name="${slotName}"]`),
        'the element retires its own hop with the claim'
      ).to.equal(null);
      expect(
        harness.querySelector(`[slot="${slotName}"]:not(slot)`),
        'and the relocated node leaves the container'
      ).to.equal(null);
      expect(
        el.shadowRoot?.querySelector('cds-aichat-table'),
        'default cds-aichat-table should appear after callback returns null'
      ).to.not.equal(null);
    });

    it('customRenderers.table: retires host, forwarder and container node when the table leaves the content', async () => {
      const { harness, mounted, addMarkdown } = await createRelocationHarness();

      const el = await addMarkdown(tableMarkdown, {
        customRenderers: { table: () => document.createElement('div') },
      } as Partial<MarkdownElementInstance>);
      const { slotName } = mounted[0];
      expect(
        harness.querySelector(`[slot="${slotName}"]:not(slot)`)
      ).to.not.equal(null);

      el.markdown = 'No table here.';
      await el.updateComplete;

      expect(
        harness.querySelector(`[slot="${slotName}"]:not(slot)`),
        'the element detaches the node it relocated'
      ).to.equal(null);
      expect(
        el.querySelector(`slot[name="${slotName}"]`),
        'and retires its own hop in the same pass'
      ).to.equal(null);
    });

    it('customRenderers.table: mints one host and one forwarder across a streaming run', async () => {
      const { harness, mounted, addMarkdown } = await createRelocationHarness();
      const stable = document.createElement('div');
      stable.className = 'cds-test-stream-table';

      const el = await addMarkdown(tableMarkdown, {
        streaming: true,
        customRenderers: { table: () => stable },
      } as Partial<MarkdownElementInstance>);
      const { slotName } = mounted[0];

      for (const tail of ['a', 'ab', 'abc']) {
        el.markdown = `${tableMarkdown}${tail}`;
        await el.updateComplete;
      }

      expect(mounted.length, 'one offer for the one table').to.equal(1);
      expect(
        harness.querySelectorAll(`[slot="${slotName}"]:not(slot)`).length,
        'one relocated host'
      ).to.equal(1);
      expect(
        el.querySelectorAll(`slot[name="${slotName}"]`).length,
        'one forwarder'
      ).to.equal(1);
    });

    for (const [kind, markdown] of [
      ['table', tableMarkdown],
      ['codeBlock', codeMarkdown],
    ] as const) {
      for (const hops of [1, 2, 3]) {
        it(`customRenderers.${kind}: keeps live content through a same-task move, ${hops} hop(s) out`, async () => {
          const { harness, mounted, addMarkdown } =
            await createRelocationHarness(hops);
          let renders = 0;
          const el = await addMarkdown(markdown, {
            customRenderers: {
              [kind]: () => {
                renders += 1;
                return document.createElement('input');
              },
            },
          } as Partial<MarkdownElementInstance>);
          const { slotName } = mounted[0];
          const host = harness.querySelector(`[slot="${slotName}"]:not(slot)`);
          const input = host?.firstElementChild as HTMLInputElement;
          input.value = 'retained input';
          const initialRenders = renders;
          const parent = el.parentNode;

          el.remove();
          parent?.appendChild(el);
          await el.updateComplete;

          expect(mounted.length, 'no replacement host offer').to.equal(1);
          expect(renders, 'no new renderer result for a DOM move').to.equal(
            initialRenders
          );
          expect(
            harness.querySelector(`[slot="${slotName}"]:not(slot)`) === host
          ).to.equal(true);
          expect(host?.firstElementChild === input).to.equal(true);
          expect(input.value).to.equal('retained input');
          expect(input.isConnected).to.equal(true);
        });
      }
    }

    for (const hops of [1, 2, 3]) {
      for (const move of ['sibling wrappers', 'whole chat']) {
        it(`customRenderers.table: keeps live content when moving ${move}, ${hops} hop(s) out`, async () => {
          const { harness, levels, mounted, addMarkdown } =
            await createRelocationHarness(hops);
          let renders = 0;
          const el = await addMarkdown(tableMarkdown, {
            customRenderers: {
              table: () => {
                renders += 1;
                return document.createElement('input');
              },
            },
          } as Partial<MarkdownElementInstance>);
          const firstWrapper = document.createElement('div');
          const secondWrapper = document.createElement('div');
          levels[hops - 1].shadowRoot?.append(firstWrapper, secondWrapper);
          firstWrapper.appendChild(el);
          await el.updateComplete;
          const [{ host }] = mounted;
          const input = host.firstElementChild as HTMLInputElement;
          input.value = 'retained input';
          const initialRenders = renders;
          const initialMounts = mounted.length;
          const destination = await fixture<HTMLElement>(html`<aside></aside>`);

          if (move === 'sibling wrappers') {
            secondWrapper.appendChild(el);
          } else {
            destination.appendChild(harness);
          }
          await el.updateComplete;
          await Promise.resolve();

          expect(renders, 'the move does not invoke the renderer').to.equal(
            initialRenders
          );
          expect(mounted.length, 'the owner does not change').to.equal(
            initialMounts
          );
          expect(host.parentElement === harness).to.equal(true);
          expect(host.firstElementChild === input).to.equal(true);
          expect(input.value).to.equal('retained input');
          const slot = el.shadowRoot?.querySelector(
            `slot[name="${host.slot}"]`
          ) as HTMLSlotElement;
          expect(slot.assignedElements({ flatten: true })[0] === host).to.equal(
            true
          );
        });
      }
    }

    it('keeps standalone renderer state through a same-task parent change', async () => {
      const first = await fixture<HTMLElement>(html`<div></div>`);
      const second = await fixture<HTMLElement>(html`<div></div>`);
      const el = document.createElement(
        MARKDOWN_ELEMENT_TAG
      ) as MarkdownElementInstance;
      let renders = 0;
      el.customRenderers = {
        table: () => {
          renders += 1;
          return document.createElement('input');
        },
      };
      el.markdown = tableMarkdown;
      first.appendChild(el);
      await el.updateComplete;
      const input = el.querySelector('input')!;
      input.value = 'standalone input';
      const initialRenders = renders;

      second.appendChild(el);
      await el.updateComplete;

      expect(renders).to.equal(initialRenders);
      expect(el.querySelector('input') === input).to.equal(true);
      expect(input.value).to.equal('standalone input');
    });

    it('reoffers renderer content when an unregistered external listener changes', async () => {
      const first = await fixture<HTMLElement>(html`<div></div>`);
      const second = await fixture<HTMLElement>(html`<div></div>`);
      const mounts: HTMLElement[] = [];
      for (const owner of [first, second]) {
        owner.addEventListener(
          'cds-aichat-markdown-plugin-host-mount',
          (event) => {
            const detail = (
              event as CustomEvent<MarkdownCustomRendererMountDetail>
            ).detail;
            event.preventDefault();
            owner.appendChild(detail.element);
            mounts.push(detail.element);
          }
        );
      }
      const el = document.createElement(
        MARKDOWN_ELEMENT_TAG
      ) as MarkdownElementInstance;
      el.customRenderers = { table: () => document.createElement('input') };
      el.markdown = tableMarkdown;
      first.appendChild(el);
      await el.updateComplete;
      const oldHost = mounts[0];

      second.appendChild(el);
      await el.updateComplete;

      expect(mounts.length).to.equal(2);
      expect(oldHost.isConnected).to.equal(false);
      expect(mounts[1].parentElement === second).to.equal(true);
      expect(mounts[1].firstElementChild?.tagName).to.equal('INPUT');
    });

    async function createExternalRelocationHarness(claim = true) {
      const owner = await fixture<HTMLElement>(
        html`<cds-test-markdown-relocation-host></cds-test-markdown-relocation-host>`
      );
      const offers: MarkdownPluginHostMountDetail[] = [];
      const hosts: HTMLElement[] = [];
      owner.addEventListener(
        'cds-aichat-markdown-plugin-host-mount',
        (event) => {
          const detail = resolveMarkdownPluginHostMountDetail(
            (event as CustomEvent<MarkdownPluginHostMountDetailInput>).detail
          );
          offers.push(detail);
          if (!claim) {
            return;
          }
          event.preventDefault();
          const host =
            detail.kind === 'customRenderer'
              ? detail.element
              : document.createElement('div');
          host.slot = detail.slotName;
          owner.appendChild(host);
          if (detail.kind === 'pluginFallback') {
            host.innerHTML = detail.html;
          }
          hosts.push(host);
        }
      );
      return { owner, offers, hosts };
    }

    it('offers retained standalone renderer content to a new external listener', async () => {
      const first = await fixture<HTMLElement>(html`<div></div>`);
      const destination = await createExternalRelocationHarness();
      const el = document.createElement(
        MARKDOWN_ELEMENT_TAG
      ) as MarkdownElementInstance;
      let renders = 0;
      el.customRenderers = {
        table: () => {
          renders += 1;
          return document.createElement('input');
        },
      };
      el.markdown = tableMarkdown;
      first.appendChild(el);
      await el.updateComplete;
      const input = el.querySelector('input')!;
      const host = input.parentElement!;
      input.value = 'retained standalone input';
      const initialRenders = renders;

      destination.owner.shadowRoot?.appendChild(el);
      await el.updateComplete;

      expect(destination.offers.length).to.equal(1);
      expect(destination.offers[0].kind).to.equal('customRenderer');
      expect(destination.hosts[0] === host).to.equal(true);
      expect(host.firstElementChild === input).to.equal(true);
      expect(input.value).to.equal('retained standalone input');
      expect(
        renders,
        'discovering ownership does not rerun the renderer'
      ).to.equal(initialRenders);
      const slot = el.shadowRoot?.querySelector(
        `slot[name="${host.slot}"]`
      ) as HTMLSlotElement;
      expect(slot.assignedElements({ flatten: true })[0] === host).to.equal(
        true
      );
    });

    for (const claim of [false, true]) {
      it(`reoffers standalone block fallback when an external listener ${claim ? 'accepts' : 'declines'}`, async () => {
        const first = await fixture<HTMLElement>(html`<div></div>`);
        const destination = await createExternalRelocationHarness(claim);
        const el = document.createElement(
          MARKDOWN_ELEMENT_TAG
        ) as MarkdownElementInstance;
        el.markdownItPlugins = [blockTagPlugin];
        el.markdown = '::tag::';
        first.appendChild(el);
        await el.updateComplete;
        const localHost = el.querySelector<HTMLElement>('[slot]')!;
        const content = localHost.firstElementChild;

        destination.owner.shadowRoot?.appendChild(el);
        await el.updateComplete;

        expect(destination.offers.length).to.equal(1);
        expect(destination.offers[0].kind).to.equal('pluginFallback');
        const host = claim ? destination.hosts[0] : localHost;
        expect(host.textContent).to.equal('tag');
        expect(
          host.parentElement === (claim ? destination.owner : el)
        ).to.equal(true);
        if (claim) {
          expect(localHost.isConnected).to.equal(false);
        } else {
          expect(localHost.firstElementChild === content).to.equal(true);
        }
        const slot = el.shadowRoot?.querySelector(
          `slot[name="${host.slot}"]`
        ) as HTMLSlotElement;
        expect(slot.assignedElements({ flatten: true })[0] === host).to.equal(
          true
        );
      });
    }

    it('offers a retained standalone inline run to a new external listener', async () => {
      const first = await fixture<HTMLElement>(html`<div></div>`);
      const destination = await createExternalRelocationHarness();
      const el = document.createElement(
        MARKDOWN_ELEMENT_TAG
      ) as MarkdownElementInstance;
      el.markdownItPlugins = [
        (md: any) => {
          tagPlugin(md);
          md.renderer.rules.cds_test_tag = () => '<input>';
        },
      ];
      el.markdown = 'Hi :tag:';
      first.appendChild(el);
      await el.updateComplete;
      const input = el.querySelector('input')!;
      const host = el.querySelector<HTMLElement>('[slot]')!;
      input.value = 'retained inline input';

      destination.owner.shadowRoot?.appendChild(el);
      await el.updateComplete;

      expect(destination.offers.length).to.equal(1);
      expect(destination.offers[0].kind).to.equal('customRenderer');
      expect(destination.hosts[0] === host).to.equal(true);
      expect(host.querySelector('input') === input).to.equal(true);
      expect(input.value).to.equal('retained inline input');
      const slot = el.shadowRoot?.querySelector(
        `slot[name="${host.slot}"]`
      ) as HTMLSlotElement;
      expect(slot.assignedElements({ flatten: true })[0] === host).to.equal(
        true
      );
    });

    for (const placement of ['shadow', 'light']) {
      it(`customRenderers.table: reoffers content in a different ${placement} DOM host`, async () => {
        const first = await createRelocationHarness();
        const second = await createRelocationHarness();
        const el = await first.addMarkdown(tableMarkdown, {
          customRenderers: { table: () => document.createElement('input') },
        } as Partial<MarkdownElementInstance>);
        if (placement === 'light') {
          first.harness.appendChild(el);
          await el.updateComplete;
        }
        const { slotName } = first.mounted[0];

        el.remove();
        const destination =
          placement === 'light' ? second.harness : second.harness.shadowRoot;
        destination?.appendChild(el);
        await el.updateComplete;

        expect(
          first.harness.querySelector(`[slot="${slotName}"]:not(slot)`)
        ).to.equal(null);
        expect(second.mounted.length).to.equal(1);
        const host = second.harness.querySelector(
          `[slot="${slotName}"]:not(slot)`
        );
        expect(host?.firstElementChild?.tagName).to.equal('INPUT');
        if (placement === 'shadow') {
          const slot = el.shadowRoot?.querySelector(
            `slot[name="${slotName}"]`
          ) as HTMLSlotElement;
          expect(slot.assignedElements({ flatten: true })[0] === host).to.equal(
            true
          );
        }
      });
    }

    it('reoffers a delegated block plugin after its light-DOM controller changes', async () => {
      const first = await createRelocationHarness();
      const second = await createRelocationHarness();
      const el = await first.addMarkdown('::tag::', {
        markdownItPlugins: [blockTagPlugin],
      } as Partial<MarkdownElementInstance>);
      first.harness.appendChild(el);
      await el.updateComplete;
      const [[slotName, oldHost]] = [...first.pluginHosts.entries()];

      second.harness.appendChild(el);
      await el.updateComplete;

      expect(first.pluginHosts.has(slotName)).to.equal(false);
      expect(oldHost.isConnected).to.equal(false);
      expect(second.pluginHosts.size).to.equal(1);
      const newHost = second.pluginHosts.get(slotName);
      expect(newHost?.parentNode === second.harness).to.equal(true);
      expect(newHost?.textContent).to.contain('tag');
    });

    it('keeps only the current block-plugin claim after a same-task return to its first controller', async () => {
      const first = await createRelocationHarness(2);
      const second = await createRelocationHarness(2);
      const el = await first.addMarkdown('::tag::', {
        markdownItPlugins: [blockTagPlugin],
      } as Partial<MarkdownElementInstance>);
      const [[slotName, oldHost]] = [...first.pluginHosts.entries()];

      second.levels[1].shadowRoot?.appendChild(el);
      first.levels[1].shadowRoot?.appendChild(el);
      await el.updateComplete;
      await Promise.resolve();

      expect(oldHost.isConnected).to.equal(false);
      expect(first.pluginHosts.size).to.equal(1);
      expect(second.pluginHosts.size).to.equal(0);
      expect(
        second.levels[1].querySelector(`slot[name="${slotName}"]`)
      ).to.equal(null);
      const host = first.pluginHosts.get(slotName);
      expect(host?.isConnected).to.equal(true);
      const slot = el.shadowRoot?.querySelector(
        `slot[name="${slotName}"]`
      ) as HTMLSlotElement;
      expect(slot.assignedElements({ flatten: true })[0] === host).to.equal(
        true
      );
    });

    it('moves an inline run and its forwarders to a different controller', async () => {
      const first = await createRelocationHarness(2);
      const second = await createRelocationHarness(2);
      const el = await first.addMarkdown('Hi :tag:', {
        markdownItPlugins: [tagPlugin],
      } as Partial<MarkdownElementInstance>);
      const [{ slotName, host }] = first.mounted;

      second.levels[1].shadowRoot?.appendChild(el);
      await el.updateComplete;
      await Promise.resolve();

      expect(host.parentElement === second.harness).to.equal(true);
      expect(second.mounted.length).to.equal(1);
      expect(second.mounted[0].host === host).to.equal(true);
      expect(
        first.levels[1].querySelector(`slot[name="${slotName}"]`)
      ).to.equal(null);
      const slot = el.shadowRoot?.querySelector(
        `slot[name="${slotName}"]`
      ) as HTMLSlotElement;
      expect(slot.assignedElements({ flatten: true })[0] === host).to.equal(
        true
      );
    });

    it('customRenderers.table: preserves an adopted host after markdown is removed', async () => {
      const { harness, mounted, addMarkdown } = await createRelocationHarness();
      const content = document.createElement('input');
      const el = await addMarkdown(tableMarkdown, {
        customRenderers: { table: () => content },
      } as Partial<MarkdownElementInstance>);
      const { slotName } = mounted[0];
      const host = harness.querySelector(`[slot="${slotName}"]:not(slot)`);
      const owner = document.createElement('div');
      document.body.appendChild(owner);
      try {
        owner.appendChild(host!);
        el.remove();
        await Promise.resolve();
        expect(host?.parentNode === owner).to.equal(true);
        expect(content.isConnected).to.equal(true);
        expect(el.querySelector(`slot[name="${slotName}"]`)).to.equal(null);
      } finally {
        owner.remove();
      }
    });

    it('customRenderers.table: mints one forwarder, not two, across a disconnect and reconnect', async () => {
      const { harness, mounted, addMarkdown } = await createRelocationHarness();

      const el = await addMarkdown(tableMarkdown, {
        customRenderers: { table: () => document.createElement('div') },
      } as Partial<MarkdownElementInstance>);
      const { slotName } = mounted[0];

      el.remove();
      await Promise.resolve();
      expect(
        harness.querySelector(`[slot="${slotName}"]:not(slot)`),
        'disconnect detaches the relocated node'
      ).to.equal(null);
      expect(
        el.querySelector(`slot[name="${slotName}"]`),
        'and retires the forwarder with it'
      ).to.equal(null);

      harness.shadowRoot?.appendChild(el);
      await el.updateComplete;

      // The namespace is minted at construction, so the reconnect re-offers
      // under the same name and a leaked forwarder would win by tree order.
      expect(mounted.length, 'the reconnect re-offers the host').to.equal(2);
      expect(el.querySelectorAll(`slot[name="${slotName}"]`).length).to.equal(
        1
      );
      const slot = el.shadowRoot?.querySelector(
        `slot[name="${slotName}"]`
      ) as HTMLSlotElement | null;
      expect(slot?.assignedElements({ flatten: true })[0]).to.equal(
        harness.querySelector(`[slot="${slotName}"]:not(slot)`)
      );
    });

    // Every case above runs at one shadow boundary, which is only the React
    // topology. The two web-component containers compose two and three, and a
    // chain that resolves at one hop can still break at three — a missing
    // middle forwarder, or a name the deferring level never tracked. These run
    // the same protocol at each depth.
    describe('across composed shadow boundaries', () => {
      const TOPOLOGIES: Array<{ hops: number; surface: string }> = [
        { hops: 1, surface: 'React ChatContainer' },
        { hops: 2, surface: 'cds-aichat-container' },
        { hops: 3, surface: 'cds-aichat-custom-element' },
      ];

      const MAX_HOPS = TOPOLOGIES[TOPOLOGIES.length - 1].hops;

      /**
       * Resolves the projection one hop at a time and returns the forwarders
       * it passed through. `assignedElements({ flatten: true })` collapses the
       * whole chain, so it cannot tell a three-hop chain from a host that
       * never left the element; this counts the hops and names the one that
       * broke.
       */
      function walkProjection(slot: HTMLSlotElement) {
        const forwarders: HTMLSlotElement[] = [];
        let current = slot;
        while (forwarders.length <= MAX_HOPS) {
          const assigned = current.assignedElements();
          expect(
            assigned.length,
            `slot "${current.getAttribute('name')}" must have exactly one assigned element`
          ).to.equal(1);
          const [next] = assigned;
          if (!(next instanceof HTMLSlotElement)) {
            return { forwarders, projected: next as HTMLElement };
          }
          forwarders.push(next);
          current = next;
        }
        throw new Error('the forwarder chain never reached a host');
      }

      /** The markdown element's own shadow slot for `slotName`. */
      function shadowSlot(el: MarkdownElementInstance, slotName: string) {
        const slot = el.shadowRoot?.querySelector(
          `slot[name="${slotName}"]`
        ) as HTMLSlotElement | null;
        expect(
          slot,
          `the element should render slot "${slotName}"`
        ).to.not.equal(null);
        return slot as HTMLSlotElement;
      }

      for (const { hops, surface } of TOPOLOGIES) {
        it(`customRenderers.table: projects the relocated host through ${hops} hop(s) (${surface})`, async () => {
          const { harness, mounted, addMarkdown } =
            await createRelocationHarness(hops);
          const rendered = document.createElement('div');
          rendered.className = 'cds-test-multihop-table';

          const el = await addMarkdown(tableMarkdown, {
            customRenderers: { table: () => rendered },
          } as Partial<MarkdownElementInstance>);

          expect(
            mounted.length,
            'the offer reaches the outermost surface, whatever the depth'
          ).to.equal(1);
          const { host, slotName } = mounted[0];
          expect(
            host.parentElement,
            'the outermost surface is the one that hosts'
          ).to.equal(harness);
          expect(
            host.firstElementChild,
            'the element keeps writing the consumer node into the host'
          ).to.equal(rendered);

          const { forwarders, projected } = walkProjection(
            shadowSlot(el, slotName)
          );
          expect(
            forwarders.length,
            'one forwarder per shadow boundary between the host and the element'
          ).to.equal(hops);
          expect(
            forwarders[0].parentElement,
            'the element mints the innermost hop itself'
          ).to.equal(el);
          expect(
            projected,
            'the chain must land on the relocated host, not on a fallback'
          ).to.equal(host);
        });

        it(`inline plugin run: projects the relocated host through ${hops} hop(s) (${surface})`, async () => {
          const { harness, mounted, addMarkdown } =
            await createRelocationHarness(hops);

          const el = await addMarkdown('Hi :tag:', {
            markdownItPlugins: [tagPlugin],
          } as Partial<MarkdownElementInstance>);

          expect(
            mounted.length,
            'the container hosts the complete live run'
          ).to.equal(1);
          const { slotName, host } = mounted[0];
          expect(
            host.parentElement,
            'the outermost surface is the one that hosts'
          ).to.equal(harness);
          expect(host.querySelector('.cds-test-tag')).to.not.equal(null);

          const { forwarders, projected } = walkProjection(
            shadowSlot(el, slotName)
          );
          expect(
            forwarders.length,
            'one forwarder per shadow boundary between the host and the element'
          ).to.equal(hops);
          expect(
            forwarders[0].parentElement,
            'the wrapper mints the innermost hop for a plugin-fallback claim'
          ).to.equal(el);
          expect(
            projected,
            'the chain must land on the relocated host, not on a fallback'
          ).to.equal(host);
        });

        it(`customRenderers.table: retires every hop when the callback returns null (${hops} hop(s))`, async () => {
          const { harness, levels, mounted, addMarkdown } =
            await createRelocationHarness(hops);

          const el = await addMarkdown(tableMarkdown, {
            customRenderers: { table: () => document.createElement('div') },
          } as Partial<MarkdownElementInstance>);
          const { slotName } = mounted[0];
          expect(
            walkProjection(shadowSlot(el, slotName)).forwarders.length
          ).to.equal(hops);

          el.customRenderers = { table: () => null };
          await el.updateComplete;

          expect(
            harness.querySelector(`[slot="${slotName}"]:not(slot)`),
            'the relocated node leaves the outermost surface'
          ).to.equal(null);
          levels.forEach((level, depth) => {
            expect(
              level.querySelector(`slot[name="${slotName}"]`),
              `the forwarder at depth ${depth} must retire with the claim`
            ).to.equal(null);
          });
          expect(
            el.querySelector(`slot[name="${slotName}"]`),
            'and so must the hop the element minted'
          ).to.equal(null);
          expect(
            shadowSlot(el, slotName).assignedNodes().length,
            'any surviving hop keeps the default table suppressed'
          ).to.equal(0);
          expect(
            el.shadowRoot?.querySelector('cds-aichat-table'),
            'the default table comes back at every depth'
          ).to.not.equal(null);
        });

        it(`inline plugin run: retires every hop when the token leaves the content (${hops} hop(s))`, async () => {
          const { harness, levels, mounted, addMarkdown } =
            await createRelocationHarness(hops);

          const el = await addMarkdown('Hi :tag:', {
            markdownItPlugins: [tagPlugin],
          } as Partial<MarkdownElementInstance>);
          const { slotName, host } = mounted[0];
          expect(
            walkProjection(shadowSlot(el, slotName)).forwarders.length
          ).to.equal(hops);

          el.markdown = 'Hi.';
          await el.updateComplete;

          expect(
            host.isConnected,
            'the container drops the live run host'
          ).to.equal(false);
          expect(
            harness.querySelector(`[slot="${slotName}"]`),
            'and nothing is left in the outermost light DOM'
          ).to.equal(null);
          levels.forEach((level, depth) => {
            expect(
              level.querySelector(`slot[name="${slotName}"]`),
              `the forwarder at depth ${depth} must retire with the claim`
            ).to.equal(null);
          });
          expect(
            el.querySelector(`slot[name="${slotName}"]`),
            'the wrapper retires its hop on the unmount event'
          ).to.equal(null);
        });
      }
    });
  });

  // ── The mount detail's `kind` discriminant ────────────────────────────
  // Both dispatch sites offer a host over the same event, and a listener used
  // to tell them apart by testing whether `detail.element` was set — the shape
  // was the discriminant. `kind` publishes what the element already knows.
  describe('plugin-host mount detail kind', () => {
    const KIND_HARNESS_TAG = 'cds-test-markdown-kind-host';

    if (!customElements.get(KIND_HARNESS_TAG)) {
      customElements.define(
        KIND_HARNESS_TAG,
        class extends HTMLElement {
          connectedCallback() {
            if (!this.shadowRoot) {
              this.attachShadow({ mode: 'open' });
            }
          }
        }
      );
    }

    /** Records every mount detail without claiming anything. */
    async function createDetailRecorder() {
      const harness = await fixture<HTMLElement>(
        html`<cds-test-markdown-kind-host></cds-test-markdown-kind-host>`
      );
      const details: Array<Record<string, unknown>> = [];
      harness.addEventListener(
        'cds-aichat-markdown-plugin-host-mount',
        (event) => {
          details.push((event as CustomEvent<Record<string, unknown>>).detail);
        }
      );
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
      return { harness, details, addMarkdown };
    }

    it('offers an inline plugin run as a live customRenderer host', async () => {
      const { details, addMarkdown } = await createDetailRecorder();

      await addMarkdown('Hi :tag: there', {
        markdownItPlugins: [tagPlugin],
      } as Partial<MarkdownElementInstance>);

      expect(
        details.length,
        'the plugin token should offer a host'
      ).to.be.at.least(1);
      expect(details[0].kind).to.equal('customRenderer');
      expect(details[0].element).to.be.instanceOf(HTMLSpanElement);
      expect(details[0].html).to.equal(undefined);
    });

    it('marks a customRenderers offer as customRenderer', async () => {
      const { details, addMarkdown } = await createDetailRecorder();

      await addMarkdown('```json\n{ "a": 1 }\n```', {
        customRenderers: { codeBlock: () => document.createElement('div') },
      } as Partial<MarkdownElementInstance>);

      expect(
        details.length,
        'the code block should offer a host'
      ).to.be.at.least(1);
      expect(details[0].kind).to.equal('customRenderer');
      expect(details[0].element).to.be.instanceOf(HTMLElement);
      expect(details[0].html).to.equal(undefined);
    });
  });

  // `html` is typed `string` on the plugin-fallback detail, so a payload
  // missing it cannot come from the markdown element — it comes from an
  // emitter this compiler never saw, which is the audience the protocol was
  // published for. Hence the synthesized events: no element produces these.
  describe('plugin-host container: a payload carrying no html', () => {
    async function createHostTarget() {
      const target = await fixture<HTMLElement>(html`<div></div>`);
      const controller = createMarkdownPluginHostController(target);
      controller.connect();

      function dispatch(type: string, detail: Record<string, unknown>) {
        target.dispatchEvent(
          new CustomEvent(type, {
            bubbles: true,
            composed: true,
            cancelable: true,
            detail,
          })
        );
      }

      return { controller, dispatch };
    }

    it('hosts a mount with no html as an empty host', async () => {
      const { controller, dispatch } = await createHostTarget();

      dispatch('cds-aichat-markdown-plugin-host-mount', {
        kind: 'pluginFallback',
        slotName: 'no-html-mount',
        isInline: false,
      });

      expect(controller.hosts.get('no-html-mount')?.innerHTML).to.equal('');
    });

    it('empties the host on an update with no html', async () => {
      const { controller, dispatch } = await createHostTarget();

      dispatch('cds-aichat-markdown-plugin-host-mount', {
        kind: 'pluginFallback',
        slotName: 'no-html-update',
        html: '<i>x</i>',
        isInline: false,
      });
      dispatch('cds-aichat-markdown-plugin-host-update', {
        slotName: 'no-html-update',
      });

      expect(controller.hosts.get('no-html-update')?.innerHTML).to.equal('');
    });
  });

  // Both web-component containers build the controller in a field initializer
  // and only `connect()` / `disconnect()` from their lifecycle callbacks, so
  // one controller survives a DOM move. `disconnect()` keeps the forwarder
  // slot names on purpose: the markdown element re-offers every claim once it
  // reconnects, and retiring the names mid-move would drop the forwarder a
  // relocated `customRenderers` node still needs to project.
  describe('plugin-host container across a disconnect', () => {
    async function createReconnectTarget() {
      const target = await fixture<HTMLElement>(html`<div></div>`);
      const announced: string[][] = [];
      const controller = createMarkdownPluginHostController(target, {
        onSlotNamesChange: (slotNames) => {
          announced.push(slotNames);
        },
      });
      controller.connect();

      function mount(detail: MarkdownPluginHostMountDetailInput) {
        target.dispatchEvent(
          new CustomEvent('cds-aichat-markdown-plugin-host-mount', {
            bubbles: true,
            composed: true,
            cancelable: true,
            detail,
          })
        );
      }

      return { target, controller, announced, mount };
    }

    it('drops the hosts it created and keeps the slot names', async () => {
      const { target, controller, announced, mount } =
        await createReconnectTarget();
      const relocated = document.createElement('div');
      mount({
        kind: 'pluginFallback',
        slotName: 'reconnect-fallback',
        html: '<i>x</i>',
        isInline: false,
      });
      mount({
        kind: 'customRenderer',
        slotName: 'reconnect-renderer',
        element: relocated,
        isInline: false,
      });

      controller.disconnect();

      expect(controller.hosts.size).to.equal(0);
      expect(target.querySelector('[slot="reconnect-fallback"]')).to.equal(
        null
      );
      // Never created here, so never destroyed here — the node belongs to the
      // markdown element and rides along with the container's DOM move.
      expect(relocated.parentElement).to.equal(target);
      expect(
        announced,
        'a retirement would announce a third, shorter list'
      ).to.deep.equal([
        ['reconnect-fallback'],
        ['reconnect-fallback', 'reconnect-renderer'],
      ]);
    });

    for (const teardown of ['unmount', 'disconnect']) {
      it(`leaves a moved fallback host in its new parent on ${teardown}`, async () => {
        const { controller, mount, target } = await createReconnectTarget();
        mount({
          kind: 'pluginFallback',
          slotName: 'moved-host',
          html: '<i>x</i>',
          isInline: false,
        });
        const host = controller.hosts.get('moved-host')!;
        const elsewhere = await fixture<HTMLElement>(html`<aside></aside>`);
        elsewhere.appendChild(host);

        if (teardown === 'disconnect') {
          controller.disconnect();
        } else {
          target.dispatchEvent(
            new CustomEvent('cds-aichat-markdown-plugin-host-unmount', {
              detail: { slotName: 'moved-host' },
            })
          );
        }

        expect(host.parentElement === elsewhere).to.equal(true);
        expect(controller.hosts.has('moved-host')).to.equal(false);
      });
    }

    it('cancels pending pruning when disconnected', async () => {
      const { target, controller, announced, mount } =
        await createReconnectTarget();
      mount({
        kind: 'pluginFallback',
        slotName: 'pending-prune',
        html: '<i>x</i>',
        isInline: false,
      });
      target.remove();
      controller.disconnect();
      await Promise.resolve();

      expect(announced).to.deep.equal([['pending-prune']]);
      expect(controller.hosts.size).to.equal(0);
    });

    it('hosts one node per mount once it reconnects', async () => {
      const { target, controller, announced, mount } =
        await createReconnectTarget();
      const detail: MarkdownPluginHostMountDetailInput = {
        kind: 'pluginFallback',
        slotName: 'reconnect-rehost',
        html: '<i>x</i>',
        isInline: false,
      };
      mount(detail);

      controller.disconnect();
      controller.connect();
      mount(detail);

      expect(
        target.querySelectorAll('[slot="reconnect-rehost"]').length
      ).to.equal(1);
      expect(controller.hosts.get('reconnect-rehost')?.innerHTML).to.equal(
        '<i>x</i>'
      );

      mount({
        kind: 'pluginFallback',
        slotName: 'reconnect-second',
        html: '<i>y</i>',
        isInline: false,
      });

      expect(
        announced,
        'the retained name is not re-announced, and the new one extends it'
      ).to.deep.equal([
        ['reconnect-rehost'],
        ['reconnect-rehost', 'reconnect-second'],
      ]);
    });
  });

  // ── Slot-name stability across render commits ─────────────────────────
  // A plugin-fallback slot name ends in a positional index minted by a counter
  // that `renderMarkdownTree` resets once per call. But `renderFallback` runs
  // inside a lit-html `repeat()` callback, so it evaluates when lit-html
  // *commits*, and one render result can be committed more than once. These
  // cases pin the name to the token rather than to the commit count.
  describe('plugin-fallback slot names across render commits', () => {
    const COMMIT_HARNESS_TAG = 'cds-test-markdown-commit-host';

    if (!customElements.get(COMMIT_HARNESS_TAG)) {
      customElements.define(
        COMMIT_HARNESS_TAG,
        class extends HTMLElement {
          connectedCallback() {
            if (!this.shadowRoot) {
              this.attachShadow({ mode: 'open' });
            }
          }
        }
      );
    }

    /** A delegating container that also records every offer and retirement. */
    async function createCommitRecorder() {
      const harness = await fixture<HTMLElement>(
        html`<cds-test-markdown-commit-host></cds-test-markdown-commit-host>`
      );
      const mounts: string[] = [];
      const unmounts: string[] = [];

      const controller = createMarkdownPluginHostController(harness);
      controller.connect();
      harness.addEventListener(
        'cds-aichat-markdown-plugin-host-mount',
        (event) => {
          const detail = resolveMarkdownPluginHostMountDetail(
            (event as CustomEvent<MarkdownPluginHostMountDetailInput>).detail
          );
          if (detail.slotName.includes('pluginFallback')) {
            mounts.push(detail.slotName);
          }
        }
      );
      harness.addEventListener(
        'cds-aichat-markdown-plugin-host-unmount',
        (event) => {
          unmounts.push(
            (event as CustomEvent<{ slotName: string }>).detail.slotName
          );
        }
      );

      async function addMarkdown(markdown: string) {
        const el = document.createElement(
          MARKDOWN_ELEMENT_TAG
        ) as MarkdownElementInstance;
        Object.assign(el, {
          markdownItPlugins: [tagPlugin],
          markdown,
        } as Partial<MarkdownElementInstance>);
        harness.shadowRoot?.appendChild(el);
        await el.updateComplete;
        return el;
      }

      return { harness, mounts, unmounts, addMarkdown };
    }

    /** Names of the plugin-fallback slots the element currently renders. */
    function fallbackSlotNames(el: MarkdownElementInstance) {
      return [...(el.shadowRoot?.querySelectorAll('slot') ?? [])]
        .map((slot) => slot.getAttribute('name') ?? '')
        .filter((name) => name.includes('pluginFallback'));
    }

    it('keeps one slot when the markdown changes around the token', async () => {
      const { mounts, unmounts, addMarkdown } = await createCommitRecorder();

      const el = await addMarkdown('Hi :tag:');
      const [first] = fallbackSlotNames(el);

      el.markdown = 'Hi :tag: there';
      await el.updateComplete;

      expect(mounts, 'one offer per token, not per commit').to.deep.equal([
        first,
      ]);
      expect(unmounts, 'nothing should need retiring').to.deep.equal([]);
      expect(fallbackSlotNames(el)).to.deep.equal([first]);
    });

    it('keeps the same slot name across a re-render that changes nothing', async () => {
      const { mounts, addMarkdown } = await createCommitRecorder();

      const el = await addMarkdown('Hi :tag:');
      const [first] = fallbackSlotNames(el);

      el.requestUpdate();
      await el.updateComplete;

      expect(fallbackSlotNames(el)).to.deep.equal([first]);
      expect(mounts).to.deep.equal([first]);
    });

    it('mints one slot per token over a streaming run, not one per chunk', async () => {
      const { mounts, unmounts, addMarkdown } = await createCommitRecorder();

      const el = await addMarkdown('');
      el.streaming = true;
      for (const chunk of [
        'Hi',
        'Hi :',
        'Hi :tag:',
        'Hi :tag: a',
        'Hi :tag: ab',
      ]) {
        el.markdown = chunk;
        await el.updateComplete;
      }

      expect(mounts.length, 'one host for the one plugin token').to.equal(1);
      expect(unmounts).to.deep.equal([]);
    });

    it('groups adjacent plugin tokens into one stable inline run', async () => {
      const { addMarkdown } = await createCommitRecorder();

      const el = await addMarkdown('a :tag: b :tag: c');
      const before = fallbackSlotNames(el);
      expect(before.length, 'one slot for the complete inline run').to.equal(1);

      el.requestUpdate();
      await el.updateComplete;

      expect(fallbackSlotNames(el)).to.deep.equal(before);
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

describe('cds-aichat-markdown hard/soft line break rendering', () => {
  it('renders a hard line break (two trailing spaces + newline) as a <br>', async () => {
    const el = await fixture<MarkdownElementInstance>(
      html`<cds-aichat-markdown
        .markdown=${'**Summary**  \nNext line'}></cds-aichat-markdown>`
    );
    await el.updateComplete;
    const br = el.shadowRoot?.querySelector('br');
    expect(br, '<br> should be present for a hard line break').to.not.equal(
      null
    );
  });

  it('renders a soft line break (single newline) as a <br> when breaks mode is active', async () => {
    // The markdown-it instance uses `breaks: true`, so a bare newline inside a
    // paragraph produces a softbreak token that must render as <br>.
    const el = await fixture<MarkdownElementInstance>(
      html`<cds-aichat-markdown
        .markdown=${'line one\nline two'}></cds-aichat-markdown>`
    );
    await el.updateComplete;
    const brs = el.shadowRoot?.querySelectorAll('br');
    expect(
      brs?.length ?? 0,
      '<br> should be present for a soft line break (breaks mode)'
    ).to.be.greaterThan(0);
  });

  it('does not route hardbreak or softbreak through the plugin-fallback slot system', async () => {
    // plugin-fallback slots create <slot name="..."> elements in the shadow DOM;
    // a break token should never produce one.
    const el = await fixture<MarkdownElementInstance>(
      html`<cds-aichat-markdown
        .markdown=${'line one  \nline two\nline three'}></cds-aichat-markdown>`
    );
    await el.updateComplete;
    const pluginSlots = el.shadowRoot?.querySelectorAll(
      'slot[name*="pluginFallback"]'
    );
    expect(
      pluginSlots?.length ?? 0,
      'break tokens must not produce plugin-fallback slots'
    ).to.equal(0);
  });
});

describe('renderTokenTree — softbreak with breaks: false', () => {
  // The component always uses breaks: true, but renderTokenTree is exported and
  // may be called directly by consumers. When a caller passes an md instance with
  // breaks: false, a softbreak token must render as a literal newline character,
  // not a <br>, to match markdown-it's own behavior for that setting.
  it('emits a newline character (not <br>) for softbreak when breaks is false', async () => {
    const { renderTokenTree } = await import('../src/markdown-renderer.js');
    const MarkdownIt = (await import('markdown-it')).default;

    const md = new MarkdownIt({ breaks: false });
    const node = {
      key: 'softbreak-0',
      token: {
        type: 'softbreak',
        tag: '',
        nesting: 0 as const,
        level: 0,
        content: '',
        attrs: null,
        children: null,
        markup: '',
        block: false,
        hidden: false,
        map: null,
        info: '',
        meta: null,
      },
      children: [],
    };

    const { render } = await import('lit');
    const container = document.createElement('div');
    render(renderTokenTree(node, { sanitize: false, md }), container);

    expect(
      container.innerHTML,
      'softbreak with breaks:false should not contain <br>'
    ).to.not.include('<br');
    expect(
      container.innerHTML,
      'softbreak with breaks:false should contain a newline'
    ).to.include('\n');
  });
});

describe('cds-aichat-markdown line breaks inside merged inline-HTML runs', () => {
  // `combineConsecutiveHtmlInline` collapses consecutive html_inline / text /
  // break tokens into one `html_inline` node serialized by
  // `serializeInlineToken`. Before the fix, both softbreak and hardbreak
  // returned token.content (the empty string) and the break was deleted.

  type RenderOptions = { sanitize?: boolean; removeHtml?: boolean };

  async function renderMarkdown(markdown: string, opts: RenderOptions = {}) {
    const el = await fixture<MarkdownElementInstance>(
      html`<cds-aichat-markdown
        ?sanitize-html=${opts.sanitize ?? false}
        ?remove-html=${opts.removeHtml ?? false}
        .markdown=${markdown}></cds-aichat-markdown>`
    );
    await el.updateComplete;
    return el;
  }

  // Lit brackets each rendered part with comment markers, so what landed either
  // side of the break has to be read past them.
  function contentNodes(parent: Element) {
    return Array.from(parent.childNodes).filter(
      (node) => node.nodeType !== Node.COMMENT_NODE
    );
  }

  const BREAK_CASES = [
    { label: 'soft break', markdown: '<span>one\ntwo</span>' },
    { label: 'hard break', markdown: '<span>one  \ntwo</span>' },
  ];

  // Default mode — neither flag — is the one that hands the serialized run to
  // unsafeHTML with nothing filtering it in between.
  const MERGING_MODES: Array<{ label: string; opts: RenderOptions }> = [
    { label: 'default', opts: {} },
    { label: 'sanitize-html', opts: { sanitize: true } },
  ];

  for (const { label, markdown } of BREAK_CASES) {
    for (const mode of MERGING_MODES) {
      it(`renders a ${label} inside a merged inline-HTML run as one <br> (${mode.label})`, async () => {
        const el = await renderMarkdown(markdown, mode.opts);
        const span = el.shadowRoot?.querySelector('span');
        expect(span, '<span> should be in the shadow root').to.not.equal(null);
        expect(
          span?.querySelectorAll('br').length,
          `${label} inside span should produce exactly one <br>`
        ).to.equal(1);
        expect(span?.textContent, 'text content should be "onetwo"').to.equal(
          'onetwo'
        );
      });
    }

    // remove-html parses with `html: false`, so `<span>` is never tokenized as
    // html_inline and the run is never merged — the serializer does not run
    // here at all. What this mode still owes is narrower: the tag stays inert
    // text and the break splits it.
    it(`renders a ${label} with remove-html set, keeping the tag as inert text`, async () => {
      const el = await renderMarkdown(markdown, { removeHtml: true });
      expect(
        el.shadowRoot?.querySelector('span'),
        'remove-html must not produce a live <span>'
      ).to.equal(null);

      const paragraph = el.shadowRoot?.querySelector('p');
      if (!paragraph) {
        throw new Error('Expected a <p> in the shadow root');
      }

      const nodes = contentNodes(paragraph);
      const breaks = nodes.filter(
        (node) => node.nodeName.toLowerCase() === 'br'
      );
      expect(
        breaks.length,
        `${label} should produce exactly one <br>`
      ).to.equal(1);

      const textAround = (from: number, to: number) =>
        nodes
          .slice(from, to)
          .map((node) => node.textContent)
          .join('');
      const breakIndex = nodes.indexOf(breaks[0]);
      expect(
        textAround(0, breakIndex),
        'the escaped opening tag should survive'
      ).to.equal('<span>one');
      expect(
        textAround(breakIndex + 1, nodes.length),
        'the escaped closing tag should survive'
      ).to.equal('two</span>');
    });
  }

  for (const mode of MERGING_MODES) {
    it(`the <br> node has no adjacent stray whitespace text node (${mode.label})`, async () => {
      const el = await renderMarkdown('<span>one\ntwo</span>', mode.opts);
      const span = el.shadowRoot?.querySelector('span');
      expect(span).to.not.equal(null);
      if (!span) {
        return;
      }
      const childNodes = Array.from(span.childNodes);
      expect(
        childNodes.length,
        `span should have exactly 3 child nodes, got: ${childNodes.map((n) => (n.nodeType === 3 ? JSON.stringify(n.textContent) : n.nodeName)).join(', ')}`
      ).to.equal(3);
      // Text, not just node type: a serializer emitting '<br />\n' also yields
      // three nodes, because the newline is parsed into the following text
      // node. The exact strings are what separate it from '<br />'.
      expect(childNodes[0].textContent, 'first node is text "one"').to.equal(
        'one'
      );
      expect(
        childNodes[1].nodeName.toLowerCase(),
        'second node should be <br>'
      ).to.equal('br');
      expect(childNodes[2].textContent, 'third node is text "two"').to.equal(
        'two'
      );
    });
  }

  it('inline HTML with no line break serializes exactly as before (no-op)', async () => {
    const el = await renderMarkdown('<span>hello world</span>', {
      sanitize: true,
    });
    const span = el.shadowRoot?.querySelector('span');
    expect(span).to.not.equal(null);
    expect(span?.textContent).to.equal('hello world');
    expect(span?.querySelector('br')).to.equal(null);
  });
});
