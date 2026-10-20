/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

const unresolved = Symbol('unresolved');
const ignoredProperties = new Set([
  'args',
  'render',
  'decorators',
  'play',
  'control',
  'options',
  'mapping',
  'viteFinal',
]);

function exportedSymbol(model, source, name) {
  const module = model.checker.getSymbolAtLocation(source);
  const symbol =
    module &&
    model.checker
      .getExportsOfModule(module)
      .find((entry) => entry.name === name);
  return symbol?.flags & model.ts.SymbolFlags.Alias
    ? model.checker.getAliasedSymbol(symbol)
    : symbol;
}

function wrapperSymbols(model, registry) {
  return new Map(
    registry
      .map((entry) => {
        const source = model.program.getSourceFile(
          `${model.root}/${entry.module}`
        );
        return [
          source && exportedSymbol(model, source, entry.exportName),
          entry,
        ];
      })
      .filter(([symbol]) => symbol)
  );
}

function generatedRows(entry) {
  return Object.fromEntries(
    entry.events.map((event) => [
      event.callback,
      {
        description: event.description,
        table: { category: 'Events', type: { summary: event.type } },
        manifestEntry: entry,
      },
    ])
  );
}

function importedHelper(model, node) {
  const symbol = model.checker.getSymbolAtLocation(node);
  return symbol?.declarations?.some(
    (declaration) =>
      model.ts.isImportSpecifier(declaration) &&
      (declaration.propertyName ?? declaration.name).text ===
        'manifestEventArgTypes' &&
      model.resolveModule(
        declaration.parent.parent.parent.moduleSpecifier.text,
        declaration.getSourceFile().fileName
      )?.fileName ===
        `${model.root}/.storybook-react/manifest-event-arg-types.js`
  );
}

function unwrap(ts, node) {
  while (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node)
  ) {
    node = node.expression;
  }
  return node;
}

function metadataWrites(model) {
  const { ts } = model;
  const writes = new Map();
  const visit = (node) => {
    if (ts.isFunctionLike(node)) {
      return;
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
    ) {
      const target = metadataWriteTarget(ts, node.left);
      const symbol = target && model.symbol(target);
      if (symbol) {
        writes.set(symbol, node);
      }
    }
    ts.forEachChild(node, visit);
  };
  model.program
    .getRootFileNames()
    .forEach((file) => visit(model.program.getSourceFile(file)));
  return writes;
}

