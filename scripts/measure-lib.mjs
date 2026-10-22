/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { ESLint } from 'eslint';
import sonarjs from 'eslint-plugin-sonarjs';

// The tree these tools measure. `tools/` is in it so the definition-of-done row
// covering `scripts/` and `tools/` can actually be satisfied: without it every
// `tools/` path is "not in the cruised tree" and coupling exits 1.
export const ROOTS = ['packages', 'demo', 'examples', 'scripts', 'tools'];

const PRIMARY_AREAS = [
  'packages/ai-chat/',
  'packages/ai-chat-components/',
  'packages/typedoc-theme/',
  'examples/',
];

const SOURCE_FILE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

// The three answers to "after what?". `worktree` is what you are editing right
// now, `index` what a pre-commit hook would see, `head` the last commit. They
// agree once everything is committed, which is why a review never has to think
// about it and a mid-change run does.
const SOURCES = ['worktree', 'index', 'head'];

// `git show` spells the after side of each: `:file`, `HEAD:file`, or the disk.
const AFTER_PREFIX = { index: ':', head: 'HEAD:' };

const requireFrom = createRequire(import.meta.url);
const parser = requireFrom.resolve('@typescript-eslint/parser');

// `filePath` is what decides JSX: without it the parser reads the source as
// `.ts` and rejects the first `<`.
export function parse(content, filePath) {
  return requireFrom(parser).parse(content, {
    filePath,
    jsx: true,
    loc: true,
    range: true,
  });
}

export function labelsFor(rel) {
  const r = rel.replaceAll('\\', '/');
  if (PRIMARY_AREAS.some((p) => r.startsWith(p))) {
    return { important: 'Important', blocker: 'Blocker' };
  }
  if (r.startsWith('demo/')) {
    return { important: 'Nit', blocker: 'Important' };
  }
  return null;
}

function toRepoRelative(f) {
  return relative(process.cwd(), resolve(f)).replaceAll('\\', '/');
}

// A real PR's `git diff -U0` runs to megabytes, and spawnSync's default 1 MB
// buffer kills git with an empty stderr, which reads as a clean gate failure.
function git(args) {
  const result = spawnSync('git', args, {
    encoding: 'utf8',
    maxBuffer: Infinity,
  });
  if (result.status !== 0) {
    console.error(result.stderr.trim());
    process.exit(1);
  }
  return result.stdout;
}

// `<base>...HEAD` asks for the changes on HEAD since the merge base, so the
// left side of the diff is that merge base and not `<base>` itself. Resolving
// it once lets every diff and every `git show` below share one left side —
// otherwise a base that moved ahead reads its own newer content as "before".
function resolveBase(base, usage) {
  const result = spawnSync('git', ['merge-base', base, 'HEAD'], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    const detail = result.stderr.trim();
    fail(
      `cannot resolve the merge base of ${base} and HEAD${detail ? `\n${detail}` : ''}`,
      usage
    );
  }
  return result.stdout.trim();
}

// Against the merge base: the disk, the index, or HEAD.
function diffArgs(source, base) {
  if (source === 'head') {
    return [base, 'HEAD'];
  }
  if (source === 'index') {
    return ['--cached', base];
  }
  return [base];
}

