/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import {
  copyFile,
  mkdtemp,
  readFile,
  realpath,
  writeFile,
} from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { chromium } from '@playwright/test';
import {
  assertHostParity,
  proveParityFailures,
  readPackedManifest,
  readPublishedHostTypes,
} from './manifests.mjs';
import {
  assertRegistrationProofs,
  prepareRegistrationProofs,
} from './registration.mjs';
import { assertPackedResolution } from './resolution.mjs';
import { assertAggregateProof, prepareAggregateProof } from './aggregate.mjs';

const runFile = promisify(execFile);
const fixtureDirectory = dirname(fileURLToPath(import.meta.url));
const repository = resolve(fixtureDirectory, '../..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const consumer = await mkdtemp(join(tmpdir(), 'carbon-v12-consumer-'));
console.log(`Packed consumer evidence: ${consumer}`);

async function runNpm(args, cwd = consumer) {
  const label = `${basename(cwd)}-${args.join(' ')}`.replaceAll(
    /[^a-zA-Z0-9-]/g,
    '-'
  );
  try {
    const result = await runFile(npm, args, {
      cwd,
      maxBuffer: 32 * 1024 * 1024,
      timeout: 10 * 60 * 1000,
    });
    await writeFile(
      join(consumer, `${label}.log`),
      result.stdout + result.stderr
    );
    return result.stdout;
  } catch (error) {
    await writeFile(
      join(consumer, `${label}.log`),
      `${error.stdout ?? ''}${error.stderr ?? ''}`
    );
    throw error;
  }
}

const lockfile = JSON.parse(
  await readFile(join(repository, 'package-lock.json'), 'utf8')
);
function resolvedVersion(name) {
  const version = lockfile.packages[`node_modules/${name}`]?.version;
  assert.ok(version, `The workspace lockfile must resolve ${name}.`);
  return version;
}

const dependencies = Object.fromEntries(
  [
    '@carbon/web-components',
    '@carbon/utilities',
    '@carbon/icons',
    '@carbon/styles',
    'react',
    'react-dom',
  ].map((name) => [name, resolvedVersion(name)])
);

for (const [name, directory] of [
  ['@carbon/ai-chat-components', 'ai-chat-components'],
  ['@carbon/ai-chat', 'ai-chat'],
]) {
  const output = await runNpm(
    ['pack', '--ignore-scripts', '--json', '--pack-destination', consumer],
    join(repository, 'packages', directory)
  );
  const [packed] = JSON.parse(output);
  assert.equal(packed.name, name);
  dependencies[name] = `file:./${packed.filename}`;
}

await writeFile(
  join(consumer, 'package.json'),
  JSON.stringify(
    {
      name: 'carbon-v12-packed-consumer',
      private: true,
      type: 'module',
      scripts: { build: 'vite build' },
      dependencies,
      devDependencies: { vite: resolvedVersion('vite') },
    },
    null,
    2
  )
);

const html = await readFile(join(fixtureDirectory, 'fixture.html'), 'utf8');
const source = await readFile(join(fixtureDirectory, 'fixture.js'), 'utf8');
const variants = [
  { name: 'normal', tree: 'es', prefix: 'cds' },
  { name: 'custom', tree: 'es-custom', prefix: 'cds-custom' },
];
for (const { name, tree, prefix } of variants) {
  await writeFile(
    join(consumer, `${name}.html`),
    html.replaceAll('VARIANT', name)
  );
  await writeFile(
    join(consumer, `${name}.js`),
    source.replaceAll('TREE', tree).replaceAll('PREFIX', prefix)
  );
}
await copyFile(
  join(fixtureDirectory, 'vite.config.mjs'),
  join(consumer, 'vite.config.mjs')
);
await runNpm(['install', '--ignore-scripts']);
await runNpm(['ci', '--ignore-scripts']);
const installed = await runNpm([
  'ls',
  '@carbon/ai-chat',
  '@carbon/ai-chat-components',
  '@carbon/web-components',
  '@carbon/utilities',
  '--json',
]);
await writeFile(join(consumer, 'installed.json'), installed);

const componentsMetadata = await readPackedManifest(
  consumer,
  '@carbon/ai-chat-components'
);
const chatMetadata = await readPackedManifest(consumer, '@carbon/ai-chat');
const publishedTypes = await readPublishedHostTypes(
  chatMetadata.root,
  chatMetadata.packageJson
);

const utilityPaths = await Promise.all(
  [
    '@carbon/ai-chat',
    '@carbon/ai-chat-components',
    '@carbon/web-components',
  ].map((name) => {
    const packageRequire = createRequire(
      join(consumer, 'node_modules', name, 'package.json')
    );
    return realpath(packageRequire.resolve('@carbon/utilities'));
  })
);
assert.equal(
  new Set(utilityPaths).size,
  1,
  'The consumer must share one utilities copy.'
);
await assertPackedResolution({ consumer });
await runNpm(['run', 'build']);
await prepareRegistrationProofs({ consumer, runNpm });
await prepareAggregateProof({
  consumer,
  manifest: componentsMetadata.manifest,
  runNpm,
});

const dist = join(consumer, 'dist');
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url, 'http://localhost').pathname
    );
    const path = resolve(dist, `.${pathname}`);
    if (!path.startsWith(`${dist}${sep}`)) {
      response.writeHead(403).end();
      return;
    }
    const body = await readFile(path);
    response.writeHead(200, {
      'Content-Type': mime[extname(path)] ?? 'application/octet-stream',
    });
    response.end(body);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolveListening, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolveListening);
});
let browser;
try {
  browser = await chromium.launch();
  const origin = `http://127.0.0.1:${server.address().port}`;
  await assertRegistrationProofs({ consumer, browser, origin });
  await assertAggregateProof({
    consumer,
    manifest: componentsMetadata.manifest,
    browser,
    origin,
  });
  const hostCases = variants.flatMap((variant) =>
    ['container', 'custom-element'].map((hostType) => ({
      ...variant,
      hostType,
      label:
        hostType === 'container'
          ? variant.name
          : `${variant.name}-custom-element`,
    }))
  );
  const hostsByVariant = new Map(variants.map(({ name }) => [name, []]));
  for (const { name, prefix, hostType, label } of hostCases) {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    const errors = [];
    const messages = [];
    const failedRequests = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('console', (message) => {
      messages.push({ type: message.type(), text: message.text() });
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });
    page.on('requestfailed', (request) =>
      failedRequests.push({ url: request.url(), failure: request.failure() })
    );
    page.on('response', (response) => {
      if (response.status() >= 400) {
        errors.push(`${response.status()} ${response.url()}`);
      }
    });
    try {
      await page.goto(`${origin}/${name}.html?host=${hostType}`);
      await page.waitForFunction(() => window.consumerState?.ready);
      const hosts = await page.evaluate(() => window.consumerState.hosts);
      assert.deepEqual(
        hosts.map((host) => host.tag),
        [`${prefix}-aichat-${hostType}`],
        'Each fresh context must collect only its selected host metadata.'
      );
      const canonicalHosts = hosts.map((host) => ({
        ...host,
        tag: host.tag.replace(`${prefix}-`, 'cds-'),
      }));
      hostsByVariant.get(name).push(...canonicalHosts);
      await writeFile(
        join(consumer, `${label}-manifest-parity.json`),
        JSON.stringify(
          { hosts, fields: [...publishedTypes.config.keys()] },
          null,
          2
        )
      );
      await page
        .locator('#consumer-toolbar')
        .getByRole('button', { name: 'Run action', exact: true })
        .click();
      await page.waitForFunction(() => window.consumerState.actions === 1);
      await page.getByTestId('input_field').click();
      await page.keyboard.type(`packed ${label}`);
      await page.getByTestId('input_send').click();
      await page.waitForFunction(
        (text) =>
          window.consumerState.sent.some(
            (message) => message.input?.text === text
          ),
        `packed ${label}`
      );
      const tags = await page.evaluate(async () => {
        const collect = (root) =>
          Array.from(root.querySelectorAll('*')).flatMap((element) => [
            element,
            ...(element.shadowRoot ? collect(element.shadowRoot) : []),
          ]);
        for (let pass = 0; pass < 3; pass += 1) {
          await Promise.all(
            collect(document).map(async (element) => {
              if (!element.updateComplete) {
                return;
              }
              let timer;
              try {
                await Promise.race([
                  element.updateComplete,
                  new Promise((_, reject) => {
                    timer = setTimeout(
                      () =>
                        reject(
                          new Error(`Update timed out: ${element.localName}`)
                        ),
                      5000
                    );
                  }),
                ]);
              } finally {
                clearTimeout(timer);
              }
            })
          );
        }
        return collect(document)
          .filter((element) => element.localName.startsWith('cds-'))
          .map((element) => {
            const constructor = customElements.get(element.localName);
            return {
              tag: element.localName,
              defined: !!constructor,
              upgraded: !!constructor && element instanceof constructor,
              shadow: !!element.shadowRoot,
            };
          });
      });
      await writeFile(
        join(consumer, `${label}-runtime.json`),
        JSON.stringify({ tags, errors, messages, failedRequests }, null, 2)
      );
      assert.ok(
        tags.some(
          (tag) => tag.tag === `${prefix}-aichat-container` && tag.shadow
        ),
        'The packed chat host must render its shadow root.'
      );
      if (hostType === 'custom-element') {
        assert.ok(
          tags.some(
            (tag) => tag.tag === `${prefix}-aichat-custom-element` && tag.shadow
          ),
          'The packed outer custom-element host must render its shadow root.'
        );
      }
      assert.ok(
        tags.some((tag) => tag.tag === `${prefix}-icon-button`),
        'The toolbar must render a Carbon control.'
      );
      assert.deepEqual(
        tags.filter((tag) => !tag.defined || !tag.upgraded),
        [],
        'Every rendered tag must upgrade.'
      );
      if (name === 'custom') {
        assert.deepEqual(
          tags.filter((tag) => !tag.tag.startsWith('cds-custom-')),
          [],
          'The custom consumer must use prefixed tags throughout.'
        );
      }
      assert.deepEqual(
        errors,
        [],
        'The packed consumer must have no browser errors.'
      );
      assert.deepEqual(
        failedRequests,
        [],
        'The packed consumer must resolve every request.'
      );
      assert.deepEqual(
        messages.filter((message) => message.text.includes('expects a direct')),
        [],
        'Deprecated menu composition must not render.'
      );
      await page.screenshot({
        path: join(consumer, `${label}.png`),
        fullPage: true,
      });
      console.log(
        `${label}: packed chat send, Carbon action, and ${tags.length} upgraded tags passed.`
      );
    } catch (error) {
      await writeFile(
        join(consumer, `${label}-failure.json`),
        JSON.stringify(
          { error: String(error), errors, messages, failedRequests },
          null,
          2
        )
      );
      await page
        .screenshot({
          path: join(consumer, `${label}-failure.png`),
          fullPage: true,
        })
        .catch(() => {});
      throw error;
    } finally {
      await context.close();
    }
  }
  for (const { name } of variants) {
    const hosts = hostsByVariant.get(name);
    assertHostParity(chatMetadata.manifest, hosts, publishedTypes);
    proveParityFailures(chatMetadata.manifest, hosts, publishedTypes);
    await writeFile(
      join(consumer, `${name}-combined-manifest-parity.json`),
      JSON.stringify(
        { hosts, fields: [...publishedTypes.config.keys()] },
        null,
        2
      )
    );
  }
} finally {
  await browser?.close();
  await new Promise((resolveClosed) => server.close(resolveClosed));
}
