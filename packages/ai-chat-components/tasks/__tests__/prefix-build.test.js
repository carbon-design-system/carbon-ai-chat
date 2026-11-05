/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { transformModule } from '../../bin/prefix-modules.js';

const helper = new URL('../../bin/prefix-build.js', import.meta.url).href;
const upstreamSource = fileURLToPath(
  new URL('./fixtures/create-prefixed-build.upstream.txt', import.meta.url)
);
const scratch = [];

afterEach(async () => {
  await Promise.all(
    scratch
      .splice(0)
      .map((directory) => fs.rm(directory, { recursive: true, force: true }))
  );
});

async function write(file, content) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(
    file,
    typeof content === 'string' ? content : JSON.stringify(content)
  );
}

async function fixture({ app = false, metadata = true } = {}) {
  const root = await fs.realpath(
    await fs.mkdtemp(path.join(os.tmpdir(), 'carbon-prefix-unit-'))
  );
  scratch.push(root);
  const components = path.join(root, 'node_modules/@carbon/ai-chat-components');
  const carbon = path.join(root, 'node_modules/@carbon/web-components');
  await write(path.join(carbon, 'package.json'), {
    name: '@carbon/web-components',
    type: 'module',
    module: './es/index.js',
    exports: {
      './es': './es/index.js',
      './es/*': './es/*',
      './package.json': './package.json',
    },
  });
  await write(
    path.join(carbon, 'es/index.js'),
    'export const tag = "cds-button";\n'
  );
  await write(
    path.join(carbon, 'es/index.d.ts'),
    'export declare const tag: "cds-button";\n'
  );
  await write(path.join(components, 'package.json'), {
    name: '@carbon/ai-chat-components',
    type: 'module',
    module: './es/index.js',
    exports: {
      './es': './es/index.js',
      './es/*': './es/*',
      './package.json': './package.json',
      ...(metadata && { './custom-elements.json': './custom-elements.json' }),
    },
    ...(metadata && { customElements: './custom-elements.json' }),
  });
  await write(
    path.join(components, 'es/index.js'),
    'export { tag } from "@carbon/web-components/es";\nexport const ownTag = "cds-aichat-card";\n'
  );
  await write(
    path.join(components, 'es/index.d.ts'),
    'export { tag } from "@carbon/web-components/es";\nexport declare const ownTag: "cds-aichat-card";\n'
  );
  if (metadata) {
    await write(path.join(components, 'custom-elements.json'), {
      schemaVersion: '1.0.0',
      modules: [
        {
          path: 'es/index.js',
          declarations: [
            {
              name: 'Card',
              tagName: 'cds-aichat-card',
              cssProperties: [{ name: '--cds-token' }],
            },
          ],
          exports: [
            {
              kind: 'js',
              name: 'tag',
              declaration: {
                name: 'tag',
                package: '@carbon/web-components',
                module: 'es/index.js',
              },
            },
          ],
        },
      ],
    });
  }
  const packageRoot = app
    ? path.join(root, 'node_modules/@carbon/ai-chat')
    : components;
  if (app) {
    await write(path.join(packageRoot, 'package.json'), {
      name: '@carbon/ai-chat',
      type: 'module',
      module: './dist/es/aiChatEntry.js',
      types: './dist/types/aiChatEntry.d.ts',
      exports: {
        '.': {
          types: './dist/types/aiChatEntry.d.ts',
          import: './dist/es/aiChatEntry.js',
        },
        './es': {
          types: './dist/types/aiChatEntry.d.ts',
          import: './dist/es/aiChatEntry.js',
        },
      },
    });
    await write(
      path.join(packageRoot, 'dist/es/aiChatEntry.js'),
      'export { ownTag } from "@carbon/ai-chat-components/es"; export const host = "cds-aichat-container";\n'
    );
    await write(
      path.join(packageRoot, 'dist/types/aiChatEntry.d.ts'),
      'export { ownTag } from "@carbon/ai-chat-components/es"; export declare const host: "cds-aichat-container";\n'
    );
  }
  const runner = path.join(root, 'run.mjs');
  await write(
    runner,
    `import { run } from ${JSON.stringify(helper)};\nrun({ packageRoot: ${JSON.stringify(packageRoot)} }).then(result => { if (result) console.log('RECEIPT:' + JSON.stringify(result)); }).catch(error => { console.error(error.stack); process.exitCode = 1; });\n`
  );
  const upstream = path.join(root, 'upstream.mjs');
  await fs.copyFile(upstreamSource, upstream);
  return {
    root,
    packageRoot,
    components,
    carbon,
    runner,
    upstream,
    output: path.join(root, 'generated'),
  };
}

