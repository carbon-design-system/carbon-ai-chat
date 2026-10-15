/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { componentEntries } from './entry-paths.mjs';
import { wrapperEntries } from './wrapper-entries.mjs';

const packageName = '@carbon/ai-chat-components';
const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const componentSpecifier = (path) => `${packageName}/es/components/${path}`;
const allTags = [
  ...componentEntries.map(({ tag }) => tag),
  'cds-aichat-container',
  'cds-aichat-custom-element',
];

const requiredChildren = {
  'aichat-audio-player': ['cds-aichat-markdown'],
  'aichat-card': [
    'cds-button',
    'cds-icon-button',
    'cds-icon-indicator',
    'cds-loading',
  ],
  'aichat-carousel': ['cds-icon-button'],
  'aichat-chain-of-thought': ['cds-inline-loading'],
  'aichat-history': [
    'cds-search',
    'cds-icon-button',
    'cds-menu',
    'cds-menu-item',
    'cds-menu-item-divider',
    'cds-aichat-history-panel-item-input',
    'cds-aichat-button',
    'cds-skeleton-text',
  ],
  'aichat-shell': ['cds-aichat-panel', 'cds-aichat-toolbar'],
  'aichat-code-snippet': [
    'cds-aichat-toolbar',
    'cds-button',
    'cds-menu',
    'cds-menu-item',
  ],
  'aichat-feedback': [
    'cds-aichat-markdown',
    'cds-button',
    'cds-checkbox',
    'cds-textarea',
    'cds-selectable-tag',
  ],
  'aichat-file-uploads': [
    'cds-aichat-file-upload-item',
    'cds-file-uploader-item',
  ],
  'aichat-launcher': ['cds-aichat-button'],
  'aichat-markdown': ['cds-aichat-code-snippet', 'cds-aichat-table'],
  'aichat-prompt-line': [
    'cds-aichat-autocomplete',
    'cds-aichat-stop-streaming-button',
    'cds-button',
    'cds-icon-button',
  ],
  'aichat-table': ['cds-table', 'cds-pagination'],
  'aichat-toolbar': [
    'cds-aichat-truncated-text',
    'cds-icon-button',
    'cds-menu',
    'cds-menu-item',
  ],
  'aichat-truncated-text': ['cds-tooltip', 'cds-tooltip-content'],
  'aichat-workspace-shell': ['cds-aichat-truncated-text', 'cds-button'],
};

function pureSource(specifier, tag, canonicalSpecifier) {
  return `
import Constructor from ${JSON.stringify(specifier)};
${canonicalSpecifier ? `import CanonicalConstructor from ${JSON.stringify(canonicalSpecifier)};` : ''}
import { defineCustomElement } from '${packageName}/es/globals/register.js';
const localBefore = ${JSON.stringify(allTags)}.filter((tag) => customElements.get(tag));
const definitionsBefore = [...window.isolationDefinitions];
const returned = defineCustomElement(Constructor);
const element = document.createElement(${JSON.stringify(tag)});
window.isolationState = {
  localBefore,
  aliasIdentity: ${canonicalSpecifier ? 'Constructor === CanonicalConstructor' : 'true'},
  definitionsBefore,
  carbonDefinitionsBefore: definitionsBefore.filter((name) => name.startsWith('cds-') && !name.startsWith('cds-aichat-')),
  staticTag: Constructor.is,
  returnedIdentity: returned === Constructor,
  registeredIdentity: customElements.get(${JSON.stringify(tag)}) === Constructor,
  upgraded: element instanceof Constructor,
  definitions: window.isolationDefinitions,
};
`;
}

function barrelSource(specifier, entries) {
  return `
import * as barrel from ${JSON.stringify(specifier)};
import { propsFor, slotChildren, describe, runtimeTags, appendComponent, conditionalStates, assignProps } from './isolation-fixture.js';
const components = [];
const conditionalTags = [];
for (const { tag, name } of ${JSON.stringify(entries)}) {
  const constructor = barrel[name];
  if (!constructor) throw new Error('Missing barrel class ' + name);
  const element = document.createElement(tag);
  assignProps(element, await propsFor(tag));
  element.append(...slotChildren());
  await appendComponent(element);
  components.push(await describe(element, constructor));
  conditionalTags.push(...runtimeTags(), ...await conditionalStates(element));
}
window.isolationState = { components, tags: [...conditionalTags, ...runtimeTags()], definitions: window.isolationDefinitions };
`;
}

