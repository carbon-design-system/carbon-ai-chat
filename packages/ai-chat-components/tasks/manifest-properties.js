/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

function hasModifier(node, kind) {
  return node.modifiers?.some((modifier) => modifier.kind === kind);
}

function memberTags(model, member) {
  return new Set(model.ts.getJSDocTags(member).map((tag) => tag.tagName.text));
}

function memberDescription(member) {
  return (member.jsDoc ?? [])
    .map((doc) =>
      typeof doc.comment === 'string'
        ? doc.comment
        : (doc.comment ?? []).map((part) => part.text ?? '').join('')
    )
    .filter(Boolean)
    .join('\n')
    .trim();
}

function memberDecorators(model, member) {
  const { ts } = model;
  const decorators = ts.canHaveDecorators(member)
    ? (ts.getDecorators(member) ?? [])
    : [];
  return decorators.flatMap((decorator) => {
    const expression = ts.isCallExpression(decorator.expression)
      ? decorator.expression.expression
      : decorator.expression;
    const symbol = model.symbol(expression);
    const lit = symbol?.declarations?.some((declaration) =>
      /\/node_modules\/(?:lit|@lit\/reactive-element)\//.test(
        declaration.getSourceFile().fileName.replaceAll('\\', '/')
      )
    );
    return lit ? [symbol.name] : [];
  });
}

function parameterProperty(model, member) {
  const { ts } = model;
  return (
    ts.isParameter(member) &&
    [
      ts.SyntaxKind.PublicKeyword,
      ts.SyntaxKind.PrivateKeyword,
      ts.SyntaxKind.ProtectedKeyword,
      ts.SyntaxKind.ReadonlyKeyword,
    ].some((kind) => hasModifier(member, kind))
  );
}

function classFields(model, node) {
  return node.members.flatMap((member) =>
    model.ts.isConstructorDeclaration(member)
      ? member.parameters.filter((parameter) =>
          parameterProperty(model, parameter)
        )
      : [member]
  );
}

function propertyMember(model, member) {
  const { ts } = model;
  if (
    !(
      ts.isPropertyDeclaration(member) ||
      ts.isGetAccessorDeclaration(member) ||
      ts.isSetAccessorDeclaration(member) ||
      parameterProperty(model, member)
    ) ||
    hasModifier(member, ts.SyntaxKind.StaticKeyword)
  ) {
    return undefined;
  }
  const tags = memberTags(model, member);
  const hidden =
    ts.isPrivateIdentifier(member.name) ||
    hasModifier(member, ts.SyntaxKind.PrivateKeyword) ||
    hasModifier(member, ts.SyntaxKind.ProtectedKeyword) ||
    ['internal', 'private', 'protected'].some((tag) => tags.has(tag));
  const names = ts.isComputedPropertyName(member.name)
    ? model.values(member.name.expression)
    : [member.name.text];
  if (names.length !== 1 || !names[0]) {
    model.fail(member, 'Resolve one source property name.');
  }
  const decorators = memberDecorators(model, member);
  return {
    name: names[0],
    node: member,
    declarations: [member],
    hidden,
    tags,
    reactive: decorators.includes('property'),
    implementation: decorators.some(
      (name) => name === 'state' || name.startsWith('query')
    ),
    description: memberDescription(member),
    location: model.location(member),
  };
}

function localBaseDeclarations(model, type, seen = new Set()) {
  if (seen.has(type)) {
    return [];
  }
  const next = new Set([...seen, type]);
  if (type.isIntersection()) {
    return [...type.types]
      .reverse()
      .flatMap((part) => localBaseDeclarations(model, part, next));
  }
  if (type.isTypeParameter()) {
    const constraint = model.checker.getBaseConstraintOfType(type);
    return constraint ? localBaseDeclarations(model, constraint, next) : [];
  }
  return (type.symbol?.declarations ?? []).filter(
    (declaration) =>
      model.ts.isClassLike(declaration) &&
      model.sources.includes(declaration.getSourceFile())
  );
}

