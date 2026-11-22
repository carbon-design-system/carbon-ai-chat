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
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import {
  analyze,
  compareManifests,
  CONTRACT,
  contractInventory,
  emptyManifest,
  hash,
  MANIFEST,
  parseManifest,
  rowsFromReport,
  rowsFromColocatedReport,
  serialize,
} from './contract-manifest-lib.mjs';
import {
  carryColocatedManifest,
  inputFingerprint,
  policy,
} from './contract-manifest.mjs';

function fixture(context, source) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'contract-manifest-')));
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

test('one inventory adds explicit colocated contracts while preserving legacy rows', (context) => {
  const { root, file } = fixture(context, simple);
  const legacy = reportFor(root, file, simple, [['group case', 0]]);
  const before = serialize(rowsFromReport(root, legacy));
  const write = (path, content) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  };
  const source = "it('case', () => expect(true).toBe(true));";
  const additions = ['sdk', 'chat', 'react', 'web-components'].map(
    (area, index) =>
      `packages/ai-chat/src/${area}/__tests__/nested/added.contract${index % 2 ? '.browser' : ''}.test.ts${index % 2 ? 'x' : ''}`
  );
  for (const path of additions) {
    write(path, source);
  }
  const helper = 'packages/ai-chat/src/sdk/__tests__/helpers/publicContract.ts';
  write(helper, 'export const fixture = 1;');
  const lifecycle = helper.replace('publicContract', 'lifecycleControl');
  write(lifecycle, 'export const fixture = 1;');
  for (const path of [
    'packages/ai-chat/src/sdk/__tests__/ordinary.test.ts',
    'packages/ai-chat/src/sdk/__tests__/helpers/internal.ts',
    'packages/ai-chat/src/sdk/private/__tests__/nested.contract.test.ts',
    'packages/ai-chat/src/types/__tests__/outside.contract.test.ts',
    'packages/ai-chat/src/chat/__tests__/wrong.contract.test.browser.ts',
  ]) {
    write(path, "import './private';");
  }
  const inventory = contractInventory(root);
  assert.deepEqual(inventory.specs, [file, ...additions]);
  assert.deepEqual(inventory.helpers, [
    `${CONTRACT}/helpers/nested/helper.ts`,
    helper,
    lifecycle,
  ]);
  const report = {
    ...legacy,
    numTotalTests: legacy.numTotalTests + additions.length,
    testResults: [
      ...legacy.testResults,
      ...additions.flatMap(
        (path) => reportFor(root, path, source, [['case', 0]]).testResults
      ),
    ],
  };
  const rows = rowsFromReport(root, report);
  assert.deepEqual(compareManifests(before, serialize(rows)), {
    added: 14,
    changed: 0,
  });
  assert.throws(() => rowsFromReport(root, legacy), /Incomplete/);
  write(helper, 'export const fixture = 2;');
  assert.throws(
    () =>
      compareManifests(
        serialize(rows),
        serialize(rowsFromReport(root, report))
      ),
    /helper/
  );
});

test('manifest kinds accept only registered contract paths', () => {
  const row = { kind: 'test', title: 'case', sha256: hash('body') };
  for (const file of [
    'packages/ai-chat/src/sdk/__tests__/ordinary.test.ts',
    'packages/ai-chat/src/sdk/private/__tests__/case.contract.test.ts',
    'packages/ai-chat/src/types/__tests__/case.contract.test.ts',
    'packages/ai-chat/src/sdk/__tests__/case.contract.browser.test.ts.bak',
    'packages/ai-chat/src/sdk/__tests__/../case.contract.test.ts',
  ]) {
    assert.throws(() => serialize([{ ...row, file }]));
  }
  const helper = 'packages/ai-chat/src/sdk/__tests__/helpers/publicContract.ts';
  assert.equal(
    parseManifest(
      serialize([{ ...row, kind: 'helper', file: helper, title: '' }])
    ).size,
    1
  );
  for (const file of [helper.replace('publicContract', 'internal'), helper]) {
    assert.throws(() => serialize([{ ...row, file }]));
  }
  assert.throws(() =>
    serialize([
      {
        ...row,
        kind: 'helper',
        file: helper.replace('publicContract', 'internal'),
        title: '',
      },
    ])
  );
});

