/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  access,
  copyFile,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { assertGeneratedTypes } from './prefix-edges.mjs';
import {
  assertMinimalGeneratedEdges,
  assertMinimalInstallation,
  selectedSnapshot,
} from './prefix-supplemental.mjs';
import {
  canonicalEvidencePath,
  recordCanonicalModules,
} from './prefix-bundles.mjs';

const runFile = promisify(execFile);
const fixtures = dirname(fileURLToPath(import.meta.url));
const prefixes = ['acme', 'acme-v2', 'acme-cds'];
const packageNames = [
  '@carbon/ai-chat',
  '@carbon/ai-chat-components',
  '@carbon/web-components',
];
const historicalVersions = {
  '@carbon/ai-chat': '1.22.0',
  '@carbon/ai-chat-components': '1.12.0',
  '@carbon/web-components': '2.61.0',
  '@carbon/styles': '1.117.0',
  '@carbon/icons': '11.90.0',
  '@carbon/utilities': '0.24.0',
  react: '18.3.1',
  'react-dom': '18.3.1',
};
const historicalIntegrities = {
  '@carbon/ai-chat':
    'sha512-4WIWaaPiCB7Lo4EPAYLXFPIwfHlX++dZ0W4VSxdi+/cJc406YjYyKIWBZxCoo4GWBA1fjxOIYFBnH822CRJt1Q==',
  '@carbon/ai-chat-components':
    'sha512-MxV6gdNFqXjuFh8FlOxsRXeat3ofP90cGJaypdCyj1kZm3xH+evwLVl/TCfXxQXOpJtt+dljgthTRVmPbKoKyQ==',
  '@carbon/web-components':
    'sha512-FegZCCFd+H6nEMS/ipBWBQsUOM0HnJ2xbK3O7qyZHY7d1T/A+R2vOYoMWVNagjiAbpnMWQXK19JE/CPDs6rldA==',
};

async function json(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function esmResolve(specifier, cwd) {
  const result = await runFile(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      `console.log(import.meta.resolve(${JSON.stringify(specifier)}));`,
    ],
    { cwd }
  );
  return realpath(fileURLToPath(result.stdout.trim()));
}

async function packageRoot(entry, name) {
  let root = dirname(entry);
  while (dirname(root) !== root) {
    const metadata = await json(join(root, 'package.json')).catch(
      () => undefined
    );
    if (metadata?.name === name) {
      return realpath(root);
    }
    root = dirname(root);
  }
  assert.fail(`Cannot find installed ${name} owning ${entry}.`);
}

async function installedRoots(consumer) {
  const app = await packageRoot(
    await esmResolve('@carbon/ai-chat', consumer),
    packageNames[0]
  );
  const components = await packageRoot(
    await esmResolve(
      '@carbon/ai-chat-components/es/components/card/index.js',
      app
    ),
    packageNames[1]
  );
  const carbonFromApp = await packageRoot(
    await esmResolve(
      '@carbon/web-components/es/components/button/index.js',
      app
    ),
    packageNames[2]
  );
  const carbon = await packageRoot(
    await esmResolve(
      '@carbon/web-components/es/components/button/index.js',
      components
    ),
    packageNames[2]
  );
  assert.equal(
    carbon,
    carbonFromApp,
    'Chat and components must select the same real Carbon root.'
  );
  return {
    'ai-chat': app,
    'ai-chat-components': components,
    'web-components': carbon,
  };
}

async function installedVersions(consumer, roots, expected) {
  const installed = await realpath(join(consumer, 'node_modules'));
  const versions = {};
  for (const root of Object.values(roots)) {
    assert.ok(
      !relative(installed, root).startsWith('..'),
      `Resolved package escaped this consumer: ${root}`
    );
    const metadata = await json(join(root, 'package.json'));
    versions[metadata.name] = metadata.version;
    if (expected) {
      assert.equal(metadata.version, expected[metadata.name]);
    }
  }
  for (const name of [
    '@carbon/icons',
    '@carbon/styles',
    'react',
    'react-dom',
  ]) {
    const metadata = await json(
      join(consumer, 'node_modules', name, 'package.json')
    );
    versions[name] = metadata.version;
    if (expected) {
      assert.equal(metadata.version, expected[name]);
    }
  }
  return versions;
}

