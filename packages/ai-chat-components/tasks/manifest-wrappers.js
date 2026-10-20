/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from 'node:path';

function unwrap(ts, node) {
  while (
    node &&
    (ts.isParenthesizedExpression(node) ||
      ts.isAsExpression(node) ||
      ts.isSatisfiesExpression(node) ||
      ts.isNonNullExpression(node))
  ) {
    node = node.expression;
  }
  return node;
}

function moduleOwner(ts, declaration) {
  let owner = declaration.parent;
  while (
    owner &&
    !ts.isImportDeclaration(owner) &&
    !ts.isExportDeclaration(owner)
  ) {
    owner = owner.parent;
  }
  return owner;
}

function moduleBinding(ts, checker, owner, name, seen) {
  const module = owner.moduleSpecifier.text;
  const binding = { module, name, filename: owner.getSourceFile().fileName };
  if (!module.startsWith('.')) {
    return binding;
  }
  const symbol = checker.getSymbolAtLocation(owner.moduleSpecifier);
  const exported =
    symbol &&
    checker.getExportsOfModule(symbol).find((entry) => entry.name === name);
  return symbolBinding(ts, checker, exported, seen) ?? binding;
}

function declarationBinding(ts, checker, declaration, seen) {
  if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
    return importBinding(ts, checker, declaration.initializer, seen);
  }
  const specifier =
    ts.isImportSpecifier(declaration) || ts.isExportSpecifier(declaration);
  if (
    !specifier &&
    !ts.isImportClause(declaration) &&
    !ts.isNamespaceImport(declaration)
  ) {
    return undefined;
  }
  const owner = moduleOwner(ts, declaration);
  if (!owner?.moduleSpecifier) {
    const target = checker.getExportSpecifierLocalTargetSymbol(declaration);
    return symbolBinding(ts, checker, target, seen);
  }
  const name = specifier
    ? (declaration.propertyName ?? declaration.name).text
    : ts.isNamespaceImport(declaration)
      ? '*'
      : 'default';
  return moduleBinding(ts, checker, owner, name, seen);
}

function symbolBinding(ts, checker, symbol, seen) {
  if (!symbol || seen.has(symbol)) {
    return undefined;
  }
  const next = new Set([...seen, symbol]);
  for (const declaration of symbol.declarations ?? []) {
    const binding = declarationBinding(ts, checker, declaration, next);
    if (binding) {
      return binding;
    }
  }
  return undefined;
}

function importBinding(ts, checker, node, seen = new Set()) {
  node = unwrap(ts, node);
  const direct = symbolBinding(
    ts,
    checker,
    checker.getSymbolAtLocation(node),
    seen
  );
  if (direct) {
    return direct;
  }
  if (ts.isPropertyAccessExpression(node)) {
    const binding = importBinding(ts, checker, node.expression, seen);
    if (binding?.name === '*' || binding?.name === 'default') {
      return { ...binding, name: node.name.text };
    }
  }
  return undefined;
}

function callBinding(model, expression) {
  return importBinding(model.ts, model.checker, expression);
}

function validateOptions(model, options) {
  const names = new Set();
  for (const entry of options.properties) {
    const name = entry.name;
    if (!name || model.ts.isComputedPropertyName(name)) {
      model.fail(
        entry,
        'Use explicit named createComponent options instead of spreads or computed keys.'
      );
    }
    if (names.has(name.text)) {
      model.fail(
        entry,
        `Declare the createComponent option ${name.text} once.`
      );
    }
    names.add(name.text);
    if (name.text === 'events' && !model.ts.isPropertyAssignment(entry)) {
      model.fail(
        entry,
        'Use an explicit events property with an object literal callback map.'
      );
    }
  }
}

function property(ts, object, name) {
  return object.properties.find(
    (entry) =>
      ts.isPropertyAssignment(entry) &&
      (ts.isIdentifier(entry.name) || ts.isStringLiteralLike(entry.name)) &&
      entry.name.text === name
  );
}

