/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { checkReferences, readPackedManifest } from './manifests.mjs';
import { checkPackedHosts } from './host-runtime.mjs';

const runFile = promisify(execFile);
const repository = fileURLToPath(new URL('../..', import.meta.url));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const consumer = await mkdtemp(join(tmpdir(), 'manifest-consumer-'));
console.log(`Packed manifest evidence: ${consumer}`);

async function runNpm(args, cwd = consumer) {
  const label = `${basename(cwd)}-${args.join('-')}`.replaceAll(
    /[^a-zA-Z0-9-]/g,
    '-'
  );
  try {
    const result = await runFile(npm, args, {
      cwd,
      maxBuffer: 32 * 1024 * 1024,
      timeout: 10 * 60 * 1000,
    });
    await writeFile(
      join(consumer, `${label}.log`),
      result.stdout + result.stderr
    );
    return result.stdout;
  } catch (error) {
    await writeFile(
      join(consumer, `${label}.log`),
      `${error.stdout ?? ''}${error.stderr ?? ''}`
    );
    throw error;
  }
}

const lockfile = JSON.parse(
  await readFile(join(repository, 'package-lock.json'))
);
const dependencies = Object.fromEntries(
  ['@carbon/web-components', 'react', 'react-dom'].map((name) => {
    const version = lockfile.packages[`node_modules/${name}`]?.version;
    assert.ok(version, `The workspace lockfile must resolve ${name}.`);
    return [name, version];
  })
);
const packageName = '@carbon/ai-chat-components';
const output = await runNpm(
  ['pack', '--ignore-scripts', '--json', '--pack-destination', consumer],
  join(repository, 'packages/ai-chat-components')
);
const [packed] = JSON.parse(output);
assert.equal(packed.name, packageName);
dependencies[packageName] = `file:./${packed.filename}`;
const [chatPacked] = JSON.parse(
  await runNpm(
    ['pack', '--ignore-scripts', '--json', '--pack-destination', consumer],
    join(repository, 'packages/ai-chat')
  )
);
assert.equal(chatPacked.name, '@carbon/ai-chat');
dependencies[chatPacked.name] = `file:./${chatPacked.filename}`;
await writeFile(
  join(consumer, 'package.json'),
  JSON.stringify(
    {
      name: 'manifest-packed-consumer',
      private: true,
      type: 'module',
      dependencies,
    },
    null,
    2
  )
);
await runNpm(['install', '--ignore-scripts']);
const { manifest, root } = await readPackedManifest(consumer, packageName);

const missingPath = structuredClone(manifest);
missingPath.modules[0].path = 'es/missing-manifest-target.js';
await assert.rejects(() => checkReferences(missingPath, root, packageName));
const missingSymbol = structuredClone(manifest);
const exported = missingSymbol.modules.find((module) =>
  module.exports?.some((entry) => entry.kind === 'js')
);
exported.exports.find((entry) => entry.kind === 'js').name =
  'missingManifestExport';
await assert.rejects(
  () => checkReferences(missingSymbol, root, packageName),
  /Unpublished symbol/
);

const elements = manifest.modules.flatMap((module) =>
  (module.declarations ?? [])
    .filter((entry) => entry.tagName)
    .map((declaration) => {
      const exported = module.exports?.find(
        (entry) =>
          entry.kind === 'js' && entry.declaration.name === declaration.name
      );
      assert.ok(exported, `Missing constructor export: ${declaration.name}`);
      return {
        module: module.path,
        tag: declaration.tagName,
        name: exported.name,
      };
    })
);
for (const tag of ['cds-aichat-toolbar', 'cds-aichat-truncated-text']) {
  assert.ok(
    elements.some((entry) => entry.tag === tag),
    `The manifest must list ${tag} for its property checks.`
  );
}
assert.equal(new Set(elements.map((entry) => entry.tag)).size, elements.length);
await writeFile(
  join(consumer, 'index.html'),
  '<!doctype html><title>Packed components manifest</title>'
);
const server = await createServer({
  configFile: false,
  logLevel: 'error',
  root: consumer,
  server: { host: '127.0.0.1', port: 0 },
  optimizeDeps: { noDiscovery: true, include: [] },
});
await server.listen();
let browser;
try {
  browser = await chromium.launch();
  const origin = server.resolvedUrls.local[0];
  for (const tree of ['es', 'es-custom']) {
    const results = [];
    for (const element of elements) {
      const context = await browser.newContext();
      try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(String(error)));
        await page.goto(origin);
        const result = await page.evaluate(
          async ({ element, tree, packageName }) => {
            const path = element.module.replace(/^es\//, `${tree}/`);
            const tag =
              tree === 'es'
                ? element.tag
                : element.tag.replace(/^cds-/, 'cds-custom-');
            if (customElements.get(tag)) {
              throw new Error(`The isolated page already defines ${tag}.`);
            }
            const exports = await import(
              `/node_modules/${packageName}/${path}`
            );
            const constructor = exports[element.name];
            if (customElements.get(tag) !== constructor) {
              throw new Error(`The class import did not register ${tag}.`);
            }
            const instance = document.createElement(tag);
            if (!(instance instanceof constructor)) {
              throw new Error(
                `The registered constructor did not upgrade ${tag}.`
              );
            }
            let selected = [];
            if (element.tag === 'cds-aichat-toolbar') {
              selected = ['actions', 'overflow'];
            }
            if (element.tag === 'cds-aichat-truncated-text') {
              selected = ['collapseLabel', 'value'];
            }
            const properties = selected.map((name) => {
              const options = constructor.elementProperties.get(name);
              let attribute = options.attribute;
              if (attribute !== false && typeof attribute !== 'string') {
                attribute = name.toLowerCase();
              }
              return { name, attribute };
            });
            return { tag, registered: true, upgraded: true, properties };
          },
          { element, tree, packageName }
        );
        const declaration = manifest.modules
          .find((module) => module.path === element.module)
          .declarations.find((entry) => entry.tagName === element.tag);
        for (const property of result.properties) {
          assert.ok(
            declaration.members.some((member) => member.name === property.name)
          );
          const attributes = (declaration.attributes ?? []).filter(
            (attribute) => attribute.fieldName === property.name
          );
          assert.deepEqual(
            attributes.map((attribute) => attribute.name),
            property.attribute === false ? [] : [property.attribute]
          );
        }
        assert.deepEqual(errors, []);
        results.push(result);
      } finally {
        await context.close();
      }
    }
    await writeFile(
      join(consumer, `${tree}-registration.json`),
      JSON.stringify(results, null, 2)
    );
    console.log(
      `${tree}: ${results.length} isolated class imports retain registration and constructor identity.`
    );
  }
} finally {
  await browser?.close();
  await server.close();
}
console.log(
  'Packed discovery, published paths and symbols, and negative path/export mutations passed.'
);

await checkPackedHosts(consumer);