async function sharedUtilities(roots, expected) {
  const entries = await Promise.all(
    Object.values(roots).map((root) => esmResolve('@carbon/utilities', root))
  );
  assert.equal(
    new Set(entries).size,
    1,
    'All three installed source packages must share utilities.'
  );
  const root = await packageRoot(entries[0], '@carbon/utilities');
  const version = (await json(join(root, 'package.json'))).version;
  if (expected) {
    assert.equal(version, '0.24.0');
  }
  return { root, entry: entries[0], version };
}

async function installedChain(consumer, expected) {
  const roots = await installedRoots(consumer);
  const versions = await installedVersions(consumer, roots, expected);
  const utilities = await sharedUtilities(roots, expected);
  return {
    roots,
    versions: { ...versions, '@carbon/utilities': utilities.version },
    utilities: { root: utilities.root, entry: utilities.entry },
  };
}

async function provenance(consumer, chain) {
  const lock = await json(join(consumer, 'package-lock.json'));
  const packages = {};
  for (const name of Object.keys(chain.versions)) {
    const metadata = lock.packages[`node_modules/${name}`];
    assert.ok(
      metadata?.integrity,
      `${name}: installed tarball integrity must be recorded.`
    );
    packages[name] = {
      version: metadata.version,
      resolved: metadata.resolved,
      integrity: metadata.integrity,
    };
  }
  return {
    ...chain,
    consumer: await realpath(consumer),
    lockfile: join(consumer, 'package-lock.json'),
    packages,
  };
}

async function writeBrowserEntry(consumer, receipt, label, withChat) {
  const generated = `./${relative(consumer, receipt.output).replaceAll('\\', '/')}`;
  const imports = [
    `${generated}/ai-chat-components/components/toolbar/index.js`,
    `${generated}/ai-chat-components/components/audio-player/index.js`,
    `${generated}/ai-chat-components/components/chat-shell/index.js`,
    `${generated}/ai-chat-components/components/chat-history/index.js`,
    `${generated}/web-components/components/button/index.js`,
  ];
  if (withChat) {
    imports.push(
      `${generated}/ai-chat/web-components/cds-aichat-custom-element/index.js`
    );
  }
  await writeFile(
    join(consumer, `${label}.js`),
    `${imports.map((path) => `import ${JSON.stringify(path)};`).join('\n')}
import fixtureStyles from '@carbon/styles/css/styles.css?inline';
import { installFixtureTheme } from './prefix-theme-browser.js';
import { mountPrefix } from './prefix-browser.js';
installFixtureTheme(fixtureStyles, ${JSON.stringify(label)});
await mountPrefix(${JSON.stringify({ prefix: receipt.prefix, label, withChat, theme: label === 'historical' ? 'g90' : 'g10' })});
`
  );
}

function html(scripts, title) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="icon" href="data:,"><title>${title}</title></head><body>${scripts.map((script) => `<script type="module" src="./${script}"></script>`).join('')}</body></html>`;
}

async function buildProofBundle({
  consumer,
  receipts,
  runNpm,
  name,
  withChat,
}) {
  await copyFile(
    join(fixtures, 'prefix-browser.js'),
    join(consumer, 'prefix-browser.js')
  );
  await copyFile(
    join(fixtures, 'prefix-host-browser.js'),
    join(consumer, 'prefix-host-browser.js')
  );
  await copyFile(
    join(fixtures, 'prefix-theme-browser.js'),
    join(consumer, 'prefix-theme-browser.js')
  );
  const entries = {};
  for (const receipt of receipts) {
    const label =
      name === 'historical' ? 'historical' : `${name}-${receipt.prefix}`;
    entries[label] = join(consumer, `${label}.js`);
    await writeBrowserEntry(consumer, receipt, label, withChat);
  }
  if (name === 'current') {
    entries['prefix-default'] = join(consumer, 'prefix-default.js');
    await writeFile(
      entries['prefix-default'],
      `import '@carbon/web-components/es/components/button/index.js';\nconst button = document.createElement('cds-button'); button.id='default-carbon'; button.textContent='Default Carbon'; window.defaultCarbonActions=0; button.addEventListener('click',()=>window.defaultCarbonActions++); document.body.append(button);`
    );
  }
  await writeFile(
    join(consumer, 'prefix.vite.config.mjs'),
    `import { writeFileSync } from 'node:fs';
