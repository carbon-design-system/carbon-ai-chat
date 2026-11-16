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
    ts.isSatisfiesExpression(node) ||
    ts.isNonNullExpression(node)
  ) {
    node = node.expression;
  }
  return node;
}

function primitiveType(model, node) {
  const { TypeFlags } = model.ts;
  const primitive =
    TypeFlags.StringLike |
    TypeFlags.NumberLike |
    TypeFlags.BooleanLike |
    TypeFlags.BigIntLike |
    TypeFlags.ESSymbolLike |
    TypeFlags.Null |
    TypeFlags.Undefined |
    TypeFlags.Void |
    TypeFlags.Never;
  return !!(model.checker.getTypeAtLocation(node).flags & primitive);
}

function readOnlyCall(model, node) {
  if (importedHelper(model, node.expression)) {
    return true;
  }
  const { ts } = model;
  const callee = unwrap(ts, node.expression);
  if (
    !ts.isPropertyAccessExpression(callee) ||
    callee.name.text !== 'keys' ||
    callee.expression.getText() !== 'Object'
  ) {
    return false;
  }
  return model
    .symbol(callee.expression)
    ?.declarations?.some((declaration) =>
      /[\\/]typescript[\\/]lib[\\/]lib\..*\.d\.ts$/.test(
        declaration.getSourceFile().fileName
      )
    );
}

function captured(model, node) {
  const symbols = [];
  model.visit(node, (child) => {
    const symbol = model.ts.isIdentifier(child) && model.symbol(child);
    if (symbol) {
      symbols.push(symbol);
    }
  });
  return symbols;
}

// Symbols whose objects the value of `input` can share. Functions share
// everything they capture, so returning metadata from one still counts.
function aliases(model, input) {
  if (!input) {
    return [];
  }
  const { ts } = model;
  const node = unwrap(ts, input);
  if (ts.isIdentifier(node)) {
    const symbol = model.symbol(node);
    return symbol ? [symbol] : [];
  }
  if (
    ts.isPropertyAccessExpression(node) ||
    ts.isElementAccessExpression(node) ||
    ts.isSpreadElement(node) ||
    ts.isSpreadAssignment(node)
  ) {
    return aliases(model, node.expression);
  }
  if (ts.isCallExpression(node)) {
    return readOnlyCall(model, node) ? [] : aliases(model, node.expression);
  }
  if (ts.isFunctionLike(node)) {
    return captured(model, node);
  }
  if (ts.isObjectLiteralExpression(node)) {
    return node.properties.flatMap((property) =>
      ts.isFunctionLike(property)
        ? captured(model, property)
        : aliases(
            model,
            property.initializer ?? property.expression ?? property.name
          )
    );
  }
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.flatMap((element) => aliases(model, element));
  }
  if (ts.isConditionalExpression(node)) {
    return [node.whenTrue, node.whenFalse].flatMap((branch) =>
      aliases(model, branch)
    );
  }
  if (ts.isBinaryExpression(node)) {
    return [node.left, node.right].flatMap((branch) => aliases(model, branch));
  }
  return [];
}

function bindingNames(ts, name) {
  return ts.isIdentifier(name)
    ? [name]
    : name.elements.flatMap((element) =>
        ts.isOmittedExpression(element) ? [] : bindingNames(ts, element.name)
      );
}

// Any assignment, delete, increment, method call, or non-primitive call
// argument reaching a value counts as a write to every symbol that value can
// share. Rebinding a variable writes only that variable, and calling a story's
// own play or render does not write the story. This over-reports on purpose:
// the stories never write their metadata, so a hit means a story started doing
// something the guard cannot follow.
function metadataWrites(model) {
  const { ts } = model;
  const links = new Map();
  const writes = [];
  const link = (symbol, targets) => {
    if (symbol) {
      links.set(symbol, [...(links.get(symbol) ?? []), ...targets]);
    }
  };
  const write = (node, subject) => {
    const target = unwrap(ts, subject);
    if (ts.isIdentifier(target)) {
      writes.push({ node, symbols: [model.symbol(target)], shared: false });
    } else {
      writes.push({ node, symbols: aliases(model, target), shared: true });
    }
  };
  const visit = (node) => {
    if (
      (ts.isVariableDeclaration(node) ||
        ts.isParameter(node) ||
        ts.isBindingElement(node)) &&
      node.initializer
    ) {
      const targets = aliases(model, node.initializer);
      for (const name of bindingNames(ts, node.name)) {
        link(model.symbol(name), targets);
      }
    }
    if (ts.isForOfStatement(node)) {
      const targets = aliases(model, node.expression);
      const names = ts.isVariableDeclarationList(node.initializer)
        ? node.initializer.declarations
            .flatMap((declaration) => bindingNames(ts, declaration.name))
            .map((name) => model.symbol(name))
        : aliases(model, node.initializer);
      names.forEach((symbol) => link(symbol, targets));
    }
    if (
      (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) &&
      node.name
    ) {
      link(model.symbol(node.name), captured(model, node));
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
    ) {
      write(node, node.left);
      const stored = aliases(model, node.right);
      for (const symbol of aliases(model, node.left)) {
        link(symbol, stored);
      }
    }
    if (ts.isDeleteExpression(node)) {
      write(node, node.expression);
    }
    if (
      (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
      [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(
        node.operator
      )
    ) {
      write(node, node.operand);
    }
    if (
      (ts.isCallExpression(node) || ts.isNewExpression(node)) &&
      !readOnlyCall(model, node)
    ) {
      for (const argument of node.arguments ?? []) {
        if (!primitiveType(model, argument)) {
          writes.push({
            node,
            symbols: aliases(model, argument),
            shared: true,
          });
        }
      }
      const callee = unwrap(ts, node.expression);
      const method = ts.isPropertyAccessExpression(callee)
        ? callee.name.text
        : callee.argumentExpression?.text;
      if (
        (ts.isPropertyAccessExpression(callee) ||
          ts.isElementAccessExpression(callee)) &&
        !ignoredProperties.has(method)
      ) {
        writes.push({
          node,
          symbols: aliases(model, callee.expression),
          shared: true,
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  model.program
    .getSourceFiles()
    .filter(
      (source) =>
        source.fileName.startsWith(`${model.root}/`) &&
        !source.isDeclarationFile
    )
    .forEach(visit);

  const reach = (symbols, seen = new Set()) => {
    for (const symbol of symbols) {
      if (symbol && !seen.has(symbol)) {
        seen.add(symbol);
        reach(links.get(symbol) ?? [], seen);
      }
    }
    return seen;
  };
  const written = new Map();
  for (const { node, symbols, shared } of writes) {
    for (const symbol of shared ? reach(symbols) : symbols) {
      if (symbol && !written.has(symbol)) {
        written.set(symbol, node);
      }
    }
  }
  return written;
}

function assertConstant(model, writes, symbol) {
  const write = writes.get(symbol);
  if (write) {
    model.fail(
      write,
      'Define documentation metadata without later writes or escaping calls.'
    );
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
    if (wrappers.has(model.symbol(node))) {
      return unresolved;
    }
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