function invoke(setup, args) {
  return spawnSync(process.execPath, [setup.runner, ...args], {
    cwd: setup.root,
    encoding: 'utf8',
  });
}

function successful(result) {
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout.split('RECEIPT:')[1]);
}

test('keeps the copied upstream fixture pinned to its reviewed source', async () => {
  const source = await fs.readFile(upstreamSource);
  assert.equal(
    createHash('sha256').update(source).digest('hex'),
    'fec33bd6b0bd7a77eb0cdfecb583c0ebbc04c4af9b9a189a2c1a602bd62744ee'
  );
});

test('preserves the upstream transform on a shared ESM fixture', async () => {
  const setup = await fixture();
  const source = path.join(setup.root, 'source');
  const text =
    'export const tag = "cds-button"; export const css = "--cds-token .cds-button"; export const event = "cds-click";\n';
  await write(path.join(source, 'index.js'), text);
  for (const prefix of ['acme', 'acme-v2', 'mycds']) {
    const originalOut = path.join(setup.root, `upstream-${prefix}`);
    const original = spawnSync(
      process.execPath,
      [
        setup.upstream,
        '--prefix',
        prefix,
        '--src',
        source,
        '--out',
        originalOut,
      ],
      { encoding: 'utf8' }
    );
    assert.equal(original.status, 0, original.stderr);
    successful(
      invoke(setup, [
        '--prefix',
        prefix,
        '--src',
        source,
        '--out',
        setup.output,
      ])
    );
    assert.equal(
      await fs.readFile(
        path.join(setup.output, 'ai-chat-components/index.js'),
        'utf8'
      ),
      await fs.readFile(path.join(originalOut, 'index.js'), 'utf8')
    );
  }
});

test('matches upstream invalid-prefix and unknown-option errors', async () => {
  const setup = await fixture();
  for (const args of [
    ['--prefix', 'cds'],
    ['--prefix', 'A'],
    ['--prefix', '1acme'],
    ['--prefix', 'acme--v2'],
    ['--unknown'],
    ['--prefix'],
  ]) {
    const original = spawnSync(process.execPath, [setup.upstream, ...args], {
      encoding: 'utf8',
    });
    const result = invoke(setup, args);
    assert.equal(result.status, original.status);
    assert.equal(result.stderr.split('\n')[0], original.stderr.split('\n')[0]);
    if (args[0] === '--prefix' && args.length === 2) {
      assert.equal(result.stderr, original.stderr);
    }
    assert.doesNotMatch(result.stderr, /\n\s+at /);
  }
});

test('retains help, defaults, missing-source errors, and replace-output behavior', async () => {
  const setup = await fixture();
  for (const flag of ['--help', '-h']) {
    const result = invoke(setup, [flag]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /create-ai-chat-components-prefixed-build/);
    assert.match(result.stdout, /Replaces the selected output directory/);
    assert.match(
      result.stdout,
      /Child packages resolve from this installed package/
    );
  }
  const absent = path.join(setup.root, 'absent');
  const missing = invoke(setup, ['--prefix', 'acme', '--src', absent]);
  assert.equal(missing.status, 1);
  assert.equal(missing.stderr, `Error: source build not found at ${absent}.\n`);
  const result = successful(invoke(setup, ['--prefix', 'acme']));
  assert.equal(result.output, path.join(setup.root, 'acme-ai-chat-components'));
  await write(path.join(result.output, 'obsolete.txt'), 'remove me');
  successful(invoke(setup, ['--prefix', 'acme']));
  await assert.rejects(fs.access(path.join(result.output, 'obsolete.txt')));
});