export default { base:'./', plugins:[{name:'record-prefix-module-ownership',generateBundle(){writeFileSync(${JSON.stringify(join(consumer, 'prefix-bundle-modules.json'))},JSON.stringify([...this.getModuleIds()],null,2));}}], build:{outDir:'prefix-dist',rollupOptions:{input:${JSON.stringify(entries)},output:{entryFileNames:'[name].js',chunkFileNames:'prefix-assets/[name]-[hash].js',assetFileNames:'prefix-assets/[name]-[hash][extname]'}}}};
`
  );
  await runNpm(
    ['run', 'build', '--', '--config', 'prefix.vite.config.mjs'],
    consumer
  );
  const evidence = await recordCanonicalModules(
    consumer,
    join(consumer, 'prefix-bundle-modules.json')
  );
  const modules = evidence.physical.map((item) => item.canonical);
  if (withChat) {
    assert.ok(
      modules.some((id) => id.includes('/node_modules/@carbon/utilities/')),
      'Production chat bundle must include its installed utilities implementation.'
    );
  }
  return Object.keys(entries).filter((entry) => entry !== 'prefix-default');
}

async function buildHostBundle({ consumer, receipt, label, runNpm }) {
  const generated = `./${relative(consumer, receipt.output).replaceAll('\\', '/')}`;
  const entry = join(consumer, `${label}.js`);
  await copyFile(
    join(fixtures, 'prefix-host-browser.js'),
    join(consumer, 'prefix-host-browser.js')
  );
  await writeFile(
    entry,
    `import '${generated}/ai-chat/web-components/cds-aichat-custom-element/index.js';
import { mountHost } from './prefix-host-browser.js';
mountHost(${JSON.stringify({ prefix: receipt.prefix, label })});
`
  );
  const modulesPath = join(consumer, `${label}-bundle-modules.json`);
  await writeFile(
    join(consumer, `${label}.vite.config.mjs`),
    `import { writeFileSync } from 'node:fs';
