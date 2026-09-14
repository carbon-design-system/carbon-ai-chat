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
 * Seventeen rules, run on an in-memory config so the project's own ESLint
 * setup is never consulted. Five carry their own row: a function over 80
 * non-blank lines, a callback nested three functions deep, two functions with
 * the same body, identical if/else branches, and a local assigned but never
 * read. The other twelve are the redundancy bundle, each a one-line removal.
 * A row is a place to read, not a finding; rows carry no severity.
 *
 * Usage:
 *   node scripts/smells.mjs <file> [more ...] [--max <n>] [--report <n>]
 *   node scripts/smells.mjs --changed <base> [--max <n>] [--report <n>]
 *
 *   --report <n>  print files with at least <n> findings (default 1)
 *   --max <n>     exit 1 when a file has more than <n> findings
 *   --changed     scan the files changed since <base>
 *   --source <s>  what "after" means with --changed: worktree (default), index,
 *                 or head. They agree once the change is committed.
 *
 * Example:
 *   node scripts/smells.mjs --changed origin/main --max 5
 */

import {
  changedFiles,
  contentOf,
  makeLinter,
  parseCli,
} from './measure-lib.mjs';
import { duplicates } from './duplication.mjs';

const USAGE = [
  'usage: node scripts/smells.mjs <file> [more ...] [--max <n>] [--report <n>]',
  '   or: node scripts/smells.mjs --changed <base> [--max <n>] [--report <n>]',
].join('\n');

const lint = makeLinter({
  'max-lines-per-function': [
    'error',
    { max: 80, skipBlankLines: true, skipComments: true },
  ],
  'sonarjs/no-nested-functions': ['error', { threshold: 3 }],
  'sonarjs/no-identical-functions': 'error',
  'sonarjs/no-duplicated-branches': 'error',
  'sonarjs/no-dead-store': 'error',
  // The redundancy bundle: every one of these is a one-line removal.
  'no-nested-ternary': 'error',
  'no-param-reassign': 'error',
  'no-unneeded-ternary': 'error',
  'no-else-return': 'error',
  'no-lonely-if': 'error',
  'no-useless-return': 'error',
  'sonarjs/no-collapsible-if': 'error',
  'sonarjs/prefer-immediate-return': 'error',
  'sonarjs/prefer-single-boolean-return': 'error',
  'sonarjs/no-small-switch': 'error',
  'sonarjs/no-redundant-boolean': 'error',
  'sonarjs/no-redundant-jump': 'error',
});

async function scanFile(file, source) {
  const content = contentOf(source, file);
  if (content === null) {
    return null;
  }
  const messages = await lint(content, file);
  return messages
    .filter((m) => m.ruleId != null)
    .map((m) => ({
      rule: m.ruleId.replace('sonarjs/', ''),
      file,
      line: m.line,
    }));
}

const rowText = (f) =>
  `${f.rule.padEnd(28)}  ${f.file}:${f.line}${f.note ? `  ${f.note}` : ''}`;

function report(findings, { max, report: floor }, hadError) {
  const byFile = Map.groupBy(findings, (f) => f.file);
  const shown = [...byFile.values()]
    .filter((rows) => rows.length >= floor)
    .flat();
  if (shown.length === 0) {
    console.log('Nothing to report.');
  } else {
    const header = `${'rule'.padEnd(28)}  location`;
    console.log(header);
    console.log('-'.repeat(60));
    for (const f of shown) {
      console.log(rowText(f));
    }
  }
  const over =
    max === null
      ? []
      : [...byFile.entries()].filter(([, rows]) => rows.length > max);
  if (over.length > 0) {
    console.error(`\n--max ${max} exceeded by ${over.length} file(s):`);
    for (const [file, rows] of over) {
      console.error(`  ${rows.length} finding(s)  ${file}`);
    }
    process.exit(1);
  }
  process.exit(hadError ? 1 : 0);
}

async function main() {
  const cli = parseCli({
    ints: ['max', 'report'],
    defaults: { report: 1 },
    usage: USAGE,
  });
  const files =
    cli.changed === null ? cli.files : changedFiles(cli.base, cli.source);
  const findings = [];
  let hadError = false;
  for (const file of files) {
    try {
      const found = await scanFile(file, cli.source);
      // Absent from the after side: renamed or deleted and not yet committed.
      if (found === null) {
        console.log(`skipped ${file}: not in the ${cli.source}`);
        continue;
      }
      findings.push(...found);
    } catch (e) {
      console.error(`ERROR: ${file}: ${e.message}`);
      hadError = true;
    }
  }
  if (cli.changed !== null) {
    findings.push(...duplicates(cli.base, cli.source));
  }
  findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  report(findings, cli, hadError);
}

await main();