function eventType(model, expression) {
  const { ts } = model;
  while (ts.isParenthesizedExpression(expression)) {
    expression = expression.expression;
  }
  if (!ts.isAsExpression(expression)) {
    return undefined;
  }
  const annotation = expression.type;
  if (!ts.isTypeReferenceNode(annotation)) {
    return undefined;
  }
  const binding = callBinding(model, annotation.typeName);
  if (
    binding?.module !== '@lit/react' ||
    binding.name !== 'EventName' ||
    annotation.typeArguments?.length !== 1
  ) {
    return undefined;
  }
  return annotation.typeArguments[0];
}

function readCallbacks(model, options) {
  const { ts } = model;
  const events = property(ts, options, 'events');
  if (!events) {
    return [];
  }
  const object = unwrap(ts, events.initializer);
  if (!ts.isObjectLiteralExpression(object)) {
    model.fail(events, 'Use an object literal for the wrapper event map.');
  }
  return object.properties.map((entry) => {
    if (
      !ts.isPropertyAssignment(entry) ||
      (!ts.isIdentifier(entry.name) && !ts.isStringLiteralLike(entry.name))
    ) {
      model.fail(
        entry,
        'Use named callback properties in the wrapper event map.'
      );
    }
    const names = model.values(entry.initializer);
    if (names.length !== 1) {
      model.fail(entry, 'A wrapper callback must bind one event name.');
    }
    const typeNode = eventType(model, entry.initializer);
    return {
      callback: entry.name.text,
      eventName: names[0],
      type: typeNode?.getText(),
      typeNode,
      node: entry,
      location: model.location(entry),
    };
  });
}

function readNativeWrapper(model, call) {
  const { ts } = model;
  const options = call.arguments[0] && unwrap(ts, call.arguments[0]);
  if (!options || !ts.isObjectLiteralExpression(options)) {
    model.fail(call, 'Use an object literal for createComponent options.');
  }
  validateOptions(model, options);
  const classProperty = property(ts, options, 'elementClass');
  const classSymbol = classProperty && model.symbol(classProperty.initializer);
  const element = model.elements.find((entry) =>
    classSymbol?.declarations?.includes(entry.node)
  );
  if (!element) {
    const imported =
      classProperty &&
      importBinding(ts, model.checker, classProperty.initializer);
    if (imported?.module && !imported.module.startsWith('.')) {
      return undefined;
    }
    model.fail(
      call,
      'Resolve the wrapper elementClass to a published element.'
    );
  }
  const tag = property(ts, options, 'tagName');
  const tagValue = tag && unwrap(ts, tag.initializer);
  if (
    !tagValue ||
    !ts.isPropertyAccessExpression(tagValue) ||
    tagValue.name.text !== 'is' ||
    model.symbol(tagValue.expression) !== classSymbol
  ) {
    model.fail(call, "Use the wrapped element class's static is for tagName.");
  }
  return {
    element,
    callbacks: readCallbacks(model, options),
    node: call,
    location: model.location(call),
  };
}

function declarationValue(ts, declaration) {
  if (ts.isVariableDeclaration(declaration)) {
    return declaration.initializer;
  }
  if (ts.isExportAssignment(declaration)) {
    return declaration.expression;
  }
  if (ts.isFunctionDeclaration(declaration)) {
    return declaration;
  }
  return undefined;
}

function returnedExpressions(model, callback) {
  if (model.ts.isArrowFunction(callback) && !model.ts.isBlock(callback.body)) {
    return [callback.body];
  }
  const expressions = [];
  const collect = (node) => {
    if (model.ts.isFunctionLike(node)) {
      return;
    }
    if (model.ts.isReturnStatement(node) && node.expression) {
      expressions.push(node.expression);
    }
    model.ts.forEachChild(node, collect);
  };
  if (callback.body) {
    collect(callback.body);
  }
  return expressions;
}

