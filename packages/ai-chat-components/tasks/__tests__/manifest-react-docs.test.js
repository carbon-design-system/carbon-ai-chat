/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { readSource } from '../manifest-source.js';
import {
  reactEventRegistry,
  renderReactRegistry,
} from '../manifest-react-docs-registry.js';
import { validateReactDocs } from '../manifest-react-docs-coverage.js';
import { mdxTables } from '../manifest-react-docs-mdx.js';
import { createManifestEventArgTypes } from '../../.storybook-react/manifest-event-arg-types-core.js';

const root = path.join(tmpdir(), 'manifest-react-docs-fixture');
const event = {
  callback: 'onChange',
  eventName: 'button-change',
  description: 'Emitted when the selection changes.',
  type: 'CustomEvent<ButtonDetail>',
};
const entry = {
  module: 'src/react/button.ts',
  exportName: 'default',
  tagName: 'x-button',
  identity: 'button',
  events: [event],
};
const registry = [entry];
const imports = `import { Meta as Page, ArgTypes as Rows } from '@storybook/addon-docs/blocks';\nimport * as Examples from './button.stories.jsx';\n\n`;
const helper = `import { manifestEventArgTypes as callbackRows } from '../../.storybook-react/manifest-event-arg-types.js';`;
const story = `${helper}\nimport Button from '../react/button.js';\nexport default { title: 'Button' };\nexport const Default = { argTypes: { ...callbackRows(Button) } };`;

function fixture(storyText = story, extraFiles = {}) {
  const files = {
    'src/react/button.ts': 'export const Button = {}; export default Button;',
    '.storybook-react/manifest-event-arg-types.js':
      'export const manifestEventArgTypes = () => { throw new Error("Do not execute browser imports"); };',
    'src/stories/button.stories.jsx': storyText,
    ...extraFiles,
  };
  return readSource({
    root,
    files: Object.fromEntries(
      Object.entries(files).filter(([file]) => file.startsWith('src/react/'))
    ),
    additionalFiles: Object.fromEntries(
      Object.entries(files).filter(([file]) => !file.startsWith('src/react/'))
    ),
  });
}

function check(mdx, storyText = story, options = {}) {
  const model = fixture(storyText, options.files);
  return validateReactDocs(
    model,
    options.registry ?? registry,
    { [path.join(root, 'src/stories/button.mdx')]: imports + mdx },
    options.preview,
    options.includedStories
  );
}

function fails(mdx, pattern, storyText = story, options) {
  assert.match(check(mdx, storyText, options).join('\n'), pattern);
}

test('generates exact CEM descriptions and types under React callback names', () => {
  const wrapper = {
    module: 'src/react/button.ts',
    exportName: 'default',
    element: { tagName: 'x-button' },
    callbacks: [{ callback: 'onChange', eventName: 'button-change' }],
    location: 'button.ts:1:1',
  };
  const manifest = {
    modules: [
      {
        declarations: [
          {
            tagName: 'x-button',
            events: [
              {
                name: event.eventName,
                description: event.description,
                type: { text: event.type },
              },
            ],
          },
        ],
      },
    ],
  };
  const result = reactEventRegistry([wrapper], manifest);
  assert.deepEqual(result[0].events, [event]);
  const component = {};
  const rows = createManifestEventArgTypes([{ ...result[0], component }])(
    component
  );
  assert.deepEqual(Object.keys(rows), ['onChange']);
  assert.equal(rows.onChange.description, event.description);
  assert.equal(rows.onChange.table.type.summary, event.type);
  assert.equal(rows.onChange.control, false);
  assert.throws(
    () => createManifestEventArgTypes([])(component),
    /missing from the generated/
  );
  const changed = structuredClone(manifest);
  changed.modules[0].declarations[0].events[0].description =
    'Updated source description.';
  assert.equal(
    reactEventRegistry([wrapper], changed)[0].events[0].description,
    'Updated source description.'
  );
  for (const field of ['description', 'type']) {
    const broken = structuredClone(manifest);
    delete broken.modules[0].declarations[0].events[0][field];
    assert.throws(
      () => reactEventRegistry([wrapper], broken),
      /described, typed CEM event/
    );
  }
  assert.throws(
    () =>
      reactEventRegistry(
        [
          {
            ...wrapper,
            callbacks: [{ callback: 'onChange', eventName: 'missing' }],
          },
        ],
        manifest
      ),
    /onChange \(missing\)/
  );
});

