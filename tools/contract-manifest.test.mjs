/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @license
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import {
  analyze,
  compareManifests,
  CONTRACT,
  emptyManifest,
  hash,
  MANIFEST,
  parseManifest,
  rowsFromReport,
  serialize,
} from './contract-manifest-lib.mjs';
import { inputFingerprint, policy } from './contract-manifest.mjs';

function fixture(context, source) {
  const root = mkdtempSync(join(tmpdir(), 'contract-manifest-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const file = `${CONTRACT}/spec/example_spec.ts`;
  for (const [path, content] of [
    [file, source],
    [`${CONTRACT}/helpers/nested/helper.ts`, 'export const fixture = 1;'],
  ]) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return { root, file };
}

function reportFor(root, file, source, names) {
  const { registrations } = analyze(file, source);
  return {
    success: true,
    numTotalTests: names.length,
    testResults: [
      {
        name: join(root, file),
        status: 'passed',
        assertionResults: names.map(([fullName, index]) => ({
          fullName,
          status: 'passed',
          location: registrations[index].location,
        })),
      },
    ],
  };
}

const simple =
  "const fixture = 1;\ndescribe('group', () => { beforeEach(() => reset(fixture)); it('case', () => { expect(fixture).toBe(1); }); });\n";

test('runtime expanded cases map to callbacks without deriving names', (context) => {
  const source =
    "describe.each(HOSTS)('host %s', () => { describe.each([1, 2])('nested %s', () => { it.each(DATA)('case %s', (n) => expect(n).toBe(1)); }); });";
  const { root, file } = fixture(context, source);
  const names = [
    ['host A nested 1 case 1', 0],
    ['host B nested 2 case 1', 0],
  ];
  const rows = rowsFromReport(root, reportFor(root, file, source, names));
  assert.equal(rows.filter((row) => row.kind === 'test').length, 2);
  assert.equal(rows.filter((row) => row.kind === 'helper').length, 1);
  assert.equal(
    rows.filter((row) => row.kind === 'test')[0].sha256,
    rows.filter((row) => row.kind === 'test')[1].sha256
  );
});

test('each locations point at the curried invocation, as Jest reports them', () => {
  const { registrations } = analyze(
    'example_spec.ts',
    "describe.each(['A','B'])('host %s', () => {\n  it.each([1,2])('case %s', (n) => expect(n).toBeGreaterThan(0));\n});"
  );
  assert.deepEqual(registrations[0].location, { line: 2, column: 17 });
});

test('describeShared keeps runtime driver titles as case identities', (context) => {
  const source =
    "describeShared('send', (makeDriver) => { it('sends once', async () => { const chat = await makeDriver(); await chat.send('hello'); }); });";
  const { root, file } = fixture(context, source);
  const rows = rowsFromReport(
    root,
    reportFor(root, file, source, [
      ['send [instance] sends once', 0],
      ['send [other] sends once', 0],
    ])
  );
  assert.deepEqual(
    rows.filter((row) => row.kind === 'test').map((row) => row.title),
    ['send [instance] sends once', 'send [other] sends once']
  );
});

test('shared JSX text retains meaningful whitespace in its context hash', () => {
  const source =
    "const fixture = <span>one two</span>; it('case', () => expect(fixture).toBeTruthy());";
  const before = analyze('example_spec.tsx', source).contexts.find(
    (row) => row.title === 'file'
  ).sha256;
  const after = analyze(
    'example_spec.tsx',
    source.replace('one two', 'one  two')
  ).contexts.find((row) => row.title === 'file').sha256;
  assert.notEqual(before, after);
});

test('standalone case additions leave every existing row intact', (context) => {
  const { root, file } = fixture(context, simple);
  const before = serialize(
    rowsFromReport(root, reportFor(root, file, simple, [['group case', 0]]))
  );
  const added = simple.replace(
    '}); });',
    "});\n// @covers new\nit('new', () => expect(true).toBe(true)); });"
  );
  writeFileSync(join(root, file), added);
  const after = serialize(
    rowsFromReport(
      root,
      reportFor(root, file, added, [
        ['group case', 0],
        ['group new', 1],
      ])
    )
  );
  assert.deepEqual(compareManifests(before, after), { added: 2, changed: 0 });
});

test('hooks, fixtures, parameter tables, and registration metadata are guarded', (context) => {
  const { root, file } = fixture(context, simple);
  const before = serialize(
    rowsFromReport(root, reportFor(root, file, simple, [['group case', 0]]))
  );
  for (const source of [
    simple.replace('fixture = 1', 'fixture = 2'),
    simple.replace('reset(fixture)', 'reset(2)'),
    simple.replace("it('case'", "it.each([1,2])('case'"),
  ]) {
    writeFileSync(join(root, file), source);
    const after = serialize(
      rowsFromReport(root, reportFor(root, file, source, [['group case', 0]]))
    );
    assert.throws(
      () => compareManifests(before, after),
      /require behavior-change/
    );
    assert.ok(compareManifests(before, after, ['behavior-change']).changed > 0);
  }
});

test('each registration-producing helper call has independent guarded arguments', (context) => {
  const source =
    "function pinMembers(name, expected) { it(`${name} members`, () => expect(read(name)).toEqual(expected)); }\npinMembers('One', {a:1});";
  const { root, file } = fixture(context, source);
  const before = serialize(
    rowsFromReport(root, reportFor(root, file, source, [['One members', 0]]))
  );
  const added = source + "\npinMembers('Two', {b:2});";
  writeFileSync(join(root, file), added);
  const after = serialize(
    rowsFromReport(
      root,
      reportFor(root, file, added, [
        ['One members', 0],
        ['Two members', 0],
      ])
    )
  );
  assert.deepEqual(compareManifests(before, after), { added: 2, changed: 0 });
  const edited = added.replace('{a:1}', '{a:2}');
  writeFileSync(join(root, file), edited);
  const changed = serialize(
    rowsFromReport(
      root,
      reportFor(root, file, edited, [
        ['One members', 0],
        ['Two members', 0],
      ])
    )
  );
  assert.throws(() => compareManifests(after, changed), /call:pinMembers/);
});

test('hashes normalize CRLF and sorted output ignores discovery order', (context) => {
  const { root, file } = fixture(context, simple);
  const rows = rowsFromReport(
    root,
    reportFor(root, file, simple, [['group case', 0]])
  );
  assert.equal(serialize(rows), serialize([...rows].reverse()));
  assert.equal(hash(simple), hash(simple.replaceAll('\n', '\r\n')));
  const windows = simple.replaceAll('\n', '\r\n');
  writeFileSync(join(root, file), windows);
  assert.equal(
    serialize(
      rowsFromReport(root, reportFor(root, file, windows, [['group case', 0]]))
    ),
    serialize(rows)
  );
  writeFileSync(join(root, file), simple);
  assert.equal(readFileSync(join(root, file), 'utf8'), simple);
});

test('CI reruns policy on label/base edits, checks fresh merge output, and gates the required test job', () => {
  const workflow = readFileSync(
    new URL('../.github/workflows/ci.yml', import.meta.url),
    'utf8'
  );
  assert.match(
    workflow,
    /pull_request:\n\s+types: \[opened, synchronize, reopened, edited, labeled, unlabeled\]/
  );
  assert.doesNotMatch(workflow, /pull_request_target/);
  assert.match(workflow, /permissions:\n\s+contents: read/);
  assert.ok(
    workflow.indexOf('npm run aiChat:build') <
      workflow.indexOf('npm run contract:manifest:check')
  );
  assert.match(
    workflow,
    /CONTRACT_BASE_SHA: \$\{\{ github.event.pull_request.base.sha \}\}/
  );
  assert.match(
    workflow,
    /CONTRACT_HEAD_SHA: \$\{\{ github.event.pull_request.head.sha \}\}/
  );
  assert.match(
    workflow,
    /git fetch --no-tags origin "\$CONTRACT_BASE_SHA" "\$CONTRACT_HEAD_SHA"/
  );
  assert.match(workflow, /needs: \[test-suite, contract-policy\]/);
});

test('invalid or incomplete discovery never silently shrinks the manifest', (context) => {
  const { root, file } = fixture(context, simple);
  const valid = reportFor(root, file, simple, [['group case', 0]]);
  for (const report of [
    { ...valid, success: false },
    { ...valid, numPendingTests: 1 },
    { ...valid, testResults: [] },
    { ...valid, numTotalTests: 2 },
  ]) {
    assert.throws(() => rowsFromReport(root, report));
  }
  const missing = structuredClone(valid);
  delete missing.testResults[0].assertionResults[0].location;
  assert.throws(() => rowsFromReport(root, missing), /location/);
  const duplicate = structuredClone(valid);
  duplicate.testResults[0].assertionResults.push(
    duplicate.testResults[0].assertionResults[0]
  );
  duplicate.numTotalTests++;
  assert.throws(() => serialize(rowsFromReport(root, duplicate)), /Duplicate/);
  for (const kind of ['it.only', 'it.skip', 'it.todo', 'fit', 'xdescribe']) {
    assert.throws(
      () => analyze(file, `${kind}('case', () => {});`),
      /Focused or skipped/
    );
  }
});

test('recursive helpers include all regular files, guard deletion, and reject symlinks', (context) => {
  const { root, file } = fixture(context, simple);
  const report = reportFor(root, file, simple, [['group case', 0]]);
  const before = serialize(rowsFromReport(root, report));
  const addition = join(root, CONTRACT, 'helpers/addition.json');
  writeFileSync(addition, '{"value":1}');
  assert.deepEqual(
    compareManifests(before, serialize(rowsFromReport(root, report))),
    { added: 1, changed: 0 }
  );
  rmSync(addition);
  const helper = join(root, CONTRACT, 'helpers/nested/helper.ts');
  writeFileSync(helper, 'export const fixture = 2;');
  assert.throws(
    () => compareManifests(before, serialize(rowsFromReport(root, report))),
    /helper/
  );
  rmSync(helper);
  assert.throws(
    () => compareManifests(before, serialize(rowsFromReport(root, report))),
    /helper/
  );
  symlinkSync(join(root, file), helper);
  assert.throws(() => rowsFromReport(root, report), /symlink/);
});

test('helper hashes preserve binary bytes and normalize only valid text fixtures', (context) => {
  const { root, file } = fixture(context, simple);
  const report = reportFor(root, file, simple, [['group case', 0]]);
  const helper = join(root, CONTRACT, 'helpers/nested/helper.ts');
  writeFileSync(helper, 'export const fixture = 1;\n');
  const text = serialize(rowsFromReport(root, report));
  writeFileSync(helper, 'export const fixture = 1;\r\n');
  assert.equal(serialize(rowsFromReport(root, report)), text);
  const binary = join(root, CONTRACT, 'helpers/fixture.bin');
  writeFileSync(binary, Buffer.from([0xff]));
  const invalidUtf8 = serialize(rowsFromReport(root, report));
  writeFileSync(binary, Buffer.from([0xfe]));
  assert.throws(
    () =>
      compareManifests(invalidUtf8, serialize(rowsFromReport(root, report))),
    /helper/
  );
  writeFileSync(binary, Buffer.from('\r\n'));
  const binaryCrlf = serialize(rowsFromReport(root, report));
  writeFileSync(binary, Buffer.from('\n'));
  assert.throws(
    () => compareManifests(binaryCrlf, serialize(rowsFromReport(root, report))),
    /helper/
  );
  writeFileSync(helper, Buffer.from([0xff]));
  const invalidText = serialize(rowsFromReport(root, report));
  writeFileSync(helper, Buffer.from([0xfe]));
  assert.throws(
    () =>
      compareManifests(invalidText, serialize(rowsFromReport(root, report))),
    /helper/
  );
});

test('schema rejects malformed rows and rename means removal plus addition', () => {
  const row = {
    kind: 'test',
    file: `${CONTRACT}/spec/a_spec.ts`,
    title: 'one',
    sha256: hash('body'),
  };
  const before = serialize([row]);
  assert.throws(
    () => compareManifests(before, serialize([{ ...row, title: 'two' }])),
    /require behavior-change/
  );
  assert.deepEqual(compareManifests(emptyManifest(), before), {
    added: 1,
    changed: 0,
  });
  for (const text of [
    'bad',
    before.replace('test\t', 'unknown\t'),
    before.replace(row.sha256, 'x'),
    before + before.slice(before.indexOf('\n') + 1),
  ]) {
    assert.throws(() => parseManifest(text));
  }
  assert.equal(MANIFEST, `${CONTRACT}/MANIFEST.tsv`);
});

const gitEnv = {
  ...process.env,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'Contract test',
  GIT_COMMITTER_NAME: 'Contract test',
  GIT_AUTHOR_EMAIL: 'contract@example.test',
  GIT_COMMITTER_EMAIL: 'contract@example.test',
};

function git(root, ...args) {
  const result = spawnSync('git', args, {
    cwd: root,
    env: gitEnv,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

test('policy reads exact base/head snapshots, bootstraps only absent base manifests, and rejects unavailable refs', (context) => {
  const { root } = fixture(context, simple);
  git(root, 'init', '--initial-branch=main');
  git(root, 'add', '.');
  git(root, 'commit', '-m', 'base');
  const base = git(root, 'rev-parse', 'HEAD');
  const row = {
    kind: 'test',
    file: `${CONTRACT}/spec/example_spec.ts`,
    title: 'case',
    sha256: hash('one'),
  };
  writeFileSync(join(root, MANIFEST), serialize([row]));
  git(root, 'add', '.');
  git(root, 'commit', '-m', 'manifest');
  const head = git(root, 'rev-parse', 'HEAD');
  assert.deepEqual(policy(root, base, head, []), { added: 1, changed: 0 });
  writeFileSync(
    join(root, MANIFEST),
    serialize([{ ...row, sha256: hash('two') }])
  );
  git(root, 'add', '.');
  git(root, 'commit', '-m', 'changed');
  const changed = git(root, 'rev-parse', 'HEAD');
  assert.throws(() => policy(root, head, changed, []), /behavior-change/);
  assert.deepEqual(policy(root, head, changed, ['behavior-change']), {
    added: 0,
    changed: 1,
  });
  assert.deepEqual(policy(root, base, head, []), { added: 1, changed: 0 });
  assert.throws(() => policy(root, '0'.repeat(40), head, []), /git failed/);
  assert.throws(() => policy(root, 'main', head, []), /exact/);
  assert.throws(() => policy(root, head, base, []), /Head commit is missing/);
});

test('passing body edits fail staleness and every discovery input invalidates report reuse', (context) => {
  const source =
    "describe('group', () => {\n it('case', () => expect(1).toBe(1));\n});\n";
  const { root, file } = fixture(context, source);
  const write = (path, content) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  };
  write(
    'package.json',
    JSON.stringify({ private: true, workspaces: ['packages/ai-chat'] })
  );
  write('package-lock.json', '{}');
  write(
    'packages/ai-chat/package.json',
    JSON.stringify({
      name: '@carbon/ai-chat',
      scripts: { test: 'jest --config jest.config.cjs --runInBand' },
    })
  );
  write(
    'packages/ai-chat/jest.config.cjs',
    "module.exports={testEnvironment:'node',testMatch:['**/tests/contract/spec/*_spec.ts']};"
  );
  write('packages/ai-chat/tsconfig.json', '{}');
  write('packages/ai-chat/.babelrc', '{}');
  write('packages/ai-chat/src/runtime.ts', 'export const value = 1;');
  write('packages/ai-chat-components/package.json', '{}');
  write(
    'packages/ai-chat-components/src/runtime.ts',
    'export const value = 1;'
  );
  write('packages/ai-chat-components/es/runtime.js', 'export const value = 1;');
  write('packages/ai-chat/dist/es/runtime.js', 'export const value = 1;');
  for (const name of ['contract-manifest.mjs', 'contract-manifest-lib.mjs']) {
    write(`tools/${name}`, readFileSync(new URL(`./${name}`, import.meta.url)));
  }
  symlinkSync(
    fileURLToPath(new URL('../node_modules', import.meta.url)),
    join(root, 'node_modules')
  );
  const run = (mode) =>
    spawnSync(
      process.execPath,
      [
        join(root, 'tools/contract-manifest.mjs'),
        mode,
        '--report',
        join(root, 'report.json'),
      ],
      { cwd: root, encoding: 'utf8' }
    );
  write('.gitignore', 'node_modules/\nreport.json*\n');
  git(root, 'init', '--initial-branch=main');
  git(root, 'add', '.');
  git(root, 'commit', '-m', 'event base');
  const eventBase = git(root, 'rev-parse', 'HEAD');
  assert.equal(run('write').status, 0);
  assert.equal(run('check').status, 0);
  git(root, 'add', MANIFEST);
  git(root, 'commit', '-m', 'event head manifest');
  const eventHead = git(root, 'rev-parse', 'HEAD');
  const metadata = JSON.parse(
    readFileSync(join(root, 'report.json.inputs.json'), 'utf8')
  );
  for (const key of [
    'AICHAT_DISABLE_WEB_COMPONENT_BRIDGE',
    'NODE_ENV',
    'NODE_OPTIONS',
    'CONTRACT_DISCOVERY_FIXTURE_ENV',
  ]) {
    const previous = process.env[key];
    const unchanged = inputFingerprint(root);
    try {
      process.env[key] = `${previous ?? ''}-changed`;
      assert.notEqual(inputFingerprint(root), unchanged, key);
      if (key === 'AICHAT_DISABLE_WEB_COMPONENT_BRIDGE') {
        const rerun = run('check');
        assert.equal(rerun.status, 0, rerun.stdout + rerun.stderr);
        assert.match(rerun.stderr, /1 passed/);
        const current = JSON.parse(
          readFileSync(join(root, 'report.json.inputs.json'), 'utf8')
        );
        assert.notEqual(current.runtime, metadata.runtime);
      }
    } finally {
      if (previous === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous;
      }
    }
  }
  const fingerprint = inputFingerprint(root);
  for (const path of [
    file,
    `${CONTRACT}/helpers/nested/helper.ts`,
    'packages/ai-chat/jest.config.cjs',
    'packages/ai-chat-components/es/runtime.js',
  ]) {
    const original = readFileSync(join(root, path), 'utf8');
    write(path, `${original}\n// different\n`);
    assert.notEqual(inputFingerprint(root), fingerprint);
    write(path, original);
  }
  const builtFile = join(root, 'packages/ai-chat-components/es/runtime.js');
  const built = readFileSync(builtFile);
  writeFileSync(builtFile, Buffer.from([0xff]));
  const invalidBuiltUtf8 = inputFingerprint(root);
  writeFileSync(builtFile, Buffer.from([0xfe]));
  assert.notEqual(inputFingerprint(root), invalidBuiltUtf8);
  writeFileSync(builtFile, built);
  write(file, source.replace('toBe(1)', 'toBe(Number(1))'));
  git(root, 'add', file);
  git(root, 'commit', '-m', 'checked out merge tree');
  assert.notEqual(git(root, 'rev-parse', 'HEAD'), eventHead);
  const comparison = policy(root, eventBase, eventHead, []);
  assert.equal(comparison.changed, 0);
  assert.ok(comparison.added > 0);
  const result = run('check');
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /manifest is stale/);
  assert.match(result.stderr, /1 passed/);
});
