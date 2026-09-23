/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const updater = path.join(__dirname, 'update-versions-file.cjs');

function run(command, args, cwd, env = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || `${command} failed`);
  }
  return result.stdout;
}

function fixture(t) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'versions-update-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  fs.mkdirSync(path.join(cwd, 'packages/ai-chat'), { recursive: true });
  fs.mkdirSync(path.join(cwd, 'packages/ai-chat-components'), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(cwd, 'packages/ai-chat/package.json'),
    JSON.stringify({ version: '1.21.0' })
  );
  fs.writeFileSync(
    path.join(cwd, 'packages/ai-chat-components/package.json'),
    JSON.stringify({ version: '1.11.0' })
  );
  fs.writeFileSync(
    path.join(cwd, 'versions.js'),
    "export const AI_CHAT_VERSIONS = ['v1.20.0'];\n"
  );
  run('git', ['init', '-q'], cwd);
  run(
    'git',
    ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'add', '.'],
    cwd
  );
  run(
    'git',
    [
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.com',
      'commit',
      '-qm',
      'fixture',
    ],
    cwd
  );
  const sha = run('git', ['rev-parse', 'HEAD'], cwd).trim();
  const env = {
    BUILD_SHA: sha,
    CHAT_VERSION: '1.21.0',
    COMPONENTS_VERSION: '1.11.0',
    SEED_VERIFIED: 'true',
  };
  return { cwd, env };
}

test('merges published history across branches and reruns without duplicates', (t) => {
  const { cwd, env } = fixture(t);
  fs.writeFileSync(
    path.join(cwd, 'published-versions.js'),
    "export const AI_CHAT_VERSIONS = ['v1.22.0', 'v1.20.0',];\n" +
      "export const AI_CHAT_COMPONENTS_VERSIONS = ['v1.12.0', 'v1.11.0',];\n"
  );

  run('node', [updater], cwd, env);
  const first = fs.readFileSync(path.join(cwd, 'versions.js'), 'utf8');
  assert.match(first, /'v1\.22\.0',[\s\S]*'v1\.21\.0',[\s\S]*'v1\.20\.0'/);
  assert.match(first, /'v1\.12\.0',[\s\S]*'v1\.11\.0'/);
  run('node', [updater], cwd, env);
  assert.equal(fs.readFileSync(path.join(cwd, 'versions.js'), 'utf8'), first);
});

test('requires verified seed pages before adding the components list', (t) => {
  const { cwd, env } = fixture(t);
  fs.writeFileSync(
    path.join(cwd, 'published-versions.js'),
    "export const AI_CHAT_VERSIONS = ['v1.20.0',];\n"
  );
  const original = fs.readFileSync(path.join(cwd, 'versions.js'), 'utf8');
  assert.throws(() =>
    run('node', [updater], cwd, { ...env, SEED_VERIFIED: '' })
  );
  assert.equal(
    fs.readFileSync(path.join(cwd, 'versions.js'), 'utf8'),
    original
  );
  run('node', [updater], cwd, env);
  assert.match(
    fs.readFileSync(path.join(cwd, 'versions.js'), 'utf8'),
    /AI_CHAT_COMPONENTS_VERSIONS = \[\n {2}'v1\.11\.0'/
  );
});

test('rejects invalid published data and versions absent from the built SHA', (t) => {
  const { cwd, env } = fixture(t);
  fs.writeFileSync(
    path.join(cwd, 'published-versions.js'),
    "export const AI_CHAT_VERSIONS = ['v1.20.0',];\n" +
      "export const AI_CHAT_COMPONENTS_VERSIONS = ['v1.11.0-rc.0'];\n"
  );
  const original = fs.readFileSync(path.join(cwd, 'versions.js'), 'utf8');
  assert.throws(() => run('node', [updater], cwd, env));
  assert.equal(
    fs.readFileSync(path.join(cwd, 'versions.js'), 'utf8'),
    original
  );

  fs.writeFileSync(
    path.join(cwd, 'published-versions.js'),
    "export const AI_CHAT_VERSIONS = ['v1.20.0',];\n" +
      "export const AI_CHAT_COMPONENTS_VERSIONS = ['v1.11.0',];\n"
  );
  assert.throws(() =>
    run('node', [updater], cwd, { ...env, COMPONENTS_VERSION: '1.12.0' })
  );
  assert.equal(
    fs.readFileSync(path.join(cwd, 'versions.js'), 'utf8'),
    original
  );
});
