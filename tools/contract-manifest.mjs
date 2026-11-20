/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @license
 */

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import {
  compareManifests,
  CONTRACT,
  contractInventory,
  emptyManifest,
  filesIn,
  hash,
  MANIFEST,
  parseManifest,
  rowsFromReport,
  rowsFromColocatedReport,
  serialize,
} from './contract-manifest-lib.mjs';

function command(root, name, args) {
  const result = spawnSync(name, args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: Infinity,
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `${name} failed: ${result.error?.message ?? result.stderr}`
    );
  }
  return result.stdout;
}

export function policy(root, base, head, labels) {
  for (const sha of [base, head]) {
    if (!/^[a-f0-9]{40}$/.test(sha ?? '')) {
      throw new Error('Policy requires exact base and head commit SHAs');
    }
    command(root, 'git', ['cat-file', '-e', `${sha}^{commit}`]);
  }
  const snapshot = (sha, baseline) => {
    const path = command(root, 'git', [
      'ls-tree',
      '--name-only',
      sha,
      '--',
      MANIFEST,
    ]).trim();
    if (path === '') {
      if (baseline) {
        return emptyManifest();
      }
      throw new Error('Head commit is missing its contract manifest');
    }
    return command(root, 'git', ['show', `${sha}:${MANIFEST}`]);
  };
  return compareManifests(snapshot(base, true), snapshot(head, false), labels);
}

function executionIdentity() {
  // npm replaces these two values when it starts the fixed test script.
  const ignored = new Set(['npm_lifecycle_event', 'npm_lifecycle_script']);
  return {
    node: process.version,
    executable: realpathSync(process.execPath),
    versions: process.versions,
    platform: process.platform,
    arch: process.arch,
    flags: process.execArgv,
    environment: hash(
      JSON.stringify(
        Object.entries(process.env)
          .filter(([key]) => !ignored.has(key))
          .sort(([a], [b]) => a.localeCompare(b, 'en'))
      )
    ),
  };
}

export function inputFingerprint(root) {
  const roots = [
    'packages/ai-chat/src',
    'packages/ai-chat/tests',
    'packages/ai-chat-components/src',
    'packages/ai-chat-components/es',
    'packages/ai-chat/dist/es',
  ];
  const files = [
    'package.json',
    'package-lock.json',
    'packages/ai-chat/package.json',
    'packages/ai-chat/jest.config.cjs',
    'packages/ai-chat/tsconfig.json',
    'packages/ai-chat/.babelrc',
    'packages/ai-chat-components/package.json',
    'tools/contract-manifest.mjs',
    'tools/contract-manifest-lib.mjs',
  ];
  for (const path of roots) {
    files.push(...filesIn(root, path));
  }
  return hash(
    JSON.stringify(executionIdentity()) +
      '\n' +
      files
        .filter((file) => file !== MANIFEST)
        .sort()
        .map((file) => `${file}\0${hash(readFileSync(join(root, file)))}`)
        .join('\n')
  );
}

function cachedReport(reportPath, fingerprint, runtime, scope) {
  const metadataPath = `${reportPath}.inputs.json`;
  if (!existsSync(reportPath) || !existsSync(metadataPath)) {
    return null;
  }
  try {
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
    const bytes = readFileSync(reportPath);
    if (
      metadata.inputs === fingerprint &&
      metadata.runtime === runtime &&
      metadata.scope === scope &&
      metadata.report === hash(bytes)
    ) {
      return JSON.parse(bytes.toString('utf8'));
    }
  } catch {
    return null;
  }
  return null;
}

function runDiscovery(root, reportPath, specs) {
  if (!specs.length) {
    throw new Error('No contract suites found');
  }
  const run = spawnSync(
    'npm',
    [
      'run',
      'test',
      '--workspace=@carbon/ai-chat',
      '--',
      '--runTestsByPath',
      ...specs.map((file) => join(root, file)),
      '--json',
      '--testLocationInResults',
      '--coverage=false',
      `--outputFile=${reportPath}`,
    ],
    { cwd: root, stdio: 'inherit' }
  );
  if (run.error || run.status !== 0) {
    throw new Error('Contract discovery failed');
  }
}

export function discover(root, reportPath, scope = 'all') {
  if (!['all', 'colocated'].includes(scope)) {
    throw new Error('Unknown contract discovery scope');
  }
  const specs = contractInventory(root).specs.filter(
    (file) => scope === 'all' || !file.startsWith(`${CONTRACT}/`)
  );
  const fingerprint = inputFingerprint(root);
  const runtime = hash(JSON.stringify(executionIdentity()));
  const cached = cachedReport(reportPath, fingerprint, runtime, scope);
  if (cached) {
    return cached;
  }
  runDiscovery(root, reportPath, specs);
  if (inputFingerprint(root) !== fingerprint) {
    throw new Error('Contract inputs changed during discovery');
  }
  const bytes = readFileSync(reportPath);
  writeFileSync(
    `${reportPath}.inputs.json`,
    `${JSON.stringify({ inputs: fingerprint, runtime, scope, report: hash(bytes) })}\n`
  );
  return JSON.parse(bytes.toString('utf8'));
}

function optionsFor(args) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      report: { type: 'string' },
      root: { type: 'string' },
      'carry-colocated-base': { type: 'string' },
    },
  });
  const [mode] = positionals;
  if (
    positionals.length !== 1 ||
    !['write', 'check', 'policy'].includes(mode)
  ) {
    throw new Error(
      'usage: contract-manifest.mjs write|check|policy [--report path] [--carry-colocated-base exact-sha]'
    );
  }
  const carryBase = values['carry-colocated-base'];
  if (
    carryBase !== undefined &&
    (mode === 'policy' || !values.report || !/^[a-f0-9]{40}$/.test(carryBase))
  ) {
    throw new Error(
      'Colocated carry requires write|check, --report and an exact base SHA'
    );
  }
  return {
    mode,
    root: resolve(values.root ?? process.cwd()),
    reportPath: values.report,
    carryBase,
  };
}