test('D4 checks local static, type, export, require, dynamic and vi module imports in suites and helpers', (context) => {
  const { root, file } = fixture(context, simple);
  const sourceRoot = 'packages/ai-chat/src';
  const helpers = ['publicContract', 'lifecycleControl'].map(
    (name) => `${sourceRoot}/sdk/__tests__/helpers/${name}.ts`
  );
  const write = (path, content) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  };
  const allowed = [
    `${sourceRoot}/sdk/index.ts`,
    `${sourceRoot}/aiChatEntry.tsx`,
    `${sourceRoot}/serverEntry.ts`,
    `${sourceRoot}/types/public.ts`,
    `${sourceRoot}/testing/TestId.ts`,
    `${sourceRoot}/web-components/cds-aichat-container/index.ts`,
    `${sourceRoot}/web-components/cds-aichat-custom-element/index.ts`,
  ];
  const privateFiles = [
    `${sourceRoot}/sdk/services/ServiceManager.ts`,
    `${sourceRoot}/sdk/handle.ts`,
    `${sourceRoot}/sdk/__tests__/helpers/internal.ts`,
  ];
  for (const path of [...allowed, ...privateFiles]) {
    write(path, 'export const value = 1;');
  }
  for (const helper of helpers) {
    write(helper, 'export const value = 1;');
  }
  const importer = `${sourceRoot}/sdk/__tests__/case.contract.test.ts`;
  for (const target of [file, importer, ...helpers]) {
    const specifier = (path) => {
      const name = relative(dirname(target), path).replaceAll('\\', '/');
      return name.startsWith('.') ? name : `./${name}`;
    };
    for (const path of [...allowed, ...helpers]) {
      for (const statement of [
        `import '${specifier(path)}';`,
        `vi.mock(import('${specifier(path)}'));`,
      ]) {
        write(target, statement);
        assert.doesNotThrow(() => contractInventory(root));
      }
    }
    for (const path of privateFiles) {
      const name = JSON.stringify(specifier(path));
      for (const statement of [
        `import { value } from ${name};`,
        `import type { value } from ${name};`,
        `export { value } from ${name};`,
        `type Value = import(${name}).value;`,
        `const value = require(${name});`,
        `const value = import(${name});`,
        `const value = vi.importActual(${name});`,
        `vi.mock(${name});`,
        `const value = vitest.importActual(${name});`,
        `vi.mock(import(${name}));`,
      ]) {
        write(target, statement);
        assert.throws(() => contractInventory(root), /Private/);
      }
    }
    for (const statement of [
      "import './missing';",
      "import '@carbon/ai-chat/dist/es/sdk/handle.js';",
      'const value = import(target);',
      'const value = require(target);',
      'vi.doMock(target);',
    ]) {
      write(target, statement);
      assert.throws(() => contractInventory(root), /contract import/);
    }
    write(
      target,
      helpers.includes(target) ? 'export const value = 1;' : simple
    );
  }
});

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