function renderedChildren(model, node) {
  const { ts } = model;
  if (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isNonNullExpression(node)
  ) {
    return [node.expression];
  }
  if (ts.isJsxExpression(node)) {
    return node.expression ? [node.expression] : [];
  }
  if (ts.isArrayLiteralExpression(node)) {
    return [...node.elements];
  }
  if (ts.isConditionalExpression(node)) {
    return [node.whenTrue, node.whenFalse];
  }
  if (ts.isBinaryExpression(node)) {
    return node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
      ? [node.right]
      : [];
  }
  if (ts.isJsxElement(node)) {
    return [node.openingElement, ...node.children];
  }
  if (ts.isJsxFragment(node)) {
    return [...node.children];
  }
  if (
    ts.isJsxOpeningElement(node) ||
    ts.isJsxSelfClosingElement(node) ||
    ts.isObjectLiteralExpression(node)
  ) {
    return [];
  }
  if (ts.isCallExpression(node)) {
    const binding = callBinding(model, node.expression);
    return binding?.module === 'react' && binding.name === 'createElement'
      ? [...node.arguments].slice(2)
      : [];
  }
  return [];
}

function wrapperResolver(model, nativeWrappers) {
  const { ts } = model;
  const cache = new Map();

  function renderedWrappers(callback, visited) {
    const wrappers = new Set();
    const rendered = new Set();
    const readTarget = (node) => {
      let target;
      if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
        target = node.tagName;
      } else if (ts.isCallExpression(node)) {
        const binding = callBinding(model, node.expression);
        if (binding?.module === 'react' && binding.name === 'createElement') {
          target = node.arguments[0];
        }
      }
      if (target) {
        resolve(target, visited).forEach((entry) => wrappers.add(entry));
      }
    };
    const readReturned = (node) => {
      if (ts.isFunctionLike(node) || rendered.has(node)) {
        return;
      }
      rendered.add(node);
      readTarget(node);
      if (ts.isIdentifier(node)) {
        const initializer = model.symbol(node)?.valueDeclaration?.initializer;
        if (initializer) {
          readReturned(initializer);
        }
      }
      renderedChildren(model, node).forEach(readReturned);
    };
    for (const expression of returnedExpressions(model, callback)) {
      readReturned(expression);
    }
    return wrappers;
  }

  function resolveCall(node, visited) {
    const binding = callBinding(model, node.expression);
    const reactAdapter =
      binding?.module === 'react' &&
      ['forwardRef', 'memo'].includes(binding.name);
    const bridge =
      binding?.name === 'withWebComponentBridge' &&
      path
        .resolve(path.dirname(binding.filename), binding.module)
        .replace(/\.[jt]sx?$/, '') ===
        path.join(model.root, 'src/react/utils/withWebComponentBridge');
    if (reactAdapter || bridge) {
      const wrappers = resolve(node.arguments[0], visited);
      if (!wrappers.size) {
        model.fail(
          node,
          'Resolve the exported React adapter to a rendered custom-element wrapper.'
        );
      }
      return wrappers;
    }
    if (
      node.arguments.some((argument) => resolve(argument, visited).size > 0)
    ) {
      model.fail(
        node,
        'Resolve createComponent through a supported exported wrapper adapter.'
      );
    }
    return new Set();
  }

  function resolveSymbol(node, visited) {
    const wrappers = new Set();
    for (const declaration of model.symbol(node)?.declarations ?? []) {
      const value = declarationValue(ts, declaration);
      if (value) {
        resolve(value, visited).forEach((entry) => wrappers.add(entry));
      }
    }
    return wrappers;
  }

  function resolveNode(node, visited) {
    if (nativeWrappers.has(node)) {
      return new Set([nativeWrappers.get(node)]);
    }
    if (ts.isCallExpression(node)) {
      return resolveCall(node, visited);
    }
    if (
      ts.isArrowFunction(node) ||
      ts.isFunctionExpression(node) ||
      ts.isFunctionDeclaration(node)
    ) {
      return renderedWrappers(node, visited);
    }
    if (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node)) {
      return resolveSymbol(node, visited);
    }
    return new Set();
  }

  function resolve(node, visited = new Set()) {
    node = unwrap(ts, node);
    if (!node || visited.has(node)) {
      return new Set();
    }
    if (cache.has(node)) {
      return cache.get(node);
    }
    const wrappers = resolveNode(node, new Set([...visited, node]));
    cache.set(node, wrappers);
    return wrappers;
  }

  return resolve;
}

