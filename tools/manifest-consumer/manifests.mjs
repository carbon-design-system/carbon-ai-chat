/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import { access, readFile, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { globalSuperclassReferences } from '../../packages/ai-chat-components/tasks/cem-plugins.js';

export function localPath(root, path) {
  const target = resolve(root, path);
  assert.ok(
    !relative(root, target).startsWith('..'),
    `Unpublished path: ${path}`
  );
  return target;
}

function bareSuperclass(reference) {
  return Boolean(reference?.name) && !reference.module && !reference.package;
}

async function publishedGlobalSuperclasses(manifest, root) {
  const globals = new Set();
  for (const module of manifest.modules) {
    if (
      !(module.declarations ?? []).some((entry) =>
        bareSuperclass(entry.superclass)
      )
    ) {
      continue;
    }
    const filename = localPath(root, module.path);
    const source = ts.createSourceFile(
      filename,
      await readFile(filename, 'utf8'),
      ts.ScriptTarget.Latest,
      true
    );
    for (const [name, base] of globalSuperclassReferences(ts, source)) {
      if (
        source.statements.some(
          (statement) =>
            ts.isClassDeclaration(statement) && statement.name?.text === name
        )
      ) {
        globals.add(`${module.path}#${name}#${base}`);
      }
    }
  }
  return globals;
}

function globalSuperclass(reference, key, owner, globals) {
  return (
    key === 'superclass' &&
    bareSuperclass(reference) &&
    globals.has(`${owner}#${reference.name}`)
  );
}

function checkExternalReference(value, declarationReference, require) {
  assert.match(
    value.package,
    /^(@[^/]+\/)?[^/]+$/,
    `Package references name a package, not a path: ${value.package}`
  );
  if (!declarationReference) {
    return;
  }
  const specifier = value.module
    ? `${value.package}/${value.module.replace(/^\.\//, '')}`
    : value.package;
  require.resolve(specifier);
}

function collectLocalReference(
  value,
  key,
  containingModule,
  declarationReference,
  declarationName,
  state
) {
  const owner = declarationName && `${containingModule}#${declarationName}`;
  if (globalSuperclass(value, key, owner, state.globals)) {
    return;
  }
  if (!value.module && !declarationReference) {
    return;
  }
  const targetModule = value.module ?? containingModule;
  state.references.push(targetModule);
  if (key === 'references') {
    state.symbols.push({ ...value, module: targetModule });
  }
  if (
    declarationReference &&
    !state.defined.has(`${targetModule}#${value.name}`)
  ) {
    state.symbols.push({ ...value, module: targetModule, owner });
  }
}

function visitReferences(value, key, containingModule, declarationName, state) {
  if (!value || typeof value !== 'object') {
    return;
  }
  const declarationReference =
    ['declaration', 'superclass', 'inheritedFrom', 'mixins'].includes(key) &&
    value.name;
  if (value.package && value.package !== state.packageName) {
    checkExternalReference(value, declarationReference, state.require);
  } else {
    collectLocalReference(
      value,
      key,
      containingModule,
      declarationReference,
      declarationName,
      state
    );
  }
  for (const [childKey, child] of Object.entries(value)) {
    if (Array.isArray(child)) {
      child.forEach((entry) =>
        visitReferences(
          entry,
          childKey,
          containingModule,
          childKey === 'declarations' ? entry.name : declarationName,
          state
        )
      );
    } else {
      visitReferences(
        child,
        childKey,
        containingModule,
        declarationName,
        state
      );
    }
  }
}

export async function checkReferences(manifest, root, packageName) {
  const globals = await publishedGlobalSuperclasses(manifest, root);
  const defined = new Set(
    manifest.modules.flatMap((module) => [
      ...(module.declarations ?? []).map(
        (entry) => `${module.path}#${entry.name}`
      ),
      ...(module.exports ?? []).map((entry) => `${module.path}#${entry.name}`),
    ])
  );
  const references = [];
  const symbols = [];
  const exports = [];

  const state = {
    packageName,
    globals,
    defined,
    references,
    symbols,
    require: createRequire(join(root, 'package.json')),
  };
  manifest.modules.forEach((module) =>
    visitReferences(module, undefined, module.path, undefined, state)
  );
  for (const module of manifest.modules) {
    for (const entry of module.exports ?? []) {
      if (entry.kind === 'js') {
        exports.push({ name: entry.name, module: module.path });
      }
    }
  }
  for (const path of new Set([
    ...manifest.modules.map((module) => module.path),
    ...references,
  ])) {
    assert.match(path, /\.(?:[cm]?js|d\.[cm]?ts)$/);
    await access(localPath(root, path));
  }
  await checkPublishedSymbols(root, manifest, symbols, exports);
}

async function checkPublishedSymbols(root, manifest, references, exports) {
  const typedReferences = await Promise.all(
    references.map(async (reference) => {
      const path = localPath(root, reference.module);
      const declarationPath = path.replace(/\.[cm]?js$/, '.d.ts');
      const module = await access(declarationPath).then(
        () => declarationPath,
        () => path
      );
      return { ...reference, module };
    })
  );
  const runtimeExports = exports.map((entry) => ({
    ...entry,
    module: localPath(root, entry.module),
  }));
  const program = ts.createProgram(
    [
      ...new Set([
        ...manifest.modules.map((module) => localPath(root, module.path)),
        ...typedReferences.map((reference) => reference.module),
      ]),
    ],
    {
      allowJs: true,
      checkJs: false,
      noEmit: true,
      skipLibCheck: true,
      types: [],
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    }
  );
  const checker = program.getTypeChecker();
  for (const reference of [...runtimeExports, ...typedReferences]) {
    const source = program.getSourceFile(reference.module);
    const symbol = source && checker.getSymbolAtLocation(source);
    assert.ok(symbol, `Not a published module: ${reference.module}`);
    const names = checker.getExportsOfModule(symbol).map((entry) => entry.name);
    assert.ok(
      names.includes(reference.name),
      `Unpublished symbol: ${reference.module}#${reference.name}${
        reference.owner ? ` (from ${reference.owner})` : ''
      }`
    );
  }
}

export async function readPackedManifest(consumer, packageName) {
  const root = join(consumer, 'node_modules', packageName);
  const packageJson = JSON.parse(
    await readFile(join(root, 'package.json'), 'utf8')
  );
  assert.equal(packageJson.customElements, './custom-elements.json');
  const metadataPath = localPath(root, packageJson.customElements);
  const require = createRequire(join(consumer, 'package.json'));
  assert.equal(
    await realpath(require.resolve(`${packageName}/custom-elements.json`)),
    await realpath(metadataPath)
  );
  const manifest = JSON.parse(await readFile(metadataPath, 'utf8'));
  assert.equal(manifest.schemaVersion, '1.0.0');
  assert.ok(manifest.modules.length > 0);
  await checkReferences(manifest, root, packageName);
  return { manifest, root, packageJson };
}
