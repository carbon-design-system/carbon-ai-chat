/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

function componentClasses(manifest) {
  const components = manifest.modules.flatMap((module) =>
    (module.declarations ?? [])
      .filter(
        (declaration) =>
          declaration.kind === 'class' &&
          declaration.tagName &&
          module.path.startsWith('es/components/')
      )
      .map((declaration) => ({
        name: declaration.name,
        tag: declaration.tagName,
        group: dirname(module.path),
      }))
  );
  assert.equal(
    components.length,
    54,
    'The packed CEM must describe all 54 aggregate classes.'
  );
  assert.equal(
    new Set(components.map((component) => component.group)).size,
    22,
    'The aggregate must cover all 22 component groups.'
  );
  assert.equal(
    new Set(components.map((component) => component.name)).size,
    components.length,
    'Aggregate class export names must be unique.'
  );
  assert.equal(
    new Set(components.map((component) => component.tag)).size,
    components.length,
    'Aggregate component tags must be unique.'
  );
  return components
    .map(({ name, tag }) => ({ name, tag }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function prepareAggregateProof({ consumer, manifest, runNpm }) {
  const expected = componentClasses(manifest);
  await writeFile(
    join(consumer, 'aggregate.js'),
    `
import * as aggregate from '@carbon/ai-chat-components/es';

const expected = ${JSON.stringify(expected)};
window.aggregateState = {
  exports: Object.keys(aggregate).sort(),
  components: expected.map(({ name, tag }) => {
    const constructor = aggregate[name];
    const registered = customElements.get(tag);
    const element = document.createElement(tag);
    return {
      name,
      tag,
      exported: typeof constructor === 'function',
      registeredIdentity: registered === constructor && !!registered,
      htmlElementConstructor: typeof constructor === 'function' && constructor.prototype instanceof HTMLElement,
      upgraded: typeof constructor === 'function' && element instanceof constructor,
    };
  }),
};
`
  );
  await writeFile(
    join(consumer, 'aggregate.html'),
    `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><link rel="icon" href="data:," /><title>Packed aggregate proof</title></head>
  <body><script type="module" src="./aggregate.js"></script></body>
</html>
`
  );
  await writeFile(
    join(consumer, 'aggregate-build.mjs'),
    `
process.env.NODE_ENV = 'production';
const { build } = await import('vite');
await build({
  configFile: false,
  base: './',
  build: {
    outDir: 'dist/aggregate',
    emptyOutDir: true,
    rollupOptions: { input: 'aggregate.html' },
  },
});
`
  );
  const packagePath = join(consumer, 'package.json');
  const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
  packageJson.scripts['build:aggregate'] = 'node aggregate-build.mjs';
  await writeFile(packagePath, JSON.stringify(packageJson, null, 2));
  await runNpm(['run', 'build:aggregate']);
}

export async function assertAggregateProof({
  consumer,
  manifest,
  browser,
  origin,
}) {
  const expected = componentClasses(manifest);
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
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
    await page.goto(`${origin}/aggregate/aggregate.html`);
    await page.waitForFunction(() => window.aggregateState);
    state = await page.evaluate(() => window.aggregateState);
    assert.deepEqual(
      state.exports,
      expected.map((component) => component.name).sort(),
      'The aggregate must export exactly its component classes, without helper, prefix, default, or React exports.'
    );
    assert.deepEqual(
      state.components.map(({ name, tag }) => ({ name, tag })),
      expected
    );
    assert.deepEqual(
      state.components.filter(
        (component) =>
          !component.exported ||
          !component.registeredIdentity ||
          !component.htmlElementConstructor ||
          !component.upgraded
      ),
      [],
      'Every aggregate export must be its registered HTMLElement constructor and upgrade its tag.'
    );
    assert.deepEqual(
      errors,
      [],
      'The isolated aggregate must load without browser or request errors.'
    );
    console.log(
      'Aggregate: all 54 packed class exports match their registered tags and upgrade in a fresh document.'
    );
  } finally {
    await writeFile(
      join(consumer, 'aggregate-runtime.json'),
      JSON.stringify({ state, errors }, null, 2)
    );
    await context.close();
  }
}