test('emits static browser imports of final exports without executing their modules', () => {
  const output = renderReactRegistry(registry, '.storybook-react');
  assert.match(
    output,
    /import \{ default as component0 \} from "\.\.\/src\/react\/button.js"/
  );
  assert.match(output, /component: component0/);
  assert.throws(
    () =>
      createManifestEventArgTypes([
        { ...entry, component: null },
        { ...entry, component: null, events: [] },
      ]),
    /Conflicting event documentation/
  );
});

test('resolves actual MDX blocks, imported aliases and grouped metadata without a component', () => {
  assert.deepEqual(
    check('<Page of={Examples} />\n\n<Rows of={Examples.Default} />'),
    []
  );
  assert.deepEqual(check('<Page of={Examples} />\n\n<Rows />'), []);
  assert.deepEqual(check('<Rows of={Examples} />'), []);
  const namespaced = `import * as Docs from '@storybook/addon-docs/blocks';\n\n<Docs.Meta of={Examples} />\n\n<Docs.ArgTypes />`;
  assert.deepEqual(check(namespaced), []);
});

for (const [label, mdx] of [
  ['fenced code', '```mdx\n<Rows of={Examples.Default} />\n```'],
  [
    'plain text',
    'The string onChange and manifestEventArgTypes are not a Docs table.',
  ],
  ['comments', '{/* <Rows of={Examples.Default} /> */}'],
  ['conditional JSX', '{false && <Rows of={Examples.Default} />}'],
  ['unrendered component', '<Discard><Rows of={Examples.Default} /></Discard>'],
  ['hidden block', '<div hidden><Rows of={Examples.Default} /></div>'],
  [
    'style-hidden block',
    '<div style={{display: "none"}}><Rows of={Examples.Default} /></div>',
  ],
  ['foreign block', '<ArgTypes of={Examples.Default} />'],
  ['inert template', '<template><Rows of={Examples.Default} /></template>'],
  ['collapsed details', '<details><Rows of={Examples.Default} /></details>'],
]) {
  test(`does not count ${label} as coverage`, () =>
    fails(mdx, /Show onChange/));
}

for (const [label, mdx, text] of [
  [
    'block include',
    '<Rows of={Examples.Default} include={["other"]} />',
    story,
  ],
  ['block exclude', '<Rows of={Examples.Default} exclude={/^on/} />', story],
  [
    'meta filter',
    '<Rows of={Examples.Default} />',
    story.replace(
      "title: 'Button'",
      "title: 'Button', parameters: { docs: { argTypes: { exclude: ['onChange'] } } }"
    ),
  ],
  [
    'story filter',
    '<Rows of={Examples.Default} />',
    story.replace(
      'argTypes: { ...callbackRows(Button) }',
      'parameters: { docs: { argTypes: { include: /^other/ } } }, argTypes: { ...callbackRows(Button) }'
    ),
  ],
  [
    'disabled row',
    '<Rows of={Examples.Default} />',
    story.replace(
      '...callbackRows(Button)',
      '...callbackRows(Button), onChange: { table: { disable: true } }'
    ),
  ],
  [
    'callback renamed',
    '<Rows of={Examples.Default} />',
    story.replace(
      '...callbackRows(Button)',
      'onDifferent: callbackRows(Button).onChange'
    ),
  ],
  [
    'description overridden',
    '<Rows of={Examples.Default} />',
    story.replace(
      '...callbackRows(Button)',
      'onChange: { ...callbackRows(Button).onChange, description: "Drift" }'
    ),
  ],
]) {
  test(`rejects ${label}`, () =>
    fails(mdx, /Show onChange|Preserve generated/, text));
}

