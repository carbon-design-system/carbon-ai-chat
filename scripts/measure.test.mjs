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
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

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
