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

function declarations(manifest) {
  return manifest.modules.flatMap((module) =>
    (module.declarations ?? []).map((declaration) => ({ module, declaration }))
  );
}

function localPath(root, path) {
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
      globals.add(`${module.path}#${name}#${base}`);
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

async function checkReferences(manifest, root, packageName) {
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
  const unresolved = [];
  const require = createRequire(join(root, 'package.json'));
  const declarationKeys = [
    'declaration',
    'superclass',
    'inheritedFrom',
    'mixins',
  ];
  function visit(value, key, containingModule, declarationName) {
    if (!value || typeof value !== 'object') {
      return;
    }
    const declarationReference = declarationKeys.includes(key) && value.name;
    const global = globalSuperclass(
      value,
      key,
      `${containingModule}#${declarationName}`,
      globals
    );
    if (
      value.package &&
      value.package !== packageName &&
      declarationReference
    ) {
      const specifier = value.module
        ? `${value.package}/${value.module.replace(/^\.\//, '')}`
        : value.package;
      require.resolve(specifier);
    }
    if (
      (value.module || declarationReference) &&
      (!value.package || value.package === packageName) &&
      !global
    ) {
      const targetModule = value.module ?? containingModule;
      references.push(targetModule);
      if (key === 'references') {
        symbols.push({ ...value, module: targetModule });
      }
      if (declarationReference) {
        const target = `${targetModule}#${value.name}`;
        if (!defined.has(target)) {
          unresolved.push(target);
        }
      }
    }
    for (const [childKey, child] of Object.entries(value)) {
      if (Array.isArray(child)) {
        child.forEach((entry) =>
          visit(
            entry,
            childKey,
            containingModule,
            childKey === 'declarations' ? entry.name : declarationName
          )
        );
      } else {
        visit(child, childKey, containingModule, declarationName);
      }
    }
  }
  manifest.modules.forEach((module) => visit(module, undefined, module.path));
  assert.deepEqual(unresolved, [], 'Unresolved declarations.');
  await checkPublishedFiles(root, manifest, references, symbols);
}

async function checkPublishedFiles(root, manifest, references, symbols) {
  const exports = [];
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
      `Unpublished symbol: ${reference.module}#${reference.name}`
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

export async function readPublishedHostTypes(root, packageJson) {
  const path = localPath(root, packageJson.types);
  const program = ts.createProgram([path], {
    skipLibCheck: true,
    types: [],
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  });
  const checker = program.getTypeChecker();
  const module = checker.getSymbolAtLocation(program.getSourceFile(path));
  const exports = checker.getExportsOfModule(module);
  function fields(name) {
    const exported = exports.find((entry) => entry.name === name);
    assert.ok(exported, `Missing published type: ${name}`);
    const symbol =
      exported.flags & ts.SymbolFlags.Alias
        ? checker.getAliasedSymbol(exported)
        : exported;
    const interfaces = (symbol.declarations ?? []).filter(
      ts.isInterfaceDeclaration
    );
    assert.equal(
      interfaces.length,
      1,
      `Packed declarations must contain ${name}.`
    );
    return new Map(
      interfaces[0].members.map((member) => [
        member.name.text,
        member.type.getText(member.getSourceFile()),
      ])
    );
  }
  return {
    config: fields('PublicConfig'),
    hosts: new Map(
      [
        ['ChatContainer', 'CdsAiChatContainerAttributes'],
        ['ChatCustomElement', 'CdsAiChatCustomElementAttributes'],
      ].map(([host, name]) => [host, { name, fields: fields(name) }])
    ),
  };
}

function unique(entries, key, label) {
  const values = new Map(entries.map((entry) => [entry[key], entry]));
  assert.equal(values.size, entries.length, `Duplicate ${label}.`);
  return values;
}

export function assertHostParity(manifest, runtime, publishedTypes) {
  const publishedFields = publishedTypes.config;
  const hosts = declarations(manifest).filter(
    ({ declaration }) => declaration.tagName
  );
  assert.equal(
    hosts.length,
    2,
    'The chat manifest describes exactly two hosts.'
  );
  assert.equal(manifest.modules.length, 2);
  assert.ok(!JSON.stringify(manifest).includes('FlattenedConfigElement'));
  for (const { module, declaration } of hosts) {
    const publicHost = publishedTypes.hosts.get(declaration.name);
    assert.ok(publicHost, `Missing published host type: ${declaration.name}`);
    const host = runtime.find((entry) => entry.tag === declaration.tagName);
    assert.ok(host, `Missing runtime host: ${declaration.tagName}`);
    assert.ok(
      host.defaultExportRegistered,
      'The published default must be the registered class.'
    );
    const members = unique(declaration.members ?? [], 'name', 'host member');
    const attributes = unique(
      declaration.attributes ?? [],
      'name',
      'host attribute'
    );
    assert.deepEqual(
      [...attributes.keys()].sort(),
      [...host.attributes].sort()
    );
    for (const property of host.properties) {
      assert.ok(
        members.has(property.name),
        `Missing runtime property: ${property.name}`
      );
      const linked = [...attributes.values()].filter(
        (entry) => entry.fieldName === property.name
      );
      if (property.attribute === false) {
        assert.equal(
          linked.length,
          0,
          `Property-only attribute: ${property.name}`
        );
      } else {
        const name =
          typeof property.attribute === 'string'
            ? property.attribute
            : property.name.toLowerCase();
        assert.deepEqual(
          linked.map((entry) => entry.name),
          [name]
        );
      }
    }
    for (const [name, sourceType] of publishedFields) {
      assert.ok(members.has(name), `Missing config property: ${name}`);
      const text = members.get(name).type?.text.replaceAll(/\s/g, '');
      const override = publicHost.fields.get(name);
      const type = override ?? sourceType;
      const owner = override ? publicHost.name : 'PublicConfig';
      const expected = ['boolean', 'string', 'number'].includes(type)
        ? type
        : `${owner}['${name}']`;
      assert.equal(
        text?.replaceAll('"', "'"),
        expected,
        `Config type: ${name}`
      );
    }
    assert.ok(members.get('config')?.type?.text.includes('PublicConfig'));
    assert.ok(members.get('aiDisabled')?.type?.text.includes('boolean'));
    for (const member of members.values()) {
      const indexed = member.type?.text.match(
        /^PublicConfig\[['"]([^'"]+)['"]\]$/
      );
      if (indexed) {
        assert.ok(
          publishedFields.has(indexed[1]),
          `Unpublished config type: ${member.name}`
        );
      }
    }
    const definitions = module.exports.filter(
      (entry) => entry.kind === 'custom-element-definition'
    );
    assert.equal(definitions.length, 1);
    assert.equal(definitions[0].name, declaration.tagName);
    assert.ok(
      module.exports.some(
        (entry) => entry.kind === 'js' && entry.name === 'default'
      )
    );
  }
}

export function proveParityFailures(manifest, runtime, publishedTypes) {
  const mutate = (change, pattern) => {
    const copy = structuredClone(manifest);
    const host = declarations(copy).find(
      ({ declaration }) => declaration.tagName
    ).declaration;
    change(host);
    assert.throws(
      () => assertHostParity(copy, runtime, publishedTypes),
      pattern
    );
  };
  const first = publishedTypes.config.keys().next().value;
  mutate((host) => {
    host.members = host.members.filter((member) => member.name !== first);
  }, /Missing (?:runtime|config) property/);
  mutate((host) => {
    host.members.push(structuredClone(host.members[0]));
  }, /Duplicate host member/);
  mutate((host) => {
    host.attributes.push(structuredClone(host.attributes[0]));
  }, /Duplicate host attribute/);
  mutate((host) => {
    const overrides = publishedTypes.hosts.get(host.name).fields;
    const name = [...overrides.keys()].find((field) =>
      publishedTypes.config.has(field)
    );
    assert.ok(name, 'The published hosts have a config type override.');
    host.members.find((member) => member.name === name).type.text =
      `PublicConfig['${name}']`;
  }, /Config type/);
}
