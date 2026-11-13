/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { band, classify, parseNumstat } from './measure-lib.mjs';
import {
  coverageGaps,
  fingerprint,
  readVerifiedCoverage,
} from './contract-coverage.mjs';

const env = {
  ...process.env,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'Measure test',
  GIT_AUTHOR_EMAIL: 'measure@example.test',
  GIT_COMMITTER_NAME: 'Measure test',
  GIT_COMMITTER_EMAIL: 'measure@example.test',
};

function git(root, ...args) {
  const result = spawnSync('git', args, {
    cwd: root,
    env,
    encoding: 'utf8',
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function fixture(context) {
  const root = mkdtempSync(join(tmpdir(), 'measure-test-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '--initial-branch=main');
  writeFileSync(join(root, 'base.txt'), 'base\n');
  git(root, 'add', '.');
  git(root, 'commit', '-m', 'base');
  return root;
}

function orphan(root) {
  git(root, 'switch', '--orphan', 'o');
  writeFileSync(join(root, 'other.txt'), 'unrelated\n');
  git(root, 'add', '.');
  git(root, 'commit', '-m', 'unrelated');
  git(root, 'switch', 'main');
}

function refuses(root, script, base) {
  const path = fileURLToPath(new URL(`./${script}.mjs`, import.meta.url));
  const result = spawnSync(process.execPath, [path, '--changed', base], {
    cwd: root,
    env,
    encoding: 'utf8',
  });
  assert.ifError(result.error);
  assert.equal(result.status, 2, `${result.stdout}${result.stderr}`);
  assert.ok(
    result.stderr.startsWith(
      `error: cannot resolve the merge base of ${base} and HEAD\n`
    ),
    result.stderr
  );
  assert.match(result.stderr, /usage: node scripts\//);
  assert.doesNotMatch(result.stdout, /^==/m);
}

test('unknown base', (context) => {
  const root = fixture(context);
  refuses(root, 'measure', 'does-not-exist');
});

test('no merge base', (context) => {
  const root = fixture(context);
  orphan(root);
  refuses(root, 'measure', 'o');
});

test('every script refuses', (context) => {
  const root = fixture(context);
  orphan(root);
  for (const script of ['complexity', 'coupling', 'smells']) {
    for (const base of ['does-not-exist', 'o']) {
      refuses(root, script, base);
    }
  }
});

function write(root, path, content) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

function lines(count, prefix = 'line') {
  return Array.from(
    { length: count },
    (_, index) => `${prefix} ${index}\n`
  ).join('');
}

function commit(root, message = 'change') {
  git(root, 'add', '.');
  git(root, 'commit', '-m', message);
}

function report(root, base = 'main', source = 'worktree') {
  const url = new URL('./measure-lib.mjs', import.meta.url).href;
  const code = `import { sizeReport } from ${JSON.stringify(url)};
    console.log(sizeReport(${JSON.stringify(base)}, ${JSON.stringify(source)}));`;
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', code],
    {
      cwd: root,
      env,
      encoding: 'utf8',
    }
  );
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

function baseFile(root, path, count = 12) {
  write(root, path, lines(count));
  commit(root);
}

test('modify counts both', (context) => {
  const root = fixture(context);
  baseFile(root, 'src/a.ts');
  write(root, 'src/a.ts', lines(10) + lines(3, 'replacement'));
  assert.match(report(root), /counted: 5 lines \(\+3 −2\) in 1 file/);
});

test('delete', (context) => {
  const root = fixture(context);
  baseFile(root, 'src/a.ts', 10);
  rmSync(join(root, 'src/a.ts'));
  assert.match(report(root), /counted: 10 lines \(\+0 −10\) in 1 file/);
});

function move(root, from, to) {
  mkdirSync(dirname(join(root, to)), { recursive: true });
  renameSync(join(root, from), join(root, to));
  git(root, 'add', '.');
}

test('pure rename', (context) => {
  const root = fixture(context);
  baseFile(root, 'src/a.ts');
  move(root, 'src/a.ts', 'src/b.ts');
  const output = report(root);
  assert.match(output, /counted: 0 lines \(\+0 −0\) in 1 file/);
  assert.match(output, /renames: 1 pure/);
});

test('rename with edit', (context) => {
  const root = fixture(context);
  baseFile(root, 'src/a.ts');
  move(root, 'src/a.ts', 'src/b.ts');
  write(root, 'src/b.ts', lines(11) + 'replacement\n');
  assert.match(report(root), /counted: 2 lines \(\+1 −1\) in 1 file/);
});

test('cross-category move', (context) => {
  const root = fixture(context);
  baseFile(root, 'demo/x.ts');
  move(root, 'demo/x.ts', 'packages/p/src/x.ts');
  const output = report(root);
  assert.match(output, /counted: 12 lines \(\+12 −0\) in 1 file/);
  assert.match(output, /examples and demo: 12 lines \(\+0 −12\) in 1 file/);
  assert.match(output, /demo\/x.ts → packages\/p\/src\/x.ts/);
});

test('path with spaces', (context) => {
  const root = fixture(context);
  write(root, 'src/my file.ts', lines(4));
  git(root, 'add', '.');
  const output = report(root);
  assert.match(output, /counted: 4 lines \(\+4 −0\) in 1 file/);
  assert.match(output, /counted files: src\/my file.ts/);
});

const excludedPaths = [
  ['test cases', 'src/a_spec.ts'],
  ['fixtures', 'src/fixtures/a.ts'],
  ['snapshots', 'src/__snapshots__/a.snap'],
  ['examples and demo', 'examples/a.ts'],
  ['docs', 'guide.md'],
  ['lockfiles', 'package-lock.json'],
];

test('exclusions', (context) => {
  const root = fixture(context);
  for (const [, path] of excludedPaths) {
    write(root, path, lines(10));
  }
  const output = report(root);
  assert.match(output, /counted: 0 lines \(\+0 −0\) in 0 files/);
  for (const [category] of excludedPaths) {
    assert.ok(
      output.includes(`${category}: 10 lines (+10 −0) in 1 file`),
      output
    );
  }
});

test('test infrastructure', (context) => {
  const root = fixture(context);
  for (const path of [
    'packages/p/jest.config.js',
    'demo/playwright.config.ts',
    'examples/shared/playwright/helpers/index.ts',
  ]) {
    write(root, path, lines(10));
  }
  const output = report(root);
  assert.match(output, /counted: 30 lines \(\+30 −0\) in 3 files/);
  assert.match(
    output,
    /areas: demo 1 file · examples 1 file · packages\/p 1 file/
  );
});

test('example-local', (context) => {
  const root = fixture(context);
  for (const path of [
    'examples/react/x/jest.config.js',
    'examples/react/x/src/__tests__/helpers.ts',
  ]) {
    write(root, path, lines(10));
  }
  assert.match(
    report(root),
    /examples and demo: 20 lines \(\+20 −0\) in 2 files/
  );
});

test('generated', (context) => {
  const root = fixture(context);
  for (const path of [
    'packages/p/telemetry.yml',
    'versions.js',
    'packages/ai-chat/docs/api/markdown/a.md',
  ]) {
    write(root, path, lines(10));
  }
  write(root, 'packages/ai-chat/docs/api/README.md', lines(10));
  const output = report(root);
  assert.match(output, /generated: 30 lines \(\+30 −0\) in 3 files/);
  assert.match(output, /docs: 10 lines \(\+10 −0\) in 1 file/);
});

test('docs anchoring', (context) => {
  const root = fixture(context);
  write(root, 'packages/ai-chat/docs/typedoc/plugin.js', lines(10));
  write(root, 'docs/x.md', lines(10));
  assert.match(report(root), /counted: 10 lines \(\+10 −0\) in 1 file/);
  assert.equal(classify('docs/script.js'), 'docs');
});

test('unclassified', (context) => {
  const root = fixture(context);
  write(root, 'tools/data.xyz', lines(10));
  assert.match(report(root), /counted: 10 lines \(\+10 −0\) in 1 file/);
});

test('bands', () => {
  assert.match(band(200), /preferred/);
  assert.match(band(201), /consider a split/);
  assert.match(band(400), /consider a split/);
  assert.match(band(401), /split or explain/);
});

test('stacked base', (context) => {
  const root = fixture(context);
  git(root, 'switch', '-c', 'parent');
  write(root, 'src/parent.ts', lines(50));
  commit(root);
  git(root, 'switch', '-c', 'child');
  write(root, 'src/child.ts', lines(30));
  commit(root);
  assert.match(
    report(root, 'parent', 'head'),
    /counted: 30 lines \(\+30 −0\) in 1 file/
  );
});

test('sources', (context) => {
  const root = fixture(context);
  baseFile(root, 'src/a.ts');
  write(root, 'src/a.ts', lines(14));
  assert.match(report(root), /counted: 2 lines/);
  assert.match(report(root, 'main', 'head'), /counted: 0 lines/);
  git(root, 'add', '.');
  write(root, 'src/a.ts', lines(15));
  assert.match(report(root, 'main', 'index'), /counted: 2 lines/);
});

test('untracked', (context) => {
  const root = fixture(context);
  write(root, 'src/new.ts', lines(40));
  const output = report(root);
  assert.match(output, /counted: 40 lines \(\+40 −0\) in 1 file/);
  assert.match(output, /untracked: 1 file counted \(\+40\)/);
  assert.doesNotMatch(report(root, 'main', 'head'), /src\/new.ts/);
  assert.match(report(root, 'main', 'index'), /counted: 0 lines/);
});

test('advisory', (context) => {
  const root = fixture(context);
  write(root, 'src/big.ts', lines(450));
  assert.match(
    report(root),
    /counted: 450 lines.*>400: split or explain.*references\/pr-reviewability.md/
  );
});

test('numstat parsing preserves NUL-delimited names and binary rows', () => {
  const rows = parseNumstat(
    '4\t0\tsrc/my file.ts\0' +
      '1\t1\t\0old\tname.ts\0new\nname.ts\0' +
      '-\t-\timage.png\0'
  );
  assert.equal(rows[0].path, 'src/my file.ts');
  assert.equal(rows[1].oldPath, 'old\tname.ts');
  assert.equal(rows[1].path, 'new\nname.ts');
  assert.deepEqual(
    [rows[2].added, rows[2].deleted, rows[2].binary],
    [0, 0, true]
  );
});

test('classification follows ordered anchored rules', () => {
  for (const [path, category] of [
    ['src/__tests__/a.spec.ts', 'test cases'],
    ['src/__tests__/helper.ts', 'shared test infrastructure'],
    ['demo/tests/helper.ts', 'shared test infrastructure'],
    ['examples/shared/playwright/a.test.ts', 'test cases'],
    ['packages/ai-chat/tests/setup.ts', 'shared test infrastructure'],
    ['packages/ai-chat/tests/test_helpers.ts', 'shared test infrastructure'],
    [
      'packages/ai-chat-components/src/testing/helper.ts',
      'shared test infrastructure',
    ],
    ['packages/p/vitest.config.ts', 'shared test infrastructure'],
    ['packages/p/web-test-runner.config.mjs', 'shared test infrastructure'],
    ['.agents/skills/a/readme.md', 'generated'],
    ['.claude/skills/a/SKILL.md', 'generated'],
    ['.bob/skills/carbon-builder/SKILL.md', 'generated'],
    ['.bob/skills/caic-review/SKILL.md', 'docs'],
    ['packages/ai-chat/docs/api/symbol-index.json', 'generated'],
    ['packages/p/versions.js', 'code'],
    ['src/telemetry.yml', 'code'],
    ['src/a_spec.tsx', 'test cases'],
    ['src/spec.ts', 'code'],
    ['src/a_spec/normal.ts', 'code'],
    ['src/__fixtures__/a.ts', 'fixtures'],
    ['src/a.snap', 'snapshots'],
  ]) {
    assert.equal(classify(path), category, path);
  }
});

test('binary files remain visible by category', (context) => {
  const root = fixture(context);
  write(root, 'src/picture.bin', Buffer.from([0, 1, 2]));
  write(root, 'examples/picture.bin', Buffer.from([0, 1, 2]));
  git(root, 'add', '.');
  const output = report(root);
  assert.match(output, /counted: 0 lines \(\+0 −0\) in 1 file/);
  assert.match(
    output,
    /binary: 2 files .*examples\/picture.bin: examples and demo.*src\/picture.bin: code/
  );
});

test('untracked symlinks count link text without reading the target', (context) => {
  const root = fixture(context);
  symlinkSync('missing-target', join(root, 'link.ts'));
  assert.match(report(root), /counted: 1 lines \(\+1 −0\) in 1 file/);
});

test('cross-category symlinks count full link text in each source', (context) => {
  const root = fixture(context);
  mkdirSync(join(root, 'demo'));
  symlinkSync('missing-target', join(root, 'demo/link.ts'));
  commit(root);
  move(root, 'demo/link.ts', 'src/link.ts');
  for (const source of ['worktree', 'index']) {
    assert.match(
      report(root, 'main', source),
      /counted: 1 lines \(\+1 −0\) in 1 file/
    );
  }
});

test('output reports all summary fields and root areas', (context) => {
  const root = fixture(context);
  write(root, 'config.json', lines(10));
  const output = report(root);
  assert.match(
    output,
    /^== size\ncounted: 10 lines \(\+10 −0\) in 1 file — ≤200: preferred \(references\/pr-reviewability.md\)\nareas: \(root\) 1 file\ncounted files: config.json\nexcluded from the threshold:\nrenames: 0 pure \(0 edited lines\), 0 with edits or binary\nmoved across categories: none\nbinary: 0 files\nuntracked: 1 file counted \(\+10\); 0 files excluded\n$/
  );
});

test('cross-category moves use full before and after lengths with edits', (context) => {
  const root = fixture(context);
  baseFile(root, 'src/a.ts');
  move(root, 'src/a.ts', 'demo/a.ts');
  write(root, 'demo/a.ts', lines(11) + lines(2, 'replacement'));
  const output = report(root);
  assert.match(output, /counted: 12 lines \(\+0 −12\) in 1 file/);
  assert.match(output, /examples and demo: 13 lines \(\+13 −0\) in 1 file/);
  assert.match(output, /counted files: src\/a.ts → demo\/a.ts/);
});

test('moves between counted categories count one changed file', (context) => {
  const root = fixture(context);
  baseFile(root, 'src/a.ts');
  move(root, 'src/a.ts', 'src/__tests__/helper.ts');
  assert.match(report(root), /counted: 24 lines \(\+12 −12\) in 1 file/);
});

test('binary cross-category moves retain both categories with zero lines', (context) => {
  const root = fixture(context);
  write(root, 'demo/picture.bin', Buffer.from([0, 1, 2]));
  commit(root);
  move(root, 'demo/picture.bin', 'src/picture.bin');
  const output = report(root);
  assert.match(output, /counted: 0 lines \(\+0 −0\) in 1 file/);
  assert.match(output, /examples and demo: 0 lines \(\+0 −0\) in 1 file/);
  assert.match(
    output,
    /binary: 1 file .*demo\/picture.bin: examples and demo → src\/picture.bin: code/
  );
});

test('untracked binary and ignored files respect Git conventions', (context) => {
  const root = fixture(context);
  write(root, '.gitignore', 'ignored.ts\n');
  commit(root);
  write(root, 'src/picture.bin', Buffer.from([0, 1, 2]));
  write(root, 'ignored.ts', lines(10));
  const output = report(root);
  assert.match(output, /counted: 0 lines \(\+0 −0\) in 1 file/);
  assert.match(output, /binary: 1 file \(src\/picture.bin: code\)/);
  assert.match(output, /untracked: 1 file counted \(\+0\)/);
  assert.doesNotMatch(output, /ignored.ts/);
});

const RUNTIME_FILE = 'packages/ai-chat/src/runtime/index.ts';

function istanbul(
  file,
  statementCounts = { 0: 1, 1: 0 },
  branchCounts = [1, 0]
) {
  const loc = (line) => ({
    start: { line, column: 0 },
    end: { line, column: 20 },
  });
  return {
    [file]: {
      path: file,
      statementMap: { 0: loc(1), 1: loc(2) },
      s: statementCounts,
      branchMap: {
        0: { loc: loc(1), locations: [loc(1), loc(1)], type: 'cond-expr' },
      },
      b: { 0: branchCounts },
    },
  };
}

test('contract coverage lists an uncovered changed runtime index line and an untaken arm on a covered line', () => {
  const rows = [1, 2, 3].map((line) => ({ file: RUNTIME_FILE, line }));
  const result = coverageGaps(
    rows,
    istanbul(RUNTIME_FILE),
    () => 'export const x = 1;\nexport const y = 2;\n}'
  );
  assert.deepEqual(result.gaps, [`${RUNTIME_FILE}:2`]);
  assert.deepEqual(result.branches, [`${RUNTIME_FILE}:1 branch 0/1`]);
  assert.deepEqual(result.nonExecutable, [`${RUNTIME_FILE}:3`]);
  assert.deepEqual(result.unverified, []);
});

test('equivalent Istanbul producers give identical contract rows', () => {
  const rows = [{ file: RUNTIME_FILE, line: 2 }];
  const first = istanbul(RUNTIME_FILE);
  const second = JSON.parse(JSON.stringify(first));
  second[RUNTIME_FILE].fnMap = {};
  second[RUNTIME_FILE].f = {};
  assert.deepEqual(
    coverageGaps(rows, first, () => ''),
    coverageGaps(rows, second, () => '')
  );
});

test('missing runtime file data is unverified while a type-only module is named separately', () => {
  const rows = [{ file: RUNTIME_FILE, line: 1 }];
  assert.deepEqual(
    coverageGaps(rows, {}, () => 'export const x = 1;').unverified,
    [`${RUNTIME_FILE}:1`]
  );
  assert.deepEqual(
    coverageGaps(rows, {}, () => 'export interface Shape { x: number }')
      .nonExecutable,
    [`${RUNTIME_FILE}:1`]
  );
});

test('contract coverage rejects missing reports and source mismatch', (context) => {
  const root = fixture(context);
  const report = join(root, 'coverage-final.json');
  assert.throws(() => readVerifiedCoverage(report, 'fresh'), /ENOENT/);
  writeFileSync(report, '{}');
  writeFileSync(`${report}.meta.json`, JSON.stringify({ fingerprint: 'old' }));
  assert.throws(() => readVerifiedCoverage(report, 'fresh'), /fingerprint/);
  writeFileSync(
    `${report}.meta.json`,
    JSON.stringify({
      fingerprint: 'fresh',
      report: createHash('sha256').update('{}').digest('hex'),
    })
  );
  assert.deepEqual(readVerifiedCoverage(report, 'fresh'), {});
});

test('coverage fingerprint changes for source, tests, configuration, and built dependencies', (context) => {
  const root = fixture(context);
  const paths = ['src', 'tests', 'jest.config.cjs', 'es'].map((path) =>
    join(root, path)
  );
  ['src/a.ts', 'tests/a.ts', 'jest.config.cjs', 'es/a.js'].forEach((file) =>
    write(root, file, 'original')
  );
  let previous = fingerprint(paths);
  for (const file of ['src/a.ts', 'tests/a.ts', 'jest.config.cjs', 'es/a.js']) {
    write(root, file, 'changed');
    const next = fingerprint(paths);
    assert.notEqual(next, previous, file);
    previous = next;
  }
});

function contractReport(root, source = 'worktree') {
  const url = new URL('./contract-coverage.mjs', import.meta.url).href;
  const code = `import { contractCoverage } from ${JSON.stringify(url)};
    console.log(contractCoverage('HEAD', ${JSON.stringify(source)}));`;
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', code],
    { cwd: root, env, encoding: 'utf8' }
  );
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

test('contract row skips an unrelated diff without starting a producer', (context) => {
  const root = fixture(context);
  write(root, 'guide.md', 'Only prose changes.');
  assert.match(
    contractReport(root),
    /skipped: no changed ai-chat runtime source lines/
  );
});

test('contract row refuses head or index coverage when relevant source differs on disk', (context) => {
  const root = fixture(context);
  write(root, RUNTIME_FILE, 'export const x = 1;');
  write(
    root,
    'packages/ai-chat-components/package.json',
    '{"exports":{".":"./es/old.js"}}'
  );
  commit(root);
  git(root, 'branch', 'before');
  write(root, RUNTIME_FILE, 'export const x = 2;');
  commit(root);
  write(root, 'packages/ai-chat-components/package.json', '{"exports":{}}');
  const url = new URL('./contract-coverage.mjs', import.meta.url).href;
  for (const source of ['head', 'index']) {
    const code = `import { contractCoverage } from ${JSON.stringify(url)};
      console.log(contractCoverage('before', ${JSON.stringify(source)}));`;
    const result = spawnSync(
      process.execPath,
      ['--input-type=module', '-e', code],
      { cwd: root, env, encoding: 'utf8' }
    );
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /unverified: worktree inputs differ/);
    assert.doesNotMatch(result.stdout, /uncovered changed runtime lines: 0/);
  }
});

test('an ignored runtime statement without an Istanbul mapping remains unverified', () => {
  const data = istanbul(RUNTIME_FILE);
  const rows = [
    { file: RUNTIME_FILE, line: 3 },
    { file: RUNTIME_FILE, line: 4 },
  ];
  const source =
    'const a = 1;\n/* istanbul ignore next */\nexport const ignored = run();\ntype Only = string;';
  const result = coverageGaps(rows, data, () => source);
  assert.deepEqual(result.unverified, [`${RUNTIME_FILE}:3`]);
  assert.deepEqual(result.nonExecutable, [`${RUNTIME_FILE}:4`]);
});

test('implicit else arms use the enclosing branch location when their own coordinates are absent', () => {
  const data = istanbul(RUNTIME_FILE);
  data[RUNTIME_FILE].branchMap[0].locations[1] = { start: {}, end: {} };
  const result = coverageGaps(
    [{ file: RUNTIME_FILE, line: 1 }],
    data,
    () => 'if (value) run();'
  );
  assert.deepEqual(result.branches, [`${RUNTIME_FILE}:1 branch 0/1`]);
});

test('coverage reuse includes runtime environment overrides', (context) => {
  const root = fixture(context);
  const file = join(root, 'source.ts');
  writeFileSync(file, 'export const x = 1;');
  const ordinary = fingerprint([file], {});
  assert.notEqual(
    ordinary,
    fingerprint([file], { AICHAT_DISABLE_WEB_COMPONENT_BRIDGE: '1' })
  );
  assert.notEqual(
    ordinary,
    fingerprint([file], { NODE_OPTIONS: '--conditions=react-server' })
  );
  assert.notEqual(ordinary, fingerprint([file], { TZ: 'UTC' }));
  assert.notEqual(ordinary, fingerprint([file], { TERM: 'dumb' }));
  assert.equal(
    ordinary,
    fingerprint([file], {
      npm_lifecycle_event: 'measure',
      npm_lifecycle_script: 'node scripts/measure.mjs',
    })
  );
});

test('the coverage report selector does not invalidate its own reuse fingerprint', (context) => {
  const root = fixture(context);
  const file = join(root, 'source.ts');
  writeFileSync(file, 'export const x = 1;');
  assert.equal(
    fingerprint([file], {}),
    fingerprint([file], {
      CONTRACT_COVERAGE_REPORT: '/tmp/existing-report.json',
    })
  );
});

test('the contract row produces and reuses a matching report, then rejects changed source', (context) => {
  const root = fixture(context);
  write(root, 'package.json', JSON.stringify({ workspaces: ['packages/*'] }));
  write(
    root,
    'packages/ai-chat/package.json',
    JSON.stringify({
      name: '@carbon/ai-chat',
      scripts: { test: 'node producer.cjs' },
    })
  );
  write(
    root,
    'packages/ai-chat-components/package.json',
    JSON.stringify({
      name: '@carbon/ai-chat-components',
      exports: { './package.json': './package.json' },
    })
  );
  write(
    root,
    'packages/ai-chat-components/es/stub.js',
    'export const built = true;'
  );
  write(root, RUNTIME_FILE, 'export const covered = 1;\n');
  const source = JSON.stringify(istanbul(join(root, RUNTIME_FILE)));
  write(
    root,
    'packages/ai-chat/producer.cjs',
    `
    const fs = require('node:fs');
    const path = require('node:path');
    const directory = process.argv.find(arg => arg.startsWith('--coverageDirectory=')).split('=')[1];
    fs.mkdirSync(directory, { recursive: true });
    fs.appendFileSync(path.resolve('../../producer-calls'), 'run\\n');
    fs.appendFileSync(path.resolve('../../producer-directories'), directory + '\\n');
    const child = require('node:child_process');
    if (process.env.COVERAGE_MOVE_INDEX) {
      const file = path.resolve('src/runtime/index.ts');
      const previous = fs.readFileSync(file);
      fs.writeFileSync(file, 'export const changedInIndex = true;');
      const result = child.spawnSync('git', ['add', '--', file], { cwd: path.resolve('../..') });
      if (result.status !== 0) throw new Error('index mutation failed');
      fs.writeFileSync(file, previous);
    }
    if (process.env.COVERAGE_MOVE_HEAD) {
      const result = child.spawnSync('git', ['commit', '--allow-empty', '-m', 'concurrent commit'], { cwd: path.resolve('../..') });
      if (result.status !== 0) throw new Error('head mutation failed');
    }
    fs.writeFileSync(path.join(directory, 'coverage-final.json'), ${JSON.stringify(source)});
  `
  );
  mkdirSync(join(root, 'node_modules/@carbon'), { recursive: true });
  symlinkSync(
    join(root, 'packages/ai-chat-components'),
    join(root, 'node_modules/@carbon/ai-chat-components')
  );
  commit(root);
  const before = git(root, 'rev-parse', 'HEAD');
  write(
    root,
    RUNTIME_FILE,
    'export const covered = 2;\nexport const missed = 3;\n'
  );
  const url = new URL('./contract-coverage.mjs', import.meta.url).href;
  const wrapper = join(root, 'measure-contract.mjs');
  writeFileSync(
    wrapper,
    `import { contractCoverage } from ${JSON.stringify(url)}; console.log(contractCoverage(process.argv[3] ?? 'HEAD', process.argv[2] ?? 'worktree'));`
  );
  const run = (extra = {}, selected = 'worktree', base = 'HEAD') =>
    spawnSync(process.execPath, [wrapper, selected, base], {
      cwd: root,
      env: { ...env, ...extra },
      encoding: 'utf8',
    });
  const first = run();
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /uncovered changed runtime lines: 1/);
  assert.match(first.stdout, /src\/runtime\/index.ts:2/);
  const report = first.stdout.match(/report: (.+)/)?.[1];
  assert.ok(report, first.stdout);
  context.after(() =>
    rmSync(dirname(report), { recursive: true, force: true })
  );
  const second = run({ CONTRACT_COVERAGE_REPORT: report });
  assert.equal(second.status, 0, second.stderr);
  assert.equal(second.stdout, first.stdout);
  assert.equal(readFileSync(join(root, 'producer-calls'), 'utf8'), 'run\n');
  write(
    root,
    RUNTIME_FILE,
    'export const covered = 4;\nexport const missed = 3;\n'
  );
  const stale = run({ CONTRACT_COVERAGE_REPORT: report });
  assert.match(stale.stdout, /unverified: coverage source fingerprint/);
  assert.doesNotMatch(stale.stdout, /uncovered changed runtime lines: 0/);
  git(root, 'add', RUNTIME_FILE);
  const indexMoved = run({ COVERAGE_MOVE_INDEX: '1' }, 'index');
  assert.match(indexMoved.stdout, /unverified: selected index changed/);
  git(root, 'add', RUNTIME_FILE);
  commit(root, 'selected head');
  const headMoved = run({ COVERAGE_MOVE_HEAD: '1' }, 'head', before);
  assert.match(headMoved.stdout, /unverified: selected head changed/);
  const directories = readFileSync(join(root, 'producer-directories'), 'utf8')
    .trim()
    .split('\n');
  context.after(() =>
    directories.forEach((directory) =>
      rmSync(directory, { recursive: true, force: true })
    )
  );
});

test('overwriting coverage bytes cannot reuse old contract metadata', (context) => {
  const root = fixture(context);
  const report = join(root, 'coverage-final.json');
  writeFileSync(report, '{}');
  writeFileSync(
    `${report}.meta.json`,
    JSON.stringify({
      fingerprint: 'fresh',
      report: createHash('sha256').update('{}').digest('hex'),
    })
  );
  assert.deepEqual(readVerifiedCoverage(report, 'fresh'), {});
  writeFileSync(
    report,
    JSON.stringify(istanbul(RUNTIME_FILE, { 0: 100, 1: 100 }, [100, 100]))
  );
  assert.throws(
    () => readVerifiedCoverage(report, 'fresh'),
    /coverage report digest/
  );
});

test('type-only lines inside an executed runtime declaration stay non-executable', () => {
  const source =
    'export const fn = (input: {\n value: string;\n}) => input.value;';
  const data = istanbul(RUNTIME_FILE);
  data[RUNTIME_FILE].statementMap = {
    0: { start: { line: 1, column: 0 }, end: { line: 3, column: 23 } },
  };
  data[RUNTIME_FILE].s = { 0: 1 };
  data[RUNTIME_FILE].branchMap[0].loc.end.line = 3;
  const result = coverageGaps(
    [{ file: RUNTIME_FILE, line: 2 }],
    data,
    () => source
  );
  assert.deepEqual(result.nonExecutable, [`${RUNTIME_FILE}:2`]);
  assert.deepEqual(result.gaps, []);
  assert.deepEqual(result.branches, []);
});

test('deletion-only runtime edits name the attribution limit without starting a producer', (context) => {
  const root = fixture(context);
  write(
    root,
    RUNTIME_FILE,
    'export const kept = 1;\nexport const removed = 2;\n'
  );
  commit(root);
  write(root, RUNTIME_FILE, 'export const kept = 1;\n');
  assert.match(
    contractReport(root),
    /skipped producer: 1 deleted source lines have no after-side runtime lines to attribute/
  );
  rmSync(join(root, RUNTIME_FILE));
  assert.match(
    contractReport(root),
    /skipped producer: 2 deleted source lines have no after-side runtime lines to attribute/
  );
});

test('class base expressions remain runtime while their type arguments are erased', () => {
  const file = 'packages/ai-chat/src/derived.ts';
  const location = {
    start: { line: 2, column: 2 },
    end: { line: 2, column: 24 },
  };
  const result = coverageGaps(
    [
      { file, line: 2 },
      { file, line: 3 },
    ],
    {
      [file]: {
        path: file,
        statementMap: { 0: location },
        s: { 0: 0 },
        branchMap: { 0: { loc: location, locations: [location, location] } },
        b: { 0: [0, 0] },
      },
    },
    () =>
      'export class Derived extends\n  (flag ? BaseA : BaseB)<\n    Shape\n  > {}'
  );
  assert.deepEqual(result.gaps, [`${file}:2`]);
  assert.deepEqual(result.nonExecutable, [`${file}:3`]);
  assert.deepEqual(result.branches, [
    `${file}:2 branch 0/0`,
    `${file}:2 branch 0/1`,
  ]);
});

test('standalone generic instantiation executes its expression while implements stays erased', () => {
  const file = RUNTIME_FILE;
  const source =
    'export const fn =\n  getFn()<Shape>;\nexport class Empty implements\n  Shape {}';
  const result = coverageGaps(
    [
      { file, line: 2 },
      { file, line: 4 },
    ],
    istanbul(file, { 0: 1, 1: 0 }),
    () => source
  );
  assert.deepEqual(result.gaps, [`${file}:2`]);
  assert.deepEqual(result.nonExecutable, [`${file}:4`]);
});

test('a covered initializer cannot cover an ignored nested runtime statement', async () => {
  const { createInstrumenter } = await import('istanbul-lib-instrument');
  const source =
    'export const fn = () => {\n  /* istanbul ignore next */\n  return missing();\n};';
  const instrumenter = createInstrumenter({ esModules: true });
  instrumenter.instrumentSync(source, RUNTIME_FILE);
  const data = instrumenter.lastFileCoverage();
  for (const id of Object.keys(data.s)) {
    data.s[id] = 1;
  }
  const result = coverageGaps(
    [{ file: RUNTIME_FILE, line: 3 }],
    { [RUNTIME_FILE]: data },
    () => source
  );
  assert.deepEqual(result.unverified, [`${RUNTIME_FILE}:3`]);
  assert.deepEqual(result.gaps, []);
});

test('a parenthesized arrow header keeps its declaration mapping', async () => {
  const { createInstrumenter } = await import('istanbul-lib-instrument');
  const source = 'export const fn = () => (\n  calculate()\n);';
  const instrumenter = createInstrumenter({ esModules: true });
  instrumenter.instrumentSync(source, RUNTIME_FILE);
  const data = instrumenter.lastFileCoverage();
  for (const [id, location] of Object.entries(data.statementMap)) {
    data.s[id] = location.start.line === 1 ? 1 : 0;
  }
  const result = coverageGaps(
    [
      { file: RUNTIME_FILE, line: 1 },
      { file: RUNTIME_FILE, line: 2 },
    ],
    { [RUNTIME_FILE]: data },
    () => source
  );
  assert.deepEqual(result.gaps, [`${RUNTIME_FILE}:2`]);
  assert.deepEqual(result.unverified, []);
});
