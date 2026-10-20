/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { renderedMarkup, templateMarkup } from './manifest-template-source.js';
import { createTemplateReader } from './manifest-templates.js';
import { createSlotProtocolReader } from './manifest-slot-protocols.js';

function sourceOwner(model, node) {
  for (let parent = node; parent; parent = parent.parent) {
    const element = model.elements.find((entry) => entry.node === parent);
    if (element) {
      return element;
    }
    const tags = model.ts
      .getJSDocTags(parent)
      .filter((tag) => tag.tagName.text === 'slotOwner');
    if (!tags.length) {
      continue;
    }
    const name = tags[0].getText().match(/^@slotOwner\s+\{([\w$]+)\}\s*$/)?.[1];
    const symbol =
      name &&
      model.checker.resolveName(
        name,
        parent,
        model.ts.SymbolFlags.Value | model.ts.SymbolFlags.Alias,
        false
      );
    const resolved =
      symbol?.flags & model.ts.SymbolFlags.Alias
        ? model.checker.getAliasedSymbol(symbol)
        : symbol;
    const owner = model.elements.find((entry) =>
      resolved?.declarations?.includes(entry.node)
    );
    if (tags.length !== 1 || !owner) {
      model.fail(
        parent,
        'Resolve one canonical element symbol for the slot owner.'
      );
    }
    return owner;
  }
  return undefined;
}

function expressionBinding(model, element, expression, node, protocols) {
  const type = model.checker.getTypeAtLocation(expression);
  if (type.flags & (model.ts.TypeFlags.Null | model.ts.TypeFlags.Undefined)) {
    return [];
  }
  try {
    return model
      .values(expression)
      .filter(Boolean)
      .map((name) => ({
        element,
        name,
        expression,
        node,
        location: model.location(node),
      }));
  } catch (error) {
    const origins = protocols(expression);
    return origins.length
      ? [
          {
            element,
            expression,
            node,
            protocols: origins,
            location: model.location(node),
          },
        ]
      : [
          {
            element,
            expression,
            node,
            error: error.message,
            location: model.location(node),
          },
        ];
  }
}

function attributeBindings(model, element, template, attribute, protocols) {
  const { expressions, marker } = template;
  const token = new RegExp(`${marker}(\\d+)${marker}`, 'g');
  const parts = [...attribute.matchAll(token)];
  if (parts.length === 1 && parts[0][0] === attribute) {
    return expressionBinding(
      model,
      element,
      expressions[Number(parts[0][1])],
      template.node,
      protocols
    );
  }
  let names = [''];
  let offset = 0;
  try {
    for (const part of parts) {
      const literal = attribute.slice(offset, part.index);
      names = names.flatMap((name) =>
        model
          .values(expressions[Number(part[1])])
          .map((value) => name + literal + value)
      );
      offset = part.index + part[0].length;
    }
    return names
      .map((name) => name + attribute.slice(offset))
      .filter(Boolean)
      .map((name) => ({
        element,
        name,
        node: template.node,
        location: model.location(template.node),
      }));
  } catch (error) {
    return [
      {
        element,
        node: template.node,
        error: error.message,
        location: model.location(template.node),
      },
    ];
  }
}