const SIZE_RULES = [
  ['lockfiles', /(^|\/)package-lock\.json$/],
  [
    'generated',
    /^(?:\.(?:claude|agents)\/skills\/|\.bob\/skills\/carbon-builder\/|packages\/ai-chat\/docs\/api\/(?:markdown\/|symbol-index\.json$)|packages\/[^/]+\/telemetry\.yml$|versions\.js$)/,
  ],
  ['snapshots', /(?:^|\/)__snapshots__\/|\.snap$/],
  ['fixtures', /(?:^|\/)(?:fixtures|__fixtures__)\//],
  ['test cases', /(?:^|\/)[^/]*(?:_spec\.|\.test\.|\.spec\.)[^/]*$/],
  [
    'shared test infrastructure',
    /^examples\/shared\/playwright\/|^(?!examples\/)(?:(?:.*\/)?(?:jest|web-test-runner|playwright|vitest)\.config\.[^/]+$|packages\/ai-chat\/tests\/(?:setup|test_helpers)\.ts$|packages\/ai-chat-components\/src\/testing\/|(?:.*\/)?__tests__\/|demo\/tests\/)/,
  ],
  ['examples and demo', /^(?:examples|demo)\//],
  ['docs', /\.(?:md|mdx)$|^docs\//],
];
const COUNTED = new Set(['code', 'shared test infrastructure']);

export function classify(path) {
  return SIZE_RULES.find(([, pattern]) => pattern.test(path))?.[0] ?? 'code';
}

export function band(counted) {
  if (counted <= 200) {
    return '≤200: preferred';
  }
  return counted <= 400
    ? '201–400: consider a split'
    : '>400: split or explain why the change stays together';
}

export function parseNumstat(raw) {
  const fields = raw.split('\0');
  const rows = [];
  for (let index = 0; index < fields.length - 1; index++) {
    const [, added, deleted, name] = fields[index].match(
      /^([^\t]+)\t([^\t]+)\t([\s\S]*)$/
    );
    const oldPath = name === '' ? fields[++index] : null;
    const path = name === '' ? fields[++index] : name;
    rows.push({
      path,
      oldPath,
      added: Number(added) || 0,
      deleted: Number(deleted) || 0,
      binary: added === '-',
      untracked: false,
    });
  }
  return rows;
}

function worktreeBytes(path) {
  return lstatSync(path).isSymbolicLink()
    ? Buffer.from(readlinkSync(path))
    : readFileSync(path);
}

function lineCount(content) {
  const text = String(content);
  return (
    (text.match(/\n/g)?.length ?? 0) +
    Number(!text.endsWith('\n') && text !== '')
  );
}

function untrackedRows(source) {
  if (source !== 'worktree') {
    return [];
  }
  return git(['ls-files', '--others', '--exclude-standard', '-z'])
    .split('\0')
    .filter((path) => path !== '' && !path.endsWith('/'))
    .map((path) => {
      const bytes = worktreeBytes(path);
      const binary = bytes.subarray(0, 8000).includes(0);
      return {
        path,
        oldPath: null,
        added: binary ? 0 : lineCount(bytes),
        deleted: 0,
        binary,
        untracked: true,
      };
    });
}

function moveRows(row, base, source) {
  if (row.binary) {
    return [{ ...row, path: row.oldPath }, row];
  }
  const before = contentAt(base, row.oldPath);
  const after =
    source === 'worktree'
      ? worktreeBytes(row.path)
      : contentOf(source, row.path);
  return [
    { ...row, path: row.oldPath, added: 0, deleted: lineCount(before) },
    { ...row, added: lineCount(after), deleted: 0 },
  ];
}

function tally() {
  return { added: 0, deleted: 0, files: new Set() };
}

function addSize(total, row, id = row.path) {
  total.added += row.added;
  total.deleted += row.deleted;
  total.files.add(id);
}

function sizeTotals(rows) {
  const counted = tally();
  const excluded = new Map();
  const areas = new Map();
  for (const row of rows) {
    const category = classify(row.path);
    if (!COUNTED.has(category)) {
      const total = excluded.get(category) ?? tally();
      addSize(total, row);
      excluded.set(category, total);
      continue;
    }
    addSize(counted, row, row.id);
    const area = areaOf(row.path);
    const files = areas.get(area) ?? new Set();
    files.add(row.id);
    areas.set(area, files);
  }
  return { counted, excluded, areas };
}

function areaOf(path) {
  const segments = path.split('/');
  if (segments.length === 1) {
    return '(root)';
  }
  return segments.slice(0, segments[0] === 'packages' ? 2 : 1).join('/');
}

function filesLabel(count) {
  return `${count} file${count === 1 ? '' : 's'}`;
}

function totalLabel(total) {
  return `${total.added + total.deleted} lines (+${total.added} −${total.deleted}) in ${filesLabel(total.files.size)}`;
}

function moveLabel(row, parts) {
  const amount = parts
    .filter((part) => COUNTED.has(classify(part.path)))
    .reduce((sum, part) => sum + part.added + part.deleted, 0);
  return `${row.oldPath} → ${row.path} (${classify(row.oldPath)} → ${classify(row.path)}, ${amount} counted lines)`;
}

function binaryLabel(row) {
  const destination = `${row.path}: ${classify(row.path)}`;
  return row.oldPath === null
    ? destination
    : `${row.oldPath}: ${classify(row.oldPath)} → ${destination}`;
}

function metadataRows(rows, moves) {
  const renames = rows.filter((row) => row.oldPath !== null);
  const pure = renames.filter(
    (row) => row.added + row.deleted === 0 && !row.binary
  );
  const binary = rows.filter((row) => row.binary);
  const untracked = rows.filter((row) => row.untracked);
  const untrackedCounted = untracked.filter((row) =>
    COUNTED.has(classify(row.path))
  );
  const added = untrackedCounted.reduce((sum, row) => sum + row.added, 0);
  return [
    `renames: ${pure.length} pure (0 edited lines), ${renames.length - pure.length} with edits or binary`,
    `moved across categories: ${moves.join(' · ') || 'none'}`,
    `binary: ${filesLabel(binary.length)}${binary.length ? ` (${binary.map(binaryLabel).join(' · ')})` : ''}`,
    `untracked: ${filesLabel(untrackedCounted.length)} counted (+${added}); ${filesLabel(untracked.length - untrackedCounted.length)} excluded`,
  ];
}

export function sizeReport(base, source) {
  const rows = [
    ...parseNumstat(
      git(['diff', '--numstat', '-z', '-M', ...diffArgs(source, base)])
    ),
    ...untrackedRows(source),
  ];
  const moves = new Map(
    rows
      .filter(
        (row) =>
          row.oldPath !== null && classify(row.oldPath) !== classify(row.path)
      )
      .map((row) => [row, moveRows(row, base, source)])
  );
  const contributions = rows.flatMap((row) =>
    (moves.get(row) ?? [row]).map((part) => ({
      ...part,
      id: row.oldPath === null ? row.path : `${row.oldPath} → ${row.path}`,
    }))
  );
  const { counted, excluded, areas } = sizeTotals(contributions);
  const areaLabels = [...areas].map(
    ([area, files]) => `${area} ${filesLabel(files.size)}`
  );
  const excludedLabels = [...excluded].map(
    ([category, total]) => `  ${category}: ${totalLabel(total)}`
  );
  return [
    '== size',
    `counted: ${totalLabel(counted)} — ${band(counted.added + counted.deleted)} (references/pr-reviewability.md)`,
    `areas: ${areaLabels.join(' · ') || 'none'}`,
    `counted files: ${[...counted.files].join(' · ') || 'none'}`,
    'excluded from the threshold:',
    ...excludedLabels,
    ...metadataRows(
      rows,
      [...moves].map(([row, parts]) => moveLabel(row, parts))
    ),
  ].join('\n');
}

export function changedPaths(base, source) {
  const out = git([
    'diff',
    '--name-only',
    '--diff-filter=d',
    ...diffArgs(source, base),
  ]);
  return out.split('\n').filter(Boolean);
}

export function changedFiles(base, source) {
  return changedPaths(base, source).filter((f) => SOURCE_FILE.test(f));
}

export function newCodeFiles(base, source) {
  const out = git([
    'diff',
    '--name-status',
    '--diff-filter=A',
    ...diffArgs(source, base),
  ]);
  return out
    .split('\n')
    .map((l) => l.split('\t')[1])
    .filter((f) => f !== undefined && SOURCE_FILE.test(f));
}

// `git diff -U0` names each file in a `+++ b/<path>` header before its added
// lines, so one pass carries the file along with the line. The diff is not
// restricted by pathspec: dropping the rename source unpairs a move, and git
// then re-reports every line of a moved file as added.
export function addedLines(base, source) {
  const rows = [];
  let file = null;
  let line = 0;
  for (const raw of git(['diff', '-U0', ...diffArgs(source, base)]).split(
    '\n'
  )) {
    if (raw.startsWith('+++ ')) {
      file = raw.startsWith('+++ b/') ? raw.slice(6) : null;
    } else if (/^@@ -\d+(,\d+)? \+(\d+)/.test(raw)) {
      line = Number(raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)/)[1]);
    } else if (raw.startsWith('+') && file !== null && SOURCE_FILE.test(file)) {
      rows.push({ file, text: raw.slice(1), line });
      line += 1;
    }
  }
  return rows;
}

// Normalising drops what a copy would not carry across: layout, punctuation
// lines, comments, imports, and a bare `return`.
const NOISE = /^([{}()\]]+;?|return;?)$|^(import|export)\s|^(\/\/|\/\*|\*)/;