test('protects multiline/static/export/dynamic paths while rewriting actual content', async () => {
  const content = `import {
  value
} from './chunk.cds-aichat.js';
export * from './cds-export.js';
const load = () => import(/* preserve */ './lazy.cds.js');
const template = () => import(\`./cds-template.js\`);
const tag = 'cds-aichat-card'; const css = '--cds-token .cds-card';
//# sourceMappingURL=chunk.cds-aichat.js.map
`;
  const result = await transformModule(
    content,
    'fixture.js',
    'mycds',
    async (specifier) => specifier
  );
  assert.match(result, /from '\.\/chunk\.cds-aichat\.js'/);
  assert.match(result, /export \* from '\.\/cds-export\.js'/);
  assert.match(result, /import\(\/\* preserve \*\/ '\.\/lazy\.cds\.js'\)/);
  assert.match(result, /import\(`\.\/cds-template\.js`\)/);
  assert.match(result, /'mycds-aichat-card'/);
  assert.match(result, /'--cds-token \.mycds-card'/);
  assert.match(result, /sourceMappingURL=chunk\.cds-aichat\.js\.map/);
});

test('preserves the actual host module export and constructor for hyphenated prefixes in JS and DTS', async () => {
  const source = await fs.readFile(
    new URL(
      '../../../ai-chat/src/web-components/cds-aichat-custom-element/index.ts',
      import.meta.url
    ),
    'utf8'
  );
  const alias = source.match(
    /export\s*\{\s*default\s+as\s+__cds_aichat_container_register\s*\}\s*from\s*(['"])\.\.\/cds-aichat-container\1;/
  )?.[0];
  assert.equal(typeof alias, 'string');
  const child = 'data:text/javascript,export default class Container {}';
  const Constructor = (await import(child)).default;
  for (const file of ['host-registration.js', 'host-registration.d.ts']) {
    for (const prefix of ['cds', 'acme-v2']) {
      const result = await transformModule(
        alias,
        file,
        prefix,
        async () => child
      );
      assert.match(result, /as __cds_aichat_container_register/);
      const exported = await import(
        `data:text/javascript,${encodeURIComponent(result)}`
      );
      assert.deepEqual(Object.keys(exported), [
        '__cds_aichat_container_register',
      ]);
      assert.equal(exported.__cds_aichat_container_register, Constructor);
    }
  }
});

test('keeps third-party imports and generated aliased, shorthand, and namespace reexports linked', async () => {
  const setup = await fixture();
  const child = `export class Button {};
export { Button as __cds_constructor };
export const tag = "cds-button";
`;
  const declarations = `export declare class Button {}
export { Button as __cds_constructor };
export declare const tag: "cds-button";
`;
  await write(path.join(setup.carbon, 'es/interface.js'), child);
  await write(path.join(setup.carbon, 'es/interface.d.ts'), declarations);
  const external = path.join(setup.root, 'node_modules/external-provider');
  await write(path.join(external, 'package.json'), {
    name: 'external-provider',
    type: 'module',
    exports: './index.js',
  });
  await write(
    path.join(external, 'index.js'),
    'export const __cds_external = Symbol.for("provider");'
  );
  const content = `import { __cds_constructor as Constructor } from "@carbon/web-components/es/interface.js";
import { __cds_external as provider } from "external-provider";
export { __cds_constructor as __cds_alias } from "@carbon/web-components/es/interface.js";
export { __cds_constructor } from "@carbon/web-components/es/interface.js";
export * as __cds_namespace from "@carbon/web-components/es/interface.js";
export { Constructor as __cds_local, provider as __cds_external };
`;
  await write(path.join(setup.components, 'es/index.js'), content);
  await write(path.join(setup.components, 'es/index.d.ts'), content);
  successful(invoke(setup, ['--prefix', 'acme-v2', '--out', setup.output]));
  const entry = path.join(setup.output, 'ai-chat-components/index.js');
  const loaded = await import(pathToFileURL(entry));
  assert.deepEqual(Object.keys(loaded), [
    '__cds_alias',
    '__cds_constructor',
    '__cds_external',
    '__cds_local',
    '__cds_namespace',
  ]);
  assert.equal(loaded.__cds_alias, loaded.__cds_constructor);
  assert.equal(loaded.__cds_local, loaded.__cds_constructor);
  assert.equal(
    loaded.__cds_namespace.__cds_constructor,
    loaded.__cds_constructor
  );
  assert.equal(loaded.__cds_namespace.tag, 'acme-v2-button');
  assert.equal(loaded.__cds_external, Symbol.for('provider'));
  assert.equal(
    await fs.readFile(
      path.join(setup.output, 'ai-chat-components/index.d.ts'),
      'utf8'
    ),
    await fs.readFile(entry, 'utf8')
  );
});

test('protects declaration imports, import types, and triple-slash paths', async () => {
  const content = `/// <reference path="./cds-ambient.d.ts" />
/// <reference types="@carbon/web-components/es" />
import type {
  Button
} from '@carbon/web-components/es';
export type { Button } from '@carbon/web-components/es';
export type Child = import('@carbon/web-components/es').Button;
export declare const tag: 'cds-card';
`;
  const result = await transformModule(
    content,
    'fixture.d.ts',
    'acme',
    async (specifier) =>
      specifier.startsWith('@carbon/')
        ? '../web-components/index.d.ts'
        : specifier
  );
  assert.match(result, /reference path="\.\/cds-ambient\.d\.ts"/);
  assert.match(result, /reference types="\.\.\/web-components\/index\.d\.ts"/);
  assert.equal(result.match(/\.\.\/web-components\/index\.d\.ts/g).length, 4);
  assert.match(result, /tag: 'acme-card'/);
});

test('parses alpha.3 mixin setter annotations without changing declaration bytes or import offsets', async () => {
  const content = `declare const Dropdown_base: (new (...args: any[]) => {
    get value(): string;
    set value(v: string): any;
}) & {
    new (...args: any[]): {
        _handles: Set<import("../../globals/internal/cds-handle.js").default>;
        child: import("@carbon/web-components/es").Button;
    };
};
export declare const tag: "cds-dropdown";
`;
  const result = await transformModule(
    content,
    'dropdown.d.ts',
    'acme',
    async (specifier) =>
      specifier === '@carbon/web-components/es'
        ? '../web-components/index.js'
        : specifier
  );
  assert.equal(
    result,
    content
      .replace('"@carbon/web-components/es"', '"../web-components/index.js"')
      .replace('"cds-dropdown"', '"acme-dropdown"')
  );
  assert.match(result, /set value\(v: string\): any;/);
  assert.match(
    result,
    /import\("\.\.\/\.\.\/globals\/internal\/cds-handle\.js"\)/
  );
});

test('preserves Carbon declaration auto-accessors and later import offsets', async () => {
  const content = `export default class CDSDropdown {
    accessor value: string;
    child: import("@carbon/web-components/es").Button;
    tag: "cds-dropdown";
}
`;
  const result = await transformModule(
    content,
    'dropdown.d.ts',
    'acme',
    async (specifier) =>
      specifier === '@carbon/web-components/es'
        ? '../web-components/index.js'
        : specifier
  );
  assert.equal(
    result,
    content
      .replace('"@carbon/web-components/es"', '"../web-components/index.js"')
      .replace('"cds-dropdown"', '"acme-dropdown"')
  );
});

test('reports the source filename while preserving parser diagnostics', async () => {
  await assert.rejects(
    transformModule(
      'export declare const invalid: ;',
      '/installed/carbon/broken.d.ts',
      'acme',
      async (specifier) => specifier
    ),
    (error) => {
      assert.equal(error.reasonCode, 'UnexpectedToken');
      assert.match(error.message, /\/installed\/carbon\/broken\.d\.ts/);
      assert.match(
        error.stack,
        /SyntaxError: \/installed\/carbon\/broken\.d\.ts:/
      );
      return true;
    }
  );
});

test('rejects unrelated declaration errors and other setter return types', async () => {
  const resolve = async (specifier) => specifier;
  await assert.rejects(
    transformModule(
      'declare const Broken: { set value(v: string): string; };',
      'broken.d.ts',
      'acme',
      resolve
    ),
    { reasonCode: 'SetAccesorCannotHaveReturnType' }
  );
  await assert.rejects(
    transformModule(
      'declare const Broken: { set value(v: string): any; }; export declare const invalid: ;',
      'broken.d.ts',
      'acme',
      resolve
    ),
    SyntaxError
  );
  await assert.rejects(
    transformModule(
      'export declare const invalid: ;',
      'broken.d.ts',
      'acme',
      resolve
    ),
    SyntaxError
  );
});

test('components-only invocation redirects Carbon JS and DTS without app installed', async () => {
  const setup = await fixture();
  const receipt = successful(
    invoke(setup, ['--prefix', 'acme', '--out', setup.output])
  );
  assert.deepEqual(
    receipt.layers.map(({ name }) => name),
    ['web-components', 'ai-chat-components']
  );
  for (const layer of receipt.layers) {
    assert.equal(layer.packageRoot, await fs.realpath(layer.packageRoot));
    assert.equal(
      JSON.parse(
        await fs.readFile(path.join(layer.destination, 'package.json'), 'utf8')
      ).type,
      'module'
    );
  }
  const component = path.join(setup.output, 'ai-chat-components');
  assert.match(
    await fs.readFile(path.join(component, 'index.js'), 'utf8'),
    /"\.\.\/web-components\/index\.js"/
  );
  assert.match(
    await fs.readFile(path.join(component, 'index.d.ts'), 'utf8'),
    /"\.\.\/web-components\/index\.js"/
  );
  const loaded = await import(pathToFileURL(path.join(component, 'index.js')));
  assert.equal(loaded.tag, 'acme-button');
  assert.equal(loaded.ownTag, 'acme-aichat-card');
});

test('resolves actual extensionless declaration files and directories through package wildcard exports', async () => {
  const setup = await fixture();
  const metadataFile = path.join(setup.carbon, 'package.json');
  const metadata = JSON.parse(await fs.readFile(metadataFile, 'utf8'));
  metadata.exports['./es/globals/*'] = { default: './es/globals/*' };
  await write(metadataFile, metadata);
  await write(
    path.join(setup.carbon, 'es/globals/internal/icon-loader-utils.d.ts'),
    'export interface CarbonIcon { width: number; }\n'
  );
  await write(
    path.join(setup.carbon, 'es/globals/internal/icon-loader-utils.js'),
    'export {};\n'
  );
  await write(
    path.join(setup.carbon, 'es/globals/internal/types-only/index.d.ts'),
    'export interface Options { label: string; }\n'
  );
  const declaration = `import { CarbonIcon } from '@carbon/web-components/es/globals/internal/icon-loader-utils';
import type { Options } from '@carbon/web-components/es/globals/internal/types-only';
export declare const icon: CarbonIcon;
export declare const options: Options;
`;
  await write(path.join(setup.components, 'es/index.d.ts'), declaration);
  successful(invoke(setup, ['--prefix', 'acme-v2', '--out', setup.output]));
  const result = await fs.readFile(
    path.join(setup.output, 'ai-chat-components/index.d.ts'),
    'utf8'
  );
  assert.match(
    result,
    /from "\.\.\/web-components\/globals\/internal\/icon-loader-utils\.js"/
  );
  assert.match(
    result,
    /from "\.\.\/web-components\/globals\/internal\/types-only\/index\.js"/
  );
  assert.equal(
    await fs.readFile(
      path.join(
        setup.output,
        'web-components/globals/internal/types-only/index.d.ts'
      ),
      'utf8'
    ),
    'export interface Options { label: string; }\n'
  );
  await write(
    path.join(setup.components, 'es/index.d.ts'),
    declaration.replace('/icon-loader-utils', '/missing')
  );
  const missing = invoke(setup, ['--prefix', 'acme-v2', '--out', setup.output]);
  assert.equal(missing.status, 1);
  assert.match(
    missing.stderr,
    /Cannot map @carbon\/web-components\/es\/globals\/internal\/missing/
  );
});

test('app invocation copies all three trees and colocates real declarations', async () => {
  const setup = await fixture({ app: true });
  const receipt = successful(
    invoke(setup, ['--prefix', 'acme-v2', '--out', setup.output])
  );
  assert.deepEqual(
    receipt.layers.map(({ name }) => name),
    ['web-components', 'ai-chat-components', 'ai-chat']
  );
  const app = receipt.layers.find(({ name }) => name === 'ai-chat');
  assert.equal(app.entry, path.join(app.destination, 'aiChatEntry.js'));
  const declaration = await fs.readFile(
    path.join(app.destination, 'aiChatEntry.d.ts'),
    'utf8'
  );
  assert.match(declaration, /"\.\.\/ai-chat-components\/index\.js"/);
  const loaded = await import(pathToFileURL(app.entry));
  assert.equal(loaded.host, 'acme-v2-aichat-container');
  assert.equal(loaded.ownTag, 'acme-v2-aichat-card');
});

test('src overrides only the invoking ESM tree, keeping its installed child chain', async () => {
  const setup = await fixture({ app: true });
  const source = path.join(setup.root, 'override');
  await write(
    path.join(source, 'aiChatEntry.js'),
    'export { tag } from "@carbon/web-components/es"; export const marker = "cds-override";\n'
  );
  const receipt = successful(
    invoke(setup, ['--prefix', 'acme', '--out', setup.output, '--src', source])
  );
  assert.equal(
    receipt.layers.find(({ name }) => name === 'ai-chat').source,
    source
  );
  assert.equal(
    receipt.layers.find(({ name }) => name === 'web-components').source,
    path.join(setup.carbon, 'es')
  );
  const loaded = await import(
    pathToFileURL(path.join(setup.output, 'ai-chat/aiChatEntry.js'))
  );
  assert.equal(loaded.marker, 'acme-override');
  assert.equal(loaded.tag, 'acme-button');
});

test('rejects different app and components Carbon roots before replacing output', async () => {
  const setup = await fixture({ app: true });
  const nested = path.join(
    setup.components,
    'node_modules/@carbon/web-components'
  );
  await fs.cp(setup.carbon, nested, { recursive: true });
  await write(path.join(setup.output, 'keep.txt'), 'existing output');
  const result = invoke(setup, ['--prefix', 'acme', '--out', setup.output]);
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Install compatible dependencies that share one Carbon copy/
  );
  assert.ok(result.stderr.includes(await fs.realpath(setup.carbon)));
  assert.ok(result.stderr.includes(await fs.realpath(nested)));
  assert.equal(
    await fs.readFile(path.join(setup.output, 'keep.txt'), 'utf8'),
    'existing output'
  );
});

test('preserves opaque maps and their filenames byte for byte', async () => {
  const setup = await fixture();
  const source = path.join(setup.components, 'es/chunk.cds-aichat.js');
  const text =
    'export const tag = "cds-card";\n//# sourceMappingURL=chunk.cds-aichat.js.map\n';
  const map = JSON.stringify({
    version: 3,
    file: 'chunk.cds-aichat.js',
    sources: ['../../src/cds-card.ts'],
    sourceRoot: './cds-source',
    sourcesContent: ['@decorator class CDSCard { tag = "cds-card"; }'],
    names: [],
    mappings: 'AAAAcdsA',
  });
  await write(source, text);
  await write(`${source}.map`, map);
  successful(invoke(setup, ['--prefix', 'acme', '--out', setup.output]));
  assert.equal(
    await fs.readFile(
      path.join(setup.output, 'ai-chat-components/chunk.cds-aichat.js.map'),
      'utf8'
    ),
    map
  );
  assert.match(
    await fs.readFile(
      path.join(setup.output, 'ai-chat-components/chunk.cds-aichat.js'),
      'utf8'
    ),
    /sourceMappingURL=chunk\.cds-aichat\.js\.map/
  );
});

test('rewrites CEM tags and actual module edges without renaming paths', async () => {
  const setup = await fixture();
  const receipt = successful(
    invoke(setup, ['--prefix', 'mycds', '--out', setup.output])
  );
  const layer = receipt.layers.find(
    ({ name }) => name === 'ai-chat-components'
  );
  const manifest = JSON.parse(await fs.readFile(layer.manifest, 'utf8'));
  assert.equal(manifest.modules[0].path, 'index.js');
  assert.equal(
    manifest.modules[0].declarations[0].tagName,
    'mycds-aichat-card'
  );
  assert.equal(
    manifest.modules[0].declarations[0].cssProperties[0].name,
    '--cds-token'
  );
  assert.deepEqual(manifest.modules[0].exports[0].declaration, {
    name: 'tag',
    module: '../web-components/index.js',
  });
});

test('handles absent metadata generically but fails advertised missing manifests', async () => {
  const setup = await fixture({ metadata: false });
  const receipt = successful(
    invoke(setup, ['--prefix', 'acme', '--out', setup.output])
  );
  assert.equal(
    receipt.layers.find(({ name }) => name === 'ai-chat-components').manifest,
    undefined
  );
  const metadata = JSON.parse(
    await fs.readFile(path.join(setup.components, 'package.json'), 'utf8')
  );
  metadata.customElements = './missing.json';
  await write(path.join(setup.components, 'package.json'), metadata);
  const result = invoke(setup, ['--prefix', 'acme', '--out', setup.output]);
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /manifest advertised by @carbon\/ai-chat-components is missing/
  );
});

