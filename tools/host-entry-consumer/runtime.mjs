/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { build, preview } from 'vite';

async function prepareHost(consumer, tree, host) {
  const name = `${tree}-${host}`;
  const prefix = tree === 'es' ? 'cds' : 'cds-custom';
  const script = `
import Host from '@carbon/ai-chat/dist/${tree}/web-components/cds-aichat-${host}/index.js';
const tag = '${prefix}-aichat-${host}';
if (customElements.get(tag) !== Host) throw new Error('The default host export must register its tag.');
const attributes = Host.observedAttributes;
window.hostRuntime = {
  tag: 'cds-aichat-${host}', actualTag: tag, attributes,
  properties: [...Host.elementProperties].filter(([, options]) => !options.state)
    .map(([name, options]) => ({ name, attribute: options.attribute ?? true, type: options.type?.name })),
  defaultExportRegistered: customElements.get(tag) === Host,
};
window.hostInstances = [];
window.hostSends = [];
window.hostRenders = 0;
const element = document.createElement(tag);
element.style.cssText = 'display:block;inline-size:800px;block-size:700px';
element.openChatByDefault = true;
element.launcher = { isOn: false };
element.messaging = { customSendMessage(message) { window.hostSends.push(message); } };
element.onBeforeRender = instance => window.hostInstances.push(instance);
element.onAfterRender = () => { window.hostRenders += 1; };
window.hostElement = element;
document.body.append(element);
`;
  await writeFile(join(consumer, `${name}.js`), script);
  await writeFile(
    join(consumer, `${name}.html`),
    `<!doctype html><html><head><meta charset="UTF-8"></head><body><script type="module" src="./${name}.js"></script></body></html>`
  );
  const outDir = `host-proof-${name}`;
  await build({
    root: consumer,
    configFile: false,
    logLevel: 'warn',
    build: { outDir, rollupOptions: { input: join(consumer, `${name}.html`) } },
  });
  return { name, prefix, outDir };
}

async function sendAndRemount(page) {
  await page.waitForFunction(() => window.hostRenders === 1);
  await page.evaluate(async () => {
    await window.hostInstances[0].send('Packed host first mount');
    window.hostElement.remove();
    await new Promise((resolve) => setTimeout(resolve, 100));
    document.body.append(window.hostElement);
  });
  await page.waitForFunction(() => window.hostRenders === 2);
  return page.evaluate(async () => {
    if (window.hostInstances[0] === window.hostInstances[1]) {
      throw new Error('A detached remount must create a fresh chat instance.');
    }
    await window.hostInstances[1].send('Packed host second mount');
    return {
      renders: window.hostRenders,
      sends: window.hostSends
        .map((message) => message.input?.text)
        .filter((text) => text?.startsWith('Packed host ')),
      requests: window.hostSends.map((message) => message.input?.text),
      freshInstance: true,
    };
  });
}

async function inspectHost(page, prefix) {
  const input = page.getByTestId('input_field');
  await input.waitFor({ state: 'visible' });
  assert.ok(
    (await input.boundingBox()).width > 0,
    'The chat input must have nonzero width.'
  );
  return page.evaluate((prefix) => {
    const collect = (root) => {
      const elements = [];
      for (const element of root.querySelectorAll('*')) {
        elements.push(element);
        if (element.shadowRoot) {
          elements.push(...collect(element.shadowRoot));
        }
      }
      return elements;
    };
    const tags = collect(document)
      .filter((element) => element.localName.startsWith('cds-'))
      .map((element) => ({
        tag: element.localName,
        upgraded:
          !!customElements.get(element.localName) &&
          element instanceof customElements.get(element.localName),
      }));
    if (tags.some((item) => !item.upgraded)) {
      throw new Error('Every rendered custom element must upgrade.');
    }
    if (
      prefix === 'cds-custom' &&
      tags.some((item) => !item.tag.startsWith('cds-custom-'))
    ) {
      throw new Error(
        'The custom host must retain its fixed prefix throughout.'
      );
    }
    return { ...window.hostRuntime, tags };
  }, prefix);
}

async function checkHost(consumer, browser, tree, host) {
  const { name, prefix, outDir } = await prepareHost(consumer, tree, host);
  const server = await preview({
    root: consumer,
    configFile: false,
    build: { outDir },
    preview: { host: '127.0.0.1', port: 0 },
  });
  const context = await browser.newContext();
  const errors = [];
  let page;
  try {
    page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(`${server.resolvedUrls.local[0]}${name}.html`);
    const lifecycle = await sendAndRemount(page);
    assert.deepEqual(lifecycle.sends, [
      'Packed host first mount',
      'Packed host second mount',
    ]);
    const runtime = await inspectHost(page, prefix);
    await page.waitForTimeout(100);
    assert.deepEqual(
      errors,
      [],
      'The isolated host must have no asynchronous browser errors.'
    );
    await page.screenshot({
      path: join(consumer, `${name}.png`),
      fullPage: true,
    });
    const result = { ...runtime, ...lifecycle, errors };
    await writeFile(
      join(consumer, `${name}-runtime.json`),
      JSON.stringify(result, null, 2)
    );
    console.log(
      `${name}: isolated production host import, send/remount, and ${runtime.tags.length} upgraded tags passed.`
    );
    return result;
  } catch (error) {
    await writeFile(
      join(consumer, `${name}-failure.json`),
      JSON.stringify({ error: String(error), errors }, null, 2)
    );
    await page
      ?.screenshot({
        path: join(consumer, `${name}-failure.png`),
        fullPage: true,
      })
      .catch(() => {});
    throw error;
  } finally {
    await context.close();
    await new Promise((resolve) => server.httpServer.close(resolve));
  }
}

export async function collectHostRuntime(consumer) {
  const browser = await chromium.launch();
  try {
    const results = {};
    for (const tree of ['es', 'es-custom']) {
      results[tree] = [];
      for (const host of ['container', 'custom-element']) {
        results[tree].push(await checkHost(consumer, browser, tree, host));
      }
    }
    return results;
  } finally {
    await browser.close();
  }
}
