#!/usr/bin/env node
/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @license
 */

// Checks that each package's Vitest config runs every test file in exactly
// one project. A file no project's globs match never runs, and CI stays green.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PACKAGES = ['packages/ai-chat', 'packages/ai-chat-components'];
const TEST_FILE = /\.test\.[cm]?[jt]sx?$/;
// Folders with no Vitest tests: build output, dependencies, and the build
// tasks' own `node --test` suites.
const SKIPPED = new Set([
  'node_modules',
  'dist',
  'es',
  'es-custom',
  'coverage',
  'storybook-static',
  'storybook-react-static',
]);
const NODE_TEST_FOLDERS = ['tasks/__tests__/'];

export function testFiles(packageRoot) {
  const walk = (path) =>
    readdirSync(join(packageRoot, path), { withFileTypes: true }).flatMap(
      (entry) => {
        const child = path ? `${path}/${entry.name}` : entry.name;
        if (entry.isSymbolicLink() || SKIPPED.has(entry.name)) {
          return [];
        }
        if (entry.isDirectory()) {
          return walk(child);
        }
        return TEST_FILE.test(entry.name) &&
          !NODE_TEST_FOLDERS.some((folder) => child.startsWith(folder))
          ? [child]
          : [];
      }
    );
  return walk('').sort();
}

/**
 * Compares the test files on disk with Vitest's list of `{ file, projectName }`
 * entries, paths relative to the package. Returns the files no project runs
 * and the files more than one project runs.
 */
export function compareProjects(files, listed) {
  const projects = new Map();
  for (const { file, projectName } of listed) {
    projects.set(file, [...(projects.get(file) ?? []), projectName]);
  }
  return {
    missing: files.filter((file) => !projects.has(file)),
    duplicated: [...projects]
      .filter(([, names]) => names.length > 1)
      .map(([file, names]) => ({ file, projects: names.sort() })),
    unknown: [...projects.keys()].filter((file) => !files.includes(file)),
  };
}

function listProjects(packageRoot) {
  const dir = mkdtempSync(join(tmpdir(), 'test-projects-'));
  const out = join(dir, 'list.json');
  // One browser instance, so each browser test is listed once.
  const env = { ...process.env };
  delete env.CAIC_ALL_BROWSERS;
  try {
    execFileSync('npx', ['vitest', 'list', '--filesOnly', `--json=${out}`], {
      cwd: packageRoot,
      env,
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    return JSON.parse(readFileSync(out, 'utf8')).map((entry) => ({
      file: relative(packageRoot, entry.file).replaceAll('\\', '/'),
      projectName: entry.projectName,
    }));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function main() {
  const repo = resolve(fileURLToPath(import.meta.url), '../..');
  let failed = false;
  for (const name of PACKAGES) {
    const packageRoot = join(repo, name);
    const files = testFiles(packageRoot);
    const { missing, duplicated, unknown } = compareProjects(
      files,
      listProjects(packageRoot)
    );
    for (const file of missing) {
      console.error(`${name}: no Vitest project runs ${file}`);
    }
    for (const { file, projects } of duplicated) {
      console.error(`${name}: ${file} runs in ${projects.join(', ')}`);
    }
    for (const file of unknown) {
      console.error(`${name}: Vitest lists ${file}, which the walk missed`);
    }
    if (missing.length + duplicated.length + unknown.length) {
      failed = true;
    } else {
      console.log(`${name}: ${files.length} test files, each in one project`);
    }
  }
  if (failed) {
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
