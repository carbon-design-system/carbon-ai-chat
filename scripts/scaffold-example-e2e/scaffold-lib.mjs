/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const goldenPath = 'examples/react/basic-custom-element-fullscreen';
const startupIds = {
  input: 'INPUT',
  launcher: 'LAUNCHER',
  homescreen: 'HOME_SCREEN_PANEL',
};
const ignorePatterns = [
  '/test-results/',
  '/playwright-report/',
  '/blob-report/',
  '/playwright/.cache/',
];
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validateExampleName(example) {
  if (
    typeof example !== 'string' ||
    !/^(react|web-components)\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(example)
  ) {
    throw new Error(
      `Invalid example path: ${example}. Use react/slug or web-components/slug.`
    );
  }
  const slug = example.split('/')[1];
  if (
    ['integrations-watsonx', 'frameworks-next'].includes(slug) ||
    slug.startsWith('tests-jest-')
  ) {
    throw new Error(`The shared Vite launcher does not support ${example}.`);
  }
}

function validateOptions(options) {
  if (!Array.isArray(options.example) || !options.example.length) {
    throw new Error('Supply at least one --example <flavor/slug>.');
  }
  if (new Set(options.example).size !== options.example.length) {
    throw new Error('Supply each --example only once.');
  }
  options.example.forEach(validateExampleName);
  if (
    typeof options.concern !== 'string' ||
    !slugPattern.test(options.concern)
  ) {
    throw new Error('Supply a kebab-case --concern for the new spec.');
  }
  if (!Object.hasOwn(startupIds, options.startup)) {
    throw new Error('Supply --startup input, launcher, or homescreen.');
  }
  if (typeof options.purpose !== 'string' || !options.purpose.trim()) {
    throw new Error(
      'Supply a nonempty --purpose describing the behavior to test.'
    );
  }
}

function checkedPath(root, relativePath, allowMissing = false) {
  const parts = relativePath.split('/');
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    let stat;
    try {
      stat = lstatSync(current);
    } catch (error) {
      if (error.code !== 'ENOENT' || !allowMissing) {
        throw error;
      }
      return path.join(root, relativePath);
    }
    if (stat.isSymbolicLink()) {
      throw new Error(
        `Refusing symlink path ${relativePath}. Use a source file inside the repository.`
      );
    }
  }
  return current;
}

function readText(root, relativePath) {
  const filename = checkedPath(root, relativePath);
  if (!lstatSync(filename).isFile()) {
    throw new Error(`${relativePath} must be a regular file.`);
  }
  return readFileSync(filename, 'utf8');
}

function planNewFile(root, relativePath, content, changes, preserve = false) {
  const filename = checkedPath(root, relativePath, true);
  if (existsSync(filename)) {
    const existing = readText(root, relativePath);
    if (preserve || existing === content) {
      return;
    }
    throw new Error(
      `${relativePath} already exists. Keep the authored file and choose another --concern.`
    );
  }
  changes.push({ path: relativePath, content, create: true });
}

function renderSpec({ concern, startup, purpose }) {
  const comment = purpose
    .trim()
    .replaceAll('*/', '* /')
    .split(/\r?\n/)
    .map((line) => ` * ${line}`)
    .join('\n');
  return `/*
 *  Copyright IBM Corp. ${new Date().getFullYear()}
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
${comment}
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test } from '../../../shared/playwright/helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
});

test('mounts with the ${startup} visible', async ({ page }) => {
  await expect(page.getByTestId(PageObjectId.${startupIds[startup]})).toBeVisible();
});

test.fixme('${concern} behavior', async () => {
  // TODO: Replace this placeholder with assertions that prove the concern.
});
`;
}

