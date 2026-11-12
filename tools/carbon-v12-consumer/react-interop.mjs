/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import { copyFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));

export async function prepareReactInteropProof({ consumer }) {
  await copyFile(
    join(directory, 'react-interop-fixture.js'),
    join(consumer, 'react-interop-fixture.js')
  );
  await writeFile(
    join(consumer, 'react-interop.html'),
    '<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>React interop</title></head><body><div id="root"></div><script type="module" src="./react-interop-entry.js"></script></body></html>'
  );
  await writeFile(
    join(consumer, 'react-interop-entry.js'),
    `
    import { createRoot } from 'react-dom/client';
    import { flushSync } from 'react-dom';
    import { startReactInterop } from './react-interop-fixture.js';
    const container = document.getElementById('root');
    let root;
    startReactInterop({
      container, expectedMajor: 19,
      render(node) { flushSync(() => { root ??= createRoot(container); root.render(node); }); },
      unmount() { flushSync(() => root.unmount()); root = undefined; },
    });
  `
  );
}

export async function assertReactInteropProof({ consumer, browser, origin }) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
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
  try {
    await page.goto(`${origin}/react-interop.html`);
    await page.waitForFunction(
      () => document.getElementById('root').dataset.interopStatus
    );
    const state = await page.locator('#root').evaluate((element) => ({
      status: element.dataset.interopStatus,
      text: element.textContent,
    }));
    await writeFile(
      join(consumer, 'react-interop-runtime.json'),
      JSON.stringify({ ...state, errors }, null, 2)
    );
    assert.equal(state.status, 'passed', state.text);
    const report = JSON.parse(state.text);
    assert.equal(report.react.split('.')[0], '19');
    assert.equal(report.reactDOM, report.react);
    assert.deepEqual(report.checks, [
      'properties-and-refs:false',
      'events:false',
      'exported-wrappers:false',
      'properties-and-refs:true',
      'events:true',
      'exported-wrappers:true',
    ]);
    assert.deepEqual(
      errors,
      [],
      'Packed React interop must have no console, page, or request errors.'
    );
    console.log(
      `React ${report.react}: packed native interop and four exported wrappers passed with StrictMode.`
    );
  } finally {
    await context.close();
  }
}
