/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { wrapperEntries } from './wrapper-entries.mjs';

const packageName = '@carbon/ai-chat-components';
const barrelSpecifier = `${packageName}/react`;

/**
 * Maps each wrapper module to the names the React barrel gives it, read from
 * the packed barrel itself.
 */
async function barrelNames(packageRoot) {
  const source = await readFile(join(packageRoot, 'es/react/index.js'), 'utf8');
  const names = new Map();
  for (const [, list, file] of source.matchAll(
    /export\s*\{([^}]*)\}\s*from\s*['"]\.\/([^'"]+)['"]/g
  )) {
    for (const part of list.split(',')) {
      const [local, exported = local] = part.trim().split(/\s+as\s+/);
      if (local) {
        names.set(`${file}#${local}`, exported);
      }
    }
  }
  const starred = [
    ...source.matchAll(/export\s*\*\s*from\s*['"]\.\/([^'"]+)['"]/g),
  ].map(([, file]) => file);
  return { names, starred };
}

function barrelBinding(entry, { names, starred }) {
  const file = entry.path.slice(`${packageName}/es/react/`.length);
  const named = entry.exports.find((name) => name !== 'default');
  const mapped = names.get(`${file}#${named ?? 'default'}`);
  if (mapped) {
    return mapped;
  }
  const throughStar =
    starred.includes(file) ||
    starred.some(
      (barrel) =>
        barrel.endsWith('/index.js') &&
        file.startsWith(barrel.slice(0, -'index.js'.length))
    );
  assert.ok(
    named && throughStar,
    `${entry.path}: the React barrel must export ${entry.tag}'s wrapper.`
  );
  return named;
}

async function bundledModules(vite, consumer, packageRoot, name, source) {
  const directory = join(consumer, 'react-barrel');
  await mkdir(directory, { recursive: true });
  const entry = join(directory, `${name}.js`);
  await writeFile(entry, source);
  const result = await vite.build({
    configFile: false,
    logLevel: 'silent',
    root: consumer,
    build: {
      write: false,
      minify: false,
      lib: { entry, formats: ['es'], fileName: name },
      rollupOptions: {
        external: (id) =>
          !id.startsWith('.') &&
          !id.startsWith('/') &&
          !id.startsWith(packageName),
      },
    },
  });
  const output = (Array.isArray(result) ? result[0] : result).output;
  const modules = output
    .filter((item) => item.type === 'chunk')
    .flatMap((chunk) => chunk.moduleIds ?? Object.keys(chunk.modules));
  return new Set(
    modules
      .filter((id) => id.startsWith(`${packageRoot}/`))
      .map((id) => id.slice(packageRoot.length + 1))
      .filter((id) => id !== 'es/react/index.js')
  );
}

/**
 * Importing one wrapper through `@carbon/ai-chat-components/react` must bundle
 * exactly what its deep `es/react/*.js` import bundles: its own component and
 * registration, and no other wrapper's.
 */
export async function assertReactBarrelShaking({ consumer }) {
  const packageRoot = await realpath(
    join(consumer, 'node_modules', packageName)
  );
  const require = createRequire(join(consumer, 'package.json'));
  const vite = await import(pathToFileURL(require.resolve('vite')).href);
  const barrel = await barrelNames(packageRoot);
  for (const entry of wrapperEntries) {
    const binding = barrelBinding(entry, barrel);
    const deep = await bundledModules(
      vite,
      consumer,
      packageRoot,
      `${binding}-deep`,
      `import * as wrappers from '${entry.path}';\nglobalThis.wrapper = wrappers[${JSON.stringify(entry.exports.find((name) => name !== 'default') ?? 'default')}];\n`
    );
    const shaken = await bundledModules(
      vite,
      consumer,
      packageRoot,
      `${binding}-barrel`,
      `import { ${binding} } from '${barrelSpecifier}';\nglobalThis.wrapper = ${binding};\n`
    );
    assert.ok(
      deep.has(entry.path.slice(`${packageName}/`.length)),
      `${entry.path}: the deep import must bundle the wrapper module.`
    );
    assert.deepEqual(
      [...shaken].sort(),
      [...deep].sort(),
      `${binding}: importing it from ${barrelSpecifier} must bundle the same modules as ${entry.path}.`
    );
  }
}
