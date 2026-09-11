/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * duplication.mjs — find added code that already exists in another file.
 *
 * The rules `npm run smells` runs compare within one file. This indexes the
 * whole tree by normalised six-line window and by function body, then looks up
 * the lines a diff adds. It is the one check that needs the tree rather than
 * the file, which is why it lives beside `smells.mjs` rather than inside it.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOTS,
  WINDOW,
  addedLines,
  afterRef,
  discard,
  materialise,
  normalise,
  windows,
} from './measure-lib.mjs';

const MIN_BLOCK = 10;
const MIN_BODY = 5;
const SOURCE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
// Entry files and barrels are re-export lists: two of them share 136 lines and
// mean nothing by it. Tests and stories repeat setup on purpose.
const NOT_ORIGINAL =
  /(aiChatEntry\.tsx|serverEntry\.ts|index\.(ts|tsx|js|jsx))$|__tests__|\.test\.|_spec\.|\.spec\.|__stories__|\.stories\./;
const OPENS_FUNCTION = /^(?:export\s+)?(?:async\s+)?function\s+(\w+)|^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/;

// `dir` is null for the working tree and an archive otherwise; either way the
// keys stay repo-relative, so a hit reads the same in both.
const linesOf = (dir, file) => {
  const path = dir === null ? file : join(dir, file);
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf8').split('\n').map((text, i) => ({ text, line: i + 1 }));
};

// The tree the added lines are looked up in, read from the same side as those
// lines: `ls-files` covers the disk and the index alike, HEAD needs `ls-tree`.
function treeFiles(source) {
  const args =
    source === 'head'
      ? ['ls-tree', '-r', '--name-only', 'HEAD', '--', ...ROOTS]
      : ['ls-files', '--', ...ROOTS];
  const out = spawnSync('git', args, { encoding: 'utf8', maxBuffer: Infinity });
  return out.stdout.split('\n').filter((f) => SOURCE.test(f) && !NOT_ORIGINAL.test(f));
}

// Every function body in the tree, keyed by name and by normalised body, so an
// added function can be looked up under either.
// The declaration line is left out, so a renamed copy still matches. A
// braceless one-liner has no body to compare, and a body of a few lines
// collides with every other short helper, so both return null.
function bodyOf(rows, start) {
  if (!rows[start].text.includes('{')) return null;
  const body = [];
  let depth = 0;
  for (let i = start; i < rows.length; i++) {
    depth += (rows[i].text.match(/{/g) ?? []).length - (rows[i].text.match(/}/g) ?? []).length;
    if (i > start) body.push(rows[i]);
    if (depth <= 0 && i > start) break;
  }
  const text = normalise(body);
  return text.length < MIN_BODY ? null : text.map((r) => r.text).join('\n');
}

function indexTree(dir, files) {
  const blocks = new Map();
  const bodies = new Map();
  const push = (map, key, value) => map.set(key, [...(map.get(key) ?? []), value]);
  for (const file of files) {
    const raw = linesOf(dir, file);
    if (raw === null) continue;
    for (const w of windows(normalise(raw))) push(blocks, w.key, { file, line: w.line });
    raw.forEach((row, i) => {
      if (!OPENS_FUNCTION.test(row.text)) return;
      const body = bodyOf(raw, i);
      if (body !== null) push(bodies, body, { file, line: row.line });
    });
  }
  return { blocks, bodies };
}

const elsewhere = (map, key, file) => (map.get(key) ?? []).find((hit) => hit.file !== file) ?? null;

function blockRows(index, file, added) {
  const hits = [];
  for (const w of windows(normalise(added))) {
    const found = elsewhere(index.blocks, w.key, file);
    if (found) hits.push({ ...w, partner: found });
  }
  const merged = [];
  for (const hit of hits) {
    const last = merged.at(-1);
    const runs = last && hit.index === last.last + 1 && hit.partner.file === last.partner.file;
    if (runs) last.last = hit.index;
    else merged.push({ first: hit.index, last: hit.index, line: hit.line, partner: hit.partner });
  }
  return merged
    .map((b) => ({ ...b, size: b.last - b.first + WINDOW }))
    .filter((b) => b.size >= MIN_BLOCK)
    .map((b) => ({
      rule: 'duplicate-block',
      file,
      line: b.line,
      note: `↔ ${b.partner.file}:${b.partner.line} (${b.size} lines)`,
    }));
}

function functionRows(index, file, added) {
  const rows = [];
  added.forEach((row, i) => {
    const name = row.text.match(OPENS_FUNCTION)?.slice(1).find(Boolean);
    if (!name) return;
    const body = bodyOf(added, i);
    const hit = body === null ? null : elsewhere(index.bodies, body, file);
    if (hit) {
      rows.push({ rule: 'duplicate-function', file, line: row.line, note: `${name} ↔ ${hit.file}:${hit.line}` });
    }
  });
  return rows;
}

export function duplicates(base, source) {
  const dir = source === 'worktree' ? null : materialise(afterRef(source));
  try {
    const index = indexTree(dir, treeFiles(source));
    const byFile = Map.groupBy(addedLines(base, source), (r) => r.file);
    const rows = [];
    for (const [file, added] of byFile) {
      rows.push(...blockRows(index, file, added), ...functionRows(index, file, added));
    }
    return rows;
  } finally {
    if (dir !== null) discard(dir);
  }
}