function metadataWriteTarget(ts, input) {
  let target = input;
  const names = [];
  while (
    ts.isPropertyAccessExpression(target) ||
    ts.isElementAccessExpression(target)
  ) {
    names.push(
      ts.isPropertyAccessExpression(target)
        ? target.name.text
        : target.argumentExpression.getText().replace(/^['"]|['"]$/g, '')
    );
    target = target.expression;
  }
  const relevant = [
    'argTypes',
    'parameters',
    'includeStories',
    'excludeStories',
    'table',
    'description',
    'docs',
    'disable',
    'page',
    'include',
    'exclude',
  ];
  return !names.length ||
    names.some((name) => relevant.includes(name) || /^on[A-Z]/.test(name))
    ? target
    : undefined;
}

function assertConstant(model, writes, symbol) {
  const write = writes.get(symbol);
  if (write) {
    model.fail(write, 'Define documentation metadata without later writes.');
  }
}

function primitiveValue(ts, node) {
  if (ts.isStringLiteralLike(node)) {
    return node.text;
  }
  if (ts.isNumericLiteral(node)) {
    return Number(node.text);
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (node.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  if (node.kind === ts.SyntaxKind.NullKeyword) {
    return null;
  }
  if (ts.isRegularExpressionLiteral(node)) {
    const end = node.text.lastIndexOf('/');
    return new RegExp(node.text.slice(1, end), node.text.slice(end + 1));
  }
  return unresolved;
}

function metadataProperty(model, property, read, seen) {
  const { ts } = model;
  if (ignoredProperties.has(property.name?.text)) {
    return {};
  }
  if (ts.isSpreadAssignment(property)) {
    const spread = read(property.expression, seen);
    if (spread === unresolved) {
      model.fail(
        property,
        'Resolve documentation metadata spreads statically.'
      );
    }
    return spread;
  }
  if (
    !ts.isPropertyAssignment(property) &&
    !ts.isShorthandPropertyAssignment(property)
  ) {
    model.fail(property, 'Use plain documentation metadata properties.');
  }
  const name = property.name;
  if (!ts.isIdentifier(name) && !ts.isStringLiteralLike(name)) {
    model.fail(name, 'Use named documentation metadata properties.');
  }
  return {
    [name.text]: read(
      ts.isPropertyAssignment(property) ? property.initializer : property.name,
      seen
    ),
  };
}

function objectValue(model, node, read, seen) {
  return Object.assign(
    {},
    ...node.properties.map((property) =>
      metadataProperty(model, property, read, seen)
    )
  );
}

function inlineReturn(ts, node) {
  const callee = unwrap(ts, node.expression);
  if (
    !ts.isArrowFunction(callee) ||
    callee.parameters.length ||
    !ts.isBlock(callee.body)
  ) {
    return undefined;
  }
  if (
    !callee.body.statements.every(
      (statement) =>
        ts.isVariableStatement(statement) || ts.isReturnStatement(statement)
    )
  ) {
    return undefined;
  }
  const returned = callee.body.statements.filter(ts.isReturnStatement);
  return returned.length === 1 ? returned[0].expression : undefined;
}

function mappedEntries(ts, node) {
  if (node.expression.getText() !== 'Object.fromEntries') {
    return undefined;
  }
  const map = node.arguments[0];
  if (
    !map ||
    !ts.isCallExpression(map) ||
    !ts.isPropertyAccessExpression(map.expression) ||
    map.expression.name.text !== 'map'
  ) {
    return undefined;
  }
  const keys = map.expression.expression;
  const callback = map.arguments[0];
  if (
    !ts.isCallExpression(keys) ||
    keys.expression.getText() !== 'Object.keys' ||
    !callback ||
    !ts.isArrowFunction(callback)
  ) {
    return undefined;
  }
  if (
    callback.parameters.length !== 1 ||
    !ts.isArrayLiteralExpression(callback.body) ||
    callback.body.elements.length !== 2
  ) {
    return undefined;
  }
  if (
    callback.body.elements[0].getText() !==
    callback.parameters[0].name.getText()
  ) {
    return undefined;
  }
  return { object: keys.arguments[0], value: callback.body.elements[1] };
}

function callValue(model, node, read, seen, wrapper) {
  if (importedHelper(model, node.expression)) {
    const entry = node.arguments[0] && wrapper(node.arguments[0]);
    if (!entry) {
      model.fail(
        node,
        'Resolve the final exported wrapper passed to manifestEventArgTypes.'
      );
    }
    return generatedRows(entry);
  }
  const returned = inlineReturn(model.ts, node);
  if (returned) {
    return read(returned, seen);
  }
  const mapped = mappedEntries(model.ts, node);
  if (!mapped) {
    return unresolved;
  }
  const object = read(mapped.object, seen);
  const value = read(mapped.value, seen);
  return object && object !== unresolved && value !== unresolved
    ? Object.fromEntries(Object.keys(object).map((key) => [key, value]))
    : unresolved;
}

function bindingValue(model, declaration, read, seen) {
  const { ts } = model;
  if (!ts.isObjectBindingPattern(declaration.parent)) {
    return unresolved;
  }
  const object = read(declaration.parent.parent.initializer, seen);
  if (!object || object === unresolved) {
    return unresolved;
  }
  if (!declaration.dotDotDotToken) {
    return object[(declaration.propertyName ?? declaration.name).text];
  }
  const omitted = declaration.parent.elements
    .filter((element) => !element.dotDotDotToken)
    .map((element) => (element.propertyName ?? element.name).text);
  return Object.fromEntries(
    Object.entries(object).filter(([key]) => !omitted.includes(key))
  );
}

function referenceValue(model, node, read, seen, writes) {
  const { ts } = model;
  if (ts.isPropertyAccessExpression(node)) {
    const object = read(node.expression, seen);
    if (
      object &&
      object !== unresolved &&
      Object.hasOwn(object, node.name.text)
    ) {
      return object[node.name.text];
    }
  }
  const symbol = model.symbol(node);
  assertConstant(model, writes, symbol);
  const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
  if (!declaration) {
    return unresolved;
  }
  if (ts.isBindingElement(declaration)) {
    return bindingValue(model, declaration, read, seen);
  }
  if (ts.isVariableDeclaration(declaration)) {
    return read(declaration.initializer, seen);
  }
  if (ts.isExportAssignment(declaration)) {
    return read(declaration.expression, seen);
  }
  return unresolved;
}

export function sourceValues(model, registry = []) {
  const { ts } = model;
  const wrappers = wrapperSymbols(model, registry);
  const writes = metadataWrites(model);
  const wrapper = (node) => wrappers.get(model.symbol(node));
  const read = (input, seen = new Set()) => {
    if (!input) {
      return undefined;
    }
    if (seen.has(input)) {
      return unresolved;
    }
    const next = new Set([...seen, input]);
    const node = unwrap(ts, input);
    const primitive = primitiveValue(ts, node);
    if (primitive !== unresolved) {
      return primitive;
    }
    if (ts.isArrayLiteralExpression(node)) {
      return node.elements.map((element) => read(element, next));
    }
    if (ts.isObjectLiteralExpression(node)) {
      return objectValue(model, node, read, next);
    }
    if (ts.isCallExpression(node)) {
      return callValue(model, node, read, next, wrapper);
    }
    return referenceValue(model, node, read, next, writes);
  };
  const exported = (source, name) => {
    const symbol = exportedSymbol(model, source, name);
    assertConstant(model, writes, symbol);
    const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
    return (
      declaration &&
      read(
        ts.isExportAssignment(declaration)
          ? declaration.expression
          : declaration.initializer
      )
    );
  };
  return { read, exported, wrapper, unresolved };
}