test('honors project filters, included stories, and the first included CSF story', () => {
  fails('<Rows of={Examples.Default} />', /Show onChange/, story, {
    preview: { parameters: { docs: { argTypes: { exclude: ['onChange'] } } } },
  });
  fails('<Rows of={Examples.Default} />', /Include the ArgTypes story/, story, {
    includedStories: new Set(),
  });
  fails(
    '<Rows of={Examples.Default} />',
    /included story/,
    story.replace(
      "title: 'Button'",
      "title: 'Button', excludeStories: ['Default']"
    )
  );
  const withFirst = story.replace(
    'export const Default',
    'export const Empty = {};\nexport const Default'
  );
  fails('<Rows of={Examples} />', /Show onChange/, withFirst);
  assert.deepEqual(
    check(
      '<Rows of={Examples} />',
      withFirst.replace(
        "title: 'Button'",
        "title: 'Button', includeStories: ['Default']"
      )
    ),
    []
  );
});

test('fails newly added wrappers instead of covering same-named peer callbacks', () => {
  const peer = { ...entry, module: 'src/react/other.ts', identity: 'other' };
  fails(
    '<Rows of={Examples.Default} />',
    /other.ts#default: Show onChange/,
    story,
    {
      registry: [...registry, peer],
      files: { 'src/react/other.ts': 'export default {};' },
    }
  );
});

test('rejects unresolved helper wrappers and unresolved filters', () => {
  fails(
    '<Rows of={Examples.Default} />',
    /Resolve the final exported wrapper/,
    story.replace('callbackRows(Button)', 'callbackRows(Unknown)')
  );
  fails(
    '<Rows of={Examples.Default} exclude={dynamic} />',
    /literal array or regular expression/
  );
});

for (const level of ['project', 'meta', 'story']) {
  test(`does not count disabled ${level} Docs routes`, () => {
    const options =
      level === 'project'
        ? { preview: { parameters: { docs: { disable: true } } } }
        : {};
    let source = story;
    if (level === 'meta') {
      source = source.replace(
        "title: 'Button'",
        "title: 'Button', parameters: { docs: { disable: true } }"
      );
    }
    if (level === 'story') {
      source = source.replace(
        'argTypes: { ...callbackRows(Button) }',
        'parameters: { docs: { disable: true } }, argTypes: { ...callbackRows(Button) }'
      );
    }
    fails(
      '<Rows of={Examples.Default} />',
      /enabled Docs page/,
      source,
      options
    );
  });
}

test('a disabled Docs page override does not count, while !autodocs keeps a real MDX route', () => {
  fails(
    '<Rows of={Examples.Default} />',
    /enabled Docs page/,
    story.replace(
      "title: 'Button'",
      "title: 'Button', parameters: { docs: { page: null } }"
    )
  );
  assert.deepEqual(
    check(
      '<Rows of={Examples.Default} />',
      story.replace("title: 'Button'", "title: 'Button', tags: ['!autodocs']")
    ),
    []
  );
});

test('rejects spread Docs attributes and non-array string filters', () => {
  fails(
    '<Rows of={Examples.Default} {...filters} />',
    /explicit Docs block attributes/
  );
  fails(
    '<Rows of={Examples.Default} exclude="onChange" />',
    /literal array or regular expression/
  );
});

test('rejects later metadata writes rather than trusting an initializer', () => {
  fails(
    '<Rows of={Examples.Default} />',
    /without later writes/,
    story + '\nDefault.argTypes.onChange = { table: { disable: true } };'
  );
});

test('shares literal Web Component targets without using them as React callback proof', () => {
  const model = fixture();
  const filename = path.join(root, 'src/stories/button.mdx');
  for (const target of ['"x-button"', '{"x-button"}']) {
    const mdx = imports + `<Page of={Examples} />\n\n<Rows of=${target} />`;
    const tables = mdxTables(mdx, filename, model);
    assert.equal(tables[0].tagName, 'x-button');
    assert.equal(
      tables[0].source.fileName,
      path.join(root, 'src/stories/button.stories.jsx')
    );
    fails(`<Page of={Examples} />\n\n<Rows of=${target} />`, /Use a CSF story/);
  }
});

test('allows wrapper display names without treating them as documentation mutations', () => {
  assert.deepEqual(
    check(
      '<Rows of={Examples.Default} />',
      story.replace("title: 'Button'", "title: 'Button', component: Button"),
      {
        files: {
          'src/react/button.ts':
            'export const Button = {}; Button.displayName = "Button"; export default Button;',
        },
      }
    ),
    []
  );
});
