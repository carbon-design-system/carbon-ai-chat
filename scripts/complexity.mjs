/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * complexity.mjs — score cyclomatic and cognitive complexity per function.
 *
 * Gives one number everyone can reproduce, so "simpler" is measured, not
 * argued. Cyclomatic comes from ESLint's `complexity` rule, cognitive from
 * `sonarjs/cognitive-complexity`; both run on an in-memory config, so the
 * project's own ESLint setup is never consulted.
 *
 * Usage:
 *   node scripts/complexity.mjs <file> [more ...] [--max <n>] [--report <n>]
 *   node scripts/complexity.mjs --changed <base> [--max <n>] [--report <n>]
 *
 *   --report <n>  print functions at or above <n> on either metric (default 10)
 *   --max <n>     exit 1 when a function's cognitive score exceeds <n>
 *   --changed     score files changed since <base>; severity attaches only to
 *                 functions that are new or scored worse than at <base>
 *
 * Example:
 *   node scripts/complexity.mjs --changed origin/main --max 25
 */

import { readFileSync } from 'node:fs';
import { changedFiles, contentAt, labelsFor, makeLinter, parseCli } from './_measure-lib.mjs';

const USAGE = [
  'usage: node scripts/complexity.mjs <file> [more ...] [--max <n>] [--report <n>]',
  '   or: node scripts/complexity.mjs --changed <base> [--max <n>] [--report <n>]',
].join('\n');

const lint = makeLinter({
  complexity: ['error', 0],
  'sonarjs/cognitive-complexity': ['error', 0],
});

// The regexes read these message shapes:
//   complexity: "Function 'x' has a complexity of N", "Arrow function has a
//   complexity of N", "Method 'x' …", "Class field initializer has a …"
//   sonarjs/cognitive-complexity: "… Cognitive Complexity from N to the 0 allowed."
function toFunction(m) {
  return {
    name: m.message.match(/'([^']+)'/)?.[1] ?? '<anonymous>',
    line: m.line,
    cyclomatic: Number(m.message.match(/complexity of (\d+)/)[1]),
    cognitive: 0,
    range: [m.line, m.column, m.endLine, m.endColumn],
  };
}

const notAfter = (l1, c1, l2, c2) => l1 < l2 || (l1 === l2 && c1 <= c2);

function contains([l1, c1, l2, c2], line, column) {
  return notAfter(l1, c1, line, column) && notAfter(line, column, l2, c2);
}

// sonarjs anchors its message on the name, the `function` keyword, or the
// `=>`, all inside the range the complexity rule reports for the same
// function. For a method it anchors on the key, whose end is where that range
// starts, so the join tests the token's end position, inclusive. Ranges nest,
// so the innermost owner is the one that starts last.
function owner(functions, m) {
  const start = (fn) => fn.range.slice(0, 2);
  return functions
    .filter((fn) => contains(fn.range, m.endLine, m.endColumn))
    .reduce((best, fn) => (!best || notAfter(...start(best), ...start(fn)) ? fn : best), null);
}

async function score(content, filePath) {
  const messages = await lint(content, filePath);
  const functions = messages
    .filter((m) => m.ruleId === 'complexity' && !m.message.startsWith('Class field initializer'))
    .map(toFunction);
  for (const m of messages.filter((m) => m.ruleId === 'sonarjs/cognitive-complexity')) {
    const fn = owner(functions, m);
    if (fn) fn.cognitive = Number(m.message.match(/from (\d+) to/)[1]);
  }
  return functions.sort((a, b) => a.line - b.line);
}

// Anonymous callbacks share a name, so ordinal matching alone shifts every
// later match when one is inserted above. Pairing identical scores first keeps
// an untouched callback paired with itself; the ordinal pass covers the rest.
function matchBase(afterFns, baseFns) {
  const pools = new Map();
  for (const fn of baseFns) pools.set(fn.name, [...(pools.get(fn.name) ?? []), fn]);
  const pool = (fn) => pools.get(fn.name) ?? [];
  for (const fn of afterFns) {
    const i = pool(fn).findIndex(
      (b) => b.cyclomatic === fn.cyclomatic && b.cognitive === fn.cognitive,
    );
    if (i !== -1) fn.base = pool(fn).splice(i, 1)[0];
  }
  for (const fn of afterFns) {
    if (fn.base === undefined) fn.base = pool(fn).shift() ?? null;
  }
}

function severity(fn, file) {
  const labels = labelsFor(file);
  const worse =
    !fn.base || fn.cyclomatic > fn.base.cyclomatic || fn.cognitive > fn.base.cognitive;
  if (!labels || !worse) return null;
  const top = Math.max(fn.cyclomatic, fn.cognitive);
  if (top > 25) return labels.blocker;
  if (top > 15) return labels.important;
  return null;
}

async function scoreFile(file, base) {
  const afterFns = await score(readFileSync(file, 'utf8'), file);
  if (base !== null) {
    const baseContent = contentAt(base, file);
    const baseFns = baseContent === null ? [] : await score(baseContent, file).catch(() => []);
    matchBase(afterFns, baseFns);
  }
  return afterFns.map((fn) => ({ fn, file, severity: severity(fn, file) }));
}

function formatRow({ fn, file, severity: sev }, changed) {
  const cell = (key) => {
    if (!changed) return String(fn[key]).padEnd(4);
    return (fn.base ? `${fn.base[key]}→${fn[key]}` : `new→${fn[key]}`).padEnd(8);
  };
  return [
    (sev ?? '').padEnd(10),
    `cyc:${cell('cyclomatic')}`,
    `cog:${cell('cognitive')}`,
    fn.name.padEnd(32),
    `${file}:${fn.line}`,
  ].join('  ');
}

function printTable(shown, changed) {
  const width = changed ? 12 : 8;
  const header = [
    'severity'.padEnd(10),
    'cyc'.padEnd(width),
    'cog'.padEnd(width),
    'function'.padEnd(32),
    'location',
  ].join('  ');
  console.log(header);
  console.log('-'.repeat(header.length));
  for (const row of shown) console.log(formatRow(row, changed));
}

function report(rows, { max, report: floor, changed }, hadError) {
  const shown = rows
    .filter(({ fn }) => fn.cyclomatic >= floor || fn.cognitive >= floor)
    .sort((a, b) => a.file.localeCompare(b.file) || a.fn.line - b.fn.line);
  if (shown.length === 0) console.log('Nothing to report.');
  else printTable(shown, changed !== null);
  const violators = max === null ? [] : rows.filter(({ fn }) => fn.cognitive > max);
  if (violators.length > 0) {
    console.error(`\n--max ${max} exceeded by ${violators.length} function(s):`);
    for (const { fn, file } of violators) {
      console.error(`  cog:${fn.cognitive}  ${fn.name}  ${file}:${fn.line}`);
    }
    process.exit(1);
  }
  process.exit(hadError ? 1 : 0);
}

async function main() {
  const cli = parseCli({ ints: ['max', 'report'], defaults: { report: 10 }, usage: USAGE });
  const files = cli.changed === null ? cli.files : changedFiles(cli.changed);
  const rows = [];
  let hadError = false;
  for (const file of files) {
    try {
      rows.push(...(await scoreFile(file, cli.changed)));
    } catch (e) {
      console.error(`ERROR: ${file}: ${e.message}`);
      hadError = true;
    }
  }
  report(rows, cli, hadError);
}

await main();
