/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import type MarkdownIt from 'markdown-it';
import type CDSAIChatMarkdownElement from '../src/markdown.js';
import '../src/markdown.js';

function codePlugin(md: MarkdownIt) {
  md.renderer.rules.code_inline = () =>
    '<span class="core-projection-plugin">plugin output</span>';
}

async function projectedHosts(el: CDSAIChatMarkdownElement) {
  await el.updateComplete;
  await waitUntil(() => el.querySelector('.core-projection-plugin') !== null);
  return [...el.querySelectorAll<HTMLSpanElement>(':scope > span[slot]')];
}

describe('core markdown inline run projection', () => {
  for (const heading of [false, true]) {
    it(`preserves native inline code styles beside plugin output (heading: ${heading})`, async () => {
      const markdown = `${heading ? '# Heading ' : ''}\`code\` ![image](image.png)`;
      const parent = await fixture<HTMLElement>(html`
        <div>
          <cds-aichat-markdown .markdown=${markdown}></cds-aichat-markdown>
          <cds-aichat-markdown
            .markdown=${markdown}
            .markdownItPlugins=${[
              (md: MarkdownIt) => {
                md.renderer.rules.image = () =>
                  '<span class="core-projection-plugin">plugin output</span>';
              },
            ]}></cds-aichat-markdown>
        </div>
      `);
      const [native, projected] = [
        ...parent.querySelectorAll<CDSAIChatMarkdownElement>(
          'cds-aichat-markdown'
        ),
      ];
      await native.updateComplete;
      const [host] = await projectedHosts(projected);
      const expected = getComputedStyle(
        native.shadowRoot!.querySelector('code')!
      );
      const actual = getComputedStyle(host.querySelector('code')!);
      for (const property of [
        'fontFamily',
        'fontSize',
        'fontWeight',
        'verticalAlign',
      ] as const) {
        expect(actual[property], property).to.equal(expected[property]);
      }
    });
  }

  it('projects native formatting and plugins together and preserves heading typography', async () => {
    const style = document.createElement('style');
    style.textContent = '.core-projection-plugin { color: rgb(12, 34, 56); }';
    document.head.append(style);
    try {
      const el = await fixture<CDSAIChatMarkdownElement>(html`
        <cds-aichat-markdown
          .markdownItPlugins=${[codePlugin]}
          .markdown=${'# Heading **bold** `plugin` [link](https://example.com)'}>
        </cds-aichat-markdown>
      `);
      const [host] = await projectedHosts(el);
      expect(host.textContent).to.equal('Heading bold plugin output link');
      expect(host.querySelector('strong')?.textContent).to.equal('bold');
      expect(host.querySelector('a')?.target).to.equal('_blank');
      expect(
        getComputedStyle(host.querySelector('.core-projection-plugin')!).color
      ).to.equal('rgb(12, 34, 56)');
      const heading = el.shadowRoot!.querySelector('h1')!;
      expect(getComputedStyle(host).fontSize).to.equal(
        getComputedStyle(heading).fontSize
      );
      expect(getComputedStyle(host).fontWeight).to.equal(
        getComputedStyle(heading).fontWeight
      );
    } finally {
      style.remove();
    }
  });

  it('reuses the complete run and calls native attribute transforms once per render', async () => {
    let linkCalls = 0;
    let imageCalls = 0;
    let clicks = 0;
    const el = await fixture<CDSAIChatMarkdownElement>(html`
      <cds-aichat-markdown
        .markdownItPlugins=${[codePlugin]}
        .customRenderers=${{
          link: () => {
            linkCalls++;
            return {
              onClick: (event: MouseEvent) => {
                event.preventDefault();
                clicks++;
              },
            };
          },
          image: () => {
            imageCalls++;
            return null;
          },
        }}
        .markdown=${''}>
      </cds-aichat-markdown>
    `);
    await el.updateComplete;
    el.markdown =
      '[link](https://example.com) `plugin` ![image](data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==)';
    const [host] = await projectedHosts(el);
    expect(linkCalls).to.equal(1);
    expect(imageCalls).to.equal(1);
    host.querySelector('a')!.click();
    expect(clicks).to.equal(1);

    el.requestUpdate();
    await el.updateComplete;
    expect((await projectedHosts(el))[0]).to.equal(host);
    expect(linkCalls).to.equal(1);
    expect(imageCalls).to.equal(1);

    el.streaming = true;
    el.markdown += ' more';
    await el.updateComplete;
    expect((await projectedHosts(el))[0]).to.equal(host);
    expect(host.textContent).to.include(' more');
    expect(linkCalls).to.equal(2);
    expect(imageCalls).to.equal(2);
  });

  it('projects separate heading and list runs without absorbing block replacements', async () => {
    let codeBlockCalls = 0;
    const el = await fixture<CDSAIChatMarkdownElement>(html`
      <cds-aichat-markdown
        .markdownItPlugins=${[codePlugin]}
        .customRenderers=${{
          codeBlock: () => {
            codeBlockCalls++;
            const node = document.createElement('pre');
            node.className = 'core-block';
            return node;
          },
        }}
        .markdown=${''}>
      </cds-aichat-markdown>
    `);
    await el.updateComplete;
    el.markdown =
      '# Heading `plugin`\n\n- List `plugin`\n\n```js\ncode\n```\n\nPlain **text**';
    const hosts = await projectedHosts(el);
    expect(hosts).to.have.length(2);
    expect(hosts[0].slot).to.not.equal(hosts[1].slot);
    expect(hosts.map((host) => host.textContent)).to.deep.equal([
      'Heading plugin output',
      'List plugin output',
    ]);
    expect(codeBlockCalls).to.equal(1);
    expect(el.querySelector('.core-block')).to.not.equal(null);
    expect(el.shadowRoot!.querySelector('p strong')?.textContent).to.equal(
      'text'
    );
  });

  it('keeps block plugin output on the HTML mount protocol', async () => {
    const kinds: string[] = [];
    const parent = await fixture<HTMLElement>(html`<div></div>`);
    parent.addEventListener(
      'cds-aichat-markdown-plugin-host-mount',
      (event) => {
        kinds.push((event as CustomEvent<{ kind: string }>).detail.kind);
      }
    );
    const el = document.createElement(
      'cds-aichat-markdown'
    ) as CDSAIChatMarkdownElement;
    el.markdownItPlugins = [
      (md: MarkdownIt) => {
        codePlugin(md);
        md.renderer.rules.fence = () =>
          '<section class="core-block-plugin">block output</section>';
      },
    ];
    el.markdown = 'Inline `plugin`\n\n```js\ncode\n```';
    parent.append(el);
    await projectedHosts(el);
    expect(el.querySelector('.core-block-plugin')?.textContent).to.equal(
      'block output'
    );
    expect(kinds).to.include('pluginFallback');
    expect(kinds).to.include('customRenderer');
  });

  it('keeps task-list checkboxes in the core event tree beside plugin output', async () => {
    const toggles: boolean[] = [];
    const el = await fixture<CDSAIChatMarkdownElement>(html`
      <cds-aichat-markdown
        .markdownItPlugins=${[codePlugin]}
        .customRenderers=${{
          checklist: {
            onToggle: ({ checked }: { checked: boolean }) =>
              toggles.push(checked),
          },
        }}
        .markdown=${'- [ ] Task `plugin`'}>
      </cds-aichat-markdown>
    `);
    await projectedHosts(el);
    const checkbox = el.shadowRoot!.querySelector('cds-checkbox');
    expect(checkbox).to.not.equal(null);
    expect(el.querySelector('cds-checkbox')).to.equal(null);
    checkbox!.dispatchEvent(
      new CustomEvent('cds-checkbox-changed', {
        bubbles: true,
        composed: true,
        detail: { checked: true },
      })
    );
    expect(toggles).to.deep.equal([true]);
  });

  it('preserves core raw HTML rendering beside plugin output', async () => {
    const el = await fixture<CDSAIChatMarkdownElement>(html`
      <cds-aichat-markdown
        .markdownItPlugins=${[codePlugin]}
        .markdown=${'<span class="core-raw">raw text</span> `plugin`'}>
      </cds-aichat-markdown>
    `);
    await projectedHosts(el);
    expect(el.shadowRoot!.querySelector('.core-raw')?.textContent).to.equal(
      'raw text'
    );
    expect(el.querySelector('.core-raw')).to.equal(null);
  });
});
