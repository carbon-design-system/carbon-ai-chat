/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { readSource } from '../manifest-source.js';
import { validateWcDocs } from '../manifest-wc-docs.js';
import { readDocsInputs } from '../manifest-docs-inputs.js';

const root = path.join(tmpdir(), 'manifest-wc-docs-fixture');
const filename = path.join(root, 'src/stories/button.mdx');
const event = {
  name: 'button-change',
  description: 'Emitted when the selection changes.',
  type: { text: 'CustomEvent<SelectionDetail>' },
};
const declaration = { tagName: 'x-button', events: [event] };
const manifest = { modules: [{ declarations: [declaration] }] };
const imports = `import { Meta as Page, ArgTypes as Rows } from '@storybook/addon-docs/blocks';\nimport * as Examples from './button.stories.js';\n\n`;
const story = `export default { title: 'Button', component: 'x-button' }; export const Default = {}; throw new Error('Do not execute story modules.');`;

function check(mdx, source = story, options = {}) {
  const model = readSource({
    root,
    files: {
      'src/components/aichat-button/button.ts': 'export class Button {}',
    },
    additionalFiles: {
      'src/stories/button.stories.js': source,
      ...options.files,
    },
  });
  return validateWcDocs(
    model,
    options.manifest ?? manifest,
    { [filename]: imports + mdx },
    options.preview,
    options.storyFiles
  );
}

function fails(mdx, pattern, source = story, options) {
  assert.match(check(mdx, source, options).join('\n'), pattern);
}

test('covers CEM events through module metadata, explicit stories and literal tags', () => {
  for (const mdx of [
    '<Rows of={Examples} />',
    '<Rows of={Examples.Default} />',
    '<Page of={Examples} />\n\n<Rows />',
    '<Page of={Examples} />\n\n<Rows of="x-button" />',
    '<Page of={Examples} />\n\n<Rows of={"x-button"} />',
  ]) {
    assert.deepEqual(check(mdx), []);
  }
});

for (const [label, mdx] of [
  ['missing block', '<Page of={Examples} />'],
  ['code fence', '```mdx\n<Rows of={Examples} />\n```'],
  ['comment', '{/* <Rows of={Examples} /> */}'],
  ['unrendered callback', '{() => <Rows of={Examples} />}'],
  ['hidden wrapper', '<div hidden><Rows of={Examples} /></div>'],
  [
    'unused metadata',
    'The string button-change and x-button is not a Docs table.',
  ],
]) {
  test(`does not cover ${label}`, () =>
    fails(mdx, /x-button: Show button-change/));
}

for (const [label, source] of [
  ['missing component', story.replace(", component: 'x-button'", '')],
  [
    'wrong component',
    story.replace("component: 'x-button'", "component: 'x-other'"),
  ],
  [
    'disabled meta row',
    story.replace(
      "title: 'Button'",
      "title: 'Button', argTypes: { 'button-change': { table: { disable: true } } }"
    ),
  ],
  [
    'disabled story row',
    story.replace(
      'export const Default = {}',
      "export const Default = { argTypes: { 'button-change': { table: { disable: true } } } }"
    ),
  ],
  [
    'excluded row',
    story.replace(
      "title: 'Button'",
      "title: 'Button', parameters: { docs: { argTypes: { exclude: ['button-change'] } } }"
    ),
  ],
  [
    'wrong description',
    story.replace(
      "title: 'Button'",
      "title: 'Button', argTypes: { 'button-change': { description: 'Drifted prose.' } }"
    ),
  ],
  [
    'wrong type',
    story.replace(
      "title: 'Button'",
      "title: 'Button', argTypes: { 'button-change': { table: { type: { summary: 'Event' } } } }"
    ),
  ],
]) {
  test(`rejects ${label}`, () =>
    fails(
      '<Rows of={Examples.Default} />',
      /x-button: Show button-change|Preserve the CEM/,
      source
    ));
}

test('requires a configured story import and honors story selection', () => {
  fails('<Rows of={Examples.Default} />', /Include the ArgTypes story/, story, {
    storyFiles: new Set(),
  });
  fails(
    '<Rows of={Examples.Default} />',
    /included story/,
    story.replace(
      "title: 'Button'",
      "title: 'Button', excludeStories: ['Default']"
    )
  );
  const source =
    story.replace(
      "title: 'Button'",
      "title: 'Button', includeStories: /^Default$/"
    ) + '\nexport const Other = {};';
  assert.deepEqual(check('<Rows of={Examples.Default} />', source), []);
  fails('<Rows of={Examples.Other} />', /included story/, source);
});

test('honors block filters and project filters for bare component targets', () => {
  fails(
    '<Rows of={Examples.Default} include={["other"]} />',
    /Show button-change/
  );
  fails(
    '<Rows of={Examples.Default} exclude={/^button/} />',
    /Show button-change/
  );
  fails(
    '<Page of={Examples} />\n\n<Rows of="x-button" />',
    /Show button-change/,
    story,
    { preview: { parameters: { docs: { argTypes: { exclude: /^button/ } } } } }
  );
});