export default { base:'./', plugins:[{name:'record-host-only-module-ownership',generateBundle(){writeFileSync(${JSON.stringify(modulesPath)},JSON.stringify([...this.getModuleIds()],null,2));}}], build:{outDir:${JSON.stringify(`${label}-dist`)},rollupOptions:{input:${JSON.stringify(entry)},output:{entryFileNames:'host.js',chunkFileNames:'host-assets/[name]-[hash].js',assetFileNames:'host-assets/[name]-[hash][extname]'}}}};
`
  );
  await runNpm(
    ['run', 'build', '--', '--config', `${label}.vite.config.mjs`],
    consumer
  );
  const evidence = await recordCanonicalModules(consumer, modulesPath);
  const modules = evidence.physical.map((item) => item.canonical);
  assert.equal(
    modules.some((id) => id.endsWith('/prefix-browser.js')),
    false,
    'Host-only production builds must not include the mixed components fixture.'
  );
  await writeFile(
    join(consumer, `${label}-dist/index.html`),
    html(['host.js'], label)
  );
  return {
    consumer,
    label,
    prefix: receipt.prefix,
    directory: `${label}-dist`,
  };
}

async function invokePublicBin({
  consumer,
  packageName,
  name,
  prefix,
  output,
  runNpm,
}) {
  const root = join(consumer, 'node_modules', packageName);
  const metadata = await json(join(root, 'package.json'));
  assert.ok(
    metadata.bin?.[name],
    `${name}: packed public executable metadata must exist.`
  );
  const link = join(consumer, 'node_modules/.bin', name);
  assert.equal(
    await realpath(link),
    await realpath(join(root, metadata.bin[name]))
  );
  await runNpm(
    ['exec', '--offline', '--', name, '--prefix', prefix, '--out', output],
    consumer
  );
  return root;
}

async function publicReceipt({ packageName, prefix, output }, root) {
  const components =
    packageName === '@carbon/ai-chat-components'
      ? await realpath(root)
      : await packageRoot(
          await esmResolve(
            '@carbon/ai-chat-components/es/components/card/index.js',
            root
          ),
          '@carbon/ai-chat-components'
        );
  const carbon = await packageRoot(
    await esmResolve(
      '@carbon/web-components/es/components/button/index.js',
      components
    ),
    '@carbon/web-components'
  );
  const roots = [
    ['ai-chat-components', components],
    ['web-components', carbon],
  ];
  if (packageName === '@carbon/ai-chat') {
    roots.unshift(['ai-chat', await realpath(root)]);
  }
  const layers = [];
  for (const [layerName, installedRoot] of roots) {
    const input = join(
      installedRoot,
      layerName === 'ai-chat' ? 'dist/es' : 'es'
    );
    const destination = join(output, layerName);
    await access(destination);
    const manifest = join(destination, 'custom-elements.json');
    layers.push({
      name: layerName,
      packageRoot: installedRoot,
      source: input,
      destination,
      ...((await access(manifest).then(
        () => true,
        () => false
      ))
        ? { manifest }
        : {}),
    });
  }
  return { prefix, output, layers };
}

async function runPublicBin(options) {
  const root = await invokePublicBin(options);
  const receipt = await publicReceipt(options, root);
  const { source } = options;
  if (source) {
    assert.equal(
      await realpath(
        receipt.layers.find((layer) => layer.name === 'ai-chat').source
      ),
      source
    );
  }
  return receipt;
}

async function installHistoricalConsumer({ consumer, runNpm, viteVersion }) {
  const historical = await mkdtemp(
    join(dirname(consumer), 'carbon-prefix-historical-')
  );
  console.log(`Historical prefix consumer evidence: ${historical}`);
  await writeFile(
    join(historical, 'package.json'),
    JSON.stringify(
      {
        name: 'carbon-prefix-historical-consumer',
        private: true,
        type: 'module',
        scripts: { build: 'vite build' },
        dependencies: historicalVersions,
        devDependencies: { vite: viteVersion },
      },
      null,
      2
    )
  );
  await runNpm(['install', '--ignore-scripts'], historical);
  await runNpm(['ci', '--ignore-scripts'], historical);
  await runNpm(
    ['ls', ...Object.keys(historicalVersions), '--json'],
    historical
  );
  await assertMinimalInstallation(historical);
  return historical;
}

async function historicalProvenance(historical, current) {
  const chain = await installedChain(historical, historicalVersions);
  for (const [name, root] of Object.entries(chain.roots)) {
    assert.notEqual(
      root,
      current.roots[name],
      'Historical package roots must not be the current installation.'
    );
  }
  const installed = await provenance(historical, chain);
  for (const [name, integrity] of Object.entries(historicalIntegrities)) {
    assert.equal(
      installed.packages[name].integrity,
      integrity,
      `Historical ${name} must match the reviewed official tarball.`
    );
  }
  await writeFile(
    join(historical, 'prefix-installed-provenance.json'),
    JSON.stringify(installed, null, 2)
  );
  return chain;
}

async function transformHistorical({ consumer, historical, chain }) {
  const runner = await import(
    pathToFileURL(
      join(
        consumer,
        'node_modules/@carbon/ai-chat-components/bin/prefix-build.js'
      )
    ).href
  );
  const receipt = await runner.run({
    packageRoot: chain.roots['ai-chat'],
    argv: ['--prefix', 'history-v1', '--out', join(historical, 'generated')],
  });
  for (const layer of receipt.layers) {
    assert.equal(
      await realpath(layer.packageRoot),
      chain.roots[layer.name],
      'The same installed runner must transform B’s actual dependency roots.'
    );
  }
  await assertMinimalGeneratedEdges({
    receipt,
    consumer: historical,
    strictMetadata: false,
  });
  return receipt;
}

async function historicalConsumer(options) {
  const { consumer, runNpm, current } = options;
  const historical = await installHistoricalConsumer(options);
  const chain = await historicalProvenance(historical, current);
  const receipt = await transformHistorical({ consumer, historical, chain });
  await buildProofBundle({
    consumer: historical,
    receipts: [receipt],
    runNpm,
    name: 'historical',
    withChat: true,
  });
  const bundleEvidence = await json(
    canonicalEvidencePath(join(historical, 'prefix-bundle-modules.json'))
  );
  const modules = bundleEvidence.physical.map((item) => item.canonical);
  assert.ok(
    modules.some((id) => id.startsWith(`${chain.utilities.root}/`)),
    'Historical bundle evidence must include B’s actual utilities root.'
  );
  return { consumer: historical, receipt, chain };
}

async function installDirectConsumer({ consumer, runNpm, viteVersion }) {
  const direct = await mkdtemp(
    join(dirname(consumer), 'carbon-prefix-components-only-')
  );
  console.log(`Components-only prefix consumer evidence: ${direct}`);
  const current = await json(join(consumer, 'package.json'));
  const dependencies = { ...current.dependencies };
  delete dependencies['@carbon/ai-chat'];
  dependencies['@carbon/ai-chat-components'] =
    `file:${resolve(consumer, current.dependencies['@carbon/ai-chat-components'].slice(5))}`;
  await writeFile(
    join(direct, 'package.json'),
    JSON.stringify(
      {
        name: 'carbon-prefix-components-only-consumer',
        private: true,
        type: 'module',
        scripts: { build: 'vite build' },
        dependencies,
        devDependencies: { vite: viteVersion },
      },
      null,
      2
    )
  );
  await runNpm(['install', '--ignore-scripts'], direct);
  await runNpm(['ci', '--ignore-scripts'], direct);
  assert.equal(
    await access(join(direct, 'node_modules/@carbon/ai-chat')).then(
      () => true,
      () => false
    ),
    false,
    'Direct components consumer must have no app installation.'
  );
  await assert.rejects(
    () => esmResolve('@carbon/ai-chat', direct),
    'Direct components must not find a parent/fallback app installation.'
  );
  await assertMinimalInstallation(direct);
  return direct;
}

async function transformDirect(direct, runNpm) {
  const receipts = [];
  for (const prefix of prefixes) {
    const receipt = await runPublicBin({
      consumer: direct,
      packageName: '@carbon/ai-chat-components',
      name: 'create-ai-chat-components-prefixed-build',
      prefix,
      output: join(direct, `generated-${prefix}`),
      runNpm,
    });
    assert.deepEqual(receipt.layers.map((layer) => layer.name).sort(), [
      'ai-chat-components',
      'web-components',
    ]);
    await assertMinimalGeneratedEdges({
      receipt,
      consumer: direct,
      strictMetadata: true,
    });
    console.log(
      `Direct components ${prefix}: packed public bin, current CEM and exact original external-edge parity passed.`
    );
    receipts.push(receipt);
  }
  return receipts;
}

async function directConsumer(options) {
  const { runNpm } = options;
  const direct = await installDirectConsumer(options);
  const receipts = await transformDirect(direct, runNpm);
  const labels = await buildProofBundle({
    consumer: direct,
    receipts,
    runNpm,
    name: 'direct',
    withChat: false,
  });
  return { consumer: direct, receipts, labels };
}

async function currentProvenance({ consumer, repository, chain }) {
  const commit = await runFile('git', ['rev-parse', 'HEAD'], {
    cwd: repository,
  });
  const diff = await runFile('git', ['diff', '--binary', 'HEAD'], {
    cwd: repository,
    maxBuffer: 32 * 1024 * 1024,
  });
  await writeFile(
    join(consumer, 'prefix-installed-provenance.json'),
    JSON.stringify(
      {
        ...(await provenance(consumer, chain)),
        sourceCommit: commit.stdout.trim(),
        sourceDiffSha256: createHash('sha256')
          .update(diff.stdout)
          .digest('hex'),
        sourceDirty: !!diff.stdout,
      },
      null,
      2
    )
  );
}

async function transformCurrent({ consumer, runNpm, chain }) {
  const receipts = [];
  for (const prefix of prefixes) {
    const receipt = await runPublicBin({
      consumer,
      packageName: '@carbon/ai-chat',
      name: 'create-ai-chat-prefixed-build',
      prefix,
      output: join(consumer, `generated-${prefix}`),
      source: join(chain.roots['ai-chat'], 'dist/es'),
      runNpm,
    });
    assert.deepEqual(receipt.layers.map((layer) => layer.name).sort(), [
      'ai-chat',
      'ai-chat-components',
      'web-components',
    ]);
    await assertMinimalGeneratedEdges({
      receipt,
      consumer,
      strictMetadata: true,
    });
    await assertGeneratedTypes({ receipt, consumer });
    console.log(
      `Current chat ${prefix}: packed public bin, selected types, current CEM and exact original external-edge parity passed.`
    );
    receipts.push(receipt);
  }
  return receipts;
}

async function publishProofPages({
  consumer,
  direct,
  historical,
  hosts,
  labels,
}) {
  await mkdir(join(consumer, 'dist'), { recursive: true });
  await cp(join(consumer, 'prefix-dist'), join(consumer, 'dist'), {
    recursive: true,
  });
  await cp(
    join(direct.consumer, 'prefix-dist'),
    join(consumer, 'dist/prefix-direct'),
    { recursive: true }
  );
  for (const host of hosts) {
    await cp(
      join(host.consumer, host.directory),
      join(consumer, 'dist', host.label),
      { recursive: true }
    );
  }
  await cp(
    join(historical.consumer, 'prefix-dist'),
    join(consumer, 'dist/prefix-historical'),
    { recursive: true }
  );
  for (const label of labels) {
    await writeFile(
      join(consumer, 'dist', `${label}.html`),
      html([`${label}.js`], label)
    );
  }
  for (const label of direct.labels) {
    await writeFile(
      join(consumer, 'dist/prefix-direct', `${label}.html`),
      html([`${label}.js`], label)
    );
  }
  await writeFile(
    join(consumer, 'dist/prefix-coexist.html'),
    html(
      [
        'prefix-default.js',
        `${labels[0]}.js`,
        'prefix-historical/historical.js',
      ],
      'Two installed Carbon chat versions'
    )
  );
}

async function supplementalDescriptors(proof) {
  const descriptors = [
    {
      consumer: proof.current.consumer,
      receipts: proof.current.receipts,
      strictMetadata: true,
      bundles: [
        'prefix-bundle-modules.json',
        'host-current-bundle-modules.json',
      ],
    },
    {
      consumer: proof.direct.consumer,
      receipts: proof.direct.receipts,
      strictMetadata: true,
      bundles: ['prefix-bundle-modules.json'],
    },
    {
      consumer: proof.historical.consumer,
      receipts: [proof.historical.receipt],
      strictMetadata: false,
      bundles: [
        'prefix-bundle-modules.json',
        'host-historical-bundle-modules.json',
      ],
    },
  ];
  return Promise.all(
    descriptors.map(async (descriptor) => ({
      ...descriptor,
      bundles: descriptor.bundles.map((file) =>
        canonicalEvidencePath(join(descriptor.consumer, file))
      ),
      selected: await selectedSnapshot(descriptor.consumer),
    }))
  );
}

export async function preparePrefixProofs({
  consumer,
  runNpm,
  viteVersion,
  repository,
}) {
  await assertMinimalInstallation(consumer);
  const chain = await installedChain(consumer);
  assert.equal(chain.versions['@carbon/web-components'], '3.0.0-alpha.3');
  await currentProvenance({ consumer, repository, chain });
  const receipts = await transformCurrent({ consumer, runNpm, chain });
  const labels = await buildProofBundle({
    consumer,
    receipts,
    runNpm,
    name: 'current',
    withChat: true,
  });
  const direct = await directConsumer({ consumer, runNpm, viteVersion });
  const historical = await historicalConsumer({
    consumer,
    runNpm,
    viteVersion,
    current: chain,
  });
  const hosts = await Promise.all([
    buildHostBundle({
      consumer,
      receipt: receipts[0],
      label: 'host-current',
      runNpm,
    }),
    buildHostBundle({
      consumer: historical.consumer,
      receipt: historical.receipt,
      label: 'host-historical',
      runNpm,
    }),
  ]);
  await publishProofPages({ consumer, direct, historical, hosts, labels });
  const proof = {
    current: { consumer, receipts, labels, chain },
    direct,
    historical,
    hosts,
    dependencyPolicy:
      'A and B are independently bundled from their own installed roots. The default Carbon button shares A dependencies; B has separate React/Lit module instances. Browser globals and --cds-* custom properties remain shared intentionally.',
  };
  proof.supplemental = await supplementalDescriptors(proof);
  await writeFile(
    join(consumer, 'prefix-proof.json'),
    JSON.stringify(proof, null, 2)
  );
  return proof;
}