if (process.env.CARBON_PREFIX_PARSE_ROOTS) {
  test('parses every selected published JavaScript and declaration file', async (context) => {
    const roots = JSON.parse(process.env.CARBON_PREFIX_PARSE_ROOTS);
    assert.ok(Array.isArray(roots) && roots.length > 0);
    const errors = [];
    let parsed = 0;
    async function inspect(directory) {
      for (const entry of await fs.readdir(directory, {
        withFileTypes: true,
      })) {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          await inspect(file);
        } else if (/\.(?:[cm]?js|d\.[cm]?ts)$/.test(entry.name)) {
          parsed++;
          try {
            const content = await fs.readFile(file, 'utf8');
            assert.equal(
              await transformModule(
                content,
                file,
                'cds',
                async (specifier) => specifier
              ),
              content
            );
            const prefixed = await transformModule(
              content,
              file,
              'acme-v2',
              async (specifier) => specifier
            );
            assert.equal(
              await transformModule(
                prefixed,
                file,
                'cds',
                async (specifier) => specifier
              ),
              prefixed
            );
          } catch (error) {
            errors.push(error);
          }
        }
      }
    }
    for (const root of roots) {
      assert.equal(typeof root, 'string');
      await inspect(root);
    }
    assert.ok(parsed > 0);
    assert.equal(
      errors.length,
      0,
      `${errors.length} parser failures among ${parsed} selected files:\n${errors.map((error) => error.stack).join('\n')}`
    );
    context.diagnostic(
      `Parsed ${parsed} selected files from ${roots.length} supplied roots.`
    );
  });
}
