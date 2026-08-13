/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Regression coverage for issue #2152 — a host config update rebuilt an
 * equivalent extension set, which recreated the live Tiptap editor and reset
 * its undo history mid-typing.
 */

import { expect, fixture, html } from '@open-wc/testing';
import { Extension } from '@tiptap/core';

import '../prompt-line.js';
import type PromptLineElement from '../prompt-line.js';
import { buildCarbonExtensions } from '../tiptap/build-extensions.js';
import type { StarterTriggerStorage } from '../tiptap/carbon-starter-trigger.js';
import type { SuggestionItem } from '../tiptap/types.js';

const PEOPLE: SuggestionItem[] = [{ id: 'u1', label: 'Alice' }];
const STARTERS: SuggestionItem[] = [{ id: 's1', label: 'Summarize this' }];

async function makeRichPromptLine(
  extensions: Extension[] = []
): Promise<PromptLineElement> {
  const el = await fixture<PromptLineElement>(html`
    <cds-aichat-prompt-line
      rich
      aria-label="test prompt"></cds-aichat-prompt-line>
  `);
  el.extensions = extensions;
  await el.updateComplete;
  await waitForRich(el);
  return el;
}

/** See prompt-line.test.ts — the rich runtime arrives via a lazy import(). */
async function waitForRich(el: PromptLineElement): Promise<void> {
  for (let i = 0; i < 500; i += 1) {
    if (el.getEditor()) {
      return;
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('rich editor did not load');
}

/** Type through ProseMirror so the edit lands in undo history like a keystroke. */
function type(el: PromptLineElement, text: string): void {
  const editor = el.getEditor()!;
  editor.view.dispatch(editor.state.tr.insertText(text));
}

async function setExtensions(
  el: PromptLineElement,
  extensions: Extension[]
): Promise<void> {
  el.extensions = extensions;
  await el.updateComplete;
  await Promise.resolve();
}

/** Let the deferred teardown scheduled by `disconnectedCallback` run. */
async function flushTeardown(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function starterStorage(el: PromptLineElement): StarterTriggerStorage {
  return (el.getEditor()!.storage as unknown as Record<string, unknown>)
    .carbonStarterTrigger as StarterTriggerStorage;
}

describe('<cds-aichat-prompt-line> editor stability across config updates', function () {
  it('keeps the editor and its undo history when an equivalent set is rebuilt', async () => {
    const configs = { mention: { trigger: '@', items: PEOPLE } };
    const el = await makeRichPromptLine(buildCarbonExtensions(configs));
    const editor = el.getEditor();

    type(el, 'hello');
    // The host rebuilds its config mid-typing (the #2152 trigger).
    await setExtensions(el, buildCarbonExtensions(configs));
    type(el, ' world');

    expect(el.getEditor()).to.equal(editor);
    expect(el.getEditor()!.getText()).to.equal('hello world');

    // Undo must walk all the way back — history was previously truncated at
    // the rebuild, stranding the field on its first chunk of text.
    while (el.undo()) {
      /* drain the history stack */
    }
    expect(el.getEditor()!.getText()).to.equal('');
  });

  it('recreates the editor when the set genuinely differs, preserving content', async () => {
    const el = await makeRichPromptLine(
      buildCarbonExtensions({ mention: { trigger: '@', items: PEOPLE } })
    );
    const editor = el.getEditor();
    type(el, 'keep me');

    await setExtensions(
      el,
      buildCarbonExtensions({ mention: { trigger: '#', items: PEOPLE } })
    );

    expect(el.getEditor()).to.not.equal(editor);
    expect(el.getEditor()!.getText()).to.equal('keep me');
  });

  it('applies starters changes to live storage without recreating', async () => {
    const el = await makeRichPromptLine(
      buildCarbonExtensions({ starters: { items: STARTERS, isOn: true } })
    );
    const editor = el.getEditor();
    type(el, 'typing');
    expect(starterStorage(el).isOn).to.equal(true);

    // Toggling the list off is the example app's action; it must not cost the
    // user their undo history.
    await setExtensions(
      el,
      buildCarbonExtensions({ starters: { items: STARTERS, isOn: false } })
    );
    expect(el.getEditor()).to.equal(editor);
    expect(starterStorage(el).isOn).to.equal(false);

    const nextItems: SuggestionItem[] = [{ id: 's2', label: 'Draft an email' }];
    await setExtensions(
      el,
      buildCarbonExtensions({ starters: { items: nextItems, isOn: false } })
    );
    expect(el.getEditor()).to.equal(editor);
    expect(starterStorage(el).items).to.equal(nextItems);

    while (el.undo()) {
      /* drain the history stack */
    }
    expect(el.getEditor()!.getText()).to.equal('');
  });

  it('recreates when a host extension identity changes', async () => {
    const el = await makeRichPromptLine([
      Extension.create({ name: 'hostThing' }),
    ]);
    const editor = el.getEditor();

    await setExtensions(el, [Extension.create({ name: 'hostThing' })]);

    expect(el.getEditor()).to.not.equal(editor);
  });

  it('applies a content update that arrives alongside an equivalent set', async () => {
    // The old guard skipped setContent whenever extensions also changed,
    // relying on the recreate to reseed. With the recreate gone, the content
    // update would otherwise be dropped.
    const configs = { mention: { trigger: '@', items: PEOPLE } };
    const el = await makeRichPromptLine(buildCarbonExtensions(configs));
    const editor = el.getEditor();
    const events: Event[] = [];
    el.addEventListener('cds-aichat-prompt-change', (event) =>
      events.push(event)
    );

    el.content = 'from the host';
    el.extensions = buildCarbonExtensions(configs);
    await el.updateComplete;
    await Promise.resolve();

    expect(el.getEditor()).to.equal(editor);
    expect(el.getEditor()!.getText()).to.equal('from the host');
    // A post-mount content update is a real change and does notify the host.
    expect(events).to.have.lengthOf(1);
  });

  it('applies a placeholder change to the live editor', async () => {
    // Placeholder used to reach the editor only via a recreate; with recreates
    // gone it has to be written through.
    const el = await makeRichPromptLine();
    const editor = el.getEditor();

    el.placeholder = 'Ask anything';
    await el.updateComplete;
    await Promise.resolve();

    expect(el.getEditor()).to.equal(editor);
    const paragraph = editor!.view.dom.querySelector('p');
    expect(paragraph?.getAttribute('data-placeholder')).to.equal(
      'Ask anything'
    );
  });

  it('keeps the editor across a same-frame detach and reattach', async () => {
    // A host reparenting the node (or a framework remounting it for one frame)
    // must not cost the user their editor or its history.
    const el = await makeRichPromptLine();
    const editor = el.getEditor();
    const parent = el.parentElement!;
    type(el, 'still here');

    parent.removeChild(el);
    parent.appendChild(el);
    await flushTeardown();

    expect(el.getEditor()).to.equal(editor);
    expect(el.getEditor()!.getText()).to.equal('still here');
    type(el, ' and typing');
    expect(el.getEditor()!.getText()).to.equal('still here and typing');
    while (el.undo()) {
      /* drain the history stack */
    }
    expect(el.getEditor()!.getText()).to.equal('');
  });

  it('keeps a pending ensureEditor() alive across a same-frame remount', async () => {
    const el = await fixture<PromptLineElement>(html`
      <cds-aichat-prompt-line aria-label="test prompt"></cds-aichat-prompt-line>
    `);
    const pending = el.ensureEditor();
    const parent = el.parentElement!;

    parent.removeChild(el);
    parent.appendChild(el);
    await flushTeardown();

    const editor = await pending;
    expect(editor).to.equal(el.getEditor());
  });

  it('recovers a working surface when reattached after teardown', async () => {
    // `firstUpdated` never runs twice, so without an explicit re-init the
    // element used to come back with no controller and ignore every prop.
    const el = await makeRichPromptLine();
    const parent = el.parentElement!;

    parent.removeChild(el);
    await flushTeardown();
    expect(el.getEditor()).to.equal(null);

    parent.appendChild(el);
    await waitForRich(el);

    expect(el.getEditor()).to.not.equal(null);
    type(el, 'back in business');
    expect(el.getEditor()!.getText()).to.equal('back in business');
    el.placeholder = 'still wired';
    await el.updateComplete;
    await Promise.resolve();
    expect(el.getEditor()!.view.dom.isConnected).to.equal(true);
  });

  it('clears in-flight composition state on a real teardown', async () => {
    // The old host div (with its composition listeners) is discarded at
    // teardown, so its `compositionend` can never arrive. Stale flags would
    // park the first upgrade after a reattach forever.
    const el = await fixture<PromptLineElement>(html`
      <cds-aichat-prompt-line aria-label="test prompt"></cds-aichat-prompt-line>
    `);
    await el.updateComplete;
    const host = el.querySelector<HTMLElement>('[data-aichat-editor-host]')!;
    host.dispatchEvent(
      new CompositionEvent('compositionstart', { bubbles: true })
    );
    const parent = el.parentElement!;

    parent.removeChild(el);
    await flushTeardown();
    parent.appendChild(el);

    const editor = await el.ensureEditor();
    expect(editor).to.equal(el.getEditor());
  });

  it('destroys the editor when the element is really unmounted', async () => {
    const el = await makeRichPromptLine();
    const editor = el.getEditor()!;
    el.parentElement!.removeChild(el);

    await flushTeardown();

    expect(el.getEditor()).to.equal(null);
    expect(editor.isDestroyed).to.equal(true);
  });

  it('does not re-apply the content seed after a reattach', async () => {
    // Every mount seeds `content`, not just the first, so the guard has to be
    // per-mount. React's order is assign-props-then-insert, which lands the new
    // value in the re-init's seed and again in the queued `updated()`.
    const el = await makeRichPromptLine();
    const parent = el.parentElement!;

    parent.removeChild(el);
    await flushTeardown();

    const events: Event[] = [];
    el.addEventListener('cds-aichat-prompt-change', (event) =>
      events.push(event)
    );
    el.content = 'restored draft';
    parent.appendChild(el);
    await waitForRich(el);

    expect(el.getEditor()!.getText()).to.equal('restored draft');
    expect(events).to.have.lengthOf(0);
  });

  it('does not emit a change event for the mount-time content seed', async () => {
    // `content` present before the first update is the mount seed, already
    // applied by the controller's init — re-applying it in `updated()` would
    // fire a spurious host-origin change.
    const container = await fixture<HTMLDivElement>(html`<div></div>`);
    const el = document.createElement(
      'cds-aichat-prompt-line'
    ) as PromptLineElement;
    el.rich = true;
    el.content = 'seeded';
    const events: Event[] = [];
    el.addEventListener('cds-aichat-prompt-change', (event) =>
      events.push(event)
    );

    container.appendChild(el);
    await el.updateComplete;
    await waitForRich(el);

    expect(el.getEditor()!.getText()).to.equal('seeded');
    expect(events).to.have.lengthOf(0);
  });

  it('applies a content update that returns to the seeded value', async () => {
    // The seed is skipped once, not for the life of the surface: suppressing
    // every update equal to it silently drops the third step here and leaves
    // the editor showing 'b'.
    const el = await fixture<PromptLineElement>(html`
      <cds-aichat-prompt-line
        rich
        aria-label="test prompt"></cds-aichat-prompt-line>
    `);
    el.content = 'a';
    await el.updateComplete;
    await waitForRich(el);
    expect(el.getEditor()!.getText()).to.equal('a');

    el.content = 'b';
    await el.updateComplete;
    expect(el.getEditor()!.getText()).to.equal('b');

    el.content = 'a';
    await el.updateComplete;
    expect(el.getEditor()!.getText()).to.equal('a');
  });
});