function isWrapperSource(source) {
  const filename = source.fileName.replaceAll('\\', '/');
  return (
    filename.includes('/src/react/') &&
    !/\/(?:__tests__|hooks|utils)\//.test(filename)
  );
}

function nativeWrapperCalls(model, sources) {
  const nativeWrappers = new Map();
  for (const source of sources) {
    model.visit(source, (node) => {
      if (!model.ts.isCallExpression(node)) {
        return;
      }
      const binding = callBinding(model, node.expression);
      if (
        binding?.module === '@lit/react' &&
        binding.name === 'createComponent'
      ) {
        const wrapper = readNativeWrapper(model, node);
        if (wrapper) {
          nativeWrappers.set(node, wrapper);
        }
      }
    });
  }
  return nativeWrappers;
}

function exportedWrapper(model, exported, resolve) {
  const { ts, checker } = model;
  const symbol =
    exported.flags & ts.SymbolFlags.Alias
      ? checker.getAliasedSymbol(exported)
      : exported;
  const declaration = symbol.valueDeclaration;
  if (!declaration) {
    return undefined;
  }
  const wrappers = resolve(declarationValue(ts, declaration) ?? declaration);
  if (wrappers.size > 1) {
    model.fail(declaration, 'An exported wrapper must resolve to one element.');
  }
  const wrapper = [...wrappers][0];
  return wrapper && { ...wrapper, exportName: exported.name };
}

function moduleWrappers(model, source, resolve) {
  const symbol = model.checker.getSymbolAtLocation(source);
  if (!symbol) {
    return [];
  }
  const records = [];
  const module = path
    .relative(model.root, source.fileName)
    .replaceAll('\\', '/');
  for (const exported of model.checker.getExportsOfModule(symbol)) {
    const wrapper = exportedWrapper(model, exported, resolve);
    if (wrapper) {
      records.push({ ...wrapper, module });
    }
  }
  return records;
}

export function readWrappers(model, { requireEventTypes = false } = {}) {
  const sources = model.sources.filter(isWrapperSource);
  const nativeSources = model.sources.filter(
    (source) =>
      source.fileName.replaceAll('\\', '/').includes('/src/react/') &&
      !source.fileName.replaceAll('\\', '/').includes('/__tests__/')
  );
  const nativeWrappers = nativeWrapperCalls(model, nativeSources);
  const resolve = wrapperResolver(model, nativeWrappers);
  const records = sources.flatMap((source) =>
    moduleWrappers(model, source, resolve)
  );
  for (const wrapper of nativeWrappers.values()) {
    if (!records.some((entry) => entry.node === wrapper.node)) {
      model.fail(
        wrapper.node,
        'Resolve createComponent through a supported exported wrapper adapter.'
      );
    }
  }
  if (requireEventTypes) {
    validateWrapperEvents(model, records);
  }
  return records;
}

export function validateWrapperEvents(model, wrappers) {
  for (const wrapper of wrappers) {
    for (const callback of wrapper.callbacks) {
      if (
        !callback.type ||
        /\b(?:any|unknown)\b/.test(callback.type) ||
        callback.type === 'CustomEvent'
      ) {
        model.fail(
          callback.node,
          `Cast ${callback.callback} with EventName and a concrete DOM event type.`
        );
      }
    }
  }
}
