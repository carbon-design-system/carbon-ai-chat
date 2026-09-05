/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * smells.mjs — list the code smells a function score cannot see.
 *
 * Five rules, run on an in-memory config so the project's own ESLint setup is
 * never consulted: a function over 80 non-blank lines, a callback nested three
 * functions deep, two functions with the same body, identical if/else
 * branches, and a local assigned but never read. A row is a place to read,
 * not a finding; rows carry no severity.
 *
 * Usage:
 *   node scripts/smells.mjs <file> [more ...] [--max <n>] [--report <n>]
 *   node scripts/smells.mjs --changed <base> [--max <n>] [--report <n>]
 *
 *   --report <n>  print files with at least <n> findings (default 1)
 *   --max <n>     exit 1 when a file has more than <n> findings
 *   --changed     scan the files changed since <base>
 *
 * Example:
 *   node scripts/smells.mjs --changed origin/main --max 5
 */

import { readFileSync } from 'node:fs';
import { changedFiles, makeLinter, parseCli } from './_measure-lib.mjs';

const USAGE = [
  'usage: node scripts/smells.mjs <file> [more ...] [--max <n>] [--report <n>]',
  '   or: node scripts/smells.mjs --changed <base> [--max <n>] [--report <n>]',
].join('\n');

const lint = makeLinter({
  'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
  'sonarjs/no-nested-functions': ['error', { threshold: 3 }],
  'sonarjs/no-identical-functions': 'error',
  'sonarjs/no-duplicated-branches': 'error',
  'sonarjs/no-dead-store': 'error',
});

async function scanFile(file) {
  const messages = await lint(readFileSync(file, 'utf8'), file);
  return messages
    .filter((m) => m.ruleId != null)
    .map((m) => ({ rule: m.ruleId.replace('sonarjs/', ''), file, line: m.line }));
}

function report(findings, { max, report: floor }, hadError) {
  const byFile = Map.groupBy(findings, (f) => f.file);
  const shown = [...byFile.values()].filter((rows) => rows.length >= floor).flat();
  if (shown.length === 0) {
    console.log('Nothing to report.');
  } else {
    const header = `${'rule'.padEnd(28)}  location`;
    console.log(header);
    console.log('-'.repeat(60));
    for (const f of shown) console.log(`${f.rule.padEnd(28)}  ${f.file}:${f.line}`);
  }
  const over = max === null ? [] : [...byFile.entries()].filter(([, rows]) => rows.length > max);
  if (over.length > 0) {
    console.error(`\n--max ${max} exceeded by ${over.length} file(s):`);
    for (const [file, rows] of over) console.error(`  ${rows.length} finding(s)  ${file}`);
    process.exit(1);
  }
  process.exit(hadError ? 1 : 0);
}

async function main() {
  const cli = parseCli({ ints: ['max', 'report'], defaults: { report: 1 }, usage: USAGE });
  const files = cli.changed === null ? cli.files : changedFiles(cli.changed);
  const findings = [];
  let hadError = false;
  for (const file of files) {
    try {
      findings.push(...(await scanFile(file)));
    } catch (e) {
      console.error(`ERROR: ${file}: ${e.message}`);
      hadError = true;
    }
  }
  findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  report(findings, cli, hadError);
}

await main();
