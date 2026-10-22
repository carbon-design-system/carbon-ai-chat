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
  const callbacks = new Set();
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
    if (callbacks.has(entry.name.text)) {
      model.fail(
        entry,
        `Declare the wrapper callback ${entry.name.text} once.`
      );
    }
    callbacks.add(entry.name.text);
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

function requireEventTypes(model, wrappers) {
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

function canonicalFamily(model, element) {
  const filename = path.resolve(
    model.root,
    path.dirname(element.module),
    'index.ts'
  );
  const exports = familyExports(model, filename);
  if (!exports) {
    model.fail(element.node, 'Resolve the owning canonical family barrel.');
  }
  return exports;
}

function familyExports(model, filename) {
  const source = model.program.getSourceFile(filename);
  const module = source && model.checker.getSymbolAtLocation(source);
  if (!module) {
    return undefined;
  }
  return new Set(
    model.checker
      .getExportsOfModule(module)
      .map((symbol) =>
        symbol.flags & model.ts.SymbolFlags.Alias
          ? model.checker.getAliasedSymbol(symbol)
          : symbol
      )
  );
}

function publicDetail(model, symbol, publicTypes) {
  if (publicTypes.has(symbol)) {
    return true;
  }
  return symbol.declarations.some((declaration) => {
    const relative = path
      .relative(model.root, declaration.getSourceFile().fileName)
      .replaceAll('\\', '/');
    const family = relative.match(/^src\/components\/aichat-[^/]+\//)?.[0];
    return (
      family &&
      familyExports(model, path.resolve(model.root, family, 'index.ts'))?.has(
        symbol
      )
    );
  });
}

function namedContractSymbol(model, name, context) {
  const { ts, checker } = model;
  const parts = name.getText().split('.');
  let symbol = checker.resolveName(
    parts.shift(),
    context,
    ts.SymbolFlags.Type | ts.SymbolFlags.Namespace | ts.SymbolFlags.Alias,
    false
  );
  const unalias = (entry) =>
    entry?.flags & ts.SymbolFlags.Alias
      ? checker.getAliasedSymbol(entry)
      : entry;
  symbol = unalias(symbol);
  for (const part of parts) {
    symbol =
      symbol &&
      unalias(
        checker.getExportsOfModule(symbol).find((entry) => entry.name === part)
      );
  }
  if (!symbol?.declarations?.length) {
    model.fail(context, `Resolve the public event type ${name.getText()}.`);
  }
  return symbol;
}

function contractDetails(model, node, context, publicTypes) {
  const { ts } = model;
  if (ts.isUnionTypeNode(node)) {
    return node.types.flatMap((entry) =>
      contractDetails(model, entry, context, publicTypes)
    );
  }
  if (
    ts.isLiteralTypeNode(node) &&
    node.literal.kind === ts.SyntaxKind.NullKeyword
  ) {
    return [null];
  }
  if (!ts.isTypeReferenceNode(node) || node.typeArguments?.length) {
    model.fail(
      context,
      `Use the exported public detail type instead of ${node.getText()}.`
    );
  }
  const symbol = namedContractSymbol(model, node.typeName, context);
  const type = model.checker.getDeclaredTypeOfSymbol(symbol);
  if (
    type.flags &
    (ts.TypeFlags.Any |
      ts.TypeFlags.Unknown |
      ts.TypeFlags.Never |
      ts.TypeFlags.TypeParameter)
  ) {
    model.fail(
      context,
      `Use a concrete exported public detail type instead of ${node.getText()}.`
    );
  }
  if (publicTypes && !publicDetail(model, symbol, publicTypes)) {
    model.fail(
      context,
      `Export public event detail ${node.getText()} from its owning canonical family.`
    );
  }
  return [symbol];
}

function eventContract(model, node, context, publicTypes) {
  const { ts, checker } = model;
  while (ts.isParenthesizedTypeNode(node)) {
    node = node.type;
  }
  if (!ts.isTypeReferenceNode(node)) {
    model.fail(context, 'Use a concrete named DOM event type.');
  }
  const symbol = namedContractSymbol(model, node.typeName, context);
  const custom = checker.resolveName(
    'CustomEvent',
    undefined,
    ts.SymbolFlags.Type,
    false
  );
  if (symbol === custom) {
    if (node.typeArguments?.length !== 1) {
      model.fail(context, 'Give CustomEvent its exported public detail type.');
    }
    return {
      symbol,
      details: contractDetails(
        model,
        node.typeArguments[0],
        context,
        publicTypes
      ),
    };
  }
  const event = checker.resolveName(
    'Event',
    undefined,
    ts.SymbolFlags.Type,
    false
  );
  const type = checker.getDeclaredTypeOfSymbol(symbol);
  if (
    node.typeArguments?.length ||
    !event ||
    !checker.isTypeAssignableTo(type, checker.getDeclaredTypeOfSymbol(event))
  ) {
    model.fail(
      context,
      'Use a concrete native DOM event type or typed CustomEvent.'
    );
  }
  return { symbol, details: [] };
}

function pairContract(model, pair) {
  const { ts } = model;
  const source = ts.createSourceFile(
    'wrapper-contract.ts',
    `type Contract = ${pair.type};`,
    ts.ScriptTarget.Latest,
    true
  );
  const node = source.statements[0]?.type;
  if (!node || source.parseDiagnostics.length) {
    model.fail(
      pair.element.node,
      `Resolve the manifest event type ${pair.type}.`
    );
  }
  return eventContract(
    model,
    node,
    pair.element.node,
    canonicalFamily(model, pair.element)
  );
}

function sameContract(actual, expected) {
  return (
    actual.symbol === expected.symbol &&
    actual.details.every((symbol) => expected.details.includes(symbol)) &&
    expected.details.every((symbol) => actual.details.includes(symbol))
  );
}

const hostProtocolTypes = new Map([
  ['mount', 'MarkdownPluginHostMountDetail'],
  ['update', 'MarkdownPluginHostUpdateDetail'],
  ['unmount', 'MarkdownPluginHostUnmountDetail'],
]);

function hostProtocolRoles(model) {
  const roles = new Map();
  const markdown = model.elements.find(
    (element) =>
      element.module === 'src/components/aichat-markdown/aichat-markdown.ts'
  );
  const publicTypes = markdown && canonicalFamily(model, markdown);
  for (const source of model.sources) {
    model.visit(source, (node) => {
      const tags = model.ts
        .getJSDocTags(node)
        .filter((tag) => tag.tagName.text === 'reactHostProtocol');
      if (!tags.length) {
        return;
      }
      const role =
        typeof tags[0].comment === 'string' ? tags[0].comment.trim() : '';
      const validDeclaration =
        model.ts.isInterfaceDeclaration(node) ||
        model.ts.isTypeAliasDeclaration(node);
      const symbol = node.name && model.symbol(node.name);
      if (
        tags.length !== 1 ||
        !validDeclaration ||
        !markdown ||
        path.relative(model.root, source.fileName).replaceAll('\\', '/') !==
          'src/components/aichat-markdown/utils/plugin-host-container.ts' ||
        node.name.text !== hostProtocolTypes.get(role) ||
        !publicTypes.has(symbol) ||
        roles.has(role)
      ) {
        model.fail(
          node,
          'Use one distinct Markdown hosting protocol role on its existing exported public detail declaration.'
        );
      }
      roles.set(role, symbol);
    });
  }
  if (markdown && roles.size !== hostProtocolTypes.size) {
    model.fail(
      markdown.node,
      'Declare all three Markdown hosting protocol detail roles.'
    );
  }
  return { markdown, roles };
}

function hostProtocolPairs(model, pairs, contracts) {
  const { markdown, roles } = hostProtocolRoles(model);
  const exempt = new Set();
  for (const [role, symbol] of roles) {
    const matches = pairs.filter(
      (pair) =>
        pair.element === markdown &&
        contracts.get(pair).details.length === 1 &&
        contracts.get(pair).details[0] === symbol
    );
    if (matches.length !== 1) {
      model.fail(
        markdown.node,
        `Resolve exactly one Markdown hosting event for its ${role} detail role.`
      );
    }
    exempt.add(matches[0]);
  }
  return exempt;
}

function validateWrapper(model, wrapper, pairs, contracts, exempt) {
  const owned = pairs.filter((pair) => pair.element === wrapper.element);
  for (const callback of wrapper.callbacks) {
    const pair = owned.find((entry) => entry.name === callback.eventName);
    if (!pair) {
      model.fail(
        callback.node,
        `Undocumented wrapper binding ${callback.callback} for ${callback.eventName}.`
      );
    }
    if (exempt.has(pair)) {
      model.fail(
        callback.node,
        'Markdown hosting protocol events are not React callback props.'
      );
    }
    const actual = eventContract(model, callback.typeNode, callback.node);
    if (!sameContract(actual, contracts.get(pair))) {
      model.fail(
        callback.node,
        `Cast ${callback.callback} with EventName<${pair.type}> using its exported public detail type.`
      );
    }
  }
  for (const pair of owned) {
    if (
      !exempt.has(pair) &&
      !wrapper.callbacks.some((callback) => callback.eventName === pair.name)
    ) {
      model.fail(
        wrapper.node,
        `Missing React callback for ${wrapper.element.tagName} event ${pair.name}.`
      );
    }
  }
}

export function validateWrapperEvents(model, wrappers, pairs) {
  requireEventTypes(model, wrappers);
  if (!pairs) {
    return;
  }
  const contracts = new Map(
    pairs.map((pair) => [pair, pairContract(model, pair)])
  );
  const exempt = hostProtocolPairs(model, pairs, contracts);
  for (const pair of pairs) {
    if (
      !exempt.has(pair) &&
      !wrappers.some((wrapper) => wrapper.element === pair.element)
    ) {
      model.fail(
        pair.element.node,
        `Missing exported React wrapper for ${pair.element.tagName} event ${pair.name}.`
      );
    }
  }
  const checked = new Set();
  for (const wrapper of wrappers) {
    if (!checked.has(wrapper.node)) {
      validateWrapper(model, wrapper, pairs, contracts, exempt);
      checked.add(wrapper.node);
    }
  }
}
