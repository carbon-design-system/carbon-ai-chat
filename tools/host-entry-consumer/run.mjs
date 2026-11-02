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
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { assertPackedResolution } from './resolution.mjs';
import { collectHostRuntime } from './runtime.mjs';

const runFile = promisify(execFile);
const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const consumer = await mkdtemp(join(tmpdir(), 'host-entry-consumer-'));
console.log(`Packed host entry evidence: ${consumer}`);
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const lockfile = JSON.parse(
  await readFile(join(repository, 'package-lock.json'), 'utf8')
);
const dependencies = Object.fromEntries(
  [
    '@carbon/web-components',
    '@carbon/utilities',
    '@carbon/icons',
    '@carbon/styles',
    'react',
    'react-dom',
    '@types/react',
    '@types/react-dom',
  ].map((name) => {
    const version = lockfile.packages[`node_modules/${name}`]?.version;
    assert.ok(version, `The lockfile must resolve ${name}.`);
    return [name, version];
  })
);

async function run(command, args, cwd = consumer) {
  const result = await runFile(command, args, {
    cwd,
    maxBuffer: 32 * 1024 * 1024,
  });
  return result.stdout;
}

for (const name of ['ai-chat-components', 'ai-chat']) {
  const output = await run(
    npm,
    ['pack', '--ignore-scripts', '--json', '--pack-destination', consumer],
    join(repository, 'packages', name)
  );
  const [packed] = JSON.parse(output);
  assert.equal(packed.name, `@carbon/${name}`);
  dependencies[packed.name] = `file:./${packed.filename}`;
}
await writeFile(
  join(consumer, 'package.json'),
  JSON.stringify(
    {
      name: 'host-entry-packed-consumer',
      private: true,
      type: 'module',
      dependencies,
    },
    null,
    2
  )
);
await writeFile(
  join(consumer, 'install.log'),
  await run(npm, ['install', '--ignore-scripts'])
);
await assertPackedResolution(consumer);

for (const specifier of [
  '@carbon/ai-chat',
  '@carbon/ai-chat/es-custom',
  '@carbon/ai-chat/server',
]) {
  const script = `import assert from 'node:assert/strict';
const globals = ['document', 'window', 'HTMLElement', 'customElements'];
for (const name of globals) assert.equal(typeof globalThis[name], 'undefined');
const entry = await import(${JSON.stringify(specifier)});
assert.ok(Object.keys(entry).length > 0);
if (${JSON.stringify(specifier)} === '@carbon/ai-chat/server') await entry.loadAllLazyDeps();
console.log(${JSON.stringify(specifier)} + ': clean-Node import passed');`;
  console.log(
    (
      await run(process.execPath, ['--input-type=module', '--eval', script])
    ).trim()
  );
}

await collectHostRuntime(consumer);
