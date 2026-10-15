/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { create, ts } from '@custom-elements-manifest/analyzer';
import { litPlugin } from '@custom-elements-manifest/analyzer/src/features/framework-plugins/lit/lit.js';
import { carbonElementTagPlugin, internalMembersPlugin } from '../../../ai-chat-components/tasks/cem-plugins.js';
import { createFlattenedConfigPlugin } from '../cem-flattened-config.js';

const tablePath = 'fixture/table.ts';
const publicConfigPath = 'fixture/config.ts';
const basePath = 'fixture/base.ts';
const typeModule = 'dist/types/aiChatEntry.d.ts';
const hosts = [
  { name: 'First', source: 'fixture/first.ts', module: 'dist/es/first/index.js' },
  { name: 'Second', source: 'fixture/second.ts', module: 'dist/es/second/index.js' },
];
const fields = `
  { name: 'aiEnabled', options: { attribute: 'ai-enabled', converter: aiEnabledConverter } },
  { name: 'assistantAvatarUrl', options: { type: String } },
  { name: 'keyboardShortcuts', options: { type: Object } },
  { name: 'onError', options: { attribute: false } }
`;
const config = `export interface PublicConfig {
  /** Enables the AI theme. */
  aiEnabled?: boolean;
  assistantAvatarUrl?: string;
  keyboardShortcuts?: Shortcuts;
  onError?: (error: ErrorData) => void;
}`;
const base = `
  import type { PublicConfig } from './config';
  function buildFlattenedProperties() {
    const properties = {
      config: { attribute: false, type: Object },
      aiDisabled: { type: Boolean, attribute: 'ai-disabled' }
    };
    return properties;
  }
  export class FlattenedConfigElement {
    /** Base settings. */
    config?: PublicConfig;
    aiDisabled?: boolean;
    public inheritedMember?: string;
    private cache?: object;
    protected resolvedConfig?: PublicConfig;
  }
`;

function hostSource(name, tagName) {
  return `
    import { FlattenedConfigElement } from './base';
    import type { ViewChange } from './events';
    /** @attr own-attribute - A concrete host attribute. */
    class ${name} extends FlattenedConfigElement {
      /** Internal renderer seam. @internal */
      @property({ attribute: false })
      privateInternal?: InternalRenderer;
      @property({ attribute: false })
      private privateReactive?: InternalRenderer;
      private privateNonreactive?: object;
      @state()
      private privateState?: object;
      @property({ state: true })
      private privatePropertyState?: object;
      @property()
      onViewChange?: (event: ViewChange) => void;
      @property()
      onViewPreChange?: (event: ViewChange) => Promise<void>;
      @property({ attribute: 'own-member' })
      public ownMember?: string;
    }
    customElements.define('${tagName}', ${name});
    export default ${name};
  `;
}

function manifest(overrides = {}, plugins = [], selectedHosts = hosts) {
  const sources = {
    [tablePath]: `export const FLATTENED_PUBLIC_CONFIG_FIELDS = [${fields}] as const satisfies readonly Entry[];`,
    [publicConfigPath]: config,
    [basePath]: base,
    [hosts[0].source]: hostSource('First', 'fixture-first'),
    [hosts[1].source]: hostSource('Second', 'fixture-second'),
    ...overrides,
  };
  return create({
    modules: Object.entries(sources).map(([path, source]) =>
      ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)
    ),
    plugins: [...litPlugin(), carbonElementTagPlugin({ prefix: 'fixture' }), internalMembersPlugin(), ...plugins, createFlattenedConfigPlugin({ tablePath, publicConfigPath, basePath, hosts: selectedHosts, typeModule })],
  });
}