function wrapperSource(entry) {
  const classImport = entry.classPath
    ? `import Constructor from ${JSON.stringify(componentSpecifier(entry.classPath))};`
    : "import Constructor from '@carbon/web-components/es/components/ai-label/ai-label-action-button.js';";
  return `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import * as bindings from ${JSON.stringify(entry.path)};
${classImport}
import { propsFor, slotChildren, describe, runtimeTags, conditionalStates } from './isolation-fixture.js';
const expected = ${JSON.stringify(entry)};
const Wrapper = bindings[expected.exports[0]];
const aliasesMatch = expected.exports.every((name) => bindings[name] === Wrapper);
const eventCounts = {};
const handlers = Object.fromEntries(Object.entries(expected.events).map(([prop, event]) => [prop, () => { eventCounts[event] = (eventCounts[event] ?? 0) + 1; }]));
const mount = document.createElement('main');
document.body.append(mount);
const root = createRoot(mount);
const props = await propsFor(expected.tag);
const children = expected.tag === 'cds-aichat-truncated-text' ? [] : slotChildren(React.createElement);
flushSync(() => root.render(React.createElement(Wrapper, { ...props, ...handlers }, ...children)));
const element = mount.querySelector(expected.tag);
if (!element) throw new Error('Wrapper failed to render ' + expected.tag);
const component = await describe(element, Constructor);
const tags = [...runtimeTags(), ...await conditionalStates(element), ...runtimeTags()];
const mappedEvents = Object.values(expected.events).map((event) => {
  const before = eventCounts[event] ?? 0;
  element.dispatchEvent(new CustomEvent(event, { bubbles: true, composed: true, detail: {} }));
  return { event, delivered: eventCounts[event] === before + 1 };
});
for (const event of Object.keys(eventCounts)) eventCounts[event] = 0;
window.isolationState = { aliasesMatch, components: [component], tags, mappedEvents, eventCounts, definitions: window.isolationDefinitions };
`;
}

function combinationSource(family) {
  const history = family === 'history';
  const imports = history
    ? [
        ['Shell', 'history/history-shell'],
        ['Panel', 'history/history-panel'],
        ['Menu', 'history/history-panel-menu'],
        ['Items', 'history/history-panel-items'],
        ['Item', 'history/history-panel-item'],
      ]
    : [
        ['Shell', 'prompt-line-shell'],
        ['Editor', 'prompt-line'],
        ['Send', 'input-send-control'],
        ['Autocomplete', 'autocomplete'],
      ];
  const tree = history
    ? "React.createElement(Shell, {}, React.createElement(Panel, {}, React.createElement(Menu, {title: 'Isolated group', expanded: true}, React.createElement(Items, {}, React.createElement(Item, {name: 'Isolated nested conversation', onSelected: () => state.selected++})))))"
    : "React.createElement(Shell, { expanded: true }, React.createElement(Editor, { slot: 'editor', content: 'Isolated nested prompt', onChange: () => state.changed++ }), React.createElement(Send, { slot: 'send-control', hasValidInput: true }), React.createElement(Autocomplete, { slot: 'autocomplete-content', items: [{id: 'nested', label: 'Nested suggestion', text: 'Nested suggestion'}] }))";
  return `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
${imports.map(([binding, path]) => `import ${binding} from '${packageName}/es/react/${path}.js';`).join('\n')}
import { settle, runtimeTags } from './isolation-fixture.js';
const mount = document.createElement('main');
document.body.append(mount);
const state = { selected: 0, changed: 0 };
const root = createRoot(mount);
flushSync(() => root.render(${tree}));
await settle();
state.components = [];
state.tags = runtimeTags();
window.isolationState = state;
`;
}

function reactHostSource(host) {
  return `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { ${host === 'container' ? 'ChatContainer' : 'ChatCustomElement'} as Host } from '@carbon/ai-chat/es';
const state = { ready: false, sent: [], removed: false };
const mount = document.createElement('main');
document.body.append(mount);
let root;
function render() {
  root = createRoot(mount);
  flushSync(() => root.render(React.createElement(Host, {
    openChatByDefault: true,
    launcher: { isOn: false },
    style: { width: '600px', height: '600px' },
    messaging: { customSendMessage(message) { state.sent.push(message); } },
    onAfterRender() { state.ready = true; },
  })));
}
state.remount = () => {
  flushSync(() => root.unmount());
  state.removed = mount.querySelector('cds-aichat-${host}') === null;
  state.ready = false;
  render();
};
window.isolationState = state;
render();
`;
}

