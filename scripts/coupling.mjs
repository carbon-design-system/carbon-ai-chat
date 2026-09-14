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
 *   --source <s>      what "after" means with --changed: worktree (default),
 *                     index, or head. Anything but worktree is materialised
 *                     into a temp dir first, because dependency-cruiser reads
 *                     the filesystem rather than git.
 *
 * Example:
 *   node scripts/coupling.mjs --changed origin/main --max-fanout 30
 */

import { existsSync } from 'node:fs';
import { cruise } from 'dependency-cruiser';
import {
  ROOTS,
  afterRef,
  changedFiles,
  discard,
  labelsFor,
  materialise,
  parseCli,
} from './measure-lib.mjs';

const USAGE = [
  'usage: node scripts/coupling.mjs <file> [more ...] [--max-fanout <n>] [--max-fanin <n>] [--report <n>]',
  '   or: node scripts/coupling.mjs --changed <base> [--max-fanout <n>] [--max-fanin <n>] [--report <n>]',
].join('\n');

const EXCLUDE =
  /node_modules|dist\/|\/es\/|es-custom\/|storybook-static\/|__tests__|\.test\.|_spec\.|\.spec\.|__stories__|\.stories\.|storybook|\/tests\/|\.scss$/;
const BARREL = /\/(aiChatEntry\.tsx|index\.(ts|tsx|js|jsx))$/;

const inTree = (file) => ROOTS.some((r) => file.startsWith(`${r}/`)) && !EXCLUDE.test(file);

const CIRCULAR = {
  forbidden: [{ name: 'no-circular', severity: 'info', from: {}, to: { circular: true } }],
};

// Ca is a graph property, so the whole tree is cruised and the requested
// files are picked out afterwards. `preCompilation` keeps the imports `tsc`
// erases, so differencing the two cruises gives the type-only edges.
async function cruiseTree({ preCompilation = false, cycles = false } = {}) {
  const roots = ROOTS.filter((d) => existsSync(d));
  const result = await cruise(roots, {
    metrics: true,
    validate: cycles,
    ruleSet: cycles ? CIRCULAR : undefined,
    tsPreCompilationDeps: preCompilation,
    doNotFollow: { path: 'node_modules' },
    exclude: { path: EXCLUDE.source },
  });
  const graph = new Map();
  for (const m of result.output.modules) {
    const local = m.dependencies.filter(
      (d) => !d.couldNotResolve && d.dependencyTypes.includes('local'),
    );
    const partners = local.filter((d) => d.cycle?.length > 0).map((d) => d.resolved);
    graph.set(m.source.replaceAll('\\', '/'), { ca: m.dependents.length, ce: local.length, partners });
  }
  return graph;
}

// A type edge is one the pre-compilation cruise sees and the runtime cruise
// does not, however it was written.
function withTypeEdges(graph, preGraph) {
  for (const [file, mod] of graph) {
    const pre = preGraph.get(file);
    mod.typeIn = pre === undefined ? 0 : Math.max(0, pre.ca - mod.ca);
    mod.typeOut = pre === undefined ? 0 : Math.max(0, pre.ce - mod.ce);
  }
}

// dependency-cruiser cruises whatever directory it is run from, so a ref that
// is not the working tree gets laid down as files and cruised from there.
async function withArchive(ref, fn) {
  const dir = materialise(ref);
  const back = process.cwd();
  try {
    process.chdir(dir);
    return await fn();
  } finally {
    process.chdir(back);
    discard(dir);
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

// Only a cycle the diff created is news; one that was already there is not.
function attachBase(mod, base) {
  mod.base = base;
  const wasCircular = (base?.partners ?? []).length > 0;
  if (!wasCircular && mod.partners.length > 0) mod.joined = mod.partners[0];
}

function notesFor(mod, file) {
  const notes = [];
  if (BARREL.test(file)) notes.push('entry/barrel — structural, not judged');
  if (mod.joined !== undefined) notes.push(`joined a cycle with ${mod.joined}`);
  return notes.length === 0 ? '' : `  (${notes.join('; ')})`;
}

function formatRow({ mod, file, severity: sev }, changed) {
  const cell = (key) => {
    if (!changed) return String(mod[key]).padEnd(4);
    return (mod.base ? `${mod.base[key]}→${mod[key]}` : `new→${mod[key]}`).padEnd(8);
  };
  const inst = mod.ca + mod.ce === 0 ? 'n/a' : (mod.ce / (mod.ca + mod.ce)).toFixed(2);
  return [
    (sev ?? '').padEnd(10),
    `fanin:${cell('ca')} (type ${String(mod.typeIn).padEnd(3)})`,
    `fanout:${cell('ce')} (type ${String(mod.typeOut).padEnd(3)})`,
    `inst:${inst.padEnd(4)}`,
    `${file}${notesFor(mod, file)}`,
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
    const width = changed ? 25 : 21;
    const header = [
      'severity'.padEnd(10),
      'fanin (type)'.padEnd(width),
      'fanout (type)'.padEnd(width + 1),
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
  const changed = cli.changed !== null;
  const files = changed ? changedFiles(cli.base, cli.source).filter(inTree) : cli.files;
  // Both cruises of the after side share one archive when there is one.
  const cruiseBoth = async () => [
    await cruiseTree({ cycles: changed }),
    await cruiseTree({ preCompilation: true }),
  ];
  const onDisk = !changed || cli.source === 'worktree';
  const [graph, preGraph] = onDisk
    ? await cruiseBoth()
    : await withArchive(afterRef(cli.source), cruiseBoth);
  withTypeEdges(graph, preGraph);
  const baseGraph = changed ? await withArchive(cli.base, () => cruiseTree({ cycles: true })) : null;
  const rows = [];
  let hadError = false;
  for (const file of files) {
    const mod = graph.get(file);
    if (!mod) {
      console.error(`ERROR: ${file}: not in the cruised tree`);
      hadError = true;
      continue;
    }
    if (baseGraph) attachBase(mod, baseGraph.get(file) ?? null);
    rows.push({ mod, file, severity: severity(mod, file) });
  }
  report(rows, cli, hadError);
}

await main();
