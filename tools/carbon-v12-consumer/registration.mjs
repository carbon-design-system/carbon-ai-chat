/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const helperSpecifier = '@carbon/ai-chat-components/es/globals/register.js';

function registrationSource(specifier) {
  return `
import { defineCustomElement } from ${JSON.stringify(specifier)};

const warnings = [];
const warn = console.warn;
console.warn = (...arguments_) => {
  warnings.push(arguments_.map(String).join(' '));
  warn.apply(console, arguments_);
};

class First extends HTMLElement {}
class Attempted extends HTMLElement {}
const name = 'packed-registration-collision';
const first = defineCustomElement(First, { name });
const attempted = defineCustomElement(Attempted, { name });
window.registrationState = {
  firstReturned: first === First,
  keptFirst: customElements.get(name) === First,
  returnedAttempted: attempted === Attempted,
  processType: typeof process,
  warnings,
};
`;
}

function registrationHtml(source) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="data:," />
    <title>Packed registration proof</title>
  </head>
  <body><script type="module" src="${source}"></script></body>
</html>
`;
}

export async function prepareRegistrationProofs({ consumer, runNpm }) {
  const packagePath = join(consumer, 'package.json');
  const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
  packageJson.scripts['test:registration-node'] = 'node registration-node.mjs';
  packageJson.scripts['build:registration'] = 'node registration-build.mjs';
  await writeFile(packagePath, JSON.stringify(packageJson, null, 2));
  await writeFile(
    join(consumer, 'registration.js'),
    registrationSource(helperSpecifier)
  );
  await writeFile(
    join(consumer, 'registration.html'),
    registrationHtml('./registration.js')
  );
  await writeFile(
    join(consumer, 'registration-node.mjs'),
    `
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
assert.equal(typeof document, 'undefined');
assert.equal(typeof HTMLElement, 'undefined');
assert.equal(typeof customElements, 'undefined');
const { defineCustomElement } = await import(${JSON.stringify(helperSpecifier)});
assert.equal(typeof defineCustomElement, 'function');
await writeFile('registration-node.json', JSON.stringify({ imported: true, document: typeof document, HTMLElement: typeof HTMLElement, customElements: typeof customElements }, null, 2));
console.log('Packed helper imports in Node without DOM globals.');
`
  );
  await writeFile(
    join(consumer, 'registration-build.mjs'),
    `
const mode = process.argv[2];
if (!['development', 'production'].includes(mode)) {
  throw new Error('Expected development or production mode.');
}
// Vite's --mode development alone still creates a production NODE_ENV build.
process.env.NODE_ENV = mode;
const { build } = await import('vite');
await build({
  configFile: false,
  base: './',
  mode,
  build: {
    outDir: 'dist/registration-' + mode,
    emptyOutDir: true,
    rollupOptions: { input: 'registration.html' },
  },
});
`
  );
  await runNpm(['run', 'test:registration-node']);
  for (const mode of ['development', 'production']) {
    await runNpm(['run', 'build:registration', '--', mode]);
  }
  const dist = join(consumer, 'dist');
  await copyFile(
    join(
      consumer,
      'node_modules/@carbon/ai-chat-components/es/globals/register.js'
    ),
    join(dist, 'registration-raw-helper.js')
  );
  await writeFile(
    join(dist, 'registration-raw.js'),
    registrationSource('./registration-raw-helper.js')
  );
  await writeFile(
    join(dist, 'registration-raw.html'),
    registrationHtml('./registration-raw.js')
  );
}

async function assertRegistrationMode({ consumer, browser, origin, mode }) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  const warnings = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'warning') {
      warnings.push(message.text());
    } else if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  page.on('requestfailed', (request) =>
    errors.push(`${request.url()}: ${request.failure()?.errorText}`)
  );
  page.on('response', (response) => {
    if (response.status() >= 400) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });
  let state;
  try {
    const path =
      mode === 'raw'
        ? '/registration-raw.html'
        : `/registration-${mode}/registration.html`;
    await page.goto(`${origin}${path}`);
    await page.waitForFunction(() => window.registrationState);
    state = await page.evaluate(() => window.registrationState);
    assert.equal(
      state.firstReturned,
      true,
      `${mode}: first registration returns its class.`
    );
    assert.equal(
      state.keptFirst,
      true,
      `${mode}: a collision keeps the first class in the registry.`
    );
    assert.equal(
      state.returnedAttempted,
      true,
      `${mode}: a collision returns the attempted class independently of the registry.`
    );
    assert.deepEqual(
      errors,
      [],
      `${mode}: the helper must not throw or fail a request.`
    );
    if (mode === 'raw') {
      assert.equal(
        state.processType,
        'undefined',
        'Raw ESM must run without a process shim.'
      );
    }
    const expectedWarnings = mode === 'development' ? 1 : 0;
    assert.equal(
      state.warnings.length,
      expectedWarnings,
      `${mode}: collision warning count.`
    );
    assert.equal(
      warnings.length,
      expectedWarnings,
      `${mode}: actual browser console warning count.`
    );
    console.log(
      `${mode}: packed helper collision preserves the registry and return identities.`
    );
  } finally {
    await writeFile(
      join(consumer, `registration-${mode}.json`),
      JSON.stringify({ state, warnings, errors }, null, 2)
    );
    await context.close();
  }
}

export async function assertRegistrationProofs({ consumer, browser, origin }) {
  for (const mode of ['development', 'production', 'raw']) {
    await assertRegistrationMode({ consumer, browser, origin, mode });
  }
}