function environmentPolicy(root) {
  const labels = JSON.parse(process.env.CONTRACT_LABELS ?? '[]');
  if (
    !Array.isArray(labels) ||
    labels.some((label) => typeof label !== 'string')
  ) {
    throw new Error('CONTRACT_LABELS must be a JSON string array');
  }
  console.log(
    policy(
      root,
      process.env.CONTRACT_BASE_SHA,
      process.env.CONTRACT_HEAD_SHA,
      labels
    )
  );
}

function saveManifest(root, mode, generated) {
  const target = join(root, MANIFEST);
  if (mode === 'write') {
    writeFileSync(target, generated);
  } else if (
    !existsSync(target) ||
    readFileSync(target, 'utf8') !== generated
  ) {
    throw new Error(
      'Contract manifest is stale; run npm run contract:manifest'
    );
  }
}

function updateManifest(root, mode, report) {
  saveManifest(root, mode, serialize(rowsFromReport(root, report)));
  console.log(
    `Contract manifest ${mode === 'write' ? 'written' : 'current'}: ${report.numTotalTests} runtime cases`
  );
}

export function carryColocatedManifest(root, base, report) {
  if (!/^[a-f0-9]{40}$/.test(base ?? '')) {
    throw new Error('Colocated carry requires an exact base commit SHA');
  }
  command(root, 'git', ['cat-file', '-e', `${base}^{commit}`]);
  const frozen = command(root, 'git', ['show', `${base}:${MANIFEST}`]);
  const files = [
    ...new Set(
      [...parseManifest(frozen).keys()].map((key) => key.split('\t')[1])
    ),
  ];
  const sourcePins = {};
  for (const file of files) {
    if (!file.startsWith(`${CONTRACT}/`)) {
      throw new Error('Colocated carry requires a legacy-only base manifest');
    }
    const blob = spawnSync('git', ['cat-file', 'blob', `${base}:${file}`], {
      cwd: root,
      maxBuffer: Infinity,
    });
    if (blob.error || blob.status !== 0) {
      throw new Error(`Cannot read frozen legacy source: ${file}`);
    }
    const current = readFileSync(join(root, file));
    if (!current.equals(blob.stdout)) {
      throw new Error(
        `Legacy source bytes differ from the frozen base: ${file}`
      );
    }
    sourcePins[file] = hash(current);
  }
  const result = rowsFromColocatedReport(root, report, frozen);
  return {
    ...result,
    generated: serialize(result.rows),
    baseManifest: hash(Buffer.from(frozen)),
    sourcePins,
  };
}

function updateColocatedManifest(root, mode, report, base, reportPath, inputs) {
  const bytes = readFileSync(reportPath);
  const reportHash = hash(bytes);
  const metadata = JSON.parse(
    readFileSync(`${reportPath}.inputs.json`, 'utf8')
  );
  if (
    metadata.scope !== 'colocated' ||
    metadata.inputs !== inputs ||
    metadata.runtime !== hash(JSON.stringify(executionIdentity())) ||
    metadata.report !== reportHash ||
    JSON.stringify(JSON.parse(bytes.toString('utf8'))) !==
      JSON.stringify(report)
  ) {
    throw new Error('Colocated report provenance changed during validation');
  }
  const result = carryColocatedManifest(root, base, report);
  if (
    inputFingerprint(root) !== inputs ||
    hash(readFileSync(reportPath)) !== reportHash
  ) {
    throw new Error(
      'Contract inputs or report changed during colocated carry validation'
    );
  }
  writeFileSync(
    `${reportPath}.carry.json`,
    `${JSON.stringify({
      kind: 'legacy-source-carry-with-colocated-execution',
      base,
      baseManifest: result.baseManifest,
      sourcePins: result.sourcePins,
      inputs,
      report: reportHash,
      generatedManifest: hash(Buffer.from(result.generated)),
      carriedLegacyRows: result.carriedRows,
      carriedLegacyCases: result.carriedCases,
      executedColocatedCases: result.executedCases,
      executedColocatedSuites: result.executedSuites,
    })}\n`
  );
  saveManifest(root, mode, result.generated);
  console.log(
    `Contract manifest ${mode === 'write' ? 'written' : 'current'}: ${result.carriedCases} carried legacy cases; ${result.executedCases} executed colocated cases`
  );
}

export function main(args = process.argv.slice(2)) {
  const { mode, root, reportPath, carryBase } = optionsFor(args);
  if (mode === 'policy') {
    environmentPolicy(root);
    return;
  }
  if (carryBase !== undefined) {
    command(root, 'git', ['cat-file', '-e', `${carryBase}^{commit}`]);
    const target = resolve(reportPath);
    const inputs = inputFingerprint(root);
    const report = discover(root, target, 'colocated');
    updateColocatedManifest(root, mode, report, carryBase, target, inputs);
    return;
  }
  const temporary = reportPath
    ? null
    : mkdtempSync(join(tmpdir(), 'contract-discovery-'));
  try {
    updateManifest(
      root,
      mode,
      discover(root, resolve(reportPath ?? join(temporary, 'report.json')))
    );
  } finally {
    if (temporary) {
      rmSync(temporary, { recursive: true, force: true });
    }
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
