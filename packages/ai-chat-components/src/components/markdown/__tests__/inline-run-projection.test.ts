/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { expect, fixture, html } from '@open-wc/testing';
import { nothing, render as litRender, type RootPart } from 'lit';
import type MarkdownIt from 'markdown-it';
import {
  renderInlineMarkdown,
  renderInlineMarkdownInRun,
} from '../src/inline-markdown.js';
import {
  projectInlineRun,
  projectedInlinePlugin,
  installInlineRunStyles,
} from '../src/utils/inline-run-projection.js';
import type { MarkdownCustomRendererMountDetail } from '../src/utils/plugin-host-container.js';

const parts = new Set<RootPart>();

function render(...args: Parameters<typeof litRender>) {
  const part = litRender(...args);
  parts.add(part);
  return part;
}

const options = {
  projectPluginOutput: true,
  markdownItPlugins: [
    (md: MarkdownIt) => {
      md.renderer.rules.code_inline = () =>
        '<span class="projected-plugin"><strong>rendered</strong></span>';
    },
  ],
};

async function projectedTarget() {
  const owner = await fixture<HTMLDivElement>(html`<div></div>`);
  const root = owner.attachShadow({ mode: 'open' });
  const target = document.createElement('p');
  root.append(target);
  const mounts: MarkdownCustomRendererMountDetail[] = [];
  const unmounts: string[] = [];
  owner.addEventListener('cds-aichat-markdown-plugin-host-mount', (event) => {
    const mount = event as CustomEvent<MarkdownCustomRendererMountDetail>;
    event.preventDefault();
    mounts.push(mount.detail);
    owner.append(mount.detail.element);
  });
  owner.addEventListener('cds-aichat-markdown-plugin-host-unmount', (event) => {
    unmounts.push((event as CustomEvent).detail.slotName);
  });
  return { owner, root, target, mounts, unmounts };
}

