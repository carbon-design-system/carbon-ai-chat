/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from 'node:path';

export function fireTags(model, node) {
  const { ts } = model;
  return ts
    .getJSDocTags(node)
    .filter((tag) => ['fires', 'event'].includes(tag.tagName.text))
    .map((tag) => {
      const raw = tag
        .getText()
        .replace(/\r?\n\s*\*\s?/g, ' ')
        .replace(/\s*\*\/$/, '')
        .trim();
      const match = raw.match(
        /^@(?:fires|event)\s+(?:\{(.+)\}\s+)?([^\s]+)?(?:\s+[-—]\s*|\s+)?([\s\S]*)$/
      );
      return {
        name: match?.[2],
        type: match?.[1],
        description: match?.[3]?.trim(),
        node: tag,
        location: model.location(tag),
      };
    });
}

function isCustomEventType(type) {
  return (
    type?.symbol?.name === 'CustomEvent' ||
    Boolean(type?.getProperty('initCustomEvent'))
  );
}

function isEventType(model, type, context) {
  const symbol = model.checker.resolveName(
    'Event',
    context,
    model.ts.SymbolFlags.Type,
    false
  );
  return Boolean(
    symbol &&
    model.checker.isTypeAssignableTo(
      type,
      model.checker.getDeclaredTypeOfSymbol(symbol)
    )
  );
}

function eventConstructor(model, node, seen = new Set()) {
  const { ts } = model;
  if (!node || seen.has(node)) {
    return undefined;
  }
  seen.add(node);
  if (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isNonNullExpression(node)
  ) {
    return eventConstructor(model, node.expression, seen);
  }
  if (ts.isNewExpression(node)) {
    return node;
  }
  const declaration = model.symbol(node)?.valueDeclaration;
  return (
    declaration?.initializer &&
    eventConstructor(model, declaration.initializer, seen)
  );
}

function importedOwnerSymbol(model, node, imported) {
  const target = path
    .resolve(path.dirname(node.getSourceFile().fileName), imported[1])
    .replace(/\.js$/, '');
  const source = model.sources.find(
    (entry) => entry.fileName.replace(/\.tsx?$/, '') === target
  );
  const module = source && model.checker.getSymbolAtLocation(source);
  return (
    module &&
    model.checker
      .getExportsOfModule(module)
      .find((entry) => entry.name === imported[2])
  );
}

function eventOwner(model, node, owner) {
  const { ts } = model;
  const text = owner.getText();
  const imported = text.match(
    /@eventOwner\s+\{import\(['"]([^'"]+)['"]\)\.([\w$]+)\}/
  );
  const name = imported?.[2] ?? text.match(/@eventOwner\s+\{?([\w$]+)/)?.[1];
  if (!name) {
    model.fail(owner, 'An event owner needs a resolvable class symbol.');
  }
  let symbol = imported
    ? importedOwnerSymbol(model, node, imported)
    : model.checker.resolveName(
        name,
        node,
        ts.SymbolFlags.Type | ts.SymbolFlags.Value,
        false
      );
  if (symbol?.flags & ts.SymbolFlags.Alias) {
    symbol = model.checker.getAliasedSymbol(symbol);
  }
  const element = model.elements.find(
    (entry) => model.symbol(entry.node.name) === symbol
  );
  if (!element) {
    model.fail(owner, `Unresolved event owner ${name}.`);
  }
  return { element };
}

function eventProtocol(model, node, protocol) {
  const { ts } = model;
  const statement = ts.isVariableDeclaration(node) ? node.parent.parent : node;
  const callable =
    ts.isFunctionDeclaration(node) ||
    (ts.isVariableDeclaration(node) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) ||
        ts.isFunctionExpression(node.initializer)));
  if (!callable) {
    model.fail(protocol, 'An event protocol must belong to a helper function.');
  }
  if (
    !statement.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
    )
  ) {
    model.fail(
      protocol,
      'An event protocol must belong to an exported producer.'
    );
  }
  const tags = fireTags(model, node);
  if (!tags.length) {
    model.fail(protocol, 'An event protocol needs typed @fires metadata.');
  }
  return { protocol: node, tags };
}

function ownerTag(model, node) {
  const { ts } = model;
  for (let current = node; current; current = current.parent) {
    const tags = ts.getJSDocTags(current);
    const owner = tags.find((tag) => tag.tagName.text === 'eventOwner');
    const protocol = tags.find((tag) => tag.tagName.text === 'eventProtocol');
    if (owner && protocol) {
      model.fail(
        current,
        'An event producer cannot have both an owner and a caller-targeted protocol.'
      );
    }
    if (owner) {
      return eventOwner(model, current, owner);
    }
    if (protocol) {
      return eventProtocol(model, current, protocol);
    }
  }
  return undefined;
}

function selectorOwner(model, expression, seen = new Set()) {
  const { ts } = model;
  if (!expression || seen.has(expression)) {
    return undefined;
  }
  seen.add(expression);
  if (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isNonNullExpression(expression)
  ) {
    return selectorOwner(model, expression.expression, seen);
  }
  if (
    ts.isCallExpression(expression) &&
    ts.isPropertyAccessExpression(expression.expression) &&
    ['closest', 'querySelector'].includes(expression.expression.name.text)
  ) {
    const tags = model.values(expression.arguments[0]);
    if (tags.length === 1) {
      return model.elements.find((element) => element.tagName === tags[0]);
    }
  }
  const declaration = model.symbol(expression)?.valueDeclaration;
  return (
    declaration?.initializer &&
    selectorOwner(model, declaration.initializer, seen)
  );
}

