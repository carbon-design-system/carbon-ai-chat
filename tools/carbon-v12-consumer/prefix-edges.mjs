/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import {
  access,
  readFile,
  readdir,
  realpath,
  writeFile,
} from 'node:fs/promises';
import { createRequire, isBuiltin } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import ts from 'typescript';

const localPackages = [
  '@carbon/ai-chat',
  '@carbon/ai-chat-components',
  '@carbon/web-components',
];

export async function filesUnder(root) {
  const entries = await readdir(root, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const path = join(root, entry.name);
        return entry.isDirectory() ? filesUnder(path) : [path];
      })
    )
  ).flat();
}

function inside(root, path) {
  const result = relative(root, path);
  return result === '' || (!result.startsWith('..') && !result.startsWith('/'));
}

async function existingModule(path, importer) {
  for (const candidate of [
    path,
    `${path}.js`,
    `${path}.d.ts`,
    join(path, 'index.js'),
    join(path, 'index.d.ts'),
  ]) {
    if (
      await access(candidate).then(
        () => true,
        () => false
      )
    ) {
      return realpath(candidate);
    }
  }
  assert.fail(`${importer}: generated relative edge has no target: ${path}`);
}

function moduleSpecifier(node) {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
    return node.moduleSpecifier;
  }
  if (ts.isCallExpression(node)) {
    return node.expression.kind === ts.SyntaxKind.ImportKeyword
      ? node.arguments[0]
      : undefined;
  }
  if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
    return node.argument.literal;
  }
  return undefined;
}

