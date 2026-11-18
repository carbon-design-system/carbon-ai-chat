/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, realpath, writeFile } from 'node:fs/promises';
import { isBuiltin } from 'node:module';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import {
  auditGeneratedEdges,
  filesUnder,
  moduleEdges,
  originalFileFor,
  resolveExternalTarget,
} from './prefix-edges.mjs';

const runFile = promisify(execFile);

const supplementalVersions = {
  flatpickr: '4.6.13',
  '@types/lodash': '4.17.26',
  storybook: '10.6.2',
};
const selectedPackages = [
  '@carbon/ai-chat',
  '@carbon/ai-chat-components',
  '@carbon/web-components',
  '@carbon/styles',
  '@carbon/icons',
  '@carbon/utilities',
  'react',
  'react-dom',
];
const localPackages = selectedPackages.slice(0, 3);
const missingCodes = [
  'MODULE_NOT_FOUND',
  'ERR_MODULE_NOT_FOUND',
  'ERR_PACKAGE_PATH_NOT_EXPORTED',
  'ENOENT',
];

function externalSpecifier(specifier) {
  return (
    !specifier.startsWith('.') &&
    !specifier.startsWith('data:') &&
    !isBuiltin(specifier) &&
    !localPackages.some(
      (name) => specifier === name || specifier.startsWith(`${name}/`)
    )
  );
}

function tuple(layer, importer, specifier, code) {
  return {
    layer: layer.name,
    importer: relative(layer.destination, importer),
    specifier,
    code,
  };
}

function sortedTuples(tuples) {
  return tuples.map((item) => JSON.stringify(item)).sort();
}

async function sourceFileUnresolved(path, layer) {
  const original = await originalFileFor(path, layer);
  const source = await readFile(original, 'utf8');
  const unresolved = [];
  for (const specifier of moduleEdges(original, source).filter(
    externalSpecifier
  )) {
    try {
      await resolveExternalTarget(original, specifier);
    } catch (error) {
      assert.ok(
        missingCodes.includes(error.code),
        `${original}: unexpected source resolver failure ${error.stack}`
      );
      unresolved.push(tuple(layer, path, specifier, error.code));
    }
  }
  return unresolved;
}

async function sourceUnresolved(receipt) {
  const unresolved = [];
  for (const layer of receipt.layers) {
    const files = await filesUnder(layer.destination);
    for (const path of files.filter((file) =>
      /\.(?:[cm]?js|d\.[cm]?ts)$/.test(file)
    )) {
      unresolved.push(...(await sourceFileUnresolved(path, layer)));
    }
  }
  return unresolved;
}

function generatedUnresolved(evidence, receipt) {
  return evidence.errors.map((error) => {
    const edge = error.externalEdge;
    assert.ok(
      edge && missingCodes.includes(edge.code),
      `${error.label}\n${error.stack}`
    );
    const layer = receipt.layers.find(
      (item) => !relative(item.destination, edge.importer).startsWith('..')
    );
    assert.ok(layer, `No actual generated layer owns ${edge.importer}`);
    return tuple(layer, edge.importer, edge.specifier, edge.code);
  });
}

export async function assertMinimalGeneratedEdges(options) {
  const evidence = await auditGeneratedEdges(options);
  const generated = generatedUnresolved(evidence, options.receipt);
  const source = await sourceUnresolved(options.receipt);
  assert.deepEqual(
    sortedTuples(generated),
    sortedTuples(source),
    'Minimal copied artifacts must have exactly the original published unresolved external edges.'
  );
  await writeFile(
    join(
      options.consumer,
      `prefix-${options.receipt.prefix}-minimal-edges.json`
    ),
    JSON.stringify(evidence, null, 2)
  );
  await writeFile(
    join(
      options.consumer,
      `prefix-${options.receipt.prefix}-minimal-source-parity.json`
    ),
    JSON.stringify({ generated, source }, null, 2)
  );
  return evidence;
}

export async function selectedSnapshot(consumer) {
  const lock = JSON.parse(
    await readFile(join(consumer, 'package-lock.json'), 'utf8')
  );
  const selected = {};
  for (const name of selectedPackages) {
    const entry = lock.packages[`node_modules/${name}`];
    if (!entry) {
      assert.equal(
        name,
        '@carbon/ai-chat',
        'Only the direct consumer may omit the app.'
      );
      continue;
    }
    const root = await realpath(join(consumer, 'node_modules', name));
    const metadata = JSON.parse(
      await readFile(join(root, 'package.json'), 'utf8')
    );
    assert.equal(metadata.version, entry.version);
    assert.ok(
      entry.integrity,
      `${name}: selected installed integrity must be known.`
    );
    selected[name] = {
      root,
      version: entry.version,
      resolved: entry.resolved,
      integrity: entry.integrity,
    };
  }
  return selected;
}

