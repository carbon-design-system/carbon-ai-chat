/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * measure.mjs — run the three measurement tools over one diff, then the rows
 * only the diff can answer.
 *
 * The tools score what a parser sees inside a function, so a clean run proves
 * function-level shape and nothing else. This adds what only the diff shows:
 * each new file's size beside its neighbours, what the added comments are made
 * of, and the tells that mean "read this line".
 *
 * Usage:
 *   node scripts/measure.mjs --changed <base> [--source <s>] [--report <n>]
 *                            [--max <n>] [--max-fanout <n>] [--max-fanin <n>]
 *
 *   --source <s>  what "after" means: worktree (default), index, or head. The
 *                 three agree once the change is committed; before that only
 *                 worktree sees what you are editing.
 *
 * Example:
 *   node scripts/measure.mjs --changed upstream/main
 */

import { spawnSync } from 'node:child_process';
import { dirname, extname } from 'node:path';
import {
  addedLines,
  changedPaths,
  contentAt,
  contentOf,
  grepFiles,
  newCodeFiles,
  parseCli,
} from './measure-lib.mjs';

const USAGE = [
  'usage: node scripts/measure.mjs --changed <base> [--source <s>] [--report <n>]',
  '                                [--max <n>] [--max-fanout <n>] [--max-fanin <n>]',
].join('\n');

// `--report` is a score floor in complexity and coupling but a findings-count
// floor in smells, where any value above 1 hides whole files. Raising it to cut
// complexity noise is the common move, so smells does not receive it: run
// `npm run smells` directly to raise that floor.
const TOOLS = [
  ['complexity', ['report', 'max']],
  ['coupling', ['report', 'max-fanout', 'max-fanin']],
  ['smells', ['max']],
];