function templateBindings(model, element, node, protocols) {
  const template = { ...templateMarkup(model, node.template), node };
  const tags =
    /<!--[\s\S]*?-->|<slot(?=[\s/>])((?:[^"'<>]|"[^"]*"|'[^']*')*)>/gi;
  const bindings = [];
  for (const tag of renderedMarkup(template.markup).matchAll(tags)) {
    if (tag[1] === undefined) {
      continue;
    }
    const attribute = tag[1].match(
      /(?:^|\s)\.?name\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i
    );
    if (attribute) {
      bindings.push(
        ...attributeBindings(
          model,
          element,
          template,
          attribute[1] ?? attribute[2] ?? attribute[3],
          protocols
        )
      );
    }
  }
  return bindings;
}

function sameValue(model, node, symbol, aliases, seen = new Set()) {
  const resolved = model.symbol(node);
  if (!resolved || seen.has(resolved)) {
    return false;
  }
  if (resolved === symbol) {
    return true;
  }
  const next = new Set([...seen, resolved]);
  const initializer = resolved.valueDeclaration?.initializer;
  const values = [...(aliases.get(resolved) ?? [])];
  if (initializer) {
    values.push(initializer);
  }
  return values.some((value) => sameValue(model, value, symbol, aliases, next));
}

function memberAccess(model, node) {
  if (!node) {
    return undefined;
  }
  if (model.ts.isPropertyAccessExpression(node)) {
    return { receiver: node.expression, names: [node.name.text] };
  }
  if (model.ts.isElementAccessExpression(node)) {
    return { receiver: node.expression, key: node.argumentExpression };
  }
  return undefined;
}

function memberNames(model, access) {
  return access.names ?? model.values(access.key);
}

function domReceiver(model, expression, name) {
  const { ts, checker } = model;
  const type = checker.getTypeAtLocation(expression);
  const symbol = checker.resolveName(
    name,
    undefined,
    ts.SymbolFlags.Type,
    false
  );
  return (
    symbol &&
    !(type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) &&
    checker.isTypeAssignableTo(type, checker.getDeclaredTypeOfSymbol(symbol))
  );
}

function domMethod(model, expression) {
  return model
    .symbol(expression)
    ?.declarations?.some((declaration) =>
      declaration.getSourceFile().fileName.endsWith('/lib.dom.d.ts')
    );
}

function isSlotCreation(model, node) {
  const { ts } = model;
  if (!ts.isCallExpression(node) || !node.arguments[0]) {
    return false;
  }
  const access = memberAccess(model, node.expression);
  if (
    !access ||
    !(
      domMethod(model, node.expression) ||
      domReceiver(model, access.receiver, 'Document')
    )
  ) {
    return false;
  }
  if (!memberNames(model, access).includes('createElement')) {
    return false;
  }
  try {
    return model.values(node.arguments[0]).includes('slot');
  } catch {
    const type = model.checker.getTypeAtLocation(node.arguments[0]);
    const variants = type.isUnion() ? type.types : [type];
    return variants.every(
      (variant) => variant.flags & ts.TypeFlags.StringLiteral
    )
      ? variants.some((variant) => variant.value === 'slot')
      : 'unknown';
  }
}

function creationTarget(model, node) {
  const { ts } = model;
  const parent = node.parent;
  if (
    (ts.isVariableDeclaration(parent) || ts.isPropertyDeclaration(parent)) &&
    parent.initializer === node
  ) {
    return parent.name;
  }
  return ts.isBinaryExpression(parent) &&
    parent.right === node &&
    parent.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ? parent.left
    : undefined;
}

function slotSourceNodes(model, source) {
  const creations = [];
  const nodes = [];
  const aliases = new Map();
  model.visit(source, (node) => {
    nodes.push(node);
    if (
      model.ts.isBinaryExpression(node) &&
      node.operatorToken.kind === model.ts.SyntaxKind.EqualsToken
    ) {
      const symbol = model.symbol(node.left);
      aliases.set(symbol, [...(aliases.get(symbol) ?? []), node.right]);
    }
    const slot = isSlotCreation(model, node);
    if (slot) {
      creations.push({
        node,
        target: creationTarget(model, node),
        uncertain: slot === 'unknown',
      });
    }
  });
  return { creations, nodes, aliases };
}

function isSlotInsertion(model, call) {
  const access = memberAccess(model, call.expression);
  if (
    !access ||
    !(
      domMethod(model, call.expression) ||
      domReceiver(model, access.receiver, 'Node')
    )
  ) {
    return false;
  }
  return memberNames(model, access).some((name) =>
    [
      'append',
      'appendChild',
      'prepend',
      'replaceChildren',
      'insertBefore',
    ].includes(name)
  );
}

function isSlotStorage(model, call) {
  return model
    .symbol(call.expression)
    ?.declarations?.some(
      (declaration) =>
        declaration
          .getSourceFile()
          .fileName.endsWith('/lib.es2015.collection.d.ts') &&
        declaration.name?.getText() === 'set' &&
        ['Map', 'WeakMap'].includes(declaration.parent.name?.text)
    );
}

function slotNameAssignment(model, node, symbol, aliases) {
  const { ts } = model;
  const call = ts.isCallExpression(node);
  const assignment =
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
    node.operatorToken.kind <= ts.SyntaxKind.LastAssignment;
  const target = call ? node.expression : node.left;
  const access = memberAccess(model, target);
  if (!access || !sameValue(model, access.receiver, symbol, aliases)) {
    return undefined;
  }
  const names = memberNames(model, access);
  if (
    call &&
    names.includes('setAttribute') &&
    model.values(node.arguments[0]).includes('name')
  ) {
    return node.arguments[1];
  }
  if (assignment && names.includes('name')) {
    if (node.operatorToken.kind !== ts.SyntaxKind.EqualsToken) {
      model.fail(node, 'Assign the complete named slot value directly.');
    }
    return node.right;
  }
  return undefined;
}

function unresolvedInsertion(model, node) {
  return [
    {
      node,
      error: 'Resolve the named slot insertion through a DOM parent.',
      location: model.location(node),
    },
  ];
}

function unboundSlot(model, creation) {
  const parent = creation.parent;
  return model.ts.isExpressionStatement(parent) ||
    (model.ts.isCallExpression(parent) && isSlotInsertion(model, parent))
    ? []
    : unresolvedInsertion(model, creation);
}

function imperativeSlot(
  model,
  { node: creation, target, uncertain },
  { nodes, aliases },
  protocols
) {
  if (!target) {
    return unboundSlot(model, creation);
  }
  const symbol = model.symbol(target);
  if (!symbol) {
    model.fail(creation, 'Resolve the source binding of the created slot.');
  }
  const deliveries = nodes.filter(
    (node) =>
      model.ts.isCallExpression(node) &&
      node.arguments.some((argument) =>
        sameValue(model, argument, symbol, aliases)
      )
  );
  const returned = nodes.some(
    (node) =>
      model.ts.isReturnStatement(node) &&
      node.expression &&
      sameValue(model, node.expression, symbol, aliases)
  );
  if (
    deliveries.some(
      (call) => !isSlotInsertion(model, call) && !isSlotStorage(model, call)
    )
  ) {
    return unresolvedInsertion(model, creation);
  }
  if (!deliveries.some((call) => isSlotInsertion(model, call))) {
    return deliveries.length || returned
      ? unresolvedInsertion(model, creation)
      : [];
  }
  const names = nodes.flatMap((node) => {
    const expression = slotNameAssignment(model, node, symbol, aliases);
    return expression ? [{ expression, node }] : [];
  });
  return names.flatMap(({ expression, node }) => {
    return uncertain
      ? [
          {
            node,
            error: 'Resolve the created tag before naming a possible slot.',
            location: model.location(node),
          },
        ]
      : expressionBinding(
          model,
          sourceOwner(model, creation),
          expression,
          node,
          protocols
        );
  });
}

function imperativeBindings(model, protocols) {
  return model.sources.flatMap((source) => {
    const inventory = slotSourceNodes(model, source);
    return inventory.creations.flatMap((creation) =>
      imperativeSlot(model, creation, inventory, protocols)
    );
  });
}

function exportedTemplateRoots(model) {
  const roots = new Set();
  for (const source of model.sources) {
    const module = model.symbol(source);
    for (const entry of module
      ? model.checker.getExportsOfModule(module)
      : []) {
      const symbol =
        entry.flags & model.ts.SymbolFlags.Alias
          ? model.checker.getAliasedSymbol(entry)
          : entry;
      const node = symbol.valueDeclaration;
      if (
        node &&
        model.sources.includes(node.getSourceFile()) &&
        (model.ts.isFunctionDeclaration(node) ||
          model.ts.isVariableDeclaration(node) ||
          model.ts.isExportAssignment(node))
      ) {
        roots.add(node);
      }
    }
  }
  return [...roots];
}

export function readSlots(model) {
  const protocols = createSlotProtocolReader(model);
  const templates = createTemplateReader(model);
  return [
    ...model.elements.flatMap((element) =>
      templates(element).flatMap((template) =>
        templateBindings(model, element, template, protocols)
      )
    ),
    ...exportedTemplateRoots(model).flatMap((node) =>
      templates({ node }).flatMap((template) =>
        templateBindings(
          model,
          sourceOwner(model, template),
          template,
          protocols
        )
      )
    ),
    ...imperativeBindings(model, protocols),
  ];
}

function namedTags(model, element) {
  return model.ts
    .getJSDocTags(element.node)
    .filter((tag) => tag.tagName.text === 'slot')
    .flatMap((tag) => {
      const name = tag.getText().match(/^@slot\s+(\S+)/)?.[1];
      return name && name !== '-' ? [{ name, node: tag }] : [];
    });
}

function validateSlotName(element, name, { tags, rendered, rows }, add) {
  if (!rendered.some((slot) => slot.name === name)) {
    add(element.node, `Unrendered named slot ${element.tagName}.${name}.`);
  }
  if (tags.filter((tag) => tag.name === name).length !== 1) {
    add(
      rendered.find((slot) => slot.name === name)?.node ?? element.node,
      `${element.tagName} slot ${name} needs one @slot declaration.`
    );
  }
  if (rows.filter((row) => row.name === name).length !== 1) {
    add(
      element.node,
      `${element.tagName} slot ${name} needs one manifest entry.`
    );
  }
}

function validateElementSlots(model, element, declaration, slots, add) {
  const tags = namedTags(model, element);
  const rendered = slots.filter(
    (slot) => slot.element === element && slot.name
  );
  const rows = (declaration.slots ?? []).filter((slot) => slot.name);
  const names = new Set(
    [...tags, ...rendered, ...rows].map((slot) => slot.name)
  );
  for (const name of names) {
    validateSlotName(element, name, { tags, rendered, rows }, add);
  }
}

export function validateSlots(model, manifest, slots = readSlots(model)) {
  const errors = new Set();
  const add = (node, message) =>
    errors.add(`${model.location(node)}: ${message}`);
  for (const slot of slots) {
    if (slot.error) {
      add(slot.node, `Unresolved named slot: ${slot.error}`);
    }
    if (slot.name && !slot.element) {
      add(slot.node, `Resolve the canonical owner of named slot ${slot.name}.`);
    }
  }
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
    validateElementSlots(model, element, declaration, slots, add);
  }
  if (errors.size) {
    throw new Error(
      `Slot contract validation failed:\n${[...errors].join('\n')}`
    );
  }
  return slots;
}
