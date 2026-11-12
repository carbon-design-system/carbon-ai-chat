/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/** Proves native Lit properties, events, refs, and exported wrappers in this app's React runtime. */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('preserves the native component contract in a real browser', async ({
  page,
}) => {
  const errors: string[] = [];
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
  await page.goto('/?interop');
  const result = page.locator('#root');
  await expect(result).toHaveAttribute('data-interop-status', /passed|failed/, {
    timeout: 30000,
  });
  const text = await result.innerText();
  expect(await result.getAttribute('data-interop-status'), text).toBe('passed');
  const report = JSON.parse(text);
  expect(report.react.split('.')[0]).toBe('17');
  const versions = Object.fromEntries(
    ['react', 'react-dom'].map((name) => [
      name,
      JSON.parse(
        readFileSync(
          new URL(`../node_modules/${name}/package.json`, import.meta.url),
          'utf8'
        )
      ).version,
    ])
  );
  expect(versions['react-dom']).toBe(versions.react);
  expect(report.react).toBe(versions.react);
  expect(report.reactDOM.split('-')[0]).toBe(versions['react-dom']);
  console.info(
    'Browser interop runtime',
    JSON.stringify({ ...report, packages: versions })
  );
  expect(report.checks).toEqual([
    'properties-and-refs:false',
    'events:false',
    'exported-wrappers:false',
  ]);
  expect(errors).toEqual([]);
});
