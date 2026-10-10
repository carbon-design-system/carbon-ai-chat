/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

// Turn the coverage the Playwright fixture recorded into one report per
// example, a summary page, and a merged lcov file. Fails when an example's
// suite runs less than MIN_LINES of its gated sources.
// Usage: node scripts/report-example-coverage.mjs [coverage-dir]
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import MCR from 'monocart-coverage-reports';

import {
  coverageOptions,
  DEFERRED_EXAMPLES,
  MIN_LINES,
  OFF_CONCERN_BACKENDS,
} from '../examples/shared/playwright/coverage-options.mjs';

const root = path.resolve(process.argv[2] ?? 'coverage/examples-e2e');
const dirs = existsSync(root)
  ? readdirSync(root).filter((name) =>
      existsSync(path.join(root, name, '.cache'))
    )
  : [];
if (!dirs.length) {
  throw new Error(`No recorded coverage in ${root}.`);
}

const percent = (covered, total) =>
  total ? Math.round((1000 * covered) / total) / 10 : 100;

const rows = [];
const lcov = [];
for (const dir of dirs.sort()) {
  const example = dir.replace('__', '/');
  const slug = example.split('/')[1];
  // Each example merges alone; its bundle holds every package, so merging all
  // examples at once would hold all of them in memory together.
  const { summary, files } = await MCR(
    coverageOptions(path.join(root, dir), example)
  ).generate();

  const offConcern = OFF_CONCERN_BACKENDS.includes(slug);
  const gated = files.filter(
    (file) =>
      !(offConcern && file.sourcePath.endsWith('/src/customSendMessage.ts'))
  );
  const gatedLines = percent(
    gated.reduce((sum, file) => sum + file.summary.lines.covered, 0),
    gated.reduce((sum, file) => sum + file.summary.lines.total, 0)
  );
  const deferred = DEFERRED_EXAMPLES.includes(slug);
  rows.push({
    dir,
    example,
    lines: summary.lines.pct,
    branches: summary.branches.pct,
    functions: summary.functions.pct,
    gatedLines,
    status: deferred ? 'deferred' : gatedLines >= MIN_LINES ? 'pass' : 'below',
  });
  lcov.push(readFileSync(path.join(root, dir, 'lcov.info'), 'utf8'));
}

writeFileSync(path.join(root, 'lcov.info'), lcov.join(''));

const cell = (value) => `<td>${value}</td>`;
writeFileSync(
  path.join(root, 'index.html'),
  `<!doctype html>
<html lang="en">
<meta charset="utf-8" />
<title>Example coverage</title>
<style>
  body { font: 14px system-ui, sans-serif; margin: 2rem; }
  table { border-collapse: collapse; }
  th, td { padding: 0.25rem 0.75rem; text-align: start; border-bottom: 1px solid #ddd; }
  .below { color: #da1e28; font-weight: 600; }
</style>
<h1>Example coverage</h1>
<p>Lines, branches, and functions of each example's own <code>src/</code> that its Playwright suite runs. The gate needs ${MIN_LINES}% of gated lines; deferred examples are reported only.</p>
<table>
  <tr><th>Example</th><th>Lines</th><th>Branches</th><th>Functions</th><th>Gated lines</th><th>Status</th></tr>
  ${rows
    .map(
      (row) =>
        `<tr>${cell(`<a href="${row.dir}/index.html">${row.example}</a>`)}${cell(`${row.lines}%`)}${cell(`${row.branches}%`)}${cell(`${row.functions}%`)}${cell(`${row.gatedLines}%`)}<td class="${row.status}">${row.status}</td></tr>`
    )
    .join('\n  ')}
</table>
</html>
`
);

console.table(
  rows.map(({ example, lines, branches, functions, gatedLines, status }) => ({
    example,
    lines,
    branches,
    functions,
    gatedLines,
    status,
  }))
);
console.log(`Report: ${path.join(root, 'index.html')}`);

const below = rows.filter((row) => row.status === 'below');
if (below.length) {
  console.error(
    `Below ${MIN_LINES}% of gated lines: ${below.map((row) => row.example).join(', ')}.`
  );
  process.exitCode = 1;
}