test('publishes both hosts with inherited fields and keeps their own callbacks', () => {
  const result = manifest();
  assert.deepEqual(result.modules.map((module) => module.path), hosts.map((host) => host.module));
  for (const [index, module] of result.modules.entries()) {
    assert.equal(module.declarations.length, 1);
    const declaration = module.declarations[0];
    assert.equal(declaration.name, hosts[index].name);
    assert.equal(declaration.superclass, undefined);
    assert.deepEqual(module.exports, [
      { kind: 'js', name: 'default', declaration: { name: hosts[index].name, module: hosts[index].module } },
      { kind: 'custom-element-definition', name: declaration.tagName, declaration: { name: hosts[index].name, module: hosts[index].module } },
    ]);
    const members = new Map(declaration.members.map((member) => [member.name, member]));
    for (const name of ['ownMember', 'inheritedMember', 'onViewChange', 'onViewPreChange']) {
      assert.ok(members.has(name), name);
    }
    assert.equal(members.get('onViewChange').type.text, '(event: ViewChange) => void | undefined');
    assert.equal(members.has('cache'), false);
    assert.equal(members.has('resolvedConfig'), false);
    assert.ok(declaration.members.every((member) => !member.inheritedFrom));
    assert.ok(declaration.attributes.some((attribute) => attribute.name === 'own-attribute'));
  }
});

test('derives property types and the exact special and synthetic attributes', () => {
  for (const module of manifest().modules) {
    const declaration = module.declarations[0];
    const members = new Map(declaration.members.map((member) => [member.name, member]));
    assert.equal(members.get('aiEnabled').type.text, 'boolean');
    assert.equal(members.get('aiEnabled').description, 'Enables the AI theme.');
    assert.equal(members.get('assistantAvatarUrl').type.text, 'string');
    assert.deepEqual(members.get('keyboardShortcuts').type, {
      text: 'PublicConfig["keyboardShortcuts"]',
      references: [{ name: 'PublicConfig', module: typeModule }],
    });
    assert.equal(members.get('onError').type.text, 'PublicConfig["onError"]');
    assert.equal(members.get('config').type.text, 'PublicConfig');
    assert.equal(members.get('aiDisabled').type.text, 'boolean');
    assert.deepEqual(declaration.attributes.filter((attribute) => attribute.fieldName).map(({ name, fieldName }) => ({ name, fieldName })), [
      { name: 'onviewchange', fieldName: 'onViewChange' },
      { name: 'onviewprechange', fieldName: 'onViewPreChange' },
      { name: 'own-member', fieldName: 'ownMember' },
      { name: 'ai-enabled', fieldName: 'aiEnabled' },
      { name: 'assistantavatarurl', fieldName: 'assistantAvatarUrl' },
      { name: 'keyboardshortcuts', fieldName: 'keyboardShortcuts' },
      { name: 'ai-disabled', fieldName: 'aiDisabled' },
    ]);
    assert.equal(members.get('config').attribute, undefined);
    assert.equal(members.get('onError').attribute, undefined);
  }
});

test('normalizes concrete reactive attributes from decorator options', () => {
  const result = manifest({}, [{
    name: 'fixture-analyzer-attribute-names',
    packageLinkPhase({ customElementsManifest }) {
      for (const module of customElementsManifest.modules) {
        const declaration = module.declarations?.[0];
        if (!declaration?.members?.some((member) => member.name === 'onViewChange')) {
          continue;
        }
        declaration.attributes ??= [];
        declaration.attributes.push(
          { name: 'onViewChange', fieldName: 'onViewChange' },
          { name: 'privateReactive', fieldName: 'privateReactive' }
        );
      }
    },
  }]);
  for (const module of result.modules) {
    const declaration = module.declarations[0];
    const members = new Map(declaration.members.map((member) => [member.name, member]));
    assert.equal(members.get('onViewChange').attribute, 'onviewchange');
    assert.equal(members.get('onViewPreChange').attribute, 'onviewprechange');
    assert.equal(members.get('ownMember').attribute, 'own-member');
    assert.equal(members.get('privateReactive').attribute, undefined);
    const attributes = new Set(declaration.attributes.map((attribute) => attribute.name));
    assert.equal(attributes.has('onViewChange'), false);
    assert.equal(attributes.has('privateReactive'), false);
    assert.equal(attributes.has('privateState'), false);
    assert.equal(attributes.has('privatePropertyState'), false);
    assert.ok(attributes.has('onviewchange'));
    assert.ok(attributes.has('onviewprechange'));
    assert.ok(attributes.has('own-member'));
  }
});