export function normalise(rows) {
  return rows
    .map((r) => ({ ...r, text: r.text.trim().replace(/\s+/g, ' ') }))
    .filter((r) => r.text !== '' && !NOISE.test(r.text));
}

export const WINDOW = 6;

// Every WINDOW-line window, hashed, so an added run can be looked up in one pass.
export function windows(rows) {
  const out = [];
  for (let i = 0; i + WINDOW <= rows.length; i++) {
    const text = rows
      .slice(i, i + WINDOW)
      .map((r) => r.text)
      .join('\n');
    out.push({
      index: i,
      line: rows[i].line,
      key: createHash('md5').update(text).digest('hex'),
    });
  }
  return out;
}

export function contentAt(base, file) {
  const result = spawnSync('git', ['show', `${base}:${file}`], {
    encoding: 'utf8',
    maxBuffer: Infinity,
  });
  return result.status === 0 ? result.stdout : null;
}

// The after side of one file. Null means it is not there to read — renamed or
// deleted but not yet committed, which is the ordinary mid-change state and so
// a skip rather than an error.
export function contentOf(source, file) {
  if (source === 'worktree') {
    return existsSync(file) ? readFileSync(file, 'utf8') : null;
  }
  const result = spawnSync('git', ['show', `${AFTER_PREFIX[source]}${file}`], {
    encoding: 'utf8',
    maxBuffer: Infinity,
  });
  return result.status === 0 ? result.stdout : null;
}