function html(name) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="icon" href="data:,"><title>Isolated ${name}</title><style>body{padding:24px;max-width:900px}body>span{display:block}</style></head><body><script type="module" src="./${name}.js"></script></body></html>`;
}

export async function prepareIsolationProofs({ consumer, manifest, runNpm }) {
  const actual = manifest.modules.flatMap((module) =>
    (module.declarations ?? [])
      .filter((declaration) => declaration.tagName)
      .map((declaration) => ({
        tag: declaration.tagName,
        name: declaration.name,
        path: module.path,
      }))
  );
  assert.equal(actual.length, 54);
  for (const expected of componentEntries) {
    const declaration = actual.find(({ tag }) => tag === expected.tag);
    assert.deepEqual(
      declaration,
      {
        tag: expected.tag,
        name: expected.name,
        path: `es/components/${expected.path}`,
      },
      'The CEM must retain one canonical pure declaration per tag.'
    );
  }
  const cases = [];
  for (const [index, entry] of componentEntries.entries()) {
    for (const legacy of [false, true]) {
      cases.push({
        name: `pure-${index}${legacy ? '-legacy' : ''}`,
        kind: 'pure',
        tag: entry.tag,
        source: pureSource(
          componentSpecifier(legacy ? entry.legacyPath : entry.path),
          entry.tag,
          legacy ? componentSpecifier(entry.path) : undefined
        ),
      });
    }
  }
  for (const [index, barrel] of [
    ...new Set(componentEntries.map(({ barrel }) => barrel)),
  ].entries()) {
    const entries = componentEntries.filter((entry) => entry.barrel === barrel);
    for (const legacy of [false, true]) {
      cases.push({
        name: `barrel-${index}${legacy ? '-legacy' : ''}`,
        kind: 'barrel',
        requiredTags: requiredChildren[barrel.split('/')[0]] ?? [],
        source: barrelSource(
          componentSpecifier(legacy ? entries[0].legacyBarrel : barrel),
          entries
        ),
      });
    }
  }
  for (const host of ['container', 'custom-element']) {
    const family = `cds-aichat-${host}`;
    cases.push({
      name: `pure-host-${host}`,
      kind: 'pure',
      tag: family,
      source: pureSource(
        `@carbon/ai-chat/es/web-components/${family}/${family}.js`,
        family
      ),
    });
  }
  for (const [index, entry] of wrapperEntries.entries()) {
    cases.push({
      name: `wrapper-${index}`,
      kind: 'wrapper',
      requiredTags:
        {
          'cds-aichat-truncated-text': ['cds-tooltip', 'cds-tooltip-content'],
          'cds-aichat-toolbar': requiredChildren['aichat-toolbar'],
          'cds-aichat-code-snippet': requiredChildren['aichat-code-snippet'],
          'cds-aichat-chat-header': [
            'cds-overflow-menu',
            'cds-menu',
            'cds-menu-item',
            'cds-menu-item-divider',
          ],
          'cds-aichat-history-panel-item': [
            'cds-overflow-menu',
            'cds-menu',
            'cds-menu-item',
            'cds-aichat-history-panel-item-input',
          ],
          'cds-aichat-input-send-control': [
            'cds-button',
            'cds-aichat-stop-streaming-button',
            'cds-icon-button',
          ],
          'cds-aichat-card-footer': ['cds-button', 'cds-icon-button'],
          'cds-aichat-table': ['cds-table', 'cds-pagination'],
        }[entry.tag] ?? [],
      tag: entry.tag,
      source: wrapperSource(entry),
    });
  }
  for (const family of ['history', 'prompt-line']) {
    cases.push({
      name: `combination-${family}`,
      kind: 'combination',
      family,
      requiredTags:
        family === 'history'
          ? [
              'cds-aichat-history-shell',
              'cds-aichat-history-panel',
              'cds-aichat-history-panel-menu',
              'cds-aichat-history-panel-items',
              'cds-aichat-history-panel-item',
            ]
          : [
              'cds-aichat-prompt-line-shell',
              'cds-aichat-prompt-line',
              'cds-aichat-input-send-control',
              'cds-aichat-autocomplete',
            ],
      source: combinationSource(family),
    });
  }
  for (const host of ['container', 'custom-element']) {
    cases.push({
      name: `react-host-${host}`,
      kind: 'react-host',
      tag: `cds-aichat-${host}`,
      source: reactHostSource(host),
    });
  }
  await copyFile(
    join(sourceDirectory, 'isolation-fixture.js'),
    join(consumer, 'isolation-fixture.js')
  );
  for (const proof of cases) {
    await writeFile(join(consumer, `${proof.name}.js`), proof.source);
    await writeFile(join(consumer, `${proof.name}.html`), html(proof.name));
  }
  await writeFile(
    join(consumer, 'isolation-build.mjs'),
    `