const TELLS = [
  ['TODO/FIXME', /\b(TODO|FIXME)\b/],
  ['console.log', /console\.log\(/],
  [': any', /:\s*any\b/],
];

const EXPORT_ROWS = 10;
const MEASURED = /^(packages|demo)\//;
const COMMENT = /^\s*(\/\/|\/\*|\*)/;
const BANNER = /^\s*\/\/ ?-{5,}/;
const TASK_REF = /#\d{3,5}|PLAN|RESEARCH/;
const EXPORTED = /^\s*export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/;

function linesOn(source, file) {
  const content = contentOf(source, file);
  return content === null ? null : content.split('\n').length - 1;
}

// Sizes come from the base tree, so a file this diff adds never counts itself.
// `recursive` widens the fallback from one directory to a whole top-level area.
function medianSizeAt(base, dir, ext, recursive = false) {
  const result = spawnSync('git', ['grep', '-c', '', base, '--', dir], {
    encoding: 'utf8',
    maxBuffer: Infinity,
  });
  if (result.status !== 0) return null;
  const sizes = result.stdout
    .split('\n')
    .map((line) => line.slice(base.length + 1))
    .map((rest) => [rest.slice(0, rest.lastIndexOf(':')), Number(rest.slice(rest.lastIndexOf(':') + 1))])
    .filter(([f]) => f.endsWith(ext) && (recursive || dirname(f) === dir))
    .map(([, n]) => n)
    .sort((a, b) => a - b);
  if (sizes.length === 0) return null;
  const mid = Math.floor(sizes.length / 2);
  const median = sizes.length % 2 ? sizes[mid] : Math.round((sizes[mid - 1] + sizes[mid]) / 2);
  return { median, n: sizes.length };
}

// A word match, so a name that is also a common word over-counts. Fine for a
// report-only row; measuring.md says so.
function importersOf(source, name, declaredIn) {
  return grepFiles(source, ['-lw'], name).filter((f) => f !== declaredIn);
}

function runTools(base, cli) {
  let worst = 0;
  for (const [name, flags] of TOOLS) {
    const extra = flags.flatMap((f) => (cli[f] === null ? [] : [`--${f}`, String(cli[f])]));
    console.log(`\n== ${name}`);
    const args = [`scripts/${name}.mjs`, '--changed', base, '--source', cli.source, ...extra];
    const { status } = spawnSync('node', args, {
      stdio: 'inherit',
    });
    worst = Math.max(worst, status ?? 1);
  }
  return worst;
}

// Same directory and extension first, then the top-level area, so a new file
// in a directory of its own still has something to be measured against.
function sizeRow(base, source, file) {
  const lines = linesOn(source, file);
  const ext = extname(file);
  const area = file.split('/')[0];
  const here = medianSizeAt(base, dirname(file), ext);
  const precedent = here ?? medianSizeAt(base, area, ext, true);
  if (precedent === null) return `${file}  ${lines} lines, no precedent`;
  const scope = here ? `${dirname(file)}/*${ext}` : `${area}/**/*${ext} (fallback)`;
  const ratio = (lines / precedent.median).toFixed(1);
  return `${file}  ${lines} lines, ${ratio}× the ${scope} median (${precedent.median}, n=${precedent.n})`;
}

function commentRows(rows) {
  const comments = rows.filter((r) => COMMENT.test(r.text));
  const ratio = Math.round((comments.length / rows.length) * 100);
  console.log(`added lines ${rows.length}, comments ${comments.length} (${ratio}%)`);
  console.log(`banners ${rows.filter((r) => BANNER.test(r.text)).length}`);
  console.log(`task references ${comments.filter((r) => TASK_REF.test(r.text)).length}`);
}

function dependencyRow(base, source) {
  const named = (raw) => {
    const pkg = raw === null ? {} : JSON.parse(raw);
    return Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  };
  const manifests = changedPaths(base, source).filter((f) => f.split('/').pop() === 'package.json');
  const fresh = manifests.flatMap((file) => {
    const before = new Set(named(contentAt(base, file)));
    return named(contentOf(source, file)).filter((name) => !before.has(name));
  });
  const unique = [...new Set(fresh)];
  console.log(`new dependencies ${unique.length === 0 ? 'none' : unique.join(', ')}`);
}

// One importer in the same directory is the shape worth a second look: the
// export could have stayed private to the file that uses it.
function thinlyImported(source, name, file) {
  const importers = importersOf(source, name, file);
  if (importers.length === 0) return `${name}: 0 importers  (${file})`;
  if (importers.length === 1 && dirname(importers[0]) === dirname(file)) {
    return `${name}: 1 importer, same directory  (${file})`;
  }
  return null;
}

function exportRows(source, rows) {
  const declared = new Map();
  for (const { file, text } of rows) {
    const name = text.match(EXPORTED)?.[1];
    if (name) declared.set(name, file);
  }
  const thin = [...declared]
    .map(([name, file]) => thinlyImported(source, name, file))
    .filter(Boolean);
  for (const row of thin.slice(0, EXPORT_ROWS)) console.log(row);
  if (thin.length > EXPORT_ROWS) console.log(`… and ${thin.length - EXPORT_ROWS} more`);
}

function tellRows(rows) {
  const scoped = rows.filter((r) => MEASURED.test(r.file));
  for (const [label, pattern] of TELLS) {
    const n = scoped.filter((r) => pattern.test(r.text)).length;
    console.log(`${label} added under packages/ and demo/: ${n}`);
  }
}

function diffBlock(base, source) {
  console.log('\n== diff');
  const added = newCodeFiles(base, source);
  const rows = addedLines(base, source);
  dependencyRow(base, source);
  if (added.length === 0 && rows.length === 0) {
    console.log('Diff: no new code files, no added lines');
    return;
  }
  for (const file of added) console.log(sizeRow(base, source, file));
  commentRows(rows);
  exportRows(source, rows);
  tellRows(rows);
}

function main() {
  const cli = parseCli({ ints: ['max', 'report', 'max-fanout', 'max-fanin'], usage: USAGE });
  if (cli.files.length > 0) {
    console.error('error: measure runs on a diff; pass --changed <base>');
    console.error(USAGE);
    process.exit(2);
  }
  const worst = runTools(cli.base, cli);
  diffBlock(cli.base, cli.source);
  process.exit(worst);
}

main();
