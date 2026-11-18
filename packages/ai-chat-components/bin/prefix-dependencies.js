/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import fs from 'node:fs/promises';
import { createRequire, isBuiltin } from 'node:module';
import path from 'node:path';
import { exists, inside, realOutputPath } from './prefix-layout.js';
import { transformModule } from './prefix-modules.js';

const copiedPackages = new Set([
  '@carbon/ai-chat',
  '@carbon/ai-chat-components',
  '@carbon/web-components',
]);

function externalPackageName(specifier) {
  if (
    specifier.startsWith('.') ||
    specifier.startsWith('/') ||
    specifier.startsWith('#') ||
    specifier.includes(':') ||
    isBuiltin(specifier)
  ) {
    return undefined;
  }
  const name = specifier
    .split('/')
    .slice(0, specifier.startsWith('@') ? 2 : 1)
    .join('/');
  return copiedPackages.has(name) ? undefined : name;
}

function packageFiles(file, layers) {
  if (!layers) {
    return [file];
  }
  const layer = layers.find((candidate) => inside(candidate.destination, file));
  if (layer) {
    return [layer.types, layer.source]
      .filter(Boolean)
      .map((source) =>
        path.join(source, path.relative(layer.destination, file))
      );
  }
  return layers.some((candidate) =>
    inside(path.dirname(candidate.destination), file)
  )
    ? []
    : [file];
}

async function installedPackage(name, importer, cache, layers) {
  for (const directory of createRequire(importer).resolve.paths(name) ?? []) {
    for (const file of packageFiles(
      path.join(directory, name, 'package.json'),
      layers
    )) {
      if (!cache.has(file)) {
        cache.set(
          file,
          fs
            .readFile(file, 'utf8')
            .then(JSON.parse)
            .catch((error) => {
              if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
                return undefined;
              }
              throw error;
            })
        );
      }
      const metadata = await cache.get(file);
      if (metadata) {
        return metadata;
      }
    }
  }
  return undefined;
}

async function* moduleFiles(directory, ancestors = new Set()) {
  const canonical = await fs.realpath(directory);
  if (ancestors.has(canonical)) {
    throw new Error(`Cannot copy a circular source directory at ${directory}.`);
  }
  const parents = new Set(ancestors).add(canonical);
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    const metadata = entry.isSymbolicLink() ? await fs.stat(file) : entry;
    if (metadata.isDirectory()) {
      yield* moduleFiles(file, parents);
    } else if (/\.(?:[cm]?js|d\.[cm]?ts)$/.test(file)) {
      yield file;
    }
  }
}

async function checkModule(file, generated, cache, layers) {
  const original = await fs.realpath(file);
  await transformModule(
    await fs.readFile(file, 'utf8'),
    file,
    'cds',
    async (specifier) => {
      const name = externalPackageName(specifier);
      if (!name) {
        return specifier;
      }
      const dependency = await installedPackage(name, original, cache);
      if (
        dependency &&
        !(await installedPackage(name, generated, cache, layers))
      ) {
        const install = `${name}${dependency.version ? `@${dependency.version}` : ''}`;
        throw new Error(
          `The generated build cannot resolve ${specifier} from ${generated}. Add ${install} as a direct dependency of the project that contains --out, then rerun the command.`
        );
      }
      return specifier;
    }
  );
}

export async function assertExternalDependencies(layers) {
  const cache = new Map();
  const output = path.dirname(layers[0].destination);
  const canonicalOutput = path.join(
    await realOutputPath(path.dirname(output)),
    path.basename(output)
  );
  const lookupLayers = layers.map(({ destination, source, types }) => ({
    destination: path.join(canonicalOutput, path.relative(output, destination)),
    source,
    types,
  }));
  for (const layer of lookupLayers) {
    const sources = [layer.source];
    if (layer.types && (await exists(layer.types))) {
      sources.push(layer.types);
    }
    for (const source of sources) {
      for await (const file of moduleFiles(source)) {
        const generated = path.join(
          layer.destination,
          path.relative(source, file)
        );
        await checkModule(file, generated, cache, lookupLayers);
      }
    }
  }
}