process.env.NODE_ENV = 'production';
const { build } = await import('vite');
await build({ configFile: false, base: './', build: { outDir: 'dist/isolation', emptyOutDir: true, rollupOptions: { input: ${JSON.stringify(cases.map(({ name }) => `${name}.html`))} } } });
`
  );
  const packagePath = join(consumer, 'package.json');
  const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
  packageJson.scripts['build:isolation'] = 'node isolation-build.mjs';
  await writeFile(packagePath, JSON.stringify(packageJson, null, 2));
  await runNpm(['run', 'build:isolation']);
  return cases.map(({ source: _source, ...proof }) => proof);
}

export async function assertIsolationProofs({
  consumer,
  browser,
  origin,
  cases,
}) {
  const results = [];
  for (const proof of cases) {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      window.isolationDefinitions = [];
      const define = customElements.define.bind(customElements);
      customElements.define = (name, constructor, options) => {
        window.isolationDefinitions.push(name);
        return define(name, constructor, options);
      };
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });
    page.on('requestfailed', (request) =>
      errors.push(`${request.url()}: ${request.failure()?.errorText}`)
    );
    page.on('response', (response) => {
      if (response.status() >= 400) {
        errors.push(`${response.status()} ${response.url()}`);
      }
    });
    let state;
    try {
      await page.goto(`${origin}/isolation/${proof.name}.html`);
      await page.waitForFunction(() => window.isolationState);
      if (proof.kind === 'react-host') {
        for (const phase of ['initial', 'remounted']) {
          if (phase === 'remounted') {
            await page.evaluate(() => window.isolationState.remount());
          }
          await page.waitForFunction(() => window.isolationState.ready);
          await page.getByTestId('input_field').click();
          await page.keyboard.type(`${phase} ${proof.name}`);
          await page.getByTestId('input_send').click();
          await page.waitForFunction(
            (text) =>
              window.isolationState.sent.some(
                (message) => message.input?.text === text
              ),
            `${phase} ${proof.name}`
          );
          const welcomeCount = await page.evaluate(
            () =>
              window.isolationState.sent.filter(
                (message) => message.history?.is_welcome_request === true
              ).length
          );
          assert.equal(
            welcomeCount,
            phase === 'initial' ? 1 : 2,
            `${phase}: exactly one welcome request occurs per mounted host.`
          );
        }
      }
      state = await page.evaluate(() => {
        const { remount: _remount, ...state } = window.isolationState;
        return state;
      });
      if (proof.kind === 'react-host') {
        assert.equal(
          state.removed,
          true,
          'React unmount removes the host before remounting.'
        );
        const welcomes = state.sent.filter(
          (message) => message.history?.is_welcome_request === true
        );
        const userMessages = state.sent.filter(
          (message) => message.history?.is_welcome_request !== true
        );
        assert.equal(
          state.sent.length,
          4,
          'Two mounts each send one welcome request and one user message.'
        );
        assert.equal(
          welcomes.length,
          2,
          'Each React host mount sends its default welcome request.'
        );
        assert.deepEqual(
          welcomes.map((message) => ({
            text: message.input?.text,
            silent: message.history?.silent,
          })),
          [
            { text: '', silent: true },
            { text: '', silent: true },
          ],
          'Welcome requests keep their public empty, silent request contract.'
        );
        assert.deepEqual(
          userMessages.map((message) => message.input?.text),
          [`initial ${proof.name}`, `remounted ${proof.name}`],
          'Both user messages arrive exactly once, without additional normal sends.'
        );
      } else if (proof.kind === 'pure') {
        assert.deepEqual(
          state.localBefore,
          [],
          `${proof.name}: pure imports must leave every local chat tag undefined.`
        );
        assert.deepEqual(
          state.definitionsBefore.filter((name) =>
            name.startsWith('cds-aichat-')
          ),
          [],
          `${proof.name}: no unexpected local chat tag may register during a pure import.`
        );
        assert.equal(
          state.aliasIdentity,
          true,
          `${proof.name}: compatibility imports retain the canonical constructor identity.`
        );
        assert.equal(state.staticTag, proof.tag);
        assert.ok(
          state.returnedIdentity && state.registeredIdentity && state.upgraded,
          `${proof.name}: explicit helper registration must preserve identity and upgrade.`
        );
      } else {
        assert.deepEqual(
          state.components.filter(
            (component) =>
              !component.registeredIdentity ||
              !component.upgraded ||
              !component.renderRootIdentity ||
              !component.rendered ||
              !component.visible
          ),
          [],
          `${proof.name}: each barrel must register and render its components independently.`
        );
        if (proof.kind === 'barrel' || proof.kind === 'wrapper') {
          state.openedMenus = 0;
          for (const overflow of await page
            .locator('cds-overflow-menu')
            .all()) {
            const trigger = overflow.locator('button').first();
            if (!(await trigger.isVisible())) {
              continue;
            }
            await trigger.click();
            await overflow.getByRole('menu').waitFor({ state: 'visible' });
            assert.equal(
              await overflow.evaluate((element) => element.open),
              true
            );
            state.openedMenus += 1;
            await page.keyboard.press('Escape');
            await overflow.getByRole('menu').waitFor({ state: 'hidden' });
          }
          if ((proof.requiredTags ?? []).includes('cds-menu')) {
            assert.ok(
              state.openedMenus > 0,
              `${proof.name}: its menu must open through a real trigger.`
            );
          }
        }
        if (proof.kind === 'combination') {
          if (proof.family === 'history') {
            await page
              .getByText('Isolated nested conversation', { exact: true })
              .click();
            await page.waitForFunction(
              () => window.isolationState.selected === 1
            );
          } else {
            await page.locator('textarea').fill('User edited nested prompt');
            await page.waitForFunction(() => window.isolationState.changed > 0);
          }
        }
        for (const tag of proof.requiredTags ?? []) {
          assert.ok(
            state.tags.some((entry) => entry.tag === tag),
            `${proof.name}: conditional child ${tag} must actually render.`
          );
        }
        if (proof.kind === 'wrapper') {
          const interactions = {
            'cds-aichat-card-footer': [
              'Run isolated action',
              'cds-aichat-card-footer-action',
            ],
            'cds-aichat-workspace-shell-footer': [
              'Save isolated workspace',
              'cds-aichat-workspace-shell-footer-clicked',
            ],
            'cds-aichat-autocomplete': [
              'Isolated suggestion',
              'cds-aichat-autocomplete-send',
            ],
            'cds-aichat-history-panel-item': [
              'Isolated conversation',
              'history-item-selected',
            ],
          };
          const action = interactions[proof.tag];
          if (action) {
            await page.getByText(action[0], { exact: true }).first().click();
            await page.waitForFunction(
              (event) => window.isolationState.eventCounts[event] > 0,
              action[1]
            );
          }
          if (proof.tag === 'cds-aichat-prompt-line') {
            await page.locator('textarea').fill('User edited isolated prompt');
            await page.waitForFunction(
              () =>
                window.isolationState.eventCounts['cds-aichat-prompt-change'] >
                0
            );
          }
          assert.equal(
            state.aliasesMatch,
            true,
            `${proof.name}: wrapper aliases retain identity.`
          );
          assert.deepEqual(
            state.mappedEvents.filter(({ delivered }) => !delivered),
            [],
            `${proof.name}: React event maps deliver every published callback.`
          );
        }
        assert.deepEqual(
          state.tags.filter((tag) => !tag.defined || !tag.upgraded),
          [],
          `${proof.name}: every rendered local or Carbon child must upgrade.`
        );
      }
      assert.deepEqual(
        errors,
        [],
        `${proof.name}: no browser or request errors.`
      );
      const liveState = await page.evaluate(() => {
        const { remount: _remount, ...state } = window.isolationState;
        return state;
      });
      state = { ...state, ...liveState };
      results.push({ ...proof, state, errors });
    } catch (error) {
      await writeFile(
        join(consumer, `${proof.name}-failure.json`),
        JSON.stringify({ error: String(error), state, errors }, null, 2)
      );
      await page
        .screenshot({
          path: join(consumer, `${proof.name}-failure.png`),
          fullPage: true,
        })
        .catch(() => {});
      throw error;
    } finally {
      await context.close();
    }
  }
  await writeFile(
    join(consumer, 'isolation-runtime.json'),
    JSON.stringify(results, null, 2)
  );
  console.log(
    `Isolated entries: ${cases.length} production pages passed pure imports, explicit registration, and independent canonical/legacy barrels.`
  );
}
