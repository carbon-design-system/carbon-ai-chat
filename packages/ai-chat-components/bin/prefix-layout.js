/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { transformMetadata, transformModule } from './prefix-modules.js';

const APP = '@carbon/ai-chat';
const COMPONENTS = '@carbon/ai-chat-components';
const CARBON = '@carbon/web-components';

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

function relativeSpecifier(from, to) {
  const relative = path.relative(from, to).split(path.sep).join('/');
  return relative.startsWith('.') ? relative : `./${relative}`;
}

function inside(root, file) {
  const relative = path.relative(root, file);
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== '..' &&
      !path.isAbsolute(relative))
  );
}

function chooseTarget(target, declaration) {
  if (typeof target === 'string' || target === null) {
    return target;
  }
  if (Array.isArray(target)) {
    return target.map((item) => chooseTarget(item, declaration)).find(Boolean);
  }
  for (const [condition, item] of Object.entries(target ?? {})) {
    if (
      condition === 'default' ||
      condition === 'import' ||
      (declaration && condition === 'types')
    ) {
      const selected = chooseTarget(item, declaration);
      if (selected) {
        return selected;
      }
    }
  }
  return undefined;
}

function patternTarget(exports, subpath, declaration) {
  const patterns = Object.keys(exports)
    .filter((key) => key.includes('*'))
    .sort((a, b) => b.indexOf('*') - a.indexOf('*') || b.length - a.length);
  for (const pattern of patterns) {
    const [start, end] = pattern.split('*');
    if (subpath.startsWith(start) && subpath.endsWith(end)) {
      const matched = subpath.slice(
        start.length,
        end ? -end.length : undefined
      );
      return chooseTarget(exports[pattern], declaration)?.replaceAll(
        '*',
        matched
      );
    }
  }
  return undefined;
}

function exportTarget(metadata, subpath, declaration) {
  const exports = metadata.exports;
  if (!exports) {
    if (subpath !== '.') {
      return subpath;
    }
    return declaration
      ? (metadata.types ?? metadata.typings ?? metadata.module ?? metadata.main)
      : (metadata.module ?? metadata.main);
  }
  if (
    typeof exports === 'string' ||
    Array.isArray(exports) ||
    !Object.keys(exports).some((key) => key.startsWith('.'))
  ) {
    return subpath === '.' ? chooseTarget(exports, declaration) : undefined;
  }
  if (Object.hasOwn(exports, subpath)) {
    return chooseTarget(exports[subpath], declaration);
  }
  return patternTarget(exports, subpath, declaration);
}

async function layerAt(packageRoot, output, override) {
  packageRoot = await fs.realpath(packageRoot);
  const metadata = JSON.parse(
    await fs.readFile(path.join(packageRoot, 'package.json'), 'utf8')
  );
  const name = metadata.name.slice('@carbon/'.length);
  const esm = path.join(packageRoot, metadata.name === APP ? 'dist/es' : 'es');
  const source = override ?? esm;
  const destination = path.join(output, name);
  const roots = [{ source: esm, destination }];
  if (override && override !== esm) {
    roots.push({ source: override, destination });
  }
  const types =
    metadata.name === APP ? path.join(packageRoot, 'dist/types') : undefined;
  if (types && (await exists(types))) {
    roots.push({ source: types, destination });
  }
  return { name, packageRoot, metadata, source, destination, roots, types };
}

async function childRoot(parent, name) {
  const require = createRequire(path.join(parent.packageRoot, 'package.json'));
  return path.dirname(require.resolve(`${name}/package.json`));
}

export async function createLayout(packageRoot, output, override) {
  const invoking = await layerAt(packageRoot, output, override);
  if (![APP, COMPONENTS].includes(invoking.metadata.name)) {
    throw new Error(
      `Cannot generate a prefixed build for ${invoking.metadata.name}.`
    );
  }
  const components =
    invoking.metadata.name === COMPONENTS
      ? invoking
      : await layerAt(await childRoot(invoking, COMPONENTS), output);
  const carbon = await layerAt(await childRoot(components, CARBON), output);
  if (invoking !== components) {
    const appCarbon = await fs.realpath(await childRoot(invoking, CARBON));
    if (appCarbon !== carbon.packageRoot) {
      throw new Error(
        `The app resolves @carbon/web-components at ${appCarbon}, while components resolves it at ${carbon.packageRoot}. Install compatible dependencies that share one Carbon copy before generating a build.`
      );
    }
  }
  return invoking === components
    ? [carbon, components]
    : [carbon, components, invoking];
}

function generatedPath(file, layers) {
  for (const layer of layers) {
    for (const root of layer.roots) {
      if (inside(root.source, file)) {
        return path.join(root.destination, path.relative(root.source, file));
      }
    }
  }
  return undefined;
}