function readExampleManifest(root, example) {
  const directory = `examples/${example}`;
  const manifestPath = `${directory}/package.json`;
  const source = readText(root, manifestPath);
  const manifest = JSON.parse(source);
  if (typeof manifest.name !== 'string' || !manifest.name.trim()) {
    throw new Error(`${example} must have a workspace name.`);
  }
  if (
    typeof manifest.scripts?.build !== 'string' ||
    !manifest.scripts.build.trim()
  ) {
    throw new Error(`${example} must define a build script for Vite.`);
  }
  readText(root, `${directory}/index.html`);
  readText(root, `${directory}/vite.config.ts`);
  const script = manifest.scripts['test:e2e'];
  if (script !== undefined && script !== 'playwright test') {
    throw new Error(
      `${example} has a custom test:e2e script. Keep its setup and add tests manually.`
    );
  }
  return { manifest, manifestPath };
}

function planManifest(root, example, version, changes) {
  const { manifest, manifestPath } = readExampleManifest(root, example);
  let changed = false;
  if (!manifest.scripts['test:e2e']) {
    manifest.scripts['test:e2e'] = 'playwright test';
    changed = true;
  }
  if (
    !manifest.devDependencies?.['@playwright/test'] &&
    !manifest.dependencies?.['@playwright/test']
  ) {
    manifest.devDependencies = {
      ...manifest.devDependencies,
      '@playwright/test': version,
    };
    changed = true;
  }
  if (changed) {
    changes.push({
      path: manifestPath,
      content: `${JSON.stringify(manifest, null, 2)}\n`,
    });
  }
  return { example, workspace: manifest.name };
}

function planGitignore(root, directory, changes) {
  const relativePath = `${directory}/.gitignore`;
  const filename = checkedPath(root, relativePath, true);
  const exists = existsSync(filename);
  const source = exists ? readText(root, relativePath) : '';
  const lines = source.split(/\r?\n/);
  const missing = ignorePatterns.filter((pattern) => !lines.includes(pattern));
  if (!missing.length) {
    return;
  }
  const separator = source && !source.endsWith('\n') ? '\n' : '';
  changes.push({
    path: relativePath,
    content: `${source}${separator}${missing.join('\n')}\n`,
    create: !exists,
  });
}

function writeChanges(root, changes) {
  for (const change of changes) {
    const filename = path.join(root, change.path);
    mkdirSync(path.dirname(filename), { recursive: true });
    writeFileSync(filename, change.content, {
      flag: change.create ? 'wx' : 'w',
    });
  }
}

export async function scaffoldExampleE2e(options, { root = repoRoot } = {}) {
  validateOptions(options);
  const resolvedRoot = realpathSync(root);
  const golden = JSON.parse(
    readText(resolvedRoot, `${goldenPath}/package.json`)
  );
  const version = golden.devDependencies?.['@playwright/test'];
  if (typeof version !== 'string' || !version.trim()) {
    throw new Error('The fullscreen golden must declare @playwright/test.');
  }
  const config = readText(resolvedRoot, `${goldenPath}/playwright.config.ts`);
  readText(resolvedRoot, 'examples/shared/playwright/baseConfig.mts');
  readText(resolvedRoot, 'examples/shared/playwright/helpers/index.ts');
  readText(resolvedRoot, 'examples/shared/playwright/start-vite.mjs');
  const changes = [];
  const examples = options.example.map((example) => {
    const entry = planManifest(resolvedRoot, example, version, changes);
    const directory = `examples/${example}`;
    planNewFile(
      resolvedRoot,
      `${directory}/playwright.config.ts`,
      config,
      changes,
      true
    );
    planNewFile(
      resolvedRoot,
      `${directory}/tests/${options.concern}.spec.ts`,
      renderSpec(options),
      changes
    );
    planGitignore(resolvedRoot, directory, changes);
    return entry;
  });
  if (!options['dry-run']) {
    writeChanges(resolvedRoot, changes);
  }
  return {
    changes,
    examples,
    incompleteCoverage: true,
    dryRun: Boolean(options['dry-run']),
  };
}