function localBases(model, node) {
  const type = model.checker.getTypeAtLocation(node);
  return (type.getBaseTypes?.() ?? []).flatMap((base) =>
    localBaseDeclarations(model, base)
  );
}

function classProperties(model, node, seen = new Set()) {
  if (seen.has(node)) {
    model.fail(node, 'Resolve an acyclic local property inheritance graph.');
  }
  const next = new Set([...seen, node]);
  const properties = new Map(
    localBases(model, node).flatMap((base) => [
      ...classProperties(model, base, next),
    ])
  );
  for (const member of classFields(model, node)) {
    const property = propertyMember(model, member);
    if (!property) {
      continue;
    }
    const previous = properties.get(property.name);
    properties.set(
      property.name,
      previous
        ? {
            ...property,
            hidden:
              property.node.parent === previous.node.parent
                ? property.hidden && previous.hidden
                : property.hidden,
            reactive: property.reactive || previous.reactive,
            tags: new Set([...previous.tags, ...property.tags]),
            description: property.description || previous.description,
            declarations: [...previous.declarations, member],
          }
        : property
    );
  }
  return properties;
}

export function readProperties(model) {
  return model.elements.flatMap((element) =>
    [...classProperties(model, element.node).values()].map((property) => ({
      ...property,
      element,
    }))
  );
}

function publicField(field) {
  return (
    field.kind === 'field' &&
    !field.static &&
    !['private', 'protected'].includes(field.privacy)
  );
}

function inheritedExternalField(model, element, name) {
  const type = model.checker.getTypeAtLocation(element.node);
  const symbol = model.checker.getPropertyOfType(type, name);
  return (
    symbol?.declarations?.length &&
    symbol.declarations.every((declaration) =>
      declaration
        .getSourceFile()
        .fileName.replaceAll('\\', '/')
        .includes('/node_modules/')
    )
  );
}

function checkProperty(property, fields, add) {
  const rows = fields.filter(
    (field) => field.name === property.name && publicField(field)
  );
  const context = `${property.element.tagName} property ${property.name}`;
  if (property.hidden || property.implementation) {
    if (rows.length) {
      add(
        property.node,
        `${context} is implementation state and cannot be a public manifest property.`
      );
    }
    if (property.implementation && !property.hidden) {
      add(
        property.node,
        `${context} is a query or state field; make its source visibility private or protected.`
      );
    }
    return;
  }
  if (!property.reactive && !property.tags.has('public')) {
    add(
      property.node,
      `${context} needs an explicit @public contract or nonpublic source visibility.`
    );
  }
  if (!property.description) {
    add(property.node, `${context} needs a source description.`);
  }
  if (rows.length !== 1) {
    add(property.node, `${context} needs one public manifest field.`);
  } else if (!rows[0].description?.trim()) {
    add(property.node, `${context} needs a manifest description.`);
  }
}

export function validateProperties(
  model,
  manifest,
  properties = readProperties(model)
) {
  const errors = new Set();
  const add = (node, message) =>
    errors.add(`${model.location(node)}: ${message}`);
  const declarations = manifest.modules.flatMap(
    (module) => module.declarations ?? []
  );
  for (const element of model.elements) {
    const declaration = declarations.find(
      (entry) => entry.tagName === element.tagName
    );
    if (!declaration) {
      add(element.node, `Missing manifest element ${element.tagName}.`);
      continue;
    }
    const owned = properties.filter((property) => property.element === element);
    const fields = declaration.members ?? [];
    for (const property of owned) {
      checkProperty(property, fields, add);
    }
    for (const field of fields.filter(publicField)) {
      if (
        !owned.some((property) => property.name === field.name) &&
        !inheritedExternalField(model, element, field.name)
      ) {
        add(
          element.node,
          `Unresolved public manifest property ${element.tagName}.${field.name}.`
        );
      }
    }
  }
  if (errors.size) {
    throw new Error(
      `Property contract validation failed:\n${[...errors].join('\n')}`
    );
  }
  return properties;
}