describe('whole inline run projection', () => {
  afterEach(async () => {
    for (const part of parts) {
      part.setConnected(false);
    }
    parts.clear();
    await Promise.resolve();
  });
  it('renders inside an existing run without slots or overriding plugin styles', async () => {
    const owner = await fixture<HTMLDivElement>(
      html`<div
        class="cds-aichat-markdown-inline-run cds-aichat-markdown-inline-run--reset"
        style="font: 24px serif">
        <style>
          .projected-plugin strong {
            font-weight: 400;
            padding: 3px;
          }
        </style>
        <span></span>
      </div>`
    );
    const target = owner.querySelector('span')!;
    const releaseStyles = installInlineRunStyles(owner);
    let linkCalls = 0;
    let clicks = 0;
    try {
      render(
        renderInlineMarkdownInRun('`source` **bold** [link](#target)', {
          ...options,
          customRenderers: {
            link: () => {
              linkCalls++;
              return {
                onClick: (event) => {
                  event.preventDefault();
                  clicks++;
                },
              };
            },
          },
        }),
        target
      );
      expect(target.querySelector('slot')).to.equal(null);
      expect(target.textContent).to.equal('rendered bold link');
      expect(linkCalls).to.equal(1);
      target.querySelector('a')!.click();
      expect(clicks).to.equal(1);
      const plugin = target.querySelector('.projected-plugin strong')!;
      expect(getComputedStyle(plugin).fontWeight).to.equal('400');
      expect(getComputedStyle(plugin).padding).to.equal('3px');
      expect(
        getComputedStyle(
          target.querySelector('strong:not(.projected-plugin strong)')!
        ).fontWeight
      ).to.equal('700');
      expect(
        getComputedStyle(
          target.querySelector('strong:not(.projected-plugin strong)')!
        ).fontSize
      ).to.equal('24px');
    } finally {
      releaseStyles();
    }
  });
  it('prepares callbacks once and keeps live links and all text in one host', async () => {
    const { owner, target, mounts } = await projectedTarget();
    let calls = 0;
    let clicks = 0;
    const content = renderInlineMarkdown(
      ' before **bold** `source` [link](#target) after ',
      {
        ...options,
        customRenderers: {
          link: () => {
            calls++;
            return {
              onClick: (event) => {
                clicks++;
                event.preventDefault();
              },
            };
          },
        },
      }
    );
    expect(calls).to.equal(1);
    const part = render(content, target);
    await Promise.resolve();
    expect(calls).to.equal(1);
    expect(mounts.length).to.equal(1);
    expect(mounts[0]).to.include({ kind: 'customRenderer', isInline: true });
    const host = mounts[0].element;
    expect(host.parentElement).to.equal(owner);
    expect(host.shadowRoot).to.equal(null);
    expect(host.textContent).to.equal(' before bold rendered link after ');
    expect(target.querySelectorAll('slot').length).to.equal(1);
    expect(target.textContent).to.equal(' before bold source link after ');
    expect(
      host.querySelector('a')!.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        })
      )
    ).to.equal(false);
    expect(clicks).to.equal(1);
    part.setConnected(false);
  });

  it('preserves native fallback markup without a claimant', async () => {
    const target = await fixture<HTMLParagraphElement>(html`<p></p>`);
    const part = render(
      renderInlineMarkdown('inter**bold**`source`national', options),
      target
    );
    await Promise.resolve();
    expect(target.textContent).to.equal('interboldsourcenational');
    expect(target.querySelector('strong')!.textContent).to.equal('bold');
    expect(target.querySelector('.projected-plugin')).to.equal(null);
    expect(target.querySelectorAll('slot').length).to.equal(1);
    part.setConnected(false);
  });

  it('styles native markup in the actual root and leaves plugin styles to the page', async () => {
    const { owner, target, mounts } = await projectedTarget();
    const style = document.createElement('style');
    style.textContent = '.projected-plugin strong { font-weight: 400; }';
    document.head.append(style);
    owner.style.fontSize = '24px';
    const part = render(
      renderInlineMarkdown('**native** `source`', options),
      target
    );
    await Promise.resolve();
    const host = mounts[0].element;
    expect(getComputedStyle(host).fontSize).to.equal('24px');
    expect(getComputedStyle(host.querySelector('strong')!).fontWeight).to.equal(
      '700'
    );
    expect(
      getComputedStyle(host.querySelector('.projected-plugin strong')!)
        .fontWeight
    ).to.equal('400');
    part.setConnected(false);
    style.remove();
  });

  it('uses a supplied local fallback host and tears it down with its root part', async () => {
    const owner = await fixture<HTMLDivElement>(html`<div></div>`);
    const root = owner.attachShadow({ mode: 'open' });
    const target = document.createElement('p');
    root.append(target);
    const sheets = document.adoptedStyleSheets.length;
    const shadowSheets = root.adoptedStyleSheets.length;
    const part = render(
      projectInlineRun(
        html`${'before '}${projectedInlinePlugin('<em>rendered</em>', 'source')}${' after'}`,
        {
          slotName: 'local-inline-run',
          fallbackHost: owner,
        }
      ),
      target
    );
    await Promise.resolve();
    const host = owner.querySelector('[slot="local-inline-run"]')!;
    expect(host.textContent).to.equal('before rendered after');
    expect(document.adoptedStyleSheets.length).to.equal(sheets + 1);
    expect(root.adoptedStyleSheets.length).to.equal(shadowSheets);
    expect(
      (target.querySelector('slot') as HTMLSlotElement).assignedElements()
    ).to.deep.equal([host]);
    render(nothing, target);
    await Promise.resolve();
    expect(owner.children.length).to.equal(0);
    expect(document.adoptedStyleSheets.length).to.equal(sheets);
    part.setConnected(false);
  });

  it('forwards ancestor-claimed output through the core host light DOM', async () => {
    const { owner, root, target, mounts } = await projectedTarget();
    const core = document.createElement('div');
    const coreRoot = core.attachShadow({ mode: 'open' });
    root.append(core);
    target.remove();
    coreRoot.append(target);
    const part = render(
      projectInlineRun(
        html`${'before '}${projectedInlinePlugin('<em>rendered</em>', 'source')}${' after'}`,
        { slotName: 'ancestor-inline-run', fallbackHost: core }
      ),
      target
    );
    await Promise.resolve();
    const host = mounts[0].element;
    expect(host.parentElement).to.equal(owner);
    const forwarder = core.querySelector('slot')!;
    expect(forwarder.name).to.equal('ancestor-inline-run');
    expect(forwarder.slot).to.equal('ancestor-inline-run');
    expect(forwarder.assignedElements()).to.deep.equal([host]);
    expect(
      (target.querySelector('slot') as HTMLSlotElement).assignedElements({
        flatten: true,
      })
    ).to.deep.equal([host]);
    expect(host.textContent).to.equal('before rendered after');
    render(nothing, target);
    await Promise.resolve();
    expect(core.children.length).to.equal(0);
    expect(host.parentElement).to.equal(null);
    part.setConnected(false);
  });

  it('shares one style lease across runs and releases it after the last run', async () => {
    const { target } = await projectedTarget();
    const sheets = document.adoptedStyleSheets.length;
    const first = projectInlineRun(html`first`, { slotName: 'lease-first' });
    const second = projectInlineRun(html`second`, { slotName: 'lease-second' });
    const part = render(html`${first}${second}`, target);
    await Promise.resolve();
    expect(document.adoptedStyleSheets.length).to.equal(sheets + 1);
    render(html`${first}${nothing}`, target);
    await Promise.resolve();
    expect(document.adoptedStyleSheets.length).to.equal(sheets + 1);
    render(nothing, target);
    await Promise.resolve();
    expect(document.adoptedStyleSheets.length).to.equal(sheets);
    part.setConnected(false);
  });

  it('preserves its live node during a same-task move and reoffers after a real disconnect', async () => {
    const { owner, target, mounts, unmounts } = await projectedTarget();
    const parent = owner.parentElement!;
    const part = render(
      renderInlineMarkdown('before `source` after', options),
      target
    );
    await Promise.resolve();
    const host = mounts[0].element;
    owner.remove();
    part.setConnected(false);
    parent.append(owner);
    part.setConnected(true);
    await Promise.resolve();
    expect(mounts.length).to.equal(1);
    expect(unmounts.length).to.equal(0);
    expect(host.parentElement).to.equal(owner);
    owner.remove();
    part.setConnected(false);
    await Promise.resolve();
    expect(unmounts.length).to.equal(1);
    expect(host.parentElement).to.equal(null);
    parent.append(owner);
    part.setConnected(true);
    expect(mounts.length).to.equal(2);
    expect(mounts[1].element).to.equal(host);
    part.setConnected(false);
  });
});