// `git write-tree` turns the current index into a tree object. It writes only
// to the object store — the index and the working tree are left alone.
export function afterRef(source) {
  return source === 'index' ? git(['write-tree']).trim() : 'HEAD';
}

// A ref laid down as files, and the caller deletes it. Both the duplication
// index and dependency-cruiser read the filesystem, and this tree runs to
// ~1,400 source files: one archive beats that many `git show` calls by ~25s.
export function materialise(ref) {
  const roots = git(['ls-tree', '--name-only', ref])
    .split('\n')
    .filter((d) => ROOTS.includes(d));
  const dir = mkdtempSync(join(tmpdir(), 'measure-'));
  git(['archive', '-o', join(dir, 'tree.tar'), ref, ...roots]);
  const untar = spawnSync('tar', ['-xf', join(dir, 'tree.tar'), '-C', dir], {
    encoding: 'utf8',
  });
  if (untar.status !== 0) {
    rmSync(dir, { recursive: true, force: true });
    console.error(untar.stderr.trim());
    process.exit(1);
  }
  return dir;
}

export const discard = (dir) => rmSync(dir, { recursive: true, force: true });

// `git grep` reads the disk unless told otherwise. The index is a flag before
// the pattern, a commit an argument after it, and a commit prefixes each hit.
export function grepFiles(source, flags, pattern) {
  const before = source === 'index' ? ['--cached'] : [];
  const after = source === 'head' ? ['HEAD'] : [];
  const result = spawnSync(
    'git',
    ['grep', ...flags, ...before, pattern, ...after],
    {
      encoding: 'utf8',
      maxBuffer: Infinity,
    }
  );
  if (result.status !== 0) {
    return [];
  }
  return result.stdout
    .split('\n')
    .filter(Boolean)
    .map((f) => (source === 'head' ? f.replace(/^HEAD:/, '') : f));
}

function firstFatal(messages) {
  return messages.find(
    (m) => m.fatal || (m.ruleId == null && m.severity === 2)
  );
}

export function makeLinter(rules) {
  // Flat config, and deliberately not the repo's own: these rules are the
  // measurement, so a config file on disk must not add to or silence them.
  // `parser` is a resolved path, which flat config does not take — it wants
  // the module.
  const eslint = new ESLint({
    overrideConfigFile: true,
    allowInlineConfig: false,
    overrideConfig: [
      {
        files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
        plugins: { sonarjs },
        languageOptions: {
          parser: requireFrom(parser),
          ecmaVersion: 'latest',
          sourceType: 'module',
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        rules,
      },
    ],
  });
  return async (content, filePath) => {
    const [result] = await eslint.lintText(content, { filePath });
    const messages = result?.messages ?? [];
    const fatal = firstFatal(messages);
    if (fatal) {
      throw new Error(fatal.message);
    }
    return messages;
  };
}

function fail(message, usage) {
  console.error(`error: ${message}`);
  console.error(usage);
  process.exit(2);
}

function parseInts(values, ints, defaults, usage) {
  const out = {};
  for (const name of ints) {
    const raw = values[name];
    if (raw !== undefined && !/^\d+$/.test(raw)) {
      fail(`--${name} requires a non-negative integer`, usage);
    }
    out[name] = raw === undefined ? (defaults[name] ?? null) : Number(raw);
  }
  return out;
}

// File mode reads the files it is handed, so there is no after side to pick.
function parseSource(raw, changed, usage) {
  if (raw === undefined) {
    return 'worktree';
  }
  if (!SOURCES.includes(raw)) {
    fail(`--source must be one of ${SOURCES.join(', ')}`, usage);
  }
  if (changed === null) {
    fail(
      '--source applies to --changed; file mode reads the files you name',
      usage
    );
  }
  return raw;
}

export function parseCli({ ints, defaults = {}, usage }) {
  const options = { changed: { type: 'string' }, source: { type: 'string' } };
  for (const name of ints) {
    options[name] = { type: 'string' };
  }
  let parsed;
  try {
    parsed = parseArgs({ options, allowPositionals: true });
  } catch (e) {
    fail(e.message, usage);
  }
  const { values, positionals } = parsed;
  const files = positionals.map(toRepoRelative);
  const changed = values.changed ?? null;
  if (files.length > 0 && changed !== null) {
    fail('positional files and --changed are mutually exclusive', usage);
  }
  if (files.length === 0 && changed === null) {
    console.error(usage);
    process.exit(2);
  }
  const source = parseSource(values.source, changed, usage);
  const base = changed === null ? null : resolveBase(changed, usage);
  return {
    files,
    changed,
    base,
    source,
    ...parseInts(values, ints, defaults, usage),
  };
}
