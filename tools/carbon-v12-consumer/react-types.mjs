/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import {
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import ts from 'typescript';
import { readSource } from '../../packages/ai-chat-components/tasks/manifest-source.js';
import { readWrappers } from '../../packages/ai-chat-components/tasks/manifest-wrappers.js';
import { reactContractSource } from './react-contracts.mjs';

const run = promisify(execFile);
const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const directory = await mkdtemp(join(tmpdir(), 'caic-react-types-'));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
console.log(`Packed React type evidence: ${directory}`);
const lock = JSON.parse(await readFile(join(repository, 'package-lock.json')));
const locked = (name) => lock.packages[`node_modules/${name}`].version;
const model = readSource({
  root: join(repository, 'packages/ai-chat-components'),
});
const wrappers = readWrappers(model, { requireEventTypes: true });

async function npmCommand(args, cwd, log) {
  try {
    const { stdout, stderr } = await run(npm, args, {
      cwd,
      maxBuffer: 32 * 1024 * 1024,
      timeout: 10 * 60 * 1000,
    });
    await writeFile(log, stdout + stderr);
    return stdout;
  } catch (error) {
    await writeFile(log, `${error.stdout ?? ''}${error.stderr ?? ''}`);
    throw error;
  }
}

const [packed] = JSON.parse(
  await npmCommand(
    ['pack', '--ignore-scripts', '--json', '--pack-destination', directory],
    join(repository, 'packages/ai-chat-components'),
    join(directory, 'pack.log')
  )
);
assert.equal(packed.name, '@carbon/ai-chat-components');
assert.ok(
  packed.files.some(
    ({ path }) => path === 'es/react/autocomplete-controller.d.ts'
  )
);

const reactReleases = { 17: '17.0.2', 18: '18.3.1', 19: locked('react') };
const domReleases = { 17: '17.0.2', 18: '18.3.1', 19: locked('react-dom') };

for (const major of [17, 18, 19]) {
  const consumer = join(directory, `react-${major}`);
  await mkdir(consumer);
  await writeFile(
    join(consumer, 'package.json'),
    JSON.stringify({
      private: true,
      type: 'module',
      dependencies: {
        '@carbon/ai-chat-components': `file:${join(directory, packed.filename)}`,
        '@carbon/icons-react': locked('@carbon/icons-react'),
        react: reactReleases[major],
        'react-dom': domReleases[major],
        '@types/react': `^${major}.0.0`,
        '@types/react-dom': `^${major}.0.0`,
      },
    })
  );
  await npmCommand(
    ['install', '--ignore-scripts', '--no-audit', '--no-fund'],
    consumer,
    join(consumer, 'install.log')
  );
  const installed = join(consumer, 'node_modules');
  const fixture = join(consumer, 'contracts.ts');
  await writeFile(
    fixture,
    reactContractSource(wrappers, '@carbon/ai-chat-components/es', model)
  );
  const versions = {};
  for (const name of [
    'react',
    'react-dom',
    '@types/react',
    '@types/react-dom',
  ]) {
    versions[name] = JSON.parse(
      await readFile(join(installed, name, 'package.json'))
    ).version;
    assert.equal(
      Number(versions[name].split('.')[0]),
      major,
      `${name}: wrong major`
    );
  }
  for (const [mode, module, moduleResolution] of [
    ['node16', ts.ModuleKind.Node16, ts.ModuleResolutionKind.Node16],
    ['bundler', ts.ModuleKind.ESNext, ts.ModuleResolutionKind.Bundler],
  ]) {
    const program = ts.createProgram([fixture], {
      target: ts.ScriptTarget.ES2021,
      module,
      moduleResolution,
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      esModuleInterop: true,
      types: [],
      typeRoots: [join(installed, '@types')],
    });
    for (const source of program.getSourceFiles()) {
      if (
        source.fileName.includes('@carbon/ai-chat-components/') ||
        source.fileName.includes('@types/react/')
      ) {
        assert.ok(
          !relative(
            await realpath(installed),
            await realpath(source.fileName)
          ).startsWith('..'),
          'Type input escaped packed consumer'
        );
      }
    }
    const diagnostics = ts.getPreEmitDiagnostics(program);
    const output = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => consumer,
      getCanonicalFileName: (path) => path,
      getNewLine: () => '\n',
    });
    await writeFile(join(consumer, `${mode}.log`), output);
    assert.equal(diagnostics.length, 0, `React ${major}/${mode}:\n${output}`);
    console.log(
      `React ${major}/${mode}: ${wrappers.length} final exports retain callback, prop, and ref types.`
    );
  }
  await writeFile(
    join(consumer, 'receipt.json'),
    JSON.stringify({ versions, exports: wrappers.length }, null, 2)
  );
}
