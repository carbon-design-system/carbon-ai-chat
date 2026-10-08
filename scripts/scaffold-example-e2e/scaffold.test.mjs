/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';
import { scaffoldExampleE2e } from './scaffold-lib.mjs';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const examples = ['react/new-concern', 'web-components/new-concern'];
const createOptions = {
  example: examples,
  concern: 'new-concern',
  startup: 'input',
  purpose: 'Check the host behavior in both frameworks.',
};
const playwrightVersion = '^1.63.0';

function write(root, path, content) {
  const destination = join(root, path);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, content);
}

function fixture(context) {
  const root = mkdtempSync(join(tmpdir(), 'caic-e2e-scaffold-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  write(
    root,
    'examples/react/basic-custom-element-fullscreen/package.json',
    JSON.stringify({
      devDependencies: { '@playwright/test': playwrightVersion },
    })
  );
  write(
    root,
    'examples/react/basic-custom-element-fullscreen/playwright.config.ts',
    readFileSync(
      join(
        repository,
        'examples/react/basic-custom-element-fullscreen/playwright.config.ts'
      ),
      'utf8'
    )
  );
  for (const file of ['baseConfig.mts', 'helpers/index.ts', 'start-vite.mjs']) {
    write(
      root,
      `examples/shared/playwright/${file}`,
      readFileSync(join(repository, 'examples/shared/playwright', file), 'utf8')
    );
  }
  for (const example of examples) {
    write(
      root,
      `examples/${example}/package.json`,
      JSON.stringify(
        {
          name: `example-${example.replace('/', '-')}`,
          version: '0.0.1',
          scripts: { start: 'vite', build: 'vite build' },
          devDependencies: { vite: '^6.0.0' },
        },
        null,
        2
      ) + '\n'
    );
    write(root, `examples/${example}/index.html`, '<main>Example</main>');
    write(root, `examples/${example}/vite.config.ts`, 'export default {};\n');
  }
  return root;
}

function snapshot(root, directory = '') {
  return readdirSync(join(root, directory), { withFileTypes: true }).flatMap(
    (entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory()
        ? snapshot(root, path)
        : [[path, readFileSync(join(root, path), 'utf8')]];
    }
  );
}

function parse(source) {
  const parsed = ts.createSourceFile(
    'generated.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  assert.deepEqual(parsed.parseDiagnostics, []);
  return parsed;
}

function manifest(root, example) {
  return JSON.parse(
    readFileSync(join(root, `examples/${example}/package.json`), 'utf8')
  );
}

test('creates local suites and adds only the required manifest entries', async (context) => {
  const root = fixture(context);
  const beforeShared = snapshot(root, 'examples/shared');
  const result = await scaffoldExampleE2e(createOptions, { root });
  assert.equal(result.incompleteCoverage, true);
  assert.deepEqual(
    result.examples,
    examples.map((example) => ({
      example,
      workspace: `example-${example.replace('/', '-')}`,
    }))
  );
  for (const example of examples) {
    const pkg = manifest(root, example);
    assert.equal(pkg.scripts['test:e2e'], 'playwright test');
    assert.equal(pkg.devDependencies['@playwright/test'], playwrightVersion);
    assert.equal(pkg.devDependencies.vite, '^6.0.0');
    assert.equal(pkg.version, '0.0.1');
    assert.equal(pkg.scripts.build, 'vite build');
    parse(
      readFileSync(
        join(root, `examples/${example}/playwright.config.ts`),
        'utf8'
      )
    );
    const spec = readFileSync(
      join(root, `examples/${example}/tests/new-concern.spec.ts`),
      'utf8'
    );
    parse(spec);
    assert.ok(spec.includes('test.fixme'));
    assert.ok(spec.includes('openExample'));
    assert.ok(spec.includes(createOptions.purpose));
    const ignore = readFileSync(
      join(root, `examples/${example}/.gitignore`),
      'utf8'
    );
    assert.ok(ignore.includes('/test-results/'));
    assert.ok(ignore.includes('/playwright-report/'));
  }
  assert.deepEqual(snapshot(root, 'examples/shared'), beforeShared);
});

test('Playwright discovers generated tests through local npm scripts with a stub helper', async (context) => {
  const root = fixture(context);
  await scaffoldExampleE2e(createOptions, { root });
  write(
    root,
    'examples/shared/playwright/helpers/index.ts',
    `export { test, expect } from '@playwright/test';
export async function openExample(page) { await page.goto('/'); }
export async function waitForChatReady() {}
`
  );
  mkdirSync(join(root, 'node_modules/@playwright'), { recursive: true });
  symlinkSync(
    join(repository, 'node_modules/@playwright/test'),
    join(root, 'node_modules/@playwright/test')
  );
  mkdirSync(join(root, 'node_modules/.bin'), { recursive: true });
  symlinkSync(
    join(repository, 'node_modules/@playwright/test/cli.js'),
    join(root, 'node_modules/.bin/playwright')
  );
  write(
    root,
    'node_modules/@carbon/ai-chat/package.json',
    JSON.stringify({ type: 'module', exports: { './server': './server.mjs' } })
  );
  write(
    root,
    'node_modules/@carbon/ai-chat/server.mjs',
    'export const PageObjectId = { INPUT: "input", LAUNCHER: "launcher", HOME_SCREEN_PANEL: "homescreen" };\n'
  );
  for (const example of examples) {
    const result = spawnSync(
      process.platform === 'win32' ? 'npm.cmd' : 'npm',
      ['run', 'test:e2e', '--', '--list'],
      {
        cwd: join(root, 'examples', example),
        encoding: 'utf8',
        shell: process.platform === 'win32',
      }
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /Total: 2 tests in 1 file/);
  }
});

test('dry runs preview every change without writing files', async (context) => {
  const root = fixture(context);
  const before = snapshot(root);
  const result = await scaffoldExampleE2e(
    { ...createOptions, 'dry-run': true },
    { root }
  );
  assert.equal(result.dryRun, true);
  assert.ok(result.changes.length > 0);
  assert.deepEqual(snapshot(root), before);
});

test('identical reruns are no-ops and authored specs are never overwritten', async (context) => {
  const root = fixture(context);
  await scaffoldExampleE2e(createOptions, { root });
  const before = snapshot(root);
  assert.deepEqual(
    (await scaffoldExampleE2e(createOptions, { root })).changes,
    []
  );
  assert.deepEqual(snapshot(root), before);
  write(
    root,
    `examples/${examples[0]}/tests/new-concern.spec.ts`,
    '// Authored behavior assertions.\n'
  );
  const authored = snapshot(root);
  await assert.rejects(scaffoldExampleE2e(createOptions, { root }));
  assert.deepEqual(snapshot(root), authored);
});

test('preserves existing config, dependencies, scripts, and ignore entries', async (context) => {
  const root = fixture(context);
  const example = examples[0];
  const config = '// Authored config.\nexport default {};\n';
  write(root, `examples/${example}/playwright.config.ts`, config);
  write(root, `examples/${example}/.gitignore`, '/authored/\n/test-results/\n');
  const pkg = manifest(root, example);
  pkg.scripts['test:e2e'] = 'playwright test';
  pkg.devDependencies['@playwright/test'] = '^1.55.0';
  write(
    root,
    `examples/${example}/package.json`,
    JSON.stringify(pkg, null, 2) + '\n'
  );
  await scaffoldExampleE2e(createOptions, { root });
  assert.equal(
    readFileSync(
      join(root, `examples/${example}/playwright.config.ts`),
      'utf8'
    ),
    config
  );
  assert.equal(
    manifest(root, example).devDependencies['@playwright/test'],
    '^1.55.0'
  );
  const ignore = readFileSync(
    join(root, `examples/${example}/.gitignore`),
    'utf8'
  );
  assert.ok(ignore.startsWith('/authored/\n/test-results/\n'));
  assert.equal(ignore.split('/test-results/').length, 2);
});

test('validates all hosts before writing and refuses nonstandard existing test commands', async (context) => {
  const root = fixture(context);
  const before = snapshot(root);
  await assert.rejects(
    scaffoldExampleE2e(
      { ...createOptions, example: [examples[0], 'react/missing-example'] },
      { root }
    )
  );
  assert.deepEqual(snapshot(root), before);
  const pkg = manifest(root, examples[1]);
  pkg.scripts['test:e2e'] = 'custom-e2e-command';
  write(root, `examples/${examples[1]}/package.json`, JSON.stringify(pkg));
  const customized = snapshot(root);
  await assert.rejects(scaffoldExampleE2e(createOptions, { root }));
  assert.deepEqual(snapshot(root), customized);
});

test('rejects unsafe paths, skipped examples, and incomplete Vite hosts without writes', async (context) => {
  const root = fixture(context);
  const before = snapshot(root);
  for (const example of [
    'react/integrations-watsonx',
    'web-components/integrations-watsonx',
    'react/tests-jest-happydom',
    'react/frameworks-next',
    '../react/new-concern',
    '/react/new-concern',
    'react/../new-concern',
  ]) {
    await assert.rejects(
      scaffoldExampleE2e({ ...createOptions, example: [example] }, { root }),
      undefined,
      example
    );
    assert.deepEqual(snapshot(root), before);
  }
  for (const missing of ['index.html', 'vite.config.ts']) {
    const hostRoot = fixture(context);
    rmSync(join(hostRoot, `examples/${examples[0]}/${missing}`));
    const incomplete = snapshot(hostRoot);
    await assert.rejects(scaffoldExampleE2e(createOptions, { root: hostRoot }));
    assert.deepEqual(snapshot(hostRoot), incomplete);
  }
  const pkg = manifest(root, examples[0]);
  delete pkg.scripts.build;
  write(root, `examples/${examples[0]}/package.json`, JSON.stringify(pkg));
  const incomplete = snapshot(root);
  await assert.rejects(scaffoldExampleE2e(createOptions, { root }));
  assert.deepEqual(snapshot(root), incomplete);
});

test('refuses symlink destinations and invalid option values', async (context) => {
  const root = fixture(context);
  const before = snapshot(root);
  for (const options of [
    { ...createOptions, concern: '../escaped' },
    { ...createOptions, example: [] },
    { ...createOptions, example: [examples[0], examples[0]] },
    { ...createOptions, startup: 'unknown' },
    { ...createOptions, purpose: ' ' },
  ]) {
    await assert.rejects(scaffoldExampleE2e(options, { root }));
    assert.deepEqual(snapshot(root), before);
  }
  const destination = join(root, `examples/${examples[0]}/tests`);
  mkdirSync(join(root, 'authored-tests'));
  symlinkSync(join(root, 'authored-tests'), destination);
  await assert.rejects(scaffoldExampleE2e(createOptions, { root }));
  assert.deepEqual(readdirSync(join(root, 'authored-tests')), []);
});

test('startup checks observe the selected surface without opening a panel', async (context) => {
  const root = fixture(context);
  for (const [startup, id] of [
    ['input', 'INPUT'],
    ['launcher', 'LAUNCHER'],
    ['homescreen', 'HOME_SCREEN_PANEL'],
  ]) {
    const result = await scaffoldExampleE2e(
      { ...createOptions, startup, 'dry-run': true },
      { root }
    );
    const spec = parse(
      result.changes.find((change) => change.path.endsWith('.spec.ts')).content
    );
    const selectedIds = [];
    const calls = [];
    function visit(node) {
      if (
        ts.isPropertyAccessExpression(node) &&
        node.expression.getText() === 'PageObjectId'
      ) {
        selectedIds.push(node.name.text);
      }
      if (ts.isCallExpression(node)) {
        calls.push(node.expression.getText());
      }
      ts.forEachChild(node, visit);
    }
    visit(spec);
    assert.deepEqual(selectedIds, [id]);
    assert.equal(
      calls.some((name) => name.endsWith('.click')),
      false
    );
    assert.ok(calls.some((name) => name.endsWith('.toBeVisible')));
  }
});

test('purpose text cannot terminate its comment or inject executable code', async (context) => {
  const root = fixture(context);
  const result = await scaffoldExampleE2e(
    {
      ...createOptions,
      purpose: "A multiline purpose.\n*/\nthrow new Error('injected');\n/*",
      'dry-run': true,
    },
    { root }
  );
  const spec = parse(
    result.changes.find((change) => change.path.endsWith('.spec.ts')).content
  );
  assert.equal(spec.statements.some(ts.isThrowStatement), false);
});