test('retains private reactive fields without inventing a published type reference', () => {
  const result = manifest({}, [{
    name: 'fixture-private-type-reference',
    packageLinkPhase({ customElementsManifest }) {
      for (const module of customElementsManifest.modules) {
        const member = module.declarations?.[0]?.members?.find((field) => field.name === 'privateReactive');
        if (member) {
          member.type.references = [{ name: 'InternalRenderer', module: 'fixture/private.ts' }];
        }
      }
    },
  }]);
  for (const module of result.modules) {
    const members = new Map(module.declarations[0].members.map((member) => [member.name, member]));
    const member = members.get('privateReactive');
    assert.equal(member.privacy, 'private');
    assert.equal(member.type.text, 'InternalRenderer | undefined');
    assert.equal(member.type.references, undefined);
    assert.equal(members.has('privateNonreactive'), false);
    assert.equal(members.has('privateState'), false);
    assert.equal(members.has('privatePropertyState'), false);
  }
});

test('restores @internal reactive fields pruned by the production analyzer pipeline', () => {
  const result = manifest();
  for (const module of result.modules) {
    const member = module.declarations[0].members.find((field) => field.name === 'privateInternal');
    assert.equal(member.privacy, 'private');
    assert.equal(member.type.text, 'InternalRenderer | undefined');
    assert.equal(member.description, 'Internal renderer seam.');
    assert.equal(member.type.references, undefined);
    assert.equal(member.attribute, undefined);
  }
});

test('still fails when the analyzer omits a public reactive field', () => {
  assert.throws(() => manifest({
    [hosts[0].source]: hostSource('First', 'fixture-first')
      .replace('@property()\n      onViewChange', '/** @ignore */\n      @property()\n      onViewChange'),
  }), /missing reactive member "onViewChange"/);
});

test('a supported added field appears without a second metadata list', () => {
  const result = manifest({
    [tablePath]: `export const FLATTENED_PUBLIC_CONFIG_FIELDS = [${fields}, { name: 'newFlag', options: { type: Boolean, attribute: 'new-flag' } }] as const;`,
    [publicConfigPath]: config.replace('aiEnabled?: boolean;', 'newFlag?: boolean; aiEnabled?: boolean;'),
  });
  for (const module of result.modules) {
    const declaration = module.declarations[0];
    assert.equal(declaration.members.find((member) => member.name === 'newFlag').type.text, 'boolean');
    assert.equal(declaration.attributes.find((attribute) => attribute.name === 'new-flag').fieldName, 'newFlag');
  }
});

const associatedHosts = hosts.map((host) => ({
  ...host,
  attributesInterface: { name: `${host.name}Attributes`, source: `fixture/${host.name}-attributes.ts` },
}));

test('host interface overrides retain specialized types and table-owned attributes', () => {
  const overrides = Object.fromEntries(associatedHosts.map(({ attributesInterface }) => [
    attributesInterface.source,
    `export interface ${attributesInterface.name} extends PublicConfig {
      /** Host-specific shortcut support. */
      keyboardShortcuts?: HostShortcuts;
      onError?: HostErrorHandler;
      assistantAvatarUrl?: number;
    }`,
  ]));
  const result = manifest(overrides, [], associatedHosts);
  for (const [index, module] of result.modules.entries()) {
    const declaration = module.declarations[0];
    const members = new Map(declaration.members.map((member) => [member.name, member]));
    const name = associatedHosts[index].attributesInterface.name;
    assert.deepEqual(members.get('keyboardShortcuts').type, {
      text: `${name}["keyboardShortcuts"]`,
      references: [{ name, module: typeModule }],
    });
    assert.equal(members.get('keyboardShortcuts').description, 'Host-specific shortcut support.');
    assert.equal(members.get('onError').type.text, `${name}["onError"]`);
    assert.equal(members.get('assistantAvatarUrl').type.text, 'number');
    assert.equal(members.get('assistantAvatarUrl').attribute, 'assistantavatarurl');
    assert.equal(declaration.attributes.some((attribute) => attribute.fieldName === 'onError'), false);
    assert.ok(declaration.attributes.some((attribute) => attribute.name === 'keyboardshortcuts' && attribute.fieldName === 'keyboardShortcuts'));
    assert.equal(members.get('onViewChange').type.text, '(event: ViewChange) => void | undefined');
  }
});

