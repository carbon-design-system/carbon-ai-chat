/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { resolve } from 'node:path';

function fail(message) {
  throw new Error(`Flattened config manifest: ${message}`);
}

function unwrap(ts, expression) {
  if (!expression) {
    fail('expected a field table initializer.');
  }
  let current = expression;
  while (
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isParenthesizedExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function objectProperties(ts, expression) {
  if (!expression || !ts.isObjectLiteralExpression(expression)) {
    fail('expected an object literal.');
  }
  const properties = new Map();
  for (const property of expression.properties) {
    if (
      !ts.isPropertyAssignment(property) ||
      ts.isComputedPropertyName(property.name)
    ) {
      fail('unsupported object property.');
    }
    const name = property.name.text;
    if (properties.has(name)) {
      fail(`duplicate object property "${name}".`);
    }
    properties.set(name, property.initializer);
  }
  return properties;
}

function literal(ts, node) {
  if (ts.isStringLiteral(node)) {
    return node.text;
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (node.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  fail('expected a string or Boolean literal.');
}

function readOptions(ts, expression) {
  const options = objectProperties(ts, expression);
  for (const [name, value] of options) {
    if (name === 'attribute') {
      literal(ts, value);
    } else if (name === 'type') {
      if (
        !ts.isIdentifier(value) ||
        !['Boolean', 'String', 'Number', 'Object', 'Array'].includes(value.text)
      ) {
        fail('unsupported Lit property type.');
      }
    } else if (name !== 'converter' || !ts.isIdentifier(value)) {
      fail(`unsupported Lit property option "${name}".`);
    }
  }
  return options.has('attribute')
    ? literal(ts, options.get('attribute'))
    : true;
}

function readTable(ts, initializer) {
  const expression = unwrap(ts, initializer);
  if (!ts.isArrayLiteralExpression(expression)) {
    fail('FLATTENED_PUBLIC_CONFIG_FIELDS must be an array literal.');
  }
  const fields = new Map();
  for (const entry of expression.elements) {
    const properties = objectProperties(ts, entry);
    if (!properties.has('name') || !properties.has('options')) {
      fail('each field needs name and options.');
    }
    for (const [name, value] of properties) {
      if (name === 'resolveManually') {
        if (typeof literal(ts, value) !== 'boolean') {
          fail('resolveManually must be Boolean.');
        }
      } else if (name !== 'name' && name !== 'options') {
        fail(`unsupported field entry "${name}".`);
      }
    }
    const name = literal(ts, properties.get('name'));
    if (typeof name !== 'string') {
      fail('field names must be string literals.');
    }
    if (fields.has(name)) {
      fail(`duplicate flattened field "${name}".`);
    }
    fields.set(name, readOptions(ts, properties.get('options')));
  }
  return fields;
}

function readMembers(ts, declaration) {
  const members = new Map();
  for (const member of declaration.members) {
    if (
      !member.name ||
      ts.isComputedPropertyName(member.name) ||
      !member.type
    ) {
      fail(`unsupported member in ${declaration.name.text}.`);
    }
    const name = member.name.text;
    if (members.has(name)) {
      fail(`duplicate member "${name}".`);
    }
    members.set(name, {
      kind: 'field',
      name,
      type: { text: member.type.getText() },
      ...(ts.getJSDocTags(member).some((tag) => tag.tagName.text === 'internal')
        ? { privacy: 'private' }
        : {}),
      description: (member.jsDoc ?? [])
        .map((doc) => ts.getTextOfJSDocComment(doc.comment))
        .filter(Boolean)
        .join('\n\n'),
    });
  }
  return members;
}

function requireMatchingNames(fields, members) {
  for (const name of new Set([...fields.keys(), ...members.keys()])) {
    if (!fields.has(name) || !members.has(name)) {
      fail(`field table and source types disagree on "${name}".`);
    }
  }
}

function configType(member, typeModule, interfaceName = 'PublicConfig') {
  if (['boolean', 'string', 'number'].includes(member.type.text)) {
    return member.type;
  }
  return {
    text: `${interfaceName}[${JSON.stringify(member.name)}]`,
    references: [{ name: interfaceName, module: typeModule }],
  };
}

function addFields(
  declaration,
  fields,
  members,
  typeModule,
  overrides = new Map(),
  interfaceName
) {
  declaration.members ??= [];
  declaration.attributes ??= [];
  for (const [name, attribute] of fields) {
    const override = overrides.get(name);
    const source = override ?? members.get(name);
    if (!source) {
      fail(`missing source type for "${name}".`);
    }
    const member = {
      ...source,
      type: configType(
        source,
        typeModule,
        override ? interfaceName : 'PublicConfig'
      ),
    };
    if (name === 'config') {
      member.type = {
        text: 'PublicConfig',
        references: [{ name: 'PublicConfig', module: typeModule }],
      };
    }
    declaration.members = declaration.members.filter(
      (item) => item.name !== name
    );
    declaration.members.push(member);
    const attributeName = attribute === true ? name.toLowerCase() : attribute;
    declaration.attributes = declaration.attributes.filter(
      (item) =>
        item.fieldName !== name &&
        item.name !== (attributeName || name.toLowerCase())
    );
    if (attribute !== false) {
      member.attribute = attributeName;
      declaration.attributes.push({
        name: attributeName,
        fieldName: name,
        type: member.type,
        description: member.description,
      });
    }
  }
}

function reactiveProperties(ts, declaration) {
  const properties = new Map();
  for (const member of declaration.members) {
    const decorators = ts.getDecorators(member) ?? [];
    const property = decorators.find(
      (decorator) =>
        ts.isCallExpression(decorator.expression) &&
        ts.isIdentifier(decorator.expression.expression) &&
        decorator.expression.expression.text === 'property'
    );
    if (!property) {
      continue;
    }
    const expression = property.expression.arguments[0];
    const options = expression ? objectProperties(ts, expression) : new Map();
    if (options.has('state') && literal(ts, options.get('state')) === true) {
      continue;
    }
    const name = member.name.getText();
    const attribute = options.has('attribute')
      ? literal(ts, options.get('attribute'))
      : true;
    const metadata = readMembers(ts, {
      name: declaration.name,
      members: [member],
    }).get(name);
    if (
      member.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.PrivateKeyword
      )
    ) {
      metadata.privacy = 'private';
    } else if (
      member.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ProtectedKeyword
      )
    ) {
      metadata.privacy = 'protected';
    }
    if (member.questionToken) {
      metadata.type.text = `(${metadata.type.text}) | undefined`;
    }
    properties.set(name, {
      attribute: attribute === true ? name.toLowerCase() : attribute,
      member: metadata,
    });
  }
  return properties;
}

function normalizeReactiveMetadata(declaration, properties) {
  for (const [name, { attribute, member: source }] of properties) {
    let member = declaration.members.find((field) => field.name === name);
    if (!member) {
      if (!['private', 'protected'].includes(source.privacy)) {
        fail(`missing reactive member "${name}".`);
      }
      // The analyzer removes @internal fields before user plugins can mark their privacy.
      member = structuredClone(source);
      declaration.members.push(member);
    }
    member.type = { ...member.type, text: source.type.text };
    const oldNames = new Set(
      [name, member.attribute, attribute].filter(
        (value) => typeof value === 'string'
      )
    );
    declaration.attributes = declaration.attributes.filter(
      (item) => item.fieldName !== name && !oldNames.has(item.name)
    );
    delete member.attribute;
    if (attribute === false) {
      continue;
    }
    member.attribute = attribute;
    declaration.attributes.push({
      name: attribute,
      fieldName: name,
      type: member.type,
      description: member.description,
      ...(member.privacy ? { privacy: member.privacy } : {}),
    });
  }
}

function projectHost(manifest, host, typeModule, reactiveNames) {
  const source = manifest.modules.find(
    (module) => resolve(module.path) === resolve(host.source)
  );
  const original = source?.declarations?.find(
    (declaration) => declaration.name === host.name
  );
  if (!original?.tagName) {
    fail(`missing tagged host "${host.name}".`);
  }
  const declaration = structuredClone(original);
  const privateMembers = new Map(
    (declaration.members ?? [])
      .filter((member) => ['private', 'protected'].includes(member.privacy))
      .map((member) => [member.name, member.privacy])
  );
  delete declaration.superclass;
  for (const kind of [
    'members',
    'attributes',
    'events',
    'slots',
    'cssParts',
    'cssProperties',
    'cssStates',
  ]) {
    declaration[kind] = (declaration[kind] ?? []).filter((item) => {
      const memberName = kind === 'members' ? item.name : item.fieldName;
      const privacy = privateMembers.get(memberName) ?? item.privacy;
      if (
        ['private', 'protected'].includes(privacy) &&
        !reactiveNames.has(memberName)
      ) {
        return false;
      }
      item.privacy = privacy;
      return true;
    });
    for (const item of declaration[kind]) {
      delete item.inheritedFrom;
      publishTypeReferences(
        item,
        ['private', 'protected'].includes(item.privacy) ? undefined : typeModule
      );
    }
  }
  normalizeReactiveMetadata(declaration, reactiveNames);
  return {
    kind: 'javascript-module',
    path: host.module,
    declarations: [declaration],
    exports: [
      {
        kind: 'js',
        name: 'default',
        declaration: { name: host.name, module: host.module },
      },
      {
        kind: 'custom-element-definition',
        name: declaration.tagName,
        declaration: { name: host.name, module: host.module },
      },
    ],
  };
}

function publishTypeReferences(value, typeModule) {
  if (!value || typeof value !== 'object') {
    return;
  }
  if (value.references) {
    // Private reactive types describe runtime fields without linking to an unshipped type.
    value.references = value.references.filter(
      (reference) => reference.package || typeModule
    );
    if (!value.references.length) {
      delete value.references;
    }
  }
  for (const reference of value.references ?? []) {
    if (!reference.package) {
      reference.module = typeModule;
    }
  }
  Object.values(value).forEach((child) =>
    publishTypeReferences(child, typeModule)
  );
}

function readSyntheticProperties(ts, node) {
  let synthetic;
  for (const statement of node.body.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }
    const properties = statement.declarationList.declarations.find(
      (declaration) => declaration.name.getText() === 'properties'
    );
    if (properties) {
      synthetic = new Map(
        [...objectProperties(ts, properties.initializer)].map(
          ([name, value]) => [name, readOptions(ts, value)]
        )
      );
    }
  }
  return synthetic;
}

export function createFlattenedConfigPlugin({
  tablePath,
  publicConfigPath,
  basePath,
  hosts,
  typeModule,
}) {
  let fields;
  let configMembers;
  let synthetic;
  let baseMembers;
  let reactiveMembers;
  let hostInterfaces;
  return {
    name: 'flattened-config',
    initialize() {
      fields = undefined;
      configMembers = undefined;
      synthetic = undefined;
      baseMembers = undefined;
      reactiveMembers = new Map();
      hostInterfaces = new Map();
    },
    analyzePhase({ ts, node, moduleDoc }) {
      const path = resolve(moduleDoc.path);
      if (
        ts.isClassDeclaration(node) &&
        hosts.some(
          (host) =>
            host.name === node.name?.text && resolve(host.source) === path
        )
      ) {
        reactiveMembers.set(node.name.text, reactiveProperties(ts, node));
      }
      if (ts.isInterfaceDeclaration(node)) {
        for (const host of hosts) {
          const association = host.attributesInterface;
          if (
            association &&
            resolve(association.source) === path &&
            node.name.text === association.name
          ) {
            hostInterfaces.set(host.name, readMembers(ts, node));
          }
        }
      }
      if (
        path === resolve(tablePath) &&
        ts.isVariableDeclaration(node) &&
        node.name.getText() === 'FLATTENED_PUBLIC_CONFIG_FIELDS'
      ) {
        fields = readTable(ts, node.initializer);
      }
      if (
        path === resolve(publicConfigPath) &&
        ts.isInterfaceDeclaration(node) &&
        node.name.text === 'PublicConfig'
      ) {
        if (node.heritageClauses?.length) {
          fail('PublicConfig inheritance needs explicit analyzer support.');
        }
        configMembers = readMembers(ts, node);
      }
      if (path !== resolve(basePath)) {
        return;
      }
      if (
        ts.isClassDeclaration(node) &&
        node.name?.text === 'FlattenedConfigElement'
      ) {
        baseMembers = readMembers(ts, {
          name: node.name,
          members: node.members.filter((member) =>
            ['config', 'aiDisabled'].includes(member.name?.getText())
          ),
        });
      }
      if (
        ts.isFunctionDeclaration(node) &&
        node.name?.text === 'buildFlattenedProperties'
      ) {
        synthetic = readSyntheticProperties(ts, node);
      }
    },
    packageLinkPhase({ customElementsManifest }) {
      if (!fields || !configMembers || !synthetic || !baseMembers) {
        fail(
          'include the field table, PublicConfig, and FlattenedConfigElement sources in analyzer globs.'
        );
      }
      requireMatchingNames(fields, configMembers);
      requireMatchingNames(synthetic, baseMembers);
      for (const host of hosts) {
        if (host.attributesInterface && !hostInterfaces.has(host.name)) {
          fail(
            `missing associated attributes interface "${host.attributesInterface.name}" from "${host.attributesInterface.source}".`
          );
        }
      }
      const modules = hosts.map((host) =>
        projectHost(
          customElementsManifest,
          host,
          typeModule,
          reactiveMembers.get(host.name) ?? new Map()
        )
      );
      for (const [index, module] of modules.entries()) {
        const declaration = module.declarations[0];
        const host = hosts[index];
        addFields(
          declaration,
          fields,
          configMembers,
          typeModule,
          hostInterfaces.get(host.name),
          host.attributesInterface?.name
        );
        addFields(declaration, synthetic, baseMembers, typeModule);
      }
      customElementsManifest.modules = modules;
    },
  };
}