export async function assertMinimalInstallation(consumer) {
  for (const name of Object.keys(supplementalVersions)) {
    const metadata = await readFile(
      join(consumer, 'node_modules', name, 'package.json'),
      'utf8'
    ).catch((error) => {
      assert.equal(error.code, 'ENOENT');
      return undefined;
    });
    assert.equal(
      metadata,
      undefined,
      `Minimal consumers must not install supplemental ${name}.`
    );
  }
}

async function supplementalSnapshot(consumer) {
  const lock = JSON.parse(
    await readFile(join(consumer, 'package-lock.json'), 'utf8')
  );
  const packages = {};
  for (const [name, version] of Object.entries(supplementalVersions)) {
    const entry = lock.packages[`node_modules/${name}`];
    assert.equal(entry.version, version);
    assert.ok(
      entry.integrity,
      `${name}: supplemental tarball integrity must be known.`
    );
    const root = await realpath(join(consumer, 'node_modules', name));
    const metadata = JSON.parse(
      await readFile(join(root, 'package.json'), 'utf8')
    );
    assert.equal(metadata.version, version);
    packages[name] = {
      root,
      version,
      integrity: entry.integrity,
      resolved: entry.resolved,
    };
  }
  return packages;
}

async function assertMinimalBundleExclusions(descriptor, packages) {
  const roots = Object.values(packages).map((item) => item.root);
  const modules = (
    await Promise.all(
      descriptor.bundles.map(async (path) =>
        JSON.parse(await readFile(path, 'utf8')).physical.map(
          (item) => item.canonical
        )
      )
    )
  ).flat();
  for (const root of roots) {
    assert.deepEqual(
      modules.filter((id) => id === root || id.startsWith(`${root}/`)),
      [],
      `Earlier minimal production bundles must not load supplemental ${root}.`
    );
  }
  return { roots, moduleEvidence: descriptor.bundles };
}

async function strictSupplementalAudit(descriptor) {
  const input = join(descriptor.consumer, 'prefix-supplemental-receipts.json');
  const log = join(descriptor.consumer, 'prefix-supplemental-strict.log');
  await writeFile(input, JSON.stringify(descriptor, null, 2));
  // A fresh process cannot retain negative package lookups from the minimal phase.
  try {
    const result = await runFile(
      process.execPath,
      [
        fileURLToPath(
          new URL('./prefix-strict-artifacts.mjs', import.meta.url)
        ),
        input,
      ],
      { cwd: descriptor.consumer, maxBuffer: 32 * 1024 * 1024 }
    );
    await writeFile(log, result.stdout + result.stderr);
  } catch (error) {
    await writeFile(log, `${error.stdout ?? ''}${error.stderr ?? ''}`);
    throw error;
  }
  return log;
}

async function supplementalConsumer(descriptor, runNpm) {
  await runNpm(
    [
      'install',
      '--save-dev',
      '--save-exact',
      '--ignore-scripts',
      ...Object.entries(supplementalVersions).map(
        ([name, version]) => `${name}@${version}`
      ),
    ],
    descriptor.consumer
  );
  assert.deepEqual(
    await selectedSnapshot(descriptor.consumer),
    descriptor.selected,
    'Supplemental install must preserve selected package roots, versions and integrities.'
  );
  await runNpm(['ci', '--ignore-scripts'], descriptor.consumer);
  assert.deepEqual(
    await selectedSnapshot(descriptor.consumer),
    descriptor.selected,
    'Supplemental fixture dependencies must preserve all selected package roots, versions and tarball integrities.'
  );
  const packages = await supplementalSnapshot(descriptor.consumer);
  const excluded = await assertMinimalBundleExclusions(descriptor, packages);
  const strictLog = await strictSupplementalAudit(descriptor);
  return {
    consumer: descriptor.consumer,
    selected: descriptor.selected,
    packages,
    strictLog,
    ...excluded,
  };
}

export async function assertSupplementalPrefixArtifacts({
  proof,
  runNpm,
  consumer,
}) {
  const evidence = [];
  for (const descriptor of proof.supplemental) {
    evidence.push(await supplementalConsumer(descriptor, runNpm));
  }
  await writeFile(
    join(consumer, 'prefix-supplemental-artifacts.json'),
    JSON.stringify(evidence, null, 2)
  );
  console.log(
    'Supplemental all-artifact graphs passed after every minimal-consumer browser proof.'
  );
}
