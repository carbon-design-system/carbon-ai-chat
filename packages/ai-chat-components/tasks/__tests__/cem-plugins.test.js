/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { create, ts } from '@custom-elements-manifest/analyzer';
import { globby } from 'globby';
import { litPlugin } from '@custom-elements-manifest/analyzer/src/features/framework-plugins/lit/lit.js';
import config from '../../custom-elements-manifest.config.js';
import {
  carbonElementTagPlugin,
  componentModulePathsPlugin,
  internalMembersPlugin,
  readPrefixSetting,
} from '../cem-plugins.js';

function analyze(files, prefix = 'fixture-chat') {
  const modules = Object.entries(files).map(([name, source]) =>
    ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true)
  );
  return create({
    modules,
    plugins: [
      ...litPlugin(),
      carbonElementTagPlugin({ prefix }),
      internalMembersPlugin(),
      componentModulePathsPlugin(),
    ],
  });
}

function declaration(manifest, name) {
  return manifest.modules
    .flatMap((module) => module.declarations ?? [])
    .find((entry) => entry.name === name);
}

test('reads the prefix source instead of hardcoding the package default', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'cem-prefix-'));
  const filename = path.join(directory, 'settings.ts');
  try {
    writeFileSync(
      filename,
      "const prefix = 'alternate-chat'; export default prefix;"
    );
    const prefix = readPrefixSetting(filename);
    const manifest = analyze(
      {
        'src/element.ts':
          'import prefix from "./settings.js"; @carbonElement(`${prefix}-element`) class Example extends HTMLElement {}',
      },
      prefix
    );
    assert.equal(
      declaration(manifest, 'Example').tagName,
      'alternate-chat-element'
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('resolves literal tags, local constants and imported decorator aliases', () => {
  const manifest = analyze({
    'src/element.ts': `
    import { carbonElement as customElement } from './decorators.js';
    import prefix from './settings.js';
    const suffix = 'element';
    const elementName = \`\${prefix}-\${suffix}\`;
    @customElement(elementName)
    class Example extends HTMLElement {
      /** @internal */
      hiddenField = 'hidden';
      visibleField = 'visible';
    }
    @carbonElement('literal-element')
    class Literal extends HTMLElement {}
    export default Example;
  `,
  });
  assert.equal(
    declaration(manifest, 'Example').tagName,
    'fixture-chat-element'
  );
  assert.equal(declaration(manifest, 'Literal').tagName, 'literal-element');
  const fields = declaration(manifest, 'Example').members;
  assert.equal(
    fields.some(
      (field) => field.name === 'hiddenField' && field.privacy !== 'private'
    ),
    false
  );
  assert.notEqual(
    fields.find((field) => field.name === 'visibleField').privacy,
    'private'
  );
  const definitions = manifest.modules
    .flatMap((module) => module.exports ?? [])
    .filter((entry) => entry.kind === 'custom-element-definition');
  assert.deepEqual(definitions.map((entry) => entry.name).sort(), [
    'fixture-chat-element',
    'literal-element',
  ]);
});

test('imported reexports point to their declarations through aliases and barrels', () => {
  const manifest = analyze({
    'src/loader.ts':
      'export function loadDeps() {} export default class Loader {}',
    'src/barrel.ts':
      "import { loadDeps as importedLoad } from './loader.js'; export { importedLoad as load };",
    'src/testing.ts':
      "import Loader, { loadDeps } from './loader.js'; import { load as loadViaBarrel } from './barrel.js'; export { Loader, loadDeps, loadViaBarrel };",
  });
  const module = manifest.modules.find(
    (entry) => entry.path === 'es/testing.js'
  );
  assert.deepEqual(
    module.exports.map((entry) => [entry.name, entry.declaration]),
    [
      ['Loader', { name: 'Loader', module: 'es/loader.js' }],
      ['loadDeps', { name: 'loadDeps', module: 'es/loader.js' }],
      ['loadViaBarrel', { name: 'loadDeps', module: 'es/loader.js' }],
    ]
  );
});

test('imported external reexports retain the package and public subpath', () => {
  const manifest = analyze({
    'src/external.ts':
      "import { Item as LocalItem } from '@other/package/items.js'; export { LocalItem };",
  });
  assert.deepEqual(manifest.modules[0].exports[0].declaration, {
    name: 'Item',
    package: '@other/package',
    module: 'items.js',
  });
});

test('type-only exports are omitted while runtime enums and values remain', () => {
  const manifest = analyze({
    'src/defs.ts': `
      interface Detail { open: boolean; }
      type Handler = () => void;
      export interface ExportedDetail { open: boolean; }
      export type ExportedHandler = () => void;
      export enum Status { Ready = 'ready' }
      enum ListedStatus { Ready = 'ready' }
      export const value = 1;
      export { type Detail, Handler, ListedStatus };
    `,
    'src/consumer.ts': `
      import type { Detail } from './defs.js';
      import { type Handler, ExportedDetail, Status, ListedStatus, value } from './defs.js';
      export { Detail, Handler, ExportedDetail, Status, ListedStatus, value };
      export type { ExportedHandler } from './defs.js';
    `,
  });
  for (const module of manifest.modules) {
    assert.deepEqual(module.exports.map((entry) => entry.name).sort(), [
      'ListedStatus',
      'Status',
      'value',
    ]);
  }
  for (const name of ['Status', 'ListedStatus']) {
    assert.deepEqual(declaration(manifest, name), {
      kind: 'variable',
      name,
      type: { text: `typeof ${name}` },
    });
  }
});

test('imported base classes use package-relative published paths', () => {
  const manifest = analyze({
    'src/providers/base.ts': 'export abstract class BaseProvider {}',
    'src/providers/derived.ts':
      "import { BaseProvider } from './base.js'; export class DerivedProvider extends BaseProvider {}",
  });
  assert.deepEqual(declaration(manifest, 'DerivedProvider').superclass, {
    name: 'BaseProvider',
    module: 'es/providers/base.js',
  });
});

test('dynamic registration helpers do not invent element definitions', () => {
  const manifest = analyze({
    'src/register.ts': `
      export function register(tagName: string, clazz: CustomElementConstructor) {
        customElements.define(tagName, clazz as CustomElementConstructor);
        customElements.define(tagName, clazz);
      }
      class Literal extends HTMLElement {}
      customElements.define('literal-element', Literal);
    `,
  });
  const definitions = manifest.modules[0].exports.filter(
    (entry) => entry.kind === 'custom-element-definition'
  );
  assert.deepEqual(definitions, [
    {
      kind: 'custom-element-definition',
      name: 'literal-element',
      declaration: { name: 'Literal', module: 'es/register.js' },
    },
  ]);
  assert.ok(
    manifest.modules[0].exports.some(
      (entry) => entry.kind === 'js' && entry.name === 'register'
    )
  );
});

test('rewrites local declaration, inheritance, export and type references to published modules', () => {
  const manifest = {
    modules: [
      {
        path: 'src/components/example/index.ts',
        declarations: [
          {
            name: 'Example',
            superclass: { name: 'Base', module: './src/base' },
            members: [
              {
                type: {
                  text: 'Value',
                  references: [
                    { name: 'Value', module: 'src/typings/value.ts' },
                    {
                      name: 'External',
                      module: 'es/example.js',
                      package: 'other-package',
                    },
                  ],
                },
              },
            ],
          },
        ],
        exports: [
          {
            kind: 'js',
            name: 'Example',
            declaration: { name: 'Example', module: './src/example.ts' },
          },
        ],
      },
    ],
  };
  componentModulePathsPlugin().packageLinkPhase({
    customElementsManifest: manifest,
  });
  const module = manifest.modules[0];
  assert.equal(module.path, 'es/components/example/index.js');
  assert.equal(
    module.declarations[0].superclass.module,
    'es/components/example/src/base.js'
  );
  assert.equal(
    module.exports[0].declaration.module,
    'es/components/example/src/example.js'
  );
  assert.deepEqual(module.declarations[0].members[0].type.references, [
    { name: 'Value', module: 'es/typings/value.js' },
    { name: 'External', module: 'es/example.js', package: 'other-package' },
  ]);
});

test('the analyzer includes public source while excluding fixture, story and declaration-only sources', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'cem-sources-'));
  try {
    for (const filename of [
      'src/element.ts',
      'src/__stories__/example.ts',
      'src/__tests__/example.ts',
      'src/globals.d.ts',
      'src/example.test.ts',
      'src/example.stories.ts',
      'src/globals/internal/storybook-cdn.ts',
    ]) {
      const file = path.join(directory, filename);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, 'export {};');
    }
    assert.deepEqual(
      await globby(config.globs, { cwd: directory, ignore: config.exclude }),
      ['src/element.ts']
    );
    assert.equal(config.packagejson, false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('stylesheet reexports use emitted modules and builtin Error stays global', () => {
  const manifest = analyze({
    'src/inline.ts':
      "export { default as inlineStyles } from './inline.scss?lit'; export class InlineError extends Error {}",
  });
  assert.deepEqual(
    manifest.modules[0].exports.find((entry) => entry.name === 'inlineStyles')
      .declaration,
    { name: 'default', module: 'es/inline.scss.js' }
  );
  assert.deepEqual(declaration(manifest, 'InlineError').superclass, {
    name: 'Error',
  });
});
