/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @license
 */

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { compareProjects, testFiles } from './check-test-projects.mjs';

test('every listed file in one project passes', () => {
  assert.deepEqual(
    compareProjects(
      ['src/a.test.ts', 'src/b.browser.test.ts'],
      [
        { file: 'src/a.test.ts', projectName: 'happy-dom' },
        { file: 'src/b.browser.test.ts', projectName: 'browser (chromium)' },
      ]
    ),
    { missing: [], duplicated: [], unknown: [] }
  );
});

test('a test file no project runs is reported', () => {
  // A components `.browser.test.tsx` that a `.ts`-only browser glob misses.
  const { missing } = compareProjects(
    ['src/a.test.ts', 'src/b.browser.test.tsx'],
    [{ file: 'src/a.test.ts', projectName: 'happy-dom' }]
  );
  assert.deepEqual(missing, ['src/b.browser.test.tsx']);
});

test('a test file two projects run is reported', () => {
  const { duplicated } = compareProjects(
    ['src/a.test.ts'],
    [
      { file: 'src/a.test.ts', projectName: 'node' },
      { file: 'src/a.test.ts', projectName: 'happy-dom' },
    ]
  );
  assert.deepEqual(duplicated, [
    { file: 'src/a.test.ts', projects: ['happy-dom', 'node'] },
  ]);
});

test('the walk finds test files and skips output and node --test tasks', (context) => {
  const root = mkdtempSync(join(tmpdir(), 'test-projects-walk-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  for (const path of [
    'src/x/__tests__/a.test.ts',
    'src/x/__tests__/b.browser.test.tsx',
    '.storybook/__tests__/c.test.jsx',
    'tests/d.test.ts',
    'src/x/helper.ts',
    'dist/e.test.js',
    'es/f.test.js',
    'node_modules/g/h.test.js',
    'tasks/__tests__/i.test.js',
  ]) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), '');
  }
  assert.deepEqual(testFiles(root), [
    '.storybook/__tests__/c.test.jsx',
    'src/x/__tests__/a.test.ts',
    'src/x/__tests__/b.browser.test.tsx',
    'tests/d.test.ts',
  ]);
});