async function declarationFile(file) {
  if (/\.[cm]?js$/.test(file)) {
    const declaration = file.replace(/\.[cm]?js$/, (extension) =>
      extension === '.mjs'
        ? '.d.mts'
        : extension === '.cjs'
          ? '.d.cts'
          : '.d.ts'
    );
    if (await exists(declaration)) {
      return declaration;
    }
  }
  if (!path.extname(file)) {
    for (const candidate of [`${file}.d.ts`, path.join(file, 'index.d.ts')]) {
      if (await exists(candidate)) {
        return candidate;
      }
    }
  }
  return file;
}

async function mapSpecifier(specifier, file, declaration, layers) {
  const layer = layers.find(
    (item) =>
      specifier === item.metadata.name ||
      specifier.startsWith(`${item.metadata.name}/`)
  );
  if (!layer) {
    return specifier;
  }
  const subpath =
    specifier === layer.metadata.name
      ? '.'
      : `.${specifier.slice(layer.metadata.name.length)}`;
  const target = exportTarget(layer.metadata, subpath, declaration);
  if (!target) {
    throw new Error(
      `Cannot resolve ${specifier} from ${file}. Check the installed package exports.`
    );
  }
  let original = path.resolve(layer.packageRoot, target);
  if (declaration) {
    original = await declarationFile(original);
  }
  const generated = generatedPath(original, layers);
  if (!generated || !(await exists(generated))) {
    throw new Error(
      `Cannot map ${specifier} from ${file} into the generated trees.`
    );
  }
  const specifierTarget = declaration
    ? generated.replace(/\.d\.([cm]?)ts$/, '.$1js')
    : generated;
  return relativeSpecifier(path.dirname(file), specifierTarget);
}

function metadataPath(value, target, layer, layers) {
  const source = path.resolve((target ?? layer).packageRoot, value);
  const generated = generatedPath(source, layers);
  return generated
    ? path.relative(layer.destination, generated).split(path.sep).join('/')
    : value;
}

async function manifestPath(layer) {
  const advertised =
    layer.metadata.customElements ??
    chooseTarget(layer.metadata.exports?.['./custom-elements.json'], false);
  const source = path.resolve(
    layer.packageRoot,
    advertised ?? 'custom-elements.json'
  );
  if (!(await exists(source))) {
    if (advertised) {
      throw new Error(
        `The manifest advertised by ${layer.metadata.name} is missing at ${source}. Reinstall the package before generating a build.`
      );
    }
    return undefined;
  }
  return source;
}

export async function copyLayer(layer) {
  await fs.cp(layer.source, layer.destination, { recursive: true });
  if (layer.types && (await exists(layer.types))) {
    await fs.cp(layer.types, layer.destination, { recursive: true });
  }
  const license = path.join(layer.packageRoot, 'LICENSE');
  if (await exists(license)) {
    await fs.copyFile(license, path.join(layer.destination, 'LICENSE'));
  }
}

export async function writeLayerMetadata(layer, layers, prefix) {
  const metadata = { type: 'module' };
  const manifest = await manifestPath(layer);
  if (manifest) {
    const content = JSON.parse(await fs.readFile(manifest, 'utf8'));
    const updated = transformMetadata(
      content,
      prefix,
      (value, target) => metadataPath(value, target, layer, layers),
      layers
    );
    layer.manifest = path.join(layer.destination, 'custom-elements.json');
    metadata.customElements = './custom-elements.json';
    await fs.writeFile(layer.manifest, `${JSON.stringify(updated, null, 2)}\n`);
  }
  await fs.writeFile(
    path.join(layer.destination, 'package.json'),
    `${JSON.stringify(metadata, null, 2)}\n`
  );
  const target =
    exportTarget(layer.metadata, './es', false) ??
    exportTarget(layer.metadata, '.', false) ??
    layer.metadata.module ??
    layer.metadata.main;
  const entry =
    target && generatedPath(path.resolve(layer.packageRoot, target), layers);
  if (entry && (await exists(entry))) {
    layer.entry = entry;
  }
}

export async function transformFile(file, layer, layers, prefix) {
  // Source-map paths and VLQ mappings describe the unchanged filenames.
  if (file.endsWith('.map') || path.basename(file) === 'LICENSE') {
    return false;
  }
  const content = await fs.readFile(file, 'utf8');
  const updated = /\.(?:[cm]?js|d\.[cm]?ts)$/.test(file)
    ? await transformModule(content, file, prefix, (specifier, declaration) =>
        mapSpecifier(specifier, file, declaration, layers)
      )
    : content.replace(/(?<!--)cds/g, prefix);
  if (updated === content) {
    return false;
  }
  await fs.writeFile(file, updated);
  return true;
}

export function layoutReceipt(layers) {
  return layers.map(
    ({ name, packageRoot, source, destination, entry, manifest }) => ({
      name,
      packageRoot,
      source,
      destination,
      entry,
      manifest,
    })
  );
}