test('fails when an associated host interface source is absent', () => {
  assert.throws(() => manifest({}, [], associatedHosts), /missing associated attributes interface "FirstAttributes"/);
});

test('fails when an associated source lacks its named interface', () => {
  const overrides = Object.fromEntries(associatedHosts.map(({ attributesInterface }) => [
    attributesInterface.source, 'export interface WrongInterface {}',
  ]));
  assert.throws(() => manifest(overrides, [], associatedHosts), /missing associated attributes interface "FirstAttributes"/);
});

for (const [label, expression] of [
  ['computed table', 'makeFields()'],
  ['spread entry', `[...existingFields]`],
  ['computed options', `[{ name: 'aiEnabled', options: makeOptions() }]`],
  ['duplicate field', `[${fields}, { name: 'aiEnabled', options: {} }]`],
  ['duplicate entry property', `[{ name: 'aiEnabled', name: 'aiEnabled', options: {} }]`],
  ['missing entry options', `[{ name: 'aiEnabled' }]`],
  ['unknown option', `[{ name: 'aiEnabled', options: { unexpected: true } }]`],
]) {
  test(`rejects ${label} instead of producing partial metadata`, () => {
    assert.throws(() => manifest({
      [tablePath]: `export const FLATTENED_PUBLIC_CONFIG_FIELDS = ${expression};`,
    }), /Flattened config manifest:/);
  });
}

test('fails when a PublicConfig field is missing from the table', () => {
  assert.throws(() => manifest({
    [publicConfigPath]: config.replace('aiEnabled?: boolean;', 'missing?: boolean; aiEnabled?: boolean;'),
  }), /disagree on "missing"/);
});

test('fails when the table names a field absent from PublicConfig', () => {
  assert.throws(() => manifest({
    [publicConfigPath]: config.replace('aiEnabled?: boolean;', ''),
  }), /disagree on "aiEnabled"/);
});

test('fails when synthetic property declarations and options disagree', () => {
  assert.throws(() => manifest({
    [basePath]: base.replace("aiDisabled: { type: Boolean, attribute: 'ai-disabled' }", ''),
  }), /disagree on "aiDisabled"/);
});

test('reads all current source fields without loading a DOM-dependent host', () => {
  const publicConfigSource = readFileSync(new URL('../../src/types/config/PublicConfig.ts', import.meta.url), 'utf8');
  const result = manifest({
    [tablePath]: readFileSync(new URL('../../src/web-components/shared/flattenedPublicConfig.ts', import.meta.url), 'utf8'),
    [publicConfigPath]: publicConfigSource,
    [basePath]: readFileSync(new URL('../../src/web-components/shared/FlattenedConfigElement.ts', import.meta.url), 'utf8'),
  });
  const declaration = result.modules[0].declarations[0];
  const names = new Set(declaration.members.map((member) => member.name));
  const configInterface = ts.createSourceFile(publicConfigPath, publicConfigSource, ts.ScriptTarget.Latest, true)
    .statements.find((node) => ts.isInterfaceDeclaration(node) && node.name.text === 'PublicConfig');
  assert.equal(configInterface.members.length, 31);
  for (const field of configInterface.members) {
    assert.ok(names.has(field.name.text), field.name.text);
  }
  for (const name of ['onError', 'serviceDeskFactory', 'persistedState', 'upload', 'markdown']) {
    assert.ok(names.has(name));
    assert.equal(declaration.attributes.some((attribute) => attribute.fieldName === name), false);
  }
  const internal = declaration.members.find((member) => member.name === 'exposeServiceManagerForTesting');
  assert.equal(internal.privacy, 'private');
  assert.equal(internal.type.text, 'boolean');
  assert.ok(declaration.attributes.some((attribute) => attribute.fieldName === internal.name));
});
