/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { expect, fixture, html } from '@open-wc/testing';
import { render, nothing } from 'lit';
import type MarkdownIt from 'markdown-it';
import {
  InlineMarkdownError,
  renderInlineMarkdown,
} from '../src/inline-markdown.js';
import type { InlineMarkdownOptions } from '../src/inline-markdown.js';
import { inlineMarkdownStyles } from '../index.js';
import type CDSAIChatMarkdownElement from '../src/markdown.js';
import type { MarkdownPluginHostMountDetail } from '../src/utils/plugin-host-container.js';

const image =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const source = `**bold** *italic* ~~deleted~~ ==highlight== \`code\` [**rich** link](#target "title") ![alternative](${image} "image")`;
const plugin = (output: string) => (md: MarkdownIt) => {
  md.renderer.rules.code_inline = () => output;
};

async function pair(text: string, options: InlineMarkdownOptions = {}) {
  const root = await fixture<HTMLDivElement>(
    html`<div>
      <style>
        ${inlineMarkdownStyles.cssText}
      </style>
      <p></p>
      <cds-aichat-markdown
        .markdown=${text}
        .sanitizeHTML=${options.sanitizeHTML ?? false}
        .removeHTML=${options.removeHTML ?? false}
        .markdownItPlugins=${options.markdownItPlugins ?? []}
        .customRenderers=${options.customRenderers}></cds-aichat-markdown>
    </div>`
  );
  const inline = root.querySelector('p')!;
  render(renderInlineMarkdown(text, options), inline);
  const block = root.querySelector(
    'cds-aichat-markdown'
  ) as CDSAIChatMarkdownElement;
  await block.updateComplete;
  return { inline, block };
}

function rejects(
  text: string,
  code: 'block-content' | 'non-inline-output',
  options: InlineMarkdownOptions = {}
) {
  let caught: unknown;
  try {
    renderInlineMarkdown(text, options);
  } catch (error) {
    caught = error;
  }
  expect(caught).to.be.instanceOf(InlineMarkdownError);
  expect((caught as InlineMarkdownError).name).to.equal('InlineMarkdownError');
  expect((caught as InlineMarkdownError).code).to.equal(code);
}

