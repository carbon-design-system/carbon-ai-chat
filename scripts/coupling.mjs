/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * coupling.mjs — score module fan-in (Ca), fan-out (Ce), and instability per file.
 *
 * Ca counts the repo modules that import a file; Ce counts the repo modules it
 * imports (npm packages are not counted). Instability is Ce / (Ca + Ce): 0 is
 * a hub everything depends on, 1 is a leaf that depends on everything.
 *
 * Usage:
 *   node scripts/coupling.mjs <file> [more ...] [--max-fanout <n>] [--max-fanin <n>] [--report <n>]
 *   node scripts/coupling.mjs --changed <base> [--max-fanout <n>] [--max-fanin <n>] [--report <n>]
 *
 *   --report <n>      print files at or above <n> on either metric (default 15)
 *   --max-fanout <n>  exit 1 when a file's Ce exceeds <n>
 *   --max-fanin <n>   exit 1 when a file's Ca exceeds <n>
 *   --changed         score files changed since <base>; severity attaches only to
 *                     files that are new or whose Ca or Ce rose since <base>
 *
 * Example:
 *   node scripts/coupling.mjs --changed origin/main --max-fanout 30
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cruise } from 'dependency-cruiser';
import { changedFiles, labelsFor, parseCli } from './_measure-lib.mjs';

const USAGE = [
  'usage: node scripts/coupling.mjs <file> [more ...] [--max-fanout <n>] [--max-fanin <n>] [--report <n>]',
  '   or: node scripts/coupling.mjs --changed <base> [--max-fanout <n>] [--max-fanin <n>] [--report <n>]',
].join('\n');

const ROOTS = ['packages', 'demo', 'examples', 'scripts'];
const EXCLUDE =
  /node_modules|dist\/|\/es\/|es-custom\/|storybook-static\/|__tests__|\.test\.|_spec\.|\.spec\.|__stories__|\.stories\.|storybook|\/tests\/|\.scss$/;
const BARREL = /\/(aiChatEntry\.tsx|index\.(ts|tsx|js|jsx))$/;

const inTree = (file) => ROOTS.some((r) => file.startsWith(`${r}/`)) && !EXCLUDE.test(file);

// Ca is a graph property, so the whole tree is cruised and the requested
// files are picked out afterwards.
async function cruiseTree() {
  const roots = ROOTS.filter((d) => existsSync(d));
  const result = await cruise(roots, {
    metrics: true,
    validate: false,
    doNotFollow: { path: 'node_modules' },
    exclude: { path: EXCLUDE.source },
  });
  const graph = new Map();
  for (const m of result.output.modules) {
    const ce = m.dependencies.filter(
      (d) => !d.couldNotResolve && d.dependencyTypes.includes('local'),
    ).length;
    graph.set(m.source.replaceAll('\\', '/'), { ca: m.dependents.length, ce });
  }
  return graph;
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    console.error(result.stderr.trim());
    process.exit(1);
  }
  return result.stdout;
}

async function cruiseBase(base) {
  const roots = run('git', ['ls-tree', '--name-only', base]).split('\n').filter((d) => ROOTS.includes(d));
  const tmp = mkdtempSync(join(tmpdir(), 'coupling-'));
  const back = process.cwd();
  try {
    run('git', ['archive', '-o', join(tmp, 'base.tar'), base, ...roots]);
    run('tar', ['-xf', join(tmp, 'base.tar'), '-C', tmp]);
    process.chdir(tmp);
    return await cruiseTree();
  } finally {
    process.chdir(back);
    rmSync(tmp, { recursive: true, force: true });
  }
}

// An entry point imports everything and a re-export index is imported by
// everything, so both metrics are structural there and carry no label.
function severity(mod, file) {
  const labels = labelsFor(file);
  const worse = !mod.base || mod.ca > mod.base.ca || mod.ce > mod.base.ce;
  if (!labels || !worse || BARREL.test(file)) return null;
  if (mod.ce > 30 || mod.ca > 40) return labels.blocker;
  if (mod.ce > 15 || mod.ca > 20) return labels.important;
  return null;
}

function formatRow({ mod, file, severity: sev }, changed) {
  const cell = (key) => {
    if (!changed) return String(mod[key]).padEnd(4);
    return (mod.base ? `${mod.base[key]}→${mod[key]}` : `new→${mod[key]}`).padEnd(8);
  };
  const inst = mod.ca + mod.ce === 0 ? 'n/a' : (mod.ce / (mod.ca + mod.ce)).toFixed(2);
  const note = BARREL.test(file) ? '  (entry/barrel — structural, not judged)' : '';
  return [
    (sev ?? '').padEnd(10),
    `fanin:${cell('ca')}`,
    `fanout:${cell('ce')}`,
    `inst:${inst.padEnd(4)}`,
    `${file}${note}`,
  ].join('  ');
}

function violators(rows, flag, key, max) {
  const over = max === null ? [] : rows.filter(({ mod }) => mod[key] > max);
  if (over.length === 0) return false;
  console.error(`\n${flag} ${max} exceeded by ${over.length} file(s):`);
  const label = key === 'ce' ? 'fanout' : 'fanin';
  for (const { mod, file } of over) console.error(`  ${label}:${mod[key]}  ${file}`);
  return true;
}

function report(rows, cli, hadError) {
  const { 'max-fanout': maxFanout, 'max-fanin': maxFanin, report: floor, changed } = cli;
  const shown = rows
    .filter(({ mod }) => mod.ca >= floor || mod.ce >= floor)
    .sort((a, b) => b.mod.ce - a.mod.ce || a.file.localeCompare(b.file));
  if (shown.length === 0) {
    console.log('Nothing to report.');
  } else {
    const width = changed ? 15 : 11;
    const header = [
      'severity'.padEnd(10),
      'fanin'.padEnd(width - 1),
      'fanout'.padEnd(width),
      'inst'.padEnd(9),
      'file',
    ].join('  ');
    console.log(header);
    console.log('-'.repeat(header.length));
    for (const row of shown) console.log(formatRow(row, changed !== null));
  }
  const failed = violators(rows, '--max-fanout', 'ce', maxFanout);
  const failedIn = violators(rows, '--max-fanin', 'ca', maxFanin);
  process.exit(failed || failedIn || hadError ? 1 : 0);
}

async function main() {
  const cli = parseCli({
    ints: ['max-fanout', 'max-fanin', 'report'],
    defaults: { report: 15 },
    usage: USAGE,
  });
  const files = cli.changed === null ? cli.files : changedFiles(cli.changed).filter(inTree);
  const graph = await cruiseTree();
  const baseGraph = cli.changed === null ? null : await cruiseBase(cli.changed);
  const rows = [];
  let hadError = false;
  for (const file of files) {
    const mod = graph.get(file);
    if (!mod) {
      console.error(`ERROR: ${file}: not in the cruised tree`);
      hadError = true;
      continue;
    }
    if (baseGraph) mod.base = baseGraph.get(file) ?? null;
    rows.push({ mod, file, severity: severity(mod, file) });
  }
  report(rows, cli, hadError);
}

await main();