test('bare component targets use CEM extraction rather than CSF argTypes overrides', () => {
  const source = story.replace(
    "title: 'Button'",
    "title: 'Button', argTypes: { 'button-change': { description: 'Ignored on a bare component', table: { disable: true } } }"
  );
  assert.deepEqual(
    check('<Page of={Examples} />\n\n<Rows of="x-button" />', source),
    []
  );
  fails('<Rows of={Examples} />', /Show button-change/, source);
});

test('meta tables do not borrow the first story component or event rows', () => {
  const source = story
    .replace(", component: 'x-button'", '')
    .replace(
      'export const Default = {}',
      "export const Default = { component: 'x-button', argTypes: { 'button-change': { description: 'Authored' } } }"
    );
  fails('<Rows of={Examples} />', /Associate the WC ArgTypes table/, source);
  fails(
    '<Rows of={Examples.Default} />',
    /Associate the WC ArgTypes table/,
    source
  );
});

test('guards a newly added event or element without a frozen inventory', () => {
  const newEvent = {
    name: 'button-ready',
    description: 'Ready.',
    type: { text: 'CustomEvent<null>' },
  };
  const changed = {
    modules: [
      { declarations: [{ ...declaration, events: [event, newEvent] }] },
    ],
  };
  fails(
    '<Rows of={Examples} include={["button-change"]} />',
    /Show button-ready/,
    story,
    { manifest: changed }
  );
  const peer = { ...declaration, tagName: 'x-peer' };
  fails('<Rows of={Examples} />', /x-peer: Show button-change/, story, {
    manifest: { modules: [{ declarations: [declaration, peer] }] },
  });
});

test('requires each grouped component target independently', () => {
  const peer = { ...declaration, tagName: 'x-peer' };
  const both = { modules: [{ declarations: [declaration, peer] }] };
  assert.deepEqual(
    check(
      '<Page of={Examples} />\n\n<Rows of="x-button" />\n\n<Rows of="x-peer" />',
      story,
      { manifest: both }
    ),
    []
  );
});

test('fails missing descriptions, missing types and extractor row collisions', () => {
  for (const key of ['description', 'type']) {
    const changed = structuredClone(manifest);
    delete changed.modules[0].declarations[0].events[0][key];
    fails('<Rows of={Examples} />', /Preserve the CEM/, story, {
      manifest: changed,
    });
  }
  const changed = structuredClone(manifest);
  changed.modules[0].declarations[0].slots = [{ name: 'button-change' }];
  fails('<Rows of={Examples} />', /Preserve the CEM/, story, {
    manifest: changed,
  });
});

test('loads actual configured include and exclude globs without executing config or stories', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'manifest-docs-inputs-'));
  const files = {
    '.storybook/main.js': `const config = { stories: ['../src/stories/*.stories.js', '../src/stories/*.mdx', '!../src/stories/excluded.stories.js'] }; export default config; throw new Error('Do not execute config');`,
    '.storybook/preview.js': `export const parameters = { docs: { argTypes: { exclude: ['internal'] } } };`,
    'src/stories/button.stories.js': story,
    'src/stories/excluded.stories.js': `export default { component: 'x-button' }; export const Default = {};`,
    'src/stories/button.mdx': imports + '<Rows of={Examples} />',
  };
  try {
    for (const [file, text] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
      writeFileSync(path.join(directory, file), text);
    }
    const { model, documents, preview, storyFiles } = await readDocsInputs(
      directory,
      '.storybook'
    );
    assert.deepEqual(
      [...storyFiles].map((file) => path.basename(file)),
      ['button.stories.js']
    );
    assert.deepEqual(
      validateWcDocs(model, manifest, documents, preview, storyFiles),
      []
    );
    const excluded = Object.fromEntries(
      Object.entries(documents).map(([file, text]) => [
        file,
        text.replace('./button.stories.js', './excluded.stories.js'),
      ])
    );
    assert.match(
      validateWcDocs(model, manifest, excluded, preview, storyFiles).join('\n'),
      /Resolve the Docs ArgTypes story reference|Include the ArgTypes story/
    );
    writeFileSync(
      path.join(directory, 'src/stories/metadata.js'),
      `export const argTypes = { 'button-change': { table: { disable: false } } }; argTypes['button-change'].table.disable = true;`
    );
    writeFileSync(
      path.join(directory, 'src/stories/button.stories.js'),
      `import { argTypes } from './metadata.js'; export default { component: 'x-button', argTypes }; export const Default = {};`
    );
    const imported = await readDocsInputs(directory, '.storybook');
    assert.match(
      validateWcDocs(
        imported.model,
        manifest,
        imported.documents,
        imported.preview,
        imported.storyFiles
      ).join('\n'),
      /without later writes/
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