describe('renderInlineMarkdown', () => {
  it('matches block inline semantics, attributes, and styles', async () => {
    const { inline, block } = await pair(source);
    for (const selector of ['strong', 'em', 's', 'mark', 'code', 'a', 'img']) {
      const actual = inline.querySelector(selector)!;
      const expected = block.shadowRoot!.querySelector(selector)!;
      expect(actual, `inline ${selector}`).not.to.equal(null);
      expect(expected, `block ${selector}`).not.to.equal(null);
      expect(actual.outerHTML).to.equal(expected.outerHTML);
      for (const property of [
        'fontWeight',
        'fontStyle',
        'textDecorationLine',
        'backgroundColor',
      ] as const) {
        expect(
          getComputedStyle(actual)[property],
          `${selector} ${property}`
        ).to.equal(getComputedStyle(expected)[property]);
      }
    }
    expect(inline.querySelector('a')!.target).to.equal('_blank');
    expect(inline.querySelector('img')!.alt).to.equal(
      block.shadowRoot!.querySelector('img')!.alt
    );
  });

  for (const [left, right, expected] of [
    ['inter', 'national', 'international'],
    [' before ', ' after ', ' before  after '],
    ['   ', '\t', '   \t'],
    ['', '', ''],
  ]) {
    it(`preserves composition ${JSON.stringify([left, right])}`, async () => {
      const paragraph = await fixture<HTMLParagraphElement>(
        html`<p>${renderInlineMarkdown(left)}${renderInlineMarkdown(right)}</p>`
      );
      expect(paragraph.textContent).to.equal(expected);
      expect(paragraph.querySelector('p, div, slot')).to.equal(null);
      expect(
        [...paragraph.children].every((child) => child.localName === 'span')
      ).to.equal(true);
      if (!expected) {
        expect(paragraph.children.length).to.equal(0);
      }
    });
  }

  it('preserves paragraph-edge newline semantics and replaces prior output', async () => {
    const { inline, block } = await pair('\nfirst\nsecond\n');
    expect(inline.textContent).to.equal(
      block.shadowRoot!.querySelector('p')!.textContent
    );
    expect(inline.querySelectorAll('br').length).to.equal(
      block.shadowRoot!.querySelectorAll('br').length
    );
    render(renderInlineMarkdown('replacement'), inline);
    expect(inline.textContent).to.equal('replacement');
  });

  for (const text of [
    'first\n\nsecond',
    '- list',
    '# heading',
    '| a | b |\n| --- | --- |\n| c | d |',
    '```\ncode\n```',
    '<div>block</div>',
    '    indented',
    '\n\nfirst\n\nsecond\n\n',
  ]) {
    it(`rejects complete block input ${JSON.stringify(text)}`, () =>
      rejects(text, 'block-content'));
  }

  for (const output of [
    '<span><b>nested</b></span>',
    '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>',
    '<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi></math>',
    '<picture><source srcset="image.webp"><img src="image.png" alt="image"></picture>',
    '<select><optgroup label="group"><option>choice</option></optgroup></select>',
  ]) {
    it(`accepts inline plugin markup ${output}`, async () => {
      const { inline, block } = await pair('`token`', {
        markdownItPlugins: [plugin(output)],
      });
      const host = block.querySelector('[slot]')!;
      expect(inline.firstElementChild!.innerHTML).to.contain(host.innerHTML);
    });
  }

  it('honors image overrides and new inline token rules in both paths', async () => {
    const extension = (md: MarkdownIt) => {
      md.renderer.rules.image = () =>
        '<span class="image">image override</span>';
      md.inline.ruler.before('text', 'badge', (state, silent) => {
        if (!state.src.slice(state.pos).startsWith(':badge:')) {
          return false;
        }
        if (!silent) {
          state.push('badge', '', 0).content = 'badge';
        }
        state.pos += 7;
        return true;
      });
      md.renderer.rules.badge = () => '<span class="badge">badge</span>';
    };
    const { inline, block } = await pair(`![alt](${image}) :badge:`, {
      markdownItPlugins: [extension],
    });
    for (const selector of ['.image', '.badge']) {
      expect(inline.querySelector(selector)!.outerHTML).to.equal(
        block.querySelector(selector)!.outerHTML
      );
    }
  });

  it('uses a changed plugin array on the next call', async () => {
    const target = await fixture<HTMLDivElement>(html`<div></div>`);
    for (const text of ['first', 'second']) {
      render(
        renderInlineMarkdown('`value`', {
          markdownItPlugins: [plugin(`<span>${text}</span>`)],
        }),
        target
      );
      expect(target.textContent).to.equal(text);
    }
  });

  for (const sanitizeHTML of [false, true]) {
    for (const output of [
      '<span><div>nested block</div></span>',
      '<span><custom-element>hidden root</custom-element></span>',
      '<figure>block</figure>',
    ]) {
      it(`rejects invalid plugin output before commit (sanitize=${sanitizeHTML}): ${output}`, async () => {
        const target = await fixture<HTMLDivElement>(html`<div>prior</div>`);
        rejects('`token`', 'non-inline-output', {
          sanitizeHTML,
          markdownItPlugins: [plugin(output)],
        });
        expect(target.textContent).to.equal('prior');
      });
    }
    it(`rejects nested raw blocks (sanitize=${sanitizeHTML})`, () => {
      rejects(
        'before <span><div>block</div></span> after',
        'non-inline-output',
        { sanitizeHTML }
      );
    });
    it(`matches raw/plugin/host attribute filtering (sanitize=${sanitizeHTML})`, async () => {
      const { inline, block } = await pair(
        'before <span onclick="return false">raw</span> `token` [link](#safe)',
        {
          sanitizeHTML,
          markdownItPlugins: [
            plugin('<span class="plugin" onclick="return false">plugin</span>'),
          ],
          customRenderers: {
            link: () => ({
              attributes: { onclick: 'return false', 'data-host': 'yes' },
            }),
          },
        }
      );
      for (const [actual, expected] of [
        [
          inline.querySelector('span span'),
          block.shadowRoot!.querySelector('p span'),
        ],
        [inline.querySelector('.plugin'), block.querySelector('.plugin')],
        [inline.querySelector('a'), block.shadowRoot!.querySelector('a')],
      ]) {
        expect(actual!.hasAttribute('onclick')).to.equal(!sanitizeHTML);
        expect(actual!.getAttribute('onclick')).to.equal(
          expected!.getAttribute('onclick')
        );
      }
    });
  }

  it('escapes removed HTML while preserving plugin output', async () => {
    const { inline, block } = await pair('<b>literal</b> `token`', {
      removeHTML: true,
      markdownItPlugins: [plugin('<i>plugin</i>')],
    });
    expect(inline.querySelector('b')).to.equal(null);
    expect(inline.textContent).to.equal('<b>literal</b> plugin');
    expect(block.shadowRoot!.querySelector('p')!.textContent).to.contain(
      '<b>literal</b>'
    );
    expect(inline.querySelector('i')!.textContent).to.equal('plugin');
  });

  it('checks nested token tags even when block is false', () => {
    const nested = (md: MarkdownIt) => {
      md.core.ruler.after('inline', 'nested-paragraph', (state) => {
        const children = state.tokens.find(
          (token) => token.type === 'inline'
        )!.children!;
        children[0].type = 'paragraph_open';
        children[0].tag = 'p';
        children[0].nesting = 1;
        children[0].block = false;
      });
    };
    rejects('text', 'non-inline-output', { markdownItPlugins: [nested] });
  });

  for (const [tag, attributes] of [
    ['cds-checkbox', []],
    ['span', [['is', 'custom-span']]],
  ] as const) {
    it(`rejects native token output ${tag} with custom element behavior`, () => {
      const extension = (md: MarkdownIt) => {
        md.core.ruler.after('inline', 'custom-element-token', (state) => {
          const token = state.tokens.find((item) => item.type === 'inline')!
            .children![0];
          token.type = 'custom_inline';
          token.tag = tag;
          token.attrs = attributes.map(([name, value]) => [name, value]);
          token.block = false;
        });
      };
      rejects('text', 'non-inline-output', { markdownItPlugins: [extension] });
    });
  }

  it('rejects an unsupported static tag instead of emitting a block fallback', () => {
    const extension = (md: MarkdownIt) => {
      md.core.ruler.after('inline', 'unsupported-static-tag', (state) => {
        const token = state.tokens.find((item) => item.type === 'inline')!
          .children![0];
        token.type = 'inline';
        token.tag = 'ruby';
        token.block = false;
      });
    };
    rejects('text', 'non-inline-output', { markdownItPlugins: [extension] });
  });

  it('rejects customized built-ins from host attributes before commit', () => {
    rejects('[link](#target)', 'non-inline-output', {
      customRenderers: {
        link: () => ({ attributes: { is: 'custom-anchor' } }),
      },
    });
  });

  it('rejects plugin-added root blocks instead of returning the first paragraph', () => {
    const block = (md: MarkdownIt) => {
      md.core.ruler.after('inline', 'extra-block', (state) => {
        const token = new state.Token('hr', 'hr', 0);
        token.block = true;
        state.tokens.push(token);
      });
    };
    rejects('text', 'block-content', { markdownItPlugins: [block] });
  });

  it('runs callbacks eagerly once and preserves callback data, rich text, alt, and canceled clicks', async () => {
    const seen: unknown[] = [];
    let clicks = 0;
    const options: InlineMarkdownOptions = {
      customRenderers: {
        link: ({ token: _token, ...args }) => {
          seen.push(args);
          return {
            target: '_self',
            onClick: (event) => {
              clicks++;
              event.preventDefault();
            },
          };
        },
        image: ({ token, ...args }) => {
          seen.push(args);
          return { attributes: { alt: token.content } };
        },
      },
    };
    const result = renderInlineMarkdown(source, options);
    expect(seen.length).to.equal(2);
    const target = await fixture<HTMLDivElement>(html`<div></div>`);
    render(result, target);
    expect(seen.length).to.equal(2);
    const inlineArgs = [...seen];
    const { block } = await pair(source, options);
    expect(seen.slice(-2)).to.deep.equal(inlineArgs);
    expect(block.shadowRoot!.querySelector('a')!.target).to.equal('_self');
    const anchor = target.querySelector('a')!;
    expect(anchor.querySelector('strong')!.textContent).to.equal('rich');
    expect(
      anchor.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      )
    ).to.equal(false);
    expect(clicks).to.equal(1);
    expect(target.querySelector('img')!.alt).to.equal('alternative');
  });

  it('keeps default attributes when callbacks return null', async () => {
    const { inline, block } = await pair(source, {
      customRenderers: { link: () => null, image: () => null },
    });
    for (const selector of ['a', 'img']) {
      expect(inline.querySelector(selector)!.outerHTML).to.equal(
        block.shadowRoot!.querySelector(selector)!.outerHTML
      );
    }
  });

  for (const kind of ['plugin', 'link', 'image']) {
    it(`propagates ${kind} exceptions before returning`, () => {
      const error = new Error('callback failed');
      const fail = () => {
        throw error;
      };
      const options: InlineMarkdownOptions =
        kind === 'plugin'
          ? {
              markdownItPlugins: [
                (md) => {
                  md.renderer.rules.code_inline = fail;
                },
              ],
            }
          : { customRenderers: { [kind]: fail } };
      expect(() => renderInlineMarkdown(source, options)).to.throw(error);
    });
  }

  it('mounts a projected result attached later inside an existing shadow root', async () => {
    const host = await fixture<HTMLDivElement>(html`<div></div>`);
    const root = host.attachShadow({ mode: 'open' });
    const target = document.createElement('p');
    let mounts = 0;
    host.addEventListener(
      'cds-aichat-markdown-plugin-host-mount',
      () => mounts++
    );
    const part = render(
      renderInlineMarkdown('`source`', {
        projectPluginOutput: true,
        markdownItPlugins: [plugin('<span>rendered</span>')],
      }),
      target
    );
    await Promise.resolve();
    expect(mounts).to.equal(0);
    root.append(target);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve())
    );
    expect(mounts).to.equal(1);
    part.setConnected(false);
  });

  it('projects unique slots, with fallback text and one mount/unmount per connection', async () => {
    const target = await fixture<HTMLDivElement>(html`<div></div>`);
    const mounts: MarkdownPluginHostMountDetail[] = [];
    const unmounts: string[] = [];
    target.addEventListener('cds-aichat-markdown-plugin-host-mount', (event) =>
      mounts.push((event as CustomEvent<MarkdownPluginHostMountDetail>).detail)
    );
    target.addEventListener(
      'cds-aichat-markdown-plugin-host-unmount',
      (event) => unmounts.push((event as CustomEvent).detail.slotName)
    );
    const options = {
      projectPluginOutput: true,
      markdownItPlugins: [plugin('<span>rendered</span>')],
    };
    const first = renderInlineMarkdown('`source`', options);
    const second = renderInlineMarkdown('`source`', options);
    expect(mounts.length).to.equal(0);
    const part = render(html`${first}${second}`, target);
    await Promise.resolve();
    const slots = [...target.querySelectorAll('slot')];
    expect(slots.length).to.equal(2);
    expect(slots[0].name).not.to.equal(slots[1].name);
    expect(slots.map((slot) => slot.textContent)).to.deep.equal([
      'source',
      'source',
    ]);
    expect(mounts.length).to.equal(2);
    for (const detail of mounts) {
      expect(detail).to.include({
        kind: 'pluginFallback',
        isInline: true,
        html: '<span>rendered</span>',
      });
    }
    part.setConnected(false);
    expect(unmounts).to.deep.equal(slots.map((slot) => slot.name));
    part.setConnected(true);
    expect(mounts.length).to.equal(4);
    render(nothing, target);
    expect(unmounts.length).to.equal(4);
    rejects('`invalid`', 'non-inline-output', {
      ...options,
      markdownItPlugins: [plugin('<figure>invalid</figure>')],
    });
    expect(mounts.length).to.equal(4);
  });
});
