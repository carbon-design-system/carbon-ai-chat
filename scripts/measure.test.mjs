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
import {
  mkdirSync,
  mkdtempSync,
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