test('each locations point at the curried invocation, as Vitest reports them', () => {
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

function colocatedCarryFixture(context) {
  const { root, file } = fixture(context, simple);
  const frozen = serialize(
    rowsFromReport(root, reportFor(root, file, simple, [['group case', 0]]))
  );
  writeFileSync(join(root, MANIFEST), frozen);
  git(root, 'init', '--initial-branch=main');
  git(root, 'add', '.');
  git(root, 'commit', '-m', 'frozen legacy contracts');
  const base = git(root, 'rev-parse', 'HEAD');
  const specs = ['one', 'two'].map(
    (name) => `packages/ai-chat/src/sdk/__tests__/${name}.contract.test.ts`
  );
  const source = "it('SDK case', () => expect(true).toBe(true));";
  const helper = 'packages/ai-chat/src/sdk/__tests__/helpers/publicContract.ts';
  for (const [path, content] of [
    ...specs.map((path) => [path, source]),
    [helper, 'export const fixture = 1;'],
  ]) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  const report = {
    success: true,
    wasInterrupted: false,
    numTotalTestSuites: 2,
    numPassedTestSuites: 2,
    numFailedTestSuites: 0,
    numPendingTestSuites: 0,
    numRuntimeErrorTestSuites: 0,
    numTotalTests: 2,
    numPassedTests: 2,
    numFailedTests: 0,
    numPendingTests: 0,
    numTodoTests: 0,
    testResults: specs.flatMap(
      (path) => reportFor(root, path, source, [['SDK case', 0]]).testResults
    ),
  };
  return { root, file, frozen, base, specs, helper, source, report };
}

test('Colocated carry preserves every legacy row and rebuilds all colocated rows and helpers', (context) => {
  const { root, frozen, base, specs, helper, source, report } =
    colocatedCarryFixture(context);
  const before = carryColocatedManifest(root, base, report);
  assert.equal(before.carriedRows, parseManifest(frozen).size);
  assert.equal(before.carriedCases, 1);
  assert.equal(before.executedCases, 2);
  assert.deepEqual(before.executedSuites, specs);
  const legacyLines = (text) =>
    text.split('\n').filter((line) => line.includes(`\t${CONTRACT}/`));
  assert.deepEqual(legacyLines(before.generated), legacyLines(frozen));
  assert.equal(Object.keys(before.sourcePins).length, 2);
  writeFileSync(join(root, MANIFEST), before.generated);
  const edited = source.replace('toBe', 'toEqual');
  writeFileSync(join(root, specs[0]), edited);
  writeFileSync(join(root, helper), 'export const fixture = 2;');
  const fresh = structuredClone(report);
  fresh.testResults[0] = reportFor(root, specs[0], edited, [
    ['SDK case', 0],
  ]).testResults[0];
  const after = carryColocatedManifest(root, base, fresh);
  assert.deepEqual(legacyLines(after.generated), legacyLines(frozen));
  assert.equal(after.executedCases, 2);
  assert.ok(
    compareManifests(before.generated, after.generated, ['behavior-change'])
      .changed >= 2
  );
  assert.equal(
    after.rows.find((row) => row.kind === 'helper' && row.file === helper)
      .sha256,
    hash('export const fixture = 2;')
  );
});

test('Colocated carry fails closed for dirty legacy helper, body, context, rows or missing source', (context) => {
  const { root, file, frozen, base, report } = colocatedCarryFixture(context);
  for (const [path, edited] of [
    [`${CONTRACT}/helpers/nested/helper.ts`, 'export const fixture = 2;'],
    [file, simple.replace('fixture = 1', 'fixture = 2')],
    [file, simple.replace('toBe(1)', 'toBe(2)')],
  ]) {
    const original = readFileSync(join(root, path));
    writeFileSync(join(root, path), edited);
    assert.throws(
      () => carryColocatedManifest(root, base, report),
      /Legacy source bytes differ/
    );
    assert.throws(
      () => rowsFromColocatedReport(root, report, frozen),
      /Frozen legacy/
    );
    writeFileSync(join(root, path), original);
  }
  writeFileSync(join(root, file), simple + '\n// source-only change\n');
  assert.throws(
    () => carryColocatedManifest(root, base, report),
    /Legacy source bytes differ/
  );
  writeFileSync(join(root, file), simple);
  writeFileSync(
    join(root, MANIFEST),
    frozen.replace(hash('export const fixture = 1;'), hash('dirty row'))
  );
  assert.throws(
    () => carryColocatedManifest(root, base, report),
    /Current legacy manifest rows differ/
  );
  writeFileSync(join(root, MANIFEST), frozen);
  const addition = `${CONTRACT}/spec/new_spec.ts`;
  writeFileSync(join(root, addition), simple);
  assert.throws(
    () => carryColocatedManifest(root, base, report),
    /legacy inventory differs/
  );
  rmSync(join(root, addition));
  writeFileSync(
    join(root, MANIFEST),
    frozen
      .split('\n')
      .filter((line) => !line.startsWith('test\t'))
      .join('\n')
  );
  assert.throws(
    () => carryColocatedManifest(root, base, report),
    /Current legacy manifest rows differ/
  );
  writeFileSync(join(root, MANIFEST), frozen);
  const original = readFileSync(join(root, file));
  rmSync(join(root, file));
  assert.throws(() => carryColocatedManifest(root, base, report), /ENOENT/);
  writeFileSync(join(root, file), original);
  assert.throws(
    () => carryColocatedManifest(root, 'main', report),
    /exact base commit/
  );
  assert.throws(
    () => carryColocatedManifest(root, '0'.repeat(40), report),
    /git failed/
  );
});

test('Colocated carry requires the complete passing colocated suite set and runtime locations', (context) => {
  const { root, base, specs, source, report } = colocatedCarryFixture(context);
  const invalid = [
    { ...report, success: false },
    { ...report, numFailedTests: 1 },
    { ...report, numPendingTests: 1 },
    { ...report, numPendingTestSuites: 1 },
    { ...report, numTodoTests: 1 },
    { ...report, wasInterrupted: true },
    { ...report, numRuntimeErrorTestSuites: 1 },
    { ...report, numTotalTests: 3, numPassedTests: 3 },
    { ...report, numPassedTestSuites: 1 },
    { ...report, testResults: report.testResults.slice(0, 1) },
    {
      ...report,
      numTotalTestSuites: 1,
      numPassedTestSuites: 1,
      numTotalTests: 1,
      numPassedTests: 1,
      testResults: report.testResults.slice(0, 1),
    },
  ];
  for (const value of invalid) {
    assert.throws(() => carryColocatedManifest(root, base, value));
  }
  for (const field of [
    'numPassedTests',
    'numPendingTestSuites',
    'wasInterrupted',
  ]) {
    const missing = structuredClone(report);
    delete missing[field];
    assert.throws(
      () => carryColocatedManifest(root, base, missing),
      /complete unfiltered/
    );
  }
  for (const status of ['pending', 'failed']) {
    const incomplete = structuredClone(report);
    incomplete.testResults[0].assertionResults[0].status = status;
    assert.throws(
      () => carryColocatedManifest(root, base, incomplete),
      /location, or pass/
    );
  }
  const missingLocation = structuredClone(report);
  missingLocation.testResults[0].assertionResults[0].location = null;
  assert.throws(
    () => carryColocatedManifest(root, base, missingLocation),
    /location/
  );
  const missingRegistration = structuredClone(report);
  missingRegistration.testResults[0].assertionResults = [];
  assert.throws(
    () => carryColocatedManifest(root, base, missingRegistration),
    /empty/
  );
  writeFileSync(
    join(root, specs[0]),
    source + "\nit('uncollected case', () => expect(true).toBe(true));"
  );
  assert.throws(
    () => carryColocatedManifest(root, base, report),
    /Uncollected registration/
  );
});

test('Colocated carry rejects ordinary and private suites and includes every colocated area', (context) => {
  const { root, base, specs, source, report } = colocatedCarryFixture(context);
  const ordinary = 'packages/ai-chat/src/sdk/__tests__/ordinary.test.ts';
  writeFileSync(join(root, ordinary), source);
  const extra = structuredClone(report);
  extra.testResults.push(
    ...reportFor(root, ordinary, source, [['ordinary', 0]]).testResults
  );
  extra.numTotalTests++;
  extra.numPassedTests++;
  assert.throws(() => carryColocatedManifest(root, base, extra), /Unexpected/);
  const privateSource = 'packages/ai-chat/src/sdk/services/ServiceManager.ts';
  mkdirSync(dirname(join(root, privateSource)), { recursive: true });
  writeFileSync(join(root, privateSource), 'export const value = 1;');
  writeFileSync(
    join(root, specs[0]),
    "import '../services/ServiceManager';\n" + source
  );
  assert.throws(() => carryColocatedManifest(root, base, report), /Private/);
  writeFileSync(join(root, specs[0]), source);
  const additions = ['chat', 'react', 'web-components'].map(
    (area) =>
      `packages/ai-chat/src/${area}/__tests__/added.contract.browser.test.tsx`
  );
  for (const file of additions) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), source);
  }
  assert.throws(
    () => carryColocatedManifest(root, base, report),
    /complete unfiltered/
  );
  const complete = structuredClone(report);
  complete.numTotalTestSuites += additions.length;
  complete.numPassedTestSuites += additions.length;
  complete.numTotalTests += additions.length;
  complete.numPassedTests += additions.length;
  complete.testResults.push(
    ...additions.flatMap(
      (file) => reportFor(root, file, source, [['host case', 0]]).testResults
    )
  );
  assert.equal(carryColocatedManifest(root, base, complete).executedCases, 5);
});

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
      type: 'module',
      scripts: { test: 'vitest run' },
    })
  );
  write(
    'packages/ai-chat/vitest.config.ts',
    "export default {test:{globals:true,environment:'node',include:['tests/contract/spec/*_spec.ts','**/__tests__/**/*.test.ts']}};"
  );
  write('packages/ai-chat/tsconfig.json', '{}');
  write('packages/ai-chat/src/runtime.ts', 'export const value = 1;');
  const sdkContract =
    'packages/ai-chat/src/sdk/__tests__/added.contract.test.ts';
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
  const run = (mode, extra = []) =>
    spawnSync(
      process.execPath,
      [
        join(root, 'tools/contract-manifest.mjs'),
        mode,
        '--report',
        join(root, 'report.json'),
        ...extra,
      ],
      { cwd: root, encoding: 'utf8' }
    );
  write('.gitignore', 'node_modules/\nreport.json*\n');
  const frozenLegacy = serialize(
    rowsFromReport(root, reportFor(root, file, source, [['group case', 0]]))
  );
  write(MANIFEST, frozenLegacy);
  git(root, 'init', '--initial-branch=main');
  git(root, 'add', '.');
  git(root, 'commit', '-m', 'event base');
  const eventBase = git(root, 'rev-parse', 'HEAD');
  write(sdkContract, "it('sdk case', () => expect(1).toBe(1));");
  write(
    'packages/ai-chat/src/sdk/__tests__/ordinary.test.ts',
    "it('ordinary test is outside discovery', () => { throw new Error('must not run'); });"
  );
  const carryArgs = ['--carry-colocated-base', eventBase];
  const carried = run('write', carryArgs);
  assert.equal(carried.status, 0, carried.stdout + carried.stderr);
  assert.match(
    carried.stdout,
    /1 carried legacy cases; 1 executed colocated cases/
  );
  assert.match(carried.stdout + carried.stderr, /1 passed/);
  const narrow = JSON.parse(readFileSync(join(root, 'report.json'), 'utf8'));
  assert.equal(narrow.numTotalTests, 1);
  assert.deepEqual(
    narrow.testResults.map((suite) => suite.name),
    [join(root, sdkContract)]
  );
  const provenance = JSON.parse(
    readFileSync(join(root, 'report.json.carry.json'), 'utf8')
  );
  assert.equal(provenance.kind, 'legacy-source-carry-with-colocated-execution');
  assert.equal(provenance.base, eventBase);
  assert.equal(provenance.baseManifest, hash(Buffer.from(frozenLegacy)));
  assert.equal(
    provenance.report,
    hash(readFileSync(join(root, 'report.json')))
  );
  assert.equal(
    provenance.generatedManifest,
    hash(readFileSync(join(root, MANIFEST)))
  );
  assert.equal(provenance.carriedLegacyRows, parseManifest(frozenLegacy).size);
  assert.equal(provenance.carriedLegacyCases, 1);
  assert.equal(provenance.executedColocatedCases, 1);
  assert.deepEqual(provenance.executedColocatedSuites, [sdkContract]);
  const narrowMetadata = JSON.parse(
    readFileSync(join(root, 'report.json.inputs.json'), 'utf8')
  );
  assert.equal(narrowMetadata.scope, 'colocated');
  const reused = run('check', carryArgs);
  assert.equal(reused.status, 0, reused.stdout + reused.stderr);
  assert.doesNotMatch(reused.stdout + reused.stderr, /passed/);
  rmSync(join(root, 'report.json.inputs.json'));
  const raw = run('check', carryArgs);
  assert.equal(raw.status, 0, raw.stdout + raw.stderr);
  assert.match(raw.stdout + raw.stderr, /1 passed/);
  const invalidBase = run('write', ['--carry-colocated-base', 'main']);
  assert.equal(invalidBase.status, 1);
  assert.match(invalidBase.stderr, /exact base SHA/);
  const full = run('write');
  assert.equal(full.status, 0, full.stdout + full.stderr);
  assert.match(full.stdout + full.stderr, /2 passed/);
  assert.equal(run('check').status, 0);
  const discovery = JSON.parse(readFileSync(join(root, 'report.json'), 'utf8'));
  assert.equal(discovery.numTotalTests, 2);
  assert.deepEqual(
    discovery.testResults.map((suite) => suite.name).sort(),
    [join(root, file), join(root, sdkContract)].sort()
  );
  git(root, 'add', MANIFEST, 'packages/ai-chat/src/sdk/__tests__');
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
        assert.match(rerun.stdout + rerun.stderr, /2 passed/);
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
    'packages/ai-chat/vitest.config.ts',
    'packages/ai-chat-components/es/runtime.js',
    'tools/contract-manifest-lib.mjs',
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
  assert.match(result.stdout + result.stderr, /2 passed/);
});