function dispatchOwner(model, dispatch, required = true, target) {
  const { ts } = model;
  const receiver = target ?? dispatch.expression.expression;
  const annotation = ownerTag(model, dispatch);
  if (annotation) {
    return annotation;
  }
  if (receiver.kind === ts.SyntaxKind.ThisKeyword) {
    for (let current = dispatch.parent; current; current = current.parent) {
      const element = model.elements.find((entry) => entry.node === current);
      if (element) {
        return { element };
      }
    }
  }
  const type = model.checker.getTypeAtLocation(receiver);
  const element = model.elements.find(
    (entry) => model.symbol(entry.node.name) === type.symbol
  );
  if (element) {
    return { element };
  }
  const selected = selectorOwner(model, receiver);
  if (selected) {
    return { element: selected };
  }
  if (!required) {
    return undefined;
  }
  return model.fail(
    dispatch,
    `Unresolved public event owner for ${receiver.getText()}.`
  );
}

function option(model, constructor, name) {
  const { ts } = model;
  let options = constructor.arguments?.[1];
  if (!options) {
    return undefined;
  }
  if (!ts.isObjectLiteralExpression(options)) {
    options = model.symbol(options)?.valueDeclaration?.initializer;
  }
  const entry = options?.properties?.find(
    (property) => property.name?.getText() === name
  );
  return (
    entry &&
    (ts.isShorthandPropertyAssignment(entry) ? entry.name : entry.initializer)
  );
}

function enclosingElement(model, node) {
  for (let current = node; current; current = current.parent) {
    if (model.elements.some((element) => element.node === current)) {
      return true;
    }
  }
  return false;
}

function dispatchTarget(model, call) {
  const { ts } = model;
  let expression = call.expression;
  while (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isNonNullExpression(expression)
  ) {
    expression = expression.expression;
  }
  if (
    ts.isPropertyAccessExpression(expression) &&
    expression.name.text === 'dispatchEvent'
  ) {
    return expression.expression;
  }
  if (!ts.isElementAccessExpression(expression)) {
    return undefined;
  }
  let names;
  try {
    names = model.values(expression.argumentExpression);
  } catch (error) {
    const constructor = eventConstructor(model, call.arguments[0]);
    if (
      constructor &&
      isEventType(
        model,
        model.checker.getTypeAtLocation(constructor),
        constructor
      )
    ) {
      throw error;
    }
    return undefined;
  }
  if (!names.includes('dispatchEvent')) {
    return undefined;
  }
  if (names.length !== 1) {
    model.fail(
      expression,
      'A dispatch member must resolve only to dispatchEvent.'
    );
  }
  return expression.expression;
}

function dispatchRecord(model, node) {
  const { ts } = model;
  if (!ts.isCallExpression(node)) {
    return [];
  }
  const argument = node.arguments[0];
  const constructor = eventConstructor(model, argument);
  const target = dispatchTarget(model, node);
  if (!target) {
    const event = constructor && model.checker.getTypeAtLocation(constructor);
    if (
      constructor &&
      isEventType(model, event, constructor) &&
      (enclosingElement(model, node) || isCustomEventType(event))
    ) {
      model.fail(node, 'Unresolved public event delivery expression.');
    }
    return [];
  }
  const type = argument && model.checker.getTypeAtLocation(argument);
  if (
    type &&
    !(type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) &&
    !isEventType(model, type, node)
  ) {
    model.fail(node, 'A dispatchEvent argument must be an Event.');
  }
  const custom =
    constructor?.expression.getText() === 'CustomEvent' ||
    isCustomEventType(type);
  if (!type || type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) {
    model.fail(node, 'Unresolved public event producer.');
  }
  let ownership = dispatchOwner(model, node, false, target);
  if (!ownership && !custom && !enclosingElement(model, node)) {
    return [];
  }
  ownership ??= dispatchOwner(model, node, true, target);
  if (!constructor) {
    model.fail(node, 'Unresolved public event producer.');
  }
  return model.values(constructor.arguments[0]).map((name) => ({
    ...ownership,
    name,
    node,
    constructor,
    custom,
    eventType: model.checker.typeToString(type),
    location: model.location(node),
    bubbles:
      option(model, constructor, 'bubbles')?.kind === ts.SyntaxKind.TrueKeyword,
    composed:
      option(model, constructor, 'composed')?.kind ===
      ts.SyntaxKind.TrueKeyword,
    detail: option(model, constructor, 'detail'),
  }));
}

export function readEvents(model) {
  const producers = [];
  const constructors = [];
  for (const source of model.sources) {
    model.visit(source, (node) => {
      producers.push(...dispatchRecord(model, node));
      if (
        model.ts.isNewExpression(node) &&
        isCustomEventType(model.checker.getTypeAtLocation(node))
      ) {
        constructors.push(node);
      }
    });
  }
  const dispatched = new Set(producers.map((producer) => producer.constructor));
  for (const constructor of constructors) {
    if (!dispatched.has(constructor)) {
      model.fail(
        constructor,
        'Unresolved public event delivery: associate this CustomEvent with a checked dispatch or helper protocol.'
      );
    }
  }
  return producers;
}