export function moduleEdges(path, source) {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  const edges = [];
  function visit(node) {
    const specifier = moduleSpecifier(node);
    if (specifier && ts.isStringLiteralLike(specifier)) {
      edges.push(specifier.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return edges;
}

async function checkMapTargets(map, originalPath, generatedPath) {
  if (map.file) {
    await access(resolve(dirname(generatedPath), map.file));
  }
  for (const [index, sourcePath] of (map.sources ?? []).entries()) {
    if (map.sourcesContent?.[index] != null) {
      continue;
    }
    const originalTarget = resolve(dirname(originalPath), sourcePath);
    if (
      await access(originalTarget).then(
        () => true,
        () => false
      )
    ) {
      await access(resolve(dirname(generatedPath), sourcePath));
    }
  }
}

async function checkMap(path, originalPath, source) {
  const sourceMap = source.match(/\/\/# sourceMappingURL=([^\r\n]+)/)?.[1];
  if (!sourceMap || sourceMap.startsWith('data:')) {
    return;
  }
  const generatedPath = resolve(dirname(path), sourceMap);
  const originalMap = JSON.parse(
    await readFile(resolve(dirname(originalPath), sourceMap), 'utf8')
  );
  const generated = JSON.parse(await readFile(generatedPath, 'utf8'));
  assert.deepEqual(
    generated,
    originalMap,
    `${path}: source maps must preserve all metadata, source roots and VLQ mappings.`
  );
  await checkMapTargets(originalMap, originalPath, generatedPath);
}

function collectManifestReferences(value, references) {
  if (!value || typeof value !== 'object') {
    return;
  }
  assert.ok(
    !localPackages.includes(value.package),
    `Generated CEM escaped to ${value.package}.`
  );
  if (value.module && !value.package) {
    references.push(value.module);
  }
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      child.forEach((entry) => collectManifestReferences(entry, references));
    } else {
      collectManifestReferences(child, references);
    }
  }
}

function manifestTags(value) {
  return value.modules.flatMap((module) =>
    (module.declarations ?? []).flatMap((declaration) =>
      declaration.tagName ? [declaration.tagName] : []
    )
  );
}

async function checkManifest(layer, prefix, context) {
  if (!layer.manifest) {
    return;
  }
  const manifest = JSON.parse(await readFile(layer.manifest, 'utf8'));
  const original = JSON.parse(
    await readFile(join(layer.packageRoot, 'custom-elements.json'), 'utf8')
  );
  assert.equal(manifest.schemaVersion, '1.0.0');
  assert.deepEqual(
    manifestTags(manifest),
    manifestTags(original).map((tag) => tag.replace(/^cds/, prefix))
  );
  const references = [];
  for (const module of manifest.modules) {
    references.push(module.path);
    collectManifestReferences(module, references);
  }
  for (const path of new Set(references)) {
    await auditCheck(context, `${layer.manifest}: CEM module ${path}`, () =>
      access(resolve(dirname(layer.manifest), path))
    );
  }
}

function declarationTarget(path, specifier) {
  if (!path.endsWith('.d.ts')) {
    return undefined;
  }
  return ts.resolveModuleName(
    specifier,
    path,
    { moduleResolution: ts.ModuleResolutionKind.Bundler },
    ts.sys
  ).resolvedModule?.resolvedFileName;
}

async function checkRelativeEdge(path, specifier, context) {
  const typeTarget = declarationTarget(path, specifier);
  const target = typeTarget
    ? await realpath(typeTarget)
    : await existingModule(resolve(dirname(path), specifier), path);
  assert.ok(
    inside(context.generatedRoot, target),
    `${path}: generated local edge escaped its three-layer tree: ${specifier}.`
  );
  context.evidence.edges.push({
    importer: relative(context.consumer, path),
    specifier,
    target: relative(context.consumer, target),
  });
}

export async function resolveExternalTarget(path, specifier) {
  return realpath(
    declarationTarget(path, specifier) || createRequire(path).resolve(specifier)
  );
}

async function checkExternalEdge(path, specifier, context) {
  let target;
  try {
    target = await resolveExternalTarget(path, specifier);
  } catch (error) {
    error.externalEdge = { importer: path, specifier, code: error.code };
    throw error;
  }
  assert.ok(
    inside(context.installedRoot, target),
    `${path}: external ${specifier} escaped its installed consumer.`
  );
  context.evidence.external.push({
    importer: relative(context.consumer, path),
    specifier,
    target,
  });
}

async function checkGeneratedEdge(path, specifier, context) {
  assert.ok(
    !localPackages.some(
      (name) => specifier === name || specifier.startsWith(`${name}/`)
    ),
    `${path}: escaped generated package edge ${specifier}.`
  );
  if (specifier.startsWith('.')) {
    await checkRelativeEdge(path, specifier, context);
  } else if (!isBuiltin(specifier) && !specifier.startsWith('data:')) {
    await checkExternalEdge(path, specifier, context);
  }
}

async function checkOriginalFile(path, originalPath, source) {
  const originalExists = await access(originalPath).then(
    () => true,
    () => false
  );
  if (!originalExists) {
    return;
  }
  await checkMap(path, originalPath, source);
  const original = await readFile(originalPath, 'utf8');
  const properties = (text) =>
    [...new Set(text.match(/--cds[-a-zA-Z0-9_]*/g) ?? [])].sort();
  assert.deepEqual(
    properties(source),
    properties(original),
    `${path}: Carbon custom-property names must remain shared.`
  );
}

export async function originalFileFor(path, layer) {
  const module = relative(layer.destination, path);
  const esm = join(layer.source, module);
  if (
    await access(esm).then(
      () => true,
      () => false
    )
  ) {
    return esm;
  }
  if (layer.name === 'ai-chat' && path.endsWith('.d.ts')) {
    return join(layer.packageRoot, 'dist/types', module);
  }
  return esm;
}

async function checkGeneratedFile(path, layer, context) {
  const source = await readFile(path, 'utf8');
  const originalPath = await originalFileFor(path, layer);
  await auditCheck(context, `${path}: source preservation`, () =>
    checkOriginalFile(path, originalPath, source)
  );
  for (const specifier of moduleEdges(path, source)) {
    await auditCheck(context, `${path}: module ${specifier}`, () =>
      checkGeneratedEdge(path, specifier, context)
    );
  }
  context.evidence.files += 1;
}

async function auditCheck(context, label, check) {
  try {
    await check();
  } catch (error) {
    context.evidence.errors.push({
      label,
      stack: error.stack || String(error),
      externalEdge: error.externalEdge,
    });
  }
}

async function checkLayerManifest(layer, receipt, context) {
  assert.ok(
    layer.manifest,
    `${layer.name}: current generated CEM must be discoverable.`
  );
  await checkManifest(layer, receipt.prefix, context);
}

async function checkGeneratedLayer(layer, receipt, strictMetadata, context) {
  const files = await filesUnder(layer.destination);
  for (const path of files.filter((file) =>
    /\.(?:[cm]?js|d\.[cm]?ts)$/.test(file)
  )) {
    await auditCheck(context, `${path}: generated file`, () =>
      checkGeneratedFile(path, layer, context)
    );
  }
  if (strictMetadata && layer.name !== 'web-components') {
    await auditCheck(context, `${layer.name}: generated CEM`, () =>
      checkLayerManifest(layer, receipt, context)
    );
  }
}

export async function auditGeneratedEdges({
  receipt,
  consumer,
  strictMetadata,
}) {
  const evidence = {
    prefix: receipt.prefix,
    files: 0,
    edges: [],
    external: [],
    errors: [],
  };
  const context = {
    consumer,
    evidence,
    generatedRoot: await realpath(receipt.output),
    installedRoot: await realpath(join(consumer, 'node_modules')),
  };
  assert.ok(
    inside(await realpath(consumer), context.generatedRoot),
    'Generated output must remain in its own actual consumer.'
  );
  for (const layer of receipt.layers) {
    await auditCheck(context, `${layer.name}: generated layer`, () =>
      checkGeneratedLayer(layer, receipt, strictMetadata, context)
    );
  }
  await writeFile(
    join(consumer, `prefix-${receipt.prefix}-edges.json`),
    JSON.stringify(evidence, null, 2)
  );
  return evidence;
}

export async function assertGeneratedEdges(options) {
  const evidence = await auditGeneratedEdges(options);
  if (evidence.errors.length) {
    assert.fail(
      `Generated graph audit found ${evidence.errors.length} failures:\n${evidence.errors.map((error) => `${error.label}\n${error.stack}`).join('\n\n')}`
    );
  }
  return evidence;
}

export async function assertGeneratedTypes({ receipt, consumer }) {
  const root = `./${relative(consumer, receipt.output).replaceAll('\\', '/')}`;
  const fixture = join(consumer, `prefix-${receipt.prefix}-types.ts`);
  await writeFile(
    fixture,
    `
import Host from '${root}/ai-chat/web-components/cds-aichat-custom-element/index.js';
import Card from '${root}/ai-chat-components/components/aichat-card/aichat-card.js';
import Skeleton from '${root}/ai-chat-components/components/aichat-button/aichat-button-skeleton.js';
import Transcript from '${root}/ai-chat-components/react/transcript.js';
import { createElement } from 'react';
const host: HTMLElement = new Host();
const constructor: CustomElementConstructor = Skeleton;
const card = new Card();
card.isFlush = true;
// @ts-expect-error Generated component property types remain Boolean.
card.isFlush = 'yes';
createElement(Transcript, { text: 'Generated transcript', expanded: true });
// @ts-expect-error Generated precise React props retain their Boolean type.
createElement(Transcript, { expanded: 'yes' });
export { host, constructor, card };
`
  );
  for (const [name, module, moduleResolution] of [
    ['node16', ts.ModuleKind.Node16, ts.ModuleResolutionKind.Node16],
    ['bundler', ts.ModuleKind.ESNext, ts.ModuleResolutionKind.Bundler],
  ]) {
    const program = ts.createProgram([fixture], {
      module,
      moduleResolution,
      target: ts.ScriptTarget.ES2022,
      lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      types: [],
      esModuleInterop: true,
      noUncheckedSideEffectImports: true,
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    const formatted = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => consumer,
      getCanonicalFileName: (path) => path,
      getNewLine: () => '\n',
    });
    await writeFile(
      join(consumer, `prefix-${receipt.prefix}-types-${name}.log`),
      formatted
    );
    assert.equal(
      diagnostics.length,
      0,
      `Generated ${receipt.prefix} ${name} declaration errors:\n${formatted}`
    );
  }
}
