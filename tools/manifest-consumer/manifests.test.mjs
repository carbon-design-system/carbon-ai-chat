/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { readPackedManifest } from './manifests.mjs';

const packageName = '@fixture/packed-manifest';
const exampleModule = 'es/example.js';

function moduleWithClass(path, name) {
  return {
    path,
    declarations: [{ kind: 'class', name }],
    exports: [{ kind: 'js', name, declaration: { name, module: path } }],
  };
}

async function withManifest(source, superclass, verify, additions = {}) {
  const consumer = await mkdtemp(join(tmpdir(), 'caic-manifest-fixture-'));
  const root = join(consumer, 'node_modules', packageName);
  const example = moduleWithClass(exampleModule, 'Example');
  example.declarations[0].superclass = superclass;
  Object.assign(example.declarations[0], additions.declaration);
  example.declarations.push(...(additions.declarations ?? []));
  example.exports.push(...(additions.exports ?? []));
  const manifest = {
    schemaVersion: '1.0.0',
    modules: [example, ...(additions.modules ?? [])],
  };
  const packageJson = {
    name: packageName,
    type: 'module',
    customElements: './custom-elements.json',
    exports: { './custom-elements.json': './custom-elements.json' },
  };
  const files = {
    'package.json': JSON.stringify(packageJson),
    'custom-elements.json': JSON.stringify(manifest),
    [exampleModule]: source,
    ...additions.files,
  };
  try {
    for (const [path, text] of Object.entries(files)) {
      const target = join(root, path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, text);
    }
    await verify(() => readPackedManifest(consumer, packageName));
  } finally {
    await rm(consumer, { recursive: true, force: true });
  }
}

test('packed manifest accepts source-proven default-library superclasses', async () => {
  for (const base of ['Error', 'Map']) {
    await withManifest(
      `export class Example extends ${base} {}`,
      { name: base },
      async (read) => {
        const { manifest } = await read();
        assert.deepEqual(manifest.modules[0].declarations[0].superclass, {
          name: base,
        });
      }
    );
  }
});

test('packed manifest still resolves a declared Error through local metadata', async () => {
  const source = 'class Error {} export class Example extends Error {}';
  await withManifest(source, { name: 'Error' }, async (read) => {
    await assert.rejects(read, /Unpublished symbol:/);
  });
  await withManifest(
    source,
    { name: 'Error' },
    async (read) => {
      await read();
    },
    { declarations: [{ kind: 'class', name: 'Error' }] }
  );
});

test('packed manifest does not treat imported Error as a library global', async () => {
  const source =
    "import { Error } from './base.js'; export class Example extends Error {}";
  const additions = {
    modules: [moduleWithClass('es/base.js', 'Error')],
    files: { 'es/base.js': 'export class Error {}' },
  };
  await withManifest(
    source,
    { name: 'Error' },
    async (read) => {
      await assert.rejects(read, /Unpublished symbol:/);
    },
    additions
  );
  await withManifest(
    source,
    { name: 'Error', module: 'es/base.js' },
    async (read) => {
      await read();
    },
    additions
  );
});

test('packed manifest rejects parameter-shadowed Error and unresolved local bases', async () => {
  for (const [source, base] of [
    [
      'function make(Error) { class Example extends Error {} return Example; } export const Example = make(Object);',
      'Error',
    ],
    ['export class Example extends MissingBase {}', 'MissingBase'],
  ]) {
    await withManifest(source, { name: base }, async (read) => {
      await assert.rejects(
        read,
        new RegExp(
          `Unpublished symbol: .*#${base} \\(from es/example\\.js#Example\\)`
        )
      );
    });
  }
});

test('packed manifest keeps explicit module and type references strict', async () => {
  const additions = {
    modules: [moduleWithClass('es/base.js', 'Other')],
    files: { 'es/base.js': 'export class Other {}' },
  };
  await withManifest(
    'export class Example extends Error {}',
    { name: 'Error', module: 'es/base.js' },
    async (read) => {
      await assert.rejects(read, /Unpublished symbol: .*es\/base\.js#Error/);
    },
    additions
  );
  await withManifest(
    'export class Example extends Error {}',
    { name: 'Error', module: 'es/missing.js' },
    async (read) => {
      await assert.rejects(read, /ENOENT.*es\/missing\.js/);
    }
  );
  for (const reference of [
    { name: 'Error' },
    { name: 'Other', module: 'es/base.js' },
  ]) {
    await withManifest(
      'export class Example extends Error {}',
      { name: 'Error' },
      async (read) => {
        await read();
      },
      { ...additions, declaration: { type: { references: [reference] } } }
    );
  }
  for (const [reference, error] of [
    [
      { name: 'Error', module: 'es/base.js' },
      /Unpublished symbol: .*es\/base\.js#Error/,
    ],
    [{ name: 'Error', module: 'es/missing.js' }, /ENOENT.*es\/missing\.js/],
  ]) {
    await withManifest(
      'export class Example extends Error {}',
      { name: 'Error' },
      async (read) => {
        await assert.rejects(read, error);
      },
      { ...additions, declaration: { type: { references: [reference] } } }
    );
  }
});

test('packed manifest requires the exact superclass owner and reference kind', async () => {
  for (const declaration of [
    { mixins: [{ name: 'Error' }] },
    { members: [{ name: 'method', inheritedFrom: { name: 'Error' } }] },
  ]) {
    await withManifest(
      'export class Example extends Error {}',
      { name: 'Error' },
      async (read) => {
        await assert.rejects(read, /Unpublished symbol: .*#Error/);
      },
      { declaration }
    );
  }
  await withManifest(
    'export class Example extends Error {}',
    { name: 'Error' },
    async (read) => {
      await assert.rejects(read, /Unpublished symbol: .*#Error/);
    },
    {
      exports: [
        {
          kind: 'custom-element-definition',
          name: 'fixture-example',
          declaration: { name: 'Error' },
        },
      ],
    }
  );
  await withManifest(
    'export class Example extends MissingBase {} export class Other extends Error {}',
    { name: 'Error' },
    async (read) => {
      await assert.rejects(read, /Unpublished symbol: .*#Error/);
    },
    {
      declarations: [
        { kind: 'class', name: 'Other', superclass: { name: 'Error' } },
      ],
    }
  );
  for (const source of [
    'function make() { class Example extends Error {} return Example; } export const Example = class extends MissingBase {};',
    'export class Example extends Error {} function make() { class Example extends Error {} return Example; }',
  ]) {
    await withManifest(source, { name: 'Error' }, async (read) => {
      await assert.rejects(
        read,
        /Unpublished symbol: .*#Error \(from es\/example\.js#Example\)/
      );
    });
  }
  const otherModule = moduleWithClass('es/other.js', 'Example');
  otherModule.declarations[0].superclass = { name: 'Error' };
  await withManifest(
    'export class Example extends MissingBase {}',
    { name: 'Error' },
    async (read) => {
      await assert.rejects(read, /Unpublished symbol: .*#Error/);
    },
    {
      modules: [otherModule],
      files: { 'es/other.js': 'export class Example extends Error {}' },
    }
  );
});
