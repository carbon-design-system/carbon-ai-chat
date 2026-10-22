/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { create, ts } from '@custom-elements-manifest/analyzer';
import { litPlugin } from '@custom-elements-manifest/analyzer/src/features/framework-plugins/lit/lit.js';
import { globby } from 'globby';
import config from '../../custom-elements-manifest.config.js';
import {
  carbonElementTagPlugin,
  componentModulePathsPlugin,
  globalSuperclassReferences,
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

test('registering barrels reference static names without tagging abstract or unnamed classes', () => {
  const manifest = analyze({
    'src/element.ts': `
      import prefix from './settings.js';
      abstract class Base extends HTMLElement { static is = 'abstract-element'; }
      class Unnamed extends HTMLElement {}
      class Example extends Base { static is = \`\${prefix}-element\`; }
      export default Example;
      export { Base, Unnamed };
    `,
    'src/index.ts': `
      import Example, { Base, Unnamed } from './element.js';
      import defineCustomElement from './register.js';
      defineCustomElement(Example);
      defineCustomElement(Base);
      defineCustomElement(Unnamed);
      export { default } from './element.js';
    `,
  });
  assert.equal(declaration(manifest, 'Base').tagName, undefined);
  assert.equal(declaration(manifest, 'Unnamed').tagName, undefined);
  assert.equal(
    declaration(manifest, 'Example').tagName,
    'fixture-chat-element'
  );
  const barrel = manifest.modules.find(
    (module) => module.path === 'es/index.js'
  );
  assert.deepEqual(
    barrel.exports.find((entry) => entry.kind === 'custom-element-definition'),
    {
      kind: 'custom-element-definition',
      name: 'fixture-chat-element',
      declaration: { name: 'Example', module: 'es/element.js' },
    }
  );
  assert.equal(
    barrel.exports.filter((entry) => entry.kind === 'custom-element-definition')
      .length,
    1
  );
});

test('recognizes a pure static-is class and its registering barrel', () => {
  const manifest = analyze({
    'src/element.ts':
      "export default class Example extends HTMLElement { static readonly is = 'static-element'; }",
    'src/index.ts':
      "import Example from './element.js'; defineCustomElement(Example); export { Example };",
  });
  assert.equal(declaration(manifest, 'Example').tagName, 'static-element');
  const owner = manifest.modules.find(
    (module) => module.path === 'es/element.js'
  );
  assert.equal(
    (owner.exports ?? []).filter(
      (entry) => entry.kind === 'custom-element-definition'
    ).length,
    0
  );
  const barrel = manifest.modules.find(
    (module) => module.path === 'es/index.js'
  );
  assert.equal(
    barrel.exports.filter((entry) => entry.kind === 'custom-element-definition')
      .length,
    1
  );
});

test('static-is getters resolve tags and registering barrels reference the pure class', () => {
  const manifest = analyze(
    {
      'src/components/aichat-card/aichat-card.ts': `
      import { prefix } from '../../globals/settings.js';
      const component = 'aichat-card';
      export default class Card extends HTMLElement {
        static get is() { return \`\${prefix}-\${component}\`; }
      }
    `,
      'src/components/aichat-card/index.ts': `
      import CardElement from './aichat-card.js';
      import { defineCustomElement as register } from '../../globals/register.js';
      export { CardElement as Card };
      register(CardElement);
    `,
    },
    'fixture'
  );
  assert.equal(declaration(manifest, 'Card').tagName, 'fixture-aichat-card');
  assert.equal(declaration(manifest, 'Card').customElement, true);
  assert.equal(
    declaration(manifest, 'Card').members.find((member) => member.name === 'is')
      .static,
    true
  );
  const owner = manifest.modules.find(
    (module) => module.path === 'es/components/aichat-card/aichat-card.js'
  );
  assert.deepEqual(
    (owner.exports ?? []).filter(
      (entry) => entry.kind === 'custom-element-definition'
    ),
    []
  );
  const barrel = manifest.modules.find(
    (module) => module.path === 'es/components/aichat-card/index.js'
  );
  assert.deepEqual(
    barrel.exports.filter(
      (entry) => entry.kind === 'custom-element-definition'
    ),
    [
      {
        kind: 'custom-element-definition',
        name: 'fixture-aichat-card',
        declaration: {
          name: 'Card',
          module: 'es/components/aichat-card/aichat-card.js',
        },
      },
    ]
  );
  assert.deepEqual(
    barrel.exports.find((entry) => entry.kind === 'js' && entry.name === 'Card')
      .declaration,
    { name: 'Card', module: 'es/components/aichat-card/aichat-card.js' }
  );
});

for (const [name, getter, expected] of [
  [
    'multiple statements',
    "static get is() { const tag = 'dynamic-element'; return tag; }",
    /Unsupported static is declaration for Example/,
  ],
  [
    'a conditional return',
    "static get is() { if (ready) return 'first-element'; return 'second-element'; }",
    /Unsupported static is declaration for Example/,
  ],
  [
    'no return value',
    'static get is() { return; }',
    /Unsupported static is declaration for Example/,
  ],
  [
    'a dynamic expression',
    'static get is() { return getTagName(); }',
    /Unsupported tag expression: getTagName\(\)/,
  ],
]) {
  test(`rejects a static-is getter with ${name}`, () => {
    assert.throws(
      () =>
        analyze({
          'src/element.ts': `class Example extends HTMLElement { ${getter} }`,
        }),
      expected
    );
  });
}

test('keeping a decorator alongside static is does not duplicate a tag', () => {
  const manifest = analyze({
    'src/element.ts':
      "@carbonElement('same-element') class Example extends HTMLElement { static is = 'same-element'; }",
  });
  const definitions = manifest.modules
    .flatMap((module) => module.exports ?? [])
    .filter((entry) => entry.kind === 'custom-element-definition');
  assert.equal(definitions.length, 1);
  assert.equal(definitions[0].name, 'same-element');
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

test('nested public reexports retain the declaration module origin and omit types', () => {
  const manifest = analyze({
    'src/components/aichat-prompt-line/tiptap/leaf.ts': `
      export function load() {}
      export interface Detail { ready: boolean; }
      export enum Status { Ready = 'ready' }
    `,
    'src/components/aichat-prompt-line/tiptap/index.ts': `
      export { load, Status, type Detail } from './leaf.js';
    `,
    'src/components/aichat-prompt-line/index.ts': `
      export { load, Status, type Detail } from './tiptap/index.js';
    `,
    'src/consumer.ts': `
      import { load as importedLoad, type Detail } from './components/aichat-prompt-line/index.js';
      export { importedLoad as load, Detail };
    `,
  });
  for (const filename of [
    'components/aichat-prompt-line/tiptap/index',
    'components/aichat-prompt-line/index',
    'consumer',
  ]) {
    const module = manifest.modules.find(
      (entry) => entry.path === `es/${filename}.js`
    );
    assert.equal(
      module.exports.some((entry) => entry.name === 'Detail'),
      false
    );
    assert.deepEqual(
      module.exports.find((entry) => entry.name === 'load').declaration,
      {
        name: 'load',
        module: 'es/components/aichat-prompt-line/tiptap/leaf.js',
      }
    );
  }
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

test('omits source-proven stylesheet resource exports and preserves JavaScript exports', () => {
  const manifest = analyze({
    'src/resources.ts': String.raw`
      import importedStyle from './theme.scss';
      export { importedStyle };
      export { default as directStyle } from './inline.scss?lit';
      export { default as escapedStyle } from './escaped.scss\u003flit\u0023inline';
      export { default as packageStyle } from '@fixture/theme/base.sass?lit';
      export { default as stylesheetNamedValue } from './theme.scss.js';
    `,
    'src/theme.scss.ts':
      'const JavaScriptValue = 42; export default JavaScriptValue;',
    'src/barrel.ts': `
      export { directStyle as renamedStyle, importedStyle, packageStyle,
        stylesheetNamedValue } from './resources.js';
      export { default as ordinaryStyles } from './styles.js';
    `,
    'src/styles.ts': 'const Styles = 7; export default Styles;',
  });
  const exportsOf = (module) =>
    manifest.modules.find((entry) => entry.path === module).exports;
  assert.deepEqual(
    exportsOf('es/resources.js').map((entry) => entry.name),
    ['stylesheetNamedValue']
  );
  assert.deepEqual(
    exportsOf('es/barrel.js').map((entry) => entry.name),
    ['stylesheetNamedValue', 'ordinaryStyles']
  );
  assert.deepEqual(
    exportsOf('es/barrel.js').map((entry) => entry.declaration),
    [
      { name: 'JavaScriptValue', module: 'es/theme.scss.js' },
      { name: 'Styles', module: 'es/styles.js' },
    ]
  );
});

test('recognizes genuine library globals while retaining local, imported, shadowed and unknown superclass edges', () => {
  const manifest = analyze({
    'src/bases.ts': `
      export class NativeError extends Error {}
      export class NativeMap extends Map {}
      export class Unknown extends MissingBase {}
      class LocalBase {}
      export class Local extends LocalBase {}
    `,
    'src/imported.ts': `
      import { Error } from 'other-package';
      export class Imported extends Error {}
    `,
  });
  for (const [name, base] of [
    ['NativeError', 'Error'],
    ['NativeMap', 'Map'],
  ]) {
    assert.deepEqual(declaration(manifest, name).superclass, { name: base });
  }
  for (const [name, base] of [
    ['Unknown', 'MissingBase'],
    ['Local', 'LocalBase'],
  ]) {
    assert.deepEqual(declaration(manifest, name).superclass, {
      name: base,
      module: 'es/bases.js',
    });
  }
  assert.deepEqual(declaration(manifest, 'Imported').superclass, {
    name: 'Error',
    package: 'other-package',
  });
  const source = ts.createSourceFile(
    'src/scopes.ts',
    `
    function scoped(Error: new () => object) { class Shadowed extends Error {} }
    function hoisted() { class Hoisted extends Error {} if (true) { var Error = Object; } }
    for (let Error of [Object]) { class LoopShadowed extends Error {} }
    class Container { Error() { class Native extends Error {} } }
    function sibling() { try {} catch (Error) {} class NativeCatchSibling extends Error {} }
    class Ambiguous extends Error {}
    function nested(Error: new () => object) { class Ambiguous extends Error {} }
  `,
    ts.ScriptTarget.Latest,
    true
  );
  assert.deepEqual(
    [...globalSuperclassReferences(ts, source)],
    [
      ['Native', 'Error'],
      ['NativeCatchSibling', 'Error'],
    ]
  );
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

test('rejects a decorator/static-is disagreement', () => {
  assert.throws(
    () =>
      analyze({
        'src/element.ts':
          "@carbonElement('first-element') class Example extends HTMLElement { static is = 'second-element'; }",
      }),
    /Conflicting tag names/
  );
});

test('the analyzer includes canonical public source while excluding compatibility and build-only sources', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'cem-sources-'));
  try {
    for (const filename of [
      'src/components/aichat-example/aichat-example.ts',
      'src/components/example/src/legacy.ts',
      'src/components/aichat-example/__stories__/example.ts',
      'src/components/aichat-example/__tests__/example.ts',
      'src/components/aichat-example/example.d.ts',
      'src/components/aichat-example/aichat-example.scss.ts',
      'src/components/aichat-example/example.test.ts',
      'src/components/aichat-example/example.stories.ts',
      'src/globals/internal/storybook-cdn.ts',
    ]) {
      const file = path.join(directory, filename);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, 'export {};');
    }
    assert.deepEqual(
      await globby(config.globs, { cwd: directory, ignore: config.exclude }),
      ['src/components/aichat-example/aichat-example.ts']
    );
    assert.equal(config.packagejson, false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

function assertResolvableReferences(manifest, sources) {
  const globals = new Set(
    sources.flatMap((source) =>
      [...globalSuperclassReferences(ts, source)].map(
        ([name, base]) =>
          `${source.fileName.replace(/^src\//, 'es/').replace(/\.[jt]sx?$/, '.js')}#${name}#${base}`
      )
    )
  );
  const defined = new Set(
    manifest.modules.flatMap((module) => [
      ...(module.declarations ?? []).map(
        (entry) => `${module.path}#${entry.name}`
      ),
      ...(module.exports ?? []).map((entry) => `${module.path}#${entry.name}`),
    ])
  );
  const referenceKeys = new Set([
    'declaration',
    'superclass',
    'inheritedFrom',
    'mixins',
  ]);
  function check(value, key, owner, declarationName) {
    if (!value || typeof value !== 'object') {
      return;
    }
    if (referenceKeys.has(key) && value.name && !value.package) {
      const reference = `${value.module ?? owner}#${value.name}`;
      const global =
        key === 'superclass' &&
        !value.module &&
        globals.has(`${owner}#${declarationName}#${value.name}`);
      assert.ok(
        global || defined.has(reference),
        `Unresolved local declaration: ${reference}`
      );
    }
    for (const [name, child] of Object.entries(value)) {
      if (Array.isArray(child)) {
        child.forEach((entry) =>
          check(
            entry,
            name,
            owner,
            name === 'declarations' ? entry.name : declarationName
          )
        );
      } else {
        check(child, name, owner, declarationName);
      }
    }
  }
  for (const module of manifest.modules) {
    check(module, undefined, module.path);
  }
}

test('the production source graph has resolvable declarations and one definition per tag', async () => {
  const files = await globby(config.globs, { ignore: config.exclude });
  const modules = files.map((filename) =>
    ts.createSourceFile(
      filename,
      readFileSync(filename, 'utf8'),
      ts.ScriptTarget.Latest,
      true
    )
  );
  const manifest = create({
    modules,
    plugins: [...litPlugin(), ...config.plugins],
  });
  assertResolvableReferences(manifest, modules);
  const tags = manifest.modules.flatMap((module) =>
    (module.declarations ?? []).flatMap((entry) =>
      entry.tagName ? [entry.tagName] : []
    )
  );
  const definitions = manifest.modules.flatMap((module) =>
    (module.exports ?? [])
      .filter((entry) => entry.kind === 'custom-element-definition')
      .map((entry) => entry.name)
  );
  assert.ok(tags.length > 0);
  assert.deepEqual(definitions.sort(), [...new Set(tags)].sort());
});
