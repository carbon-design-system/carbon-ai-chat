/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import ts from 'typescript';
import { localPath } from './manifests.mjs';

function declarations(manifest) {
  return manifest.modules.flatMap((module) =>
    (module.declarations ?? []).map((declaration) => ({ module, declaration }))
  );
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

function assertRuntimeAttribute(property, attributes) {
  const linked = [...attributes.values()].filter(
    (entry) => entry.fieldName === property.name
  );
  if (property.attribute === false) {
    assert.equal(linked.length, 0, `Property-only attribute: ${property.name}`);
    return;
  }
  const name =
    typeof property.attribute === 'string'
      ? property.attribute
      : property.name.toLowerCase();
  assert.deepEqual(
    linked.map((entry) => entry.name),
    [name]
  );
}

function assertRuntimeProperties(host, members, attributes) {
  assert.deepEqual([...attributes.keys()].sort(), [...host.attributes].sort());
  for (const property of host.properties) {
    assert.ok(
      members.has(property.name),
      `Missing runtime property: ${property.name}`
    );
    assertRuntimeAttribute(property, attributes);
  }
  for (const name of ['aiEnabled', 'aiDisabled']) {
    assert.equal(members.get(name).type.text, 'boolean');
  }
  assert.equal(
    host.properties.find((property) => property.name === 'aiDisabled').type,
    'Boolean',
    'Runtime Boolean: aiDisabled'
  );
}

function expectedConfigType(name, sourceType, publicHost) {
  const override = publicHost.fields.get(name);
  const type = override ?? sourceType;
  if (['boolean', 'string', 'number'].includes(type)) {
    return type;
  }
  const owner = override ? publicHost.name : 'PublicConfig';
  return `${owner}['${name}']`;
}

function assertConfigTypes(members, publicHost, publishedFields) {
  for (const [name, sourceType] of publishedFields) {
    assert.ok(members.has(name), `Missing config property: ${name}`);
    const text = members.get(name).type?.text.replaceAll(/\s/g, '');
    assert.equal(
      text?.replaceAll('"', "'"),
      expectedConfigType(name, sourceType, publicHost),
      `Config type: ${name}`
    );
  }
  assert.ok(members.get('config')?.type?.text.includes('PublicConfig'));
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
}

function assertCallbacks(members, publicHost) {
  for (const name of ['onViewChange', 'onViewPreChange']) {
    const sourceType = publicHost.fields.get(name);
    assert.ok(sourceType, `Missing published callback: ${name}`);
    assert.equal(
      members.get(name)?.type?.text.replaceAll(/\s/g, ''),
      `(${sourceType}) | undefined`.replaceAll(/\s/g, ''),
      `Optional callback type: ${name}`
    );
  }
}

function assertHostExports(module, declaration) {
  const target = { name: declaration.name, module: module.path };
  const definitions = module.exports.filter(
    (entry) => entry.kind === 'custom-element-definition'
  );
  assert.equal(definitions.length, 1);
  assert.equal(definitions[0].name, declaration.tagName);
  assert.deepEqual(definitions[0].declaration, target);
  const exported = module.exports.find(
    (entry) => entry.kind === 'js' && entry.name === 'default'
  );
  assert.deepEqual(exported?.declaration, target);
}

export function assertHostParity(manifest, runtime, publishedTypes) {
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
    assert.equal(
      module.path,
      host.module.replace(/^dist\/es-custom\//, 'dist/es/'),
      'Published host module must match its isolated runtime import.'
    );
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
    assertRuntimeProperties(host, members, attributes);
    assertConfigTypes(members, publicHost, publishedTypes.config);
    assertCallbacks(members, publicHost);
    assertHostExports(module, declaration);
  }
}

export function proveParityFailures(manifest, runtime, publishedTypes) {
  const mutate = (change, pattern) => {
    const copy = structuredClone(manifest);
    const { declaration: host, module } = declarations(copy).find(
      ({ declaration }) => declaration.tagName
    );
    change(host, module);
    assert.throws(
      () => assertHostParity(copy, runtime, publishedTypes),
      pattern
    );
  };
  mutate((host, module) => {
    const other = runtime.find((entry) => entry.tag !== host.tagName);
    module.path = other.module.replace(/^dist\/es-custom\//, 'dist/es/');
  }, /Published host module/);
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
  mutate((host) => {
    const member = host.members.find((entry) => entry.name === 'onViewChange');
    member.type.text = member.type.text
      .slice(1)
      .replace(/\) \| undefined$/, ' | undefined');
  }, /Optional callback type/);
}
