/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

export function sourceFiles(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(root, entry.name);
    return entry.isDirectory()
      ? sourceFiles(file)
      : /\.tsx?$/.test(file)
        ? [file]
        : [];
  });
}

export function sourceProgram(
  files: string[],
  virtual: Record<string, string> = {}
) {
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.React,
    skipLibCheck: true,
    strict: true,
    strictNullChecks: false,
    experimentalDecorators: true,
    esModuleInterop: true,
    noEmit: true,
    types: ['node', 'jest'],
  };
  const host = ts.createCompilerHost(options);
  const directoryExists = host.directoryExists?.bind(host);
  host.directoryExists = (dir) =>
    Object.keys(virtual).some((f) => f.startsWith(dir + path.sep)) ||
    Boolean(directoryExists?.(dir));
  const read = host.readFile.bind(host);
  const exists = host.fileExists.bind(host);
  host.readFile = (file) => virtual[file] ?? read(file);
  host.fileExists = (file) => file in virtual || exists(file);
  host.getSourceFile = (file, version) => {
    const text = host.readFile(file);
    return text === undefined
      ? undefined
      : ts.createSourceFile(file, text, version, true);
  };
  const program = ts.createProgram(files, options, host);
  return { program, checker: program.getTypeChecker() };
}

export function visit(node: ts.Node, fn: (node: ts.Node) => void) {
  fn(node);
  ts.forEachChild(node, (child) => visit(child, fn));
}

function isGlobalObject(node: ts.Node | undefined, checker: ts.TypeChecker) {
  while (node && ts.isParenthesizedExpression(node)) {
    node = node.expression;
  }
  return (
    node &&
    ts.isIdentifier(node) &&
    (node.text === 'globalThis' || node.text === 'global') &&
    !checker.getSymbolAtLocation(node)?.declarations?.length
  );
}

function isRequireName(node: ts.Node) {
  if (ts.isComputedPropertyName(node)) {
    return (
      ts.isStringLiteralLike(node.expression) &&
      node.expression.text === 'require'
    );
  }
  return (
    (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) &&
    node.text === 'require'
  );
}

function isGlobalRequireAssignment(
  node: ts.Node,
  checker: ts.TypeChecker
): boolean {
  if (
    !ts.isBinaryExpression(node) ||
    node.operatorToken.kind !== ts.SyntaxKind.EqualsToken ||
    !ts.isObjectLiteralExpression(node.left) ||
    !isGlobalObject(node.right, checker)
  ) {
    return false;
  }
  return node.left.properties.some(
    (property) =>
      (ts.isPropertyAssignment(property) ||
        ts.isShorthandPropertyAssignment(property)) &&
      isRequireName(property.name)
  );
}

function isGlobalRequire(node: ts.Node, checker: ts.TypeChecker): boolean {
  if (ts.isPropertyAccessExpression(node) && isRequireName(node.name)) {
    return Boolean(isGlobalObject(node.expression, checker));
  }
  if (
    ts.isElementAccessExpression(node) &&
    ts.isStringLiteralLike(node.argumentExpression) &&
    isRequireName(node.argumentExpression)
  ) {
    return Boolean(isGlobalObject(node.expression, checker));
  }
  if (
    ts.isBindingElement(node) &&
    ts.isObjectBindingPattern(node.parent) &&
    isRequireName(node.propertyName ?? node.name)
  ) {
    const declaration = node.parent.parent;
    return (
      ts.isVariableDeclaration(declaration) &&
      Boolean(isGlobalObject(declaration.initializer, checker))
    );
  }
  return false;
}

function isUnboundRequire(node: ts.Node, checker: ts.TypeChecker): boolean {
  if (
    isGlobalRequire(node, checker) ||
    isGlobalRequireAssignment(node, checker)
  ) {
    return true;
  }
  if (!ts.isIdentifier(node) || node.text !== 'require') {
    return false;
  }
  const parent = node.parent;
  if (
    (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
    (ts.isBindingElement(parent) && parent.propertyName === node) ||
    ((ts.isLabeledStatement(parent) ||
      ts.isBreakStatement(parent) ||
      ts.isContinueStatement(parent)) &&
      parent.label === node)
  ) {
    return false;
  }
  const symbol = ts.isShorthandPropertyAssignment(parent)
    ? checker.getShorthandAssignmentValueSymbol(parent)
    : checker.getSymbolAtLocation(node);
  return !symbol?.declarations?.length;
}

export function runtimeGraph(
  roots: string[],
  read: (file: string) => string,
  resolve: (file: string, specifier: string) => string | undefined,
  allowedExternal: Set<string>
) {
  const files = new Set<string>();
  const issues: string[] = [];
  const edges: Array<[string, string]> = [];
  const pending = [...roots];
  while (pending.length) {
    const file = pending.shift()!;
    if (files.has(file)) {
      continue;
    }
    files.add(file);
    const output = ts.transpileModule(read(file), {
      fileName: file,
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        experimentalDecorators: true,
      },
    }).outputText;
    const source = ts.createSourceFile(
      file + '.js',
      output,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS
    );
    // Bind only this emitted file so a local function named require is not mistaken for CommonJS.
    const bindingOptions: ts.CompilerOptions = {
      allowJs: true,
      noLib: true,
      noResolve: true,
      types: [],
    };
    const bindingHost = ts.createCompilerHost(bindingOptions);
    bindingHost.getSourceFile = (name) =>
      name === source.fileName ? source : undefined;
    const bindings = ts
      .createProgram([source.fileName], bindingOptions, bindingHost)
      .getTypeChecker();
    const add = (specifier: string) => {
      const local = resolve(file, specifier);
      if (local) {
        edges.push([file, local]);
        pending.push(local);
      } else if (!allowedExternal.has(specifier)) {
        issues.push(`${file}: unresolved or forbidden ${specifier}`);
      }
    };
    visit(source, (node) => {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier
      ) {
        if (ts.isStringLiteral(node.moduleSpecifier)) {
          add(node.moduleSpecifier.text);
        }
      }
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword
      ) {
        const argument = node.arguments[0];
        if (argument && ts.isStringLiteralLike(argument)) {
          add(argument.text);
        } else {
          issues.push(`${file}: nonliteral dynamic import`);
        }
      }
      if (isUnboundRequire(node, bindings)) {
        issues.push(`${file}: require is not a supported boundary edge`);
      }
    });
  }
  return { files, issues, edges };
}

export function resolveSource(
  file: string,
  specifier: string,
  packageRoot: string
) {
  const prefix = '@carbon/ai-chat-components/es/';
  let base: string;
  if (specifier.startsWith('.')) {
    base = path.resolve(path.dirname(file), specifier);
  } else if (specifier.startsWith(prefix)) {
    base = path.resolve(
      packageRoot,
      '../ai-chat-components/src',
      specifier.slice(prefix.length)
    );
  } else {
    return undefined;
  }
  base = base.replace(/\.js$/, '');
  return [
    base + '.ts',
    base + '.tsx',
    base + '/index.ts',
    base + '/index.tsx',
  ].find(fs.existsSync);
}

function declarationName(node: ts.Declaration): string | undefined {
  const named = node as ts.NamedDeclaration;
  return named.name &&
    (ts.isIdentifier(named.name) || ts.isStringLiteral(named.name))
    ? named.name.text
    : undefined;
}

export function resolvedCall(
  checker: ts.TypeChecker,
  node: ts.CallExpression | ts.NewExpression
) {
  const declaration = checker.getResolvedSignature(node)?.declaration;
  return declaration
    ? {
        declaration,
        file: declaration.getSourceFile().fileName,
        name: declarationName(declaration),
      }
    : undefined;
}

function sensitiveOrigin(symbol: ts.Symbol | undefined) {
  return symbol?.declarations?.some((declaration) => {
    const file = declaration.getSourceFile().fileName.replaceAll('\\', '/');
    const service =
      /\/(?:ServiceManager|ChatInstance|ChatInstanceService|appStore|AppState|PublicConfig)\.[^/]+$/.test(
        file
      );
    const browser =
      /\/lib\.[^/]+\.d\.ts$/.test(file) &&
      [
        'Promise',
        'AbortController',
        'AbortSignal',
        'Window',
        'Document',
        'HTMLElement',
      ].includes(declarationName(declaration) ?? '');
    return service || browser;
  });
}

function resolvedSymbol(checker: ts.TypeChecker, node: ts.Node | undefined) {
  const symbol = node && checker.getSymbolAtLocation(node);
  return symbol && symbol.flags & ts.SymbolFlags.Alias
    ? checker.getAliasedSymbol(symbol)
    : symbol;
}

function typeArguments(checker: ts.TypeChecker, type: ts.Type) {
  return [
    ...(type.aliasTypeArguments ?? []),
    ...(type.flags & ts.TypeFlags.Object
      ? checker.getTypeArguments(type as ts.TypeReference)
      : []),
  ];
}

function dataWrapper(type: ts.Type, args: readonly ts.Type[]) {
  return (
    type.aliasSymbol &&
    args.length &&
    type.aliasSymbol.declarations?.every((declaration) =>
      /(?:\/lib\.[^/]+\.d\.ts|\/types\/utilities\/DeepPartial(?:\.d)?\.ts)$/.test(
        declaration.getSourceFile().fileName
      )
    )
  );
}

function dataLibrary(type: ts.Type) {
  const declarations = type.symbol?.declarations ?? [];
  return (
    declarations.length &&
    declarations.every((declaration) =>
      /\/lib\.[^/]+\.d\.ts$/.test(declaration.getSourceFile().fileName)
    ) &&
    [
      'Array',
      'ReadonlyArray',
      'Map',
      'ReadonlyMap',
      'Set',
      'ReadonlySet',
      'Date',
    ].includes(type.symbol.name)
  );
}

function methodLike(
  node: ts.Node
): node is
  ts.MethodDeclaration | ts.GetAccessorDeclaration | ts.SetAccessorDeclaration {
  return (
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  );
}

/** Check data surfaces and their named origins, even when a type reduces to a primitive. */
export function capabilityIssues(
  checker: ts.TypeChecker,
  source: ts.SourceFile,
  dataLeaves: Set<ts.Symbol>,
  allowMethods = false
) {
  const issues = new Set<string>();
  const checked = new Set<ts.Type>();
  const checkedOrigins = new Set<ts.Symbol>();

  function inspectSignature(
    signature: ts.Signature,
    declaration: ts.Node,
    label: string
  ) {
    for (const parameter of signature.getParameters()) {
      inspect(
        checker.getTypeOfSymbolAtLocation(parameter, declaration),
        label + ' argument'
      );
    }
    inspect(signature.getReturnType(), label + ' result');
  }

  function inspectProperties(
    type: ts.Type,
    label: string,
    methodContainer: boolean
  ) {
    for (const index of checker.getIndexInfosOfType(type)) {
      inspect(index.type, label + ' indexed value');
    }
    for (const property of checker.getPropertiesOfType(type)) {
      const declaration =
        property.valueDeclaration ?? property.declarations?.[0];
      if (!declaration) {
        continue;
      }
      const propertyType = checker.getTypeOfSymbolAtLocation(
        property,
        declaration
      );
      const method =
        ts.isMethodSignature(declaration) ||
        ts.isMethodDeclaration(declaration);
      if (methodContainer && method) {
        propertyType
          .getCallSignatures()
          .forEach((signature) =>
            inspectSignature(
              signature,
              declaration,
              label + '.' + property.name
            )
          );
      } else {
        inspect(propertyType, label + '.' + property.name);
      }
    }
  }

  function inspectReference(node: ts.Node, label?: string) {
    if (!ts.isTypeReferenceNode(node) && !ts.isImportTypeNode(node)) {
      return;
    }
    const referenceLabel = label ?? node.getText();
    const name = ts.isTypeReferenceNode(node) ? node.typeName : node.qualifier;
    inspectOrigin(resolvedSymbol(checker, name), referenceLabel);
    const type = checker.getTypeAtLocation(node);
    if (sensitiveOrigin(type.symbol) || sensitiveOrigin(type.aliasSymbol)) {
      issues.add(referenceLabel + ': effect type origin');
    }
  }

  function inspectOriginDeclaration(
    declaration: ts.Declaration,
    label: string
  ) {
    if (ts.isTypeAliasDeclaration(declaration)) {
      visit(declaration.type, (node) => inspectReference(node, label));
    } else if (
      (ts.isInterfaceDeclaration(declaration) || ts.isClassLike(declaration)) &&
      !/\/lib\.[^/]+\.d\.ts$/.test(declaration.getSourceFile().fileName)
    ) {
      inspectHeritage(declaration, label);
      declaration.members.forEach((member) =>
        visit(member, (node) => inspectReference(node, label))
      );
    }
  }

  function inspectOrigin(symbol: ts.Symbol | undefined, label: string) {
    if (!symbol || dataLeaves.has(symbol) || checkedOrigins.has(symbol)) {
      return;
    }
    checkedOrigins.add(symbol);
    if (sensitiveOrigin(symbol)) {
      issues.add(label + ': effect type origin');
      return;
    }
    for (const declaration of symbol.declarations ?? []) {
      inspectOriginDeclaration(declaration, label);
    }
  }

  function inspect(type: ts.Type, label: string, methodContainer = false) {
    if (checked.has(type)) {
      return;
    }
    checked.add(type);
    inspectOrigin(type.symbol, label);
    inspectOrigin(type.aliasSymbol, label);
    if (sensitiveOrigin(type.symbol) || sensitiveOrigin(type.aliasSymbol)) {
      issues.add(label + ': effect capability');
      return;
    }
    if (dataLeaves.has(type.symbol) || dataLeaves.has(type.aliasSymbol)) {
      return;
    }
    const args = typeArguments(checker, type);
    args.forEach((argument) => inspect(argument, label));
    if (dataWrapper(type, args)) {
      return;
    }
    if (type.isUnionOrIntersection()) {
      type.types.forEach((member) => inspect(member, label));
      return;
    }
    if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) {
      issues.add(label + ': unscoped opaque type');
      return;
    }
    if (dataLibrary(type)) {
      return;
    }
    if (
      type.getCallSignatures().length ||
      type.getConstructSignatures().length
    ) {
      issues.add(label + ': callback capability');
      return;
    }
    if (type.flags & ts.TypeFlags.Object) {
      inspectProperties(type, label, methodContainer);
    }
  }

  function inspectCallable(
    node: ts.SignatureDeclaration,
    label: string,
    methods = false
  ) {
    node.parameters.forEach((parameter) =>
      inspect(
        checker.getTypeAtLocation(parameter),
        parameter.name.getText(source),
        methods
      )
    );
    if (!ts.isConstructorDeclaration(node)) {
      const signature = checker.getSignatureFromDeclaration(node);
      if (signature) {
        inspect(signature.getReturnType(), label + ' result');
      }
    }
  }

  function inspectProperty(member: ts.PropertyDeclaration) {
    const symbol =
      member.initializer && ts.isIdentifier(member.initializer)
        ? resolvedSymbol(checker, member.initializer)
        : undefined;
    const type = checker.getTypeAtLocation(member);
    const label = member.name.getText(source);
    if (symbol?.declarations?.every(ts.isFunctionDeclaration)) {
      type
        .getCallSignatures()
        .forEach((signature) => inspectSignature(signature, member, label));
    } else {
      inspect(type, label, allowMethods);
    }
  }

  function inspectHeritage(
    node: ts.ClassLikeDeclaration | ts.InterfaceDeclaration,
    label: string
  ) {
    for (const clause of node.heritageClauses ?? []) {
      for (const base of clause.types) {
        inspectOrigin(resolvedSymbol(checker, base.expression), label);
        inspect(checker.getTypeAtLocation(base), label, allowMethods);
      }
    }
  }

  function inspectClass(node: ts.ClassLikeDeclaration) {
    inspectHeritage(node, node.name?.text ?? 'class');
    for (const member of node.members) {
      if (ts.isConstructorDeclaration(member) || methodLike(member)) {
        inspectCallable(
          member,
          member.name?.getText(source) ?? 'constructor',
          allowMethods
        );
      } else if (ts.isPropertyDeclaration(member)) {
        inspectProperty(member);
      }
    }
  }

  function inspectDeclaration(node: ts.Node) {
    inspectReference(node);
    if (allowMethods && ts.isInterfaceDeclaration(node)) {
      inspect(checker.getTypeAtLocation(node), node.name.text, true);
    }
    if (ts.isClassLike(node)) {
      inspectClass(node);
    }
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isArrowFunction(node) ||
      ts.isFunctionExpression(node)
    ) {
      inspectCallable(node, ('name' in node && node.name?.text) || 'function');
    } else if (methodLike(node) && !ts.isClassLike(node.parent)) {
      inspectCallable(node, node.name.getText(source));
    }
  }

  visit(source, inspectDeclaration);
  return [...issues];
}

function propertyReadSymbol(checker: ts.TypeChecker, node: ts.Node) {
  if (ts.isPropertyAccessExpression(node)) {
    return checker.getSymbolAtLocation(node.name);
  }
  if (
    ts.isElementAccessExpression(node) &&
    ts.isStringLiteralLike(node.argumentExpression)
  ) {
    return checker
      .getTypeAtLocation(node.expression)
      .getProperty(node.argumentExpression.text);
  }
  if (ts.isBindingElement(node) && ts.isObjectBindingPattern(node.parent)) {
    const key = node.propertyName ?? node.name;
    if (ts.isIdentifier(key) || ts.isStringLiteralLike(key)) {
      return checker.getTypeAtLocation(node.parent).getProperty(key.text);
    }
  }
  return undefined;
}

function libraryDeclaration(declaration: ts.Node) {
  return /(?:\/lib\.[^/]+\.d\.ts|\/@types\/node\/.*\.d\.ts)$/.test(
    declaration.getSourceFile().fileName
  );
}

function declarationOwner(declaration: ts.Declaration) {
  const parent = declaration.parent as ts.NamedDeclaration;
  return parent.name && ts.isIdentifier(parent.name) ? parent.name.text : '';
}

function knownFunctionDeclaration(
  checker: ts.TypeChecker,
  declaration: ts.Declaration,
  seen: Set<ts.Symbol>
): boolean {
  let imported: ts.Node | undefined = declaration;
  while (imported && !ts.isImportDeclaration(imported)) {
    imported = imported.parent;
  }
  if (
    imported &&
    ts.isImportDeclaration(imported) &&
    ts.isStringLiteralLike(imported.moduleSpecifier)
  ) {
    return [
      'lodash-es/cloneDeep.js',
      'lodash-es/merge.js',
      'lodash-es/isEqual.js',
    ].includes(imported.moduleSpecifier.text);
  }
  if (ts.isFunctionDeclaration(declaration) && declaration.body) {
    return true;
  }
  if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
    return (
      ts.isArrowFunction(declaration.initializer) ||
      ts.isFunctionExpression(declaration.initializer) ||
      knownFunction(checker, declaration.initializer, seen)
    );
  }
  return false;
}

function knownFunction(
  checker: ts.TypeChecker,
  expression: ts.Expression,
  seen = new Set<ts.Symbol>()
): boolean {
  if (ts.isParenthesizedExpression(expression)) {
    return knownFunction(checker, expression.expression, seen);
  }
  if (!ts.isIdentifier(expression)) {
    return false;
  }
  const symbol = checker.getSymbolAtLocation(expression);
  if (!symbol || seen.has(symbol)) {
    return false;
  }
  seen.add(symbol);
  return Boolean(
    symbol.declarations?.some((declaration) =>
      knownFunctionDeclaration(checker, declaration, seen)
    )
  );
}

const ambientCalls = new Set([
  'fetch',
  'setTimeout',
  'setInterval',
  'setImmediate',
  'clearTimeout',
  'clearInterval',
  'clearImmediate',
  'queueMicrotask',
  'requestAnimationFrame',
  'cancelAnimationFrame',
]);
const browserOwners = new Set(['Window', 'Document', 'Element', 'HTMLElement']);

function ambientRead(checker: ts.TypeChecker, node: ts.Node) {
  const symbol = propertyReadSymbol(checker, node);
  return (
    symbol?.declarations?.flatMap((declaration) => {
      const owner = declarationOwner(declaration);
      return libraryDeclaration(declaration) &&
        (browserOwners.has(owner) ||
          (owner === 'Performance' && symbol.name === 'timeOrigin'))
        ? [`ambient read ${owner}.${symbol.name}`]
        : [];
    }) ?? []
  );
}

function ambientInvocation(
  call: NonNullable<ReturnType<typeof resolvedCall>>,
  node: ts.CallExpression | ts.NewExpression
) {
  const owner = declarationOwner(call.declaration);
  const isAmbient =
    call.file.endsWith('.d.ts') && ambientCalls.has(call.name ?? '');
  if (!libraryDeclaration(call.declaration) && !isAmbient) {
    return undefined;
  }
  const readsClock =
    owner === 'DateConstructor' &&
    (call.name === 'now' ||
      (!call.name && (!ts.isNewExpression(node) || !node.arguments?.length)));
  const readsRandom =
    (owner === 'Math' && call.name === 'random') ||
    (owner === 'Crypto' &&
      ['getRandomValues', 'randomUUID'].includes(call.name ?? ''));
  const readsPerformance = owner === 'Performance' && call.name === 'now';
  const touchesBrowser =
    browserOwners.has(owner) ||
    ['EventTarget', 'AbortController'].includes(owner);
  return readsClock ||
    readsRandom ||
    readsPerformance ||
    touchesBrowser ||
    ambientCalls.has(call.name ?? '')
    ? `effect ${owner}.${call.name ?? 'new'}`
    : undefined;
}

function indirectInvocation(
  call: NonNullable<ReturnType<typeof resolvedCall>>
) {
  if (!libraryDeclaration(call.declaration)) {
    return undefined;
  }
  const parent = call.declaration.parent;
  if (
    ts.isModuleBlock(parent) &&
    ts.isModuleDeclaration(parent.parent) &&
    parent.parent.name.text === 'Reflect' &&
    ['apply', 'construct'].includes(call.name ?? '')
  ) {
    return 'reflective host invocation';
  }
  if (
    ts.isInterfaceDeclaration(parent) &&
    ['Function', 'CallableFunction', 'NewableFunction'].includes(
      parent.name.text
    ) &&
    ['apply', 'call'].includes(call.name ?? '')
  ) {
    return 'indirect host invocation';
  }
  return undefined;
}

function callableInvocation(
  checker: ts.TypeChecker,
  node: ts.CallExpression | ts.NewExpression,
  call: ReturnType<typeof resolvedCall>
) {
  if (!call) {
    return checker.getTypeAtLocation(node.expression).flags &
      (ts.TypeFlags.Any | ts.TypeFlags.Unknown)
      ? 'invocation of opaque data'
      : undefined;
  }
  const declaration = call.declaration;
  if (
    !libraryDeclaration(declaration) &&
    !knownFunction(checker, node.expression) &&
    (ts.isFunctionTypeNode(declaration) ||
      ts.isCallSignatureDeclaration(declaration) ||
      ts.isMethodSignature(declaration))
  ) {
    return 'invocation of supplied callable';
  }
  return undefined;
}

/** Resolve effects by binding, while supplied Dates and math remain data operations. */
export function pureEffectIssues(
  checker: ts.TypeChecker,
  source: ts.SourceFile,
  allowedDataCalls = new Set<ts.Node>()
) {
  const issues: string[] = [];
  const add = (issue: string | undefined) => {
    if (issue) {
      issues.push(`${source.fileName}: ${issue}`);
    }
  };
  visit(source, (node) => {
    ambientRead(checker, node).forEach(add);
    if (!ts.isCallExpression(node) && !ts.isNewExpression(node)) {
      return;
    }
    const call = resolvedCall(checker, node);
    if (call) {
      add(ambientInvocation(call, node));
    }
    if (allowedDataCalls.has(node)) {
      return;
    }
    if (call) {
      add(indirectInvocation(call));
      if (/\/uuid\.[tj]s$/.test(call.file)) {
        add('UUID allocation');
      }
    }
    add(callableInvocation(checker, node, call));
  });
  return issues;
}

function compactNode(node: ts.Node) {
  return node.getText().replace(/\s/g, '');
}

function builtInOperation(
  checker: ts.TypeChecker,
  node: ts.CallExpression | ts.NewExpression,
  owner: string,
  name: string
) {
  const call = resolvedCall(checker, node);
  return Boolean(
    call &&
    libraryDeclaration(call.declaration) &&
    declarationOwner(call.declaration) === owner &&
    call.name === name
  );
}

function globalBuiltIn(
  checker: ts.TypeChecker,
  node: ts.Node,
  names: string[]
) {
  if (!ts.isIdentifier(node) || !names.includes(node.text)) {
    return false;
  }
  return Boolean(
    checker.getSymbolAtLocation(node)?.declarations?.some(libraryDeclaration)
  );
}

function builtInPrototype(
  checker: ts.TypeChecker,
  node: ts.Node | undefined,
  names: string[]
) {
  return (
    Boolean(node) &&
    ts.isPropertyAccessExpression(node) &&
    node.name.text === 'prototype' &&
    globalBuiltIn(checker, node.expression, names)
  );
}

function constantInitializer(checker: ts.TypeChecker, node: ts.Node) {
  const declaration = checker.getSymbolAtLocation(node)?.valueDeclaration;
  return declaration &&
    ts.isVariableDeclaration(declaration) &&
    ts.isVariableDeclarationList(declaration.parent) &&
    declaration.parent.flags & ts.NodeFlags.Const
    ? declaration.initializer
    : undefined;
}

function parentMatching<T extends ts.Node>(
  node: ts.Node,
  matches: (parent: ts.Node) => parent is T
): T | undefined {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (matches(parent)) {
      return parent;
    }
  }
  return undefined;
}

function trueBranch(node: ts.Node) {
  for (
    let child = node, parent = node.parent;
    parent;
    child = parent, parent = parent.parent
  ) {
    if (ts.isIfStatement(parent) && parent.thenStatement === child) {
      return parent;
    }
  }
  return undefined;
}

function deferredSnapshotCall(
  checker: ts.TypeChecker,
  node: ts.CallExpression | ts.NewExpression
) {
  const call = resolvedCall(checker, node);
  if (!call || indirectInvocation(call) !== 'reflective host invocation') {
    return false;
  }
  const fn = parentMatching(
    node,
    (parent): parent is ts.ArrowFunction | ts.FunctionExpression =>
      ts.isArrowFunction(parent) || ts.isFunctionExpression(parent)
  );
  const property = fn?.parent;
  if (
    !property ||
    !ts.isPropertyAssignment(property) ||
    !ts.isObjectLiteralExpression(property.parent)
  ) {
    return false;
  }
  const container = property.parent.parent;
  if (ts.isNewExpression(container)) {
    return (
      globalBuiltIn(checker, container.expression, ['Proxy']) &&
      container.arguments?.[1] === property.parent &&
      ['apply', 'construct'].includes(property.name.getText()) &&
      compactNode(container.arguments[0]) ===
        'Function.prototype.bind.call(bindingTarget,undefined)'
    );
  }
  return (
    ts.isCallExpression(container) &&
    builtInOperation(
      checker,
      container,
      'ObjectConstructor',
      'defineProperty'
    ) &&
    compactNode(container.arguments[0]) === 'owned' &&
    compactNode(container.arguments[1]) === 'Symbol.hasInstance' &&
    property.name.getText() === 'value'
  );
}

function intrinsicFunctionCall(
  checker: ts.TypeChecker,
  node: ts.CallExpression | ts.NewExpression
) {
  if (
    !ts.isCallExpression(node) ||
    !ts.isPropertyAccessExpression(node.expression) ||
    node.expression.name.text !== 'call'
  ) {
    return false;
  }
  const method = node.expression.expression;
  if (!ts.isPropertyAccessExpression(method)) {
    return false;
  }
  if (builtInPrototype(checker, method.expression, ['Object'])) {
    return ['hasOwnProperty', 'toString'].includes(method.name.text);
  }
  if (!builtInPrototype(checker, method.expression, ['Function'])) {
    return false;
  }
  return (
    method.name.text === 'toString' ||
    (method.name.text === 'bind' &&
      compactNode(node) ===
        'Function.prototype.bind.call(bindingTarget,undefined)')
  );
}

function onlyBufferConstructors(
  checker: ts.TypeChecker,
  node: ts.Expression
): boolean {
  if (ts.isConditionalExpression(node)) {
    return (
      onlyBufferConstructors(checker, node.whenTrue) &&
      onlyBufferConstructors(checker, node.whenFalse)
    );
  }
  return (
    ts.isArrayLiteralExpression(node) &&
    node.elements.length > 0 &&
    node.elements.every((element) =>
      globalBuiltIn(checker, element, ['ArrayBuffer', 'SharedArrayBuffer'])
    )
  );
}

function bufferConstructor(checker: ts.TypeChecker, node: ts.Node) {
  const declaration = checker.getSymbolAtLocation(node)?.valueDeclaration;
  if (
    !declaration ||
    !ts.isVariableDeclaration(declaration) ||
    !ts.isVariableDeclarationList(declaration.parent) ||
    !ts.isForOfStatement(declaration.parent.parent)
  ) {
    return false;
  }
  const values = constantInitializer(
    checker,
    declaration.parent.parent.expression
  );
  return Boolean(values && onlyBufferConstructors(checker, values));
}

function bufferPrototype(checker: ts.TypeChecker, node: ts.Node) {
  if (builtInPrototype(checker, node, ['DataView'])) {
    return true;
  }
  const initializer = constantInitializer(checker, node);
  return Boolean(
    initializer &&
    ts.isPropertyAccessExpression(initializer) &&
    initializer.name.text === 'prototype' &&
    bufferConstructor(checker, initializer.expression)
  );
}

function intrinsicBufferKey(node: ts.Expression): boolean {
  if (ts.isConditionalExpression(node)) {
    return (
      intrinsicBufferKey(node.whenTrue) && intrinsicBufferKey(node.whenFalse)
    );
  }
  return (
    ts.isStringLiteralLike(node) &&
    ['byteLength', 'maxByteLength', 'resizable', 'growable'].includes(node.text)
  );
}

function intrinsicGetterCall(
  checker: ts.TypeChecker,
  node: ts.CallExpression | ts.NewExpression
) {
  if (
    !ts.isCallExpression(node) ||
    !ts.isPropertyAccessExpression(node.expression) ||
    node.expression.name.text !== 'call'
  ) {
    return false;
  }
  const getter = node.expression.expression;
  if (
    !ts.isPropertyAccessExpression(getter) ||
    getter.name.text !== 'get' ||
    !ts.isCallExpression(getter.expression)
  ) {
    return false;
  }
  const descriptor = getter.expression;
  return (
    builtInOperation(
      checker,
      descriptor,
      'ObjectConstructor',
      'getOwnPropertyDescriptor'
    ) &&
    descriptor.arguments.length === 2 &&
    bufferPrototype(checker, descriptor.arguments[0]) &&
    intrinsicBufferKey(descriptor.arguments[1])
  );
}

function privateCollectionProbe(
  checker: ts.TypeChecker,
  source: ts.SourceFile,
  declaration: ts.FunctionDeclaration
) {
  if (
    !declaration.name ||
    declaration.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
    )
  ) {
    return false;
  }
  const symbol = checker.getSymbolAtLocation(declaration.name);
  let seen = false;
  let safe = true;
  visit(source, (node) => {
    if (
      !ts.isIdentifier(node) ||
      node === declaration.name ||
      checker.getSymbolAtLocation(node) !== symbol
    ) {
      return;
    }
    seen = true;
    const parent = node.parent;
    safe &&=
      ts.isCallExpression(parent) &&
      parent.expression === node &&
      parent.arguments.length === 2 &&
      builtInPrototype(checker, parent.arguments[1], ['Map', 'Set']);
  });
  return seen && safe;
}

function intrinsicCollectionCall(
  checker: ts.TypeChecker,
  source: ts.SourceFile,
  node: ts.CallExpression | ts.NewExpression
) {
  if (
    !ts.isCallExpression(node) ||
    !ts.isPropertyAccessExpression(node.expression) ||
    node.expression.name.text !== 'call'
  ) {
    return false;
  }
  const method = node.expression.expression;
  if (!ts.isPropertyAccessExpression(method) || method.name.text !== 'has') {
    return false;
  }
  const parameter = checker.getSymbolAtLocation(
    method.expression
  )?.valueDeclaration;
  return Boolean(
    parameter &&
    ts.isParameter(parameter) &&
    ts.isFunctionDeclaration(parameter.parent) &&
    parameter.parent.parameters[1] === parameter &&
    privateCollectionProbe(checker, source, parameter.parent)
  );
}

function isAssignmentTo(
  checker: ts.TypeChecker,
  node: ts.Node,
  symbol: ts.Symbol | undefined
): node is ts.BinaryExpression {
  return (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
    node.operatorToken.kind <= ts.SyntaxKind.LastAssignment &&
    checker.getSymbolAtLocation(node.left) === symbol
  );
}

function writesStayInAllocation(
  checker: ts.TypeChecker,
  source: ts.SourceFile,
  owned: ts.Symbol,
  allocation: ts.IfStatement
) {
  let region: ts.Node = allocation;
  for (
    let parent = region.parent;
    parent && !ts.isFunctionLike(parent);
    parent = parent.parent
  ) {
    if (ts.isIfStatement(parent)) {
      region = parent;
    }
  }
  let safe = true;
  visit(source, (node) => {
    if (!isAssignmentTo(checker, node, owned)) {
      return;
    }
    let parent: ts.Node | undefined = node;
    while (parent && parent !== region) {
      parent = parent.parent;
    }
    safe &&= parent === region;
  });
  return safe;
}

function collectionAllocation(
  checker: ts.TypeChecker,
  source: ts.SourceFile,
  flag: ts.Symbol,
  owned: ts.Symbol,
  kind: string
) {
  const writes: ts.BinaryExpression[] = [];
  visit(source, (node) => {
    if (isAssignmentTo(checker, node, flag)) {
      writes.push(node);
    }
  });
  if (
    writes.length !== 1 ||
    writes[0].right.kind !== ts.SyntaxKind.TrueKeyword
  ) {
    return false;
  }
  const block = writes[0].parent.parent;
  if (
    !ts.isBlock(block) ||
    block.statements.length !== 2 ||
    !ts.isIfStatement(block.parent) ||
    block.parent.thenStatement !== block
  ) {
    return false;
  }
  const allocation = block.statements[0];
  if (
    !ts.isExpressionStatement(allocation) ||
    !isAssignmentTo(checker, allocation.expression, owned)
  ) {
    return false;
  }
  const value = allocation.expression.right;
  const condition = block.parent.expression;
  if (
    !ts.isNewExpression(value) ||
    !globalBuiltIn(checker, value.expression, [kind]) ||
    !ts.isCallExpression(condition) ||
    !builtInPrototype(checker, condition.arguments[1], [kind])
  ) {
    return false;
  }
  const declaration = checker.getResolvedSignature(condition)?.declaration;
  return Boolean(
    declaration &&
    ts.isFunctionDeclaration(declaration) &&
    privateCollectionProbe(checker, source, declaration) &&
    writesStayInAllocation(checker, source, owned, block.parent)
  );
}

function ownedCollectionCall(
  checker: ts.TypeChecker,
  source: ts.SourceFile,
  node: ts.CallExpression | ts.NewExpression
) {
  if (
    !ts.isCallExpression(node) ||
    !ts.isPropertyAccessExpression(node.expression)
  ) {
    return false;
  }
  const kind =
    node.expression.name.text === 'set'
      ? 'Map'
      : node.expression.name.text === 'add'
        ? 'Set'
        : undefined;
  const branch = trueBranch(node);
  if (!kind || !branch || !ts.isIdentifier(branch.expression)) {
    return false;
  }
  const flag = checker.getSymbolAtLocation(branch.expression);
  const owned = checker.getSymbolAtLocation(node.expression.expression);
  const declaration = flag?.valueDeclaration;
  return Boolean(
    flag &&
    owned &&
    declaration &&
    ts.isVariableDeclaration(declaration) &&
    declaration.initializer?.kind === ts.SyntaxKind.FalseKeyword &&
    collectionAllocation(checker, source, flag, owned, kind)
  );
}

function dataViewConstructor(
  checker: ts.TypeChecker,
  node: ts.CallExpression | ts.NewExpression
) {
  if (
    !ts.isNewExpression(node) ||
    compactNode(node.expression) !== '(value.constructorasany)'
  ) {
    return false;
  }
  const branch = trueBranch(node);
  const cast = (node.expression as ts.ParenthesizedExpression)
    .expression as ts.AsExpression;
  const target = (cast.expression as ts.PropertyAccessExpression).expression;
  return Boolean(
    branch &&
    ts.isCallExpression(branch.expression) &&
    builtInOperation(
      checker,
      branch.expression,
      'ArrayBufferConstructor',
      'isView'
    ) &&
    checker.getSymbolAtLocation(branch.expression.arguments[0]) ===
      checker.getSymbolAtLocation(target)
  );
}

function ownedBufferConstruction(
  checker: ts.TypeChecker,
  node: ts.CallExpression | ts.NewExpression
) {
  const call = resolvedCall(checker, node);
  return Boolean(
    call &&
    indirectInvocation(call) === 'reflective host invocation' &&
    call.name === 'construct' &&
    node.arguments?.[0] &&
    bufferConstructor(checker, node.arguments[0])
  );
}

/** Allow only intrinsic data operations and the returned callable's deferred traps. */
export function snapshotDataCalls(
  checker: ts.TypeChecker,
  source: ts.SourceFile
) {
  const allowed = new Set<ts.Node>();
  visit(source, (node) => {
    if (!ts.isCallExpression(node) && !ts.isNewExpression(node)) {
      return;
    }
    if (
      deferredSnapshotCall(checker, node) ||
      intrinsicFunctionCall(checker, node) ||
      intrinsicGetterCall(checker, node) ||
      intrinsicCollectionCall(checker, source, node) ||
      ownedCollectionCall(checker, source, node) ||
      dataViewConstructor(checker, node) ||
      ownedBufferConstruction(checker, node)
    ) {
      allowed.add(node);
    }
  });
  return allowed;
}

export function callsIn(checker: ts.TypeChecker, sources: ts.SourceFile[]) {
  const calls: Array<{
    node: ts.CallExpression | ts.NewExpression;
    source: ts.SourceFile;
    file: string;
    name: string | undefined;
  }> = [];
  for (const source of sources) {
    visit(source, (node) => {
      if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
        const resolved = resolvedCall(checker, node);
        if (resolved) {
          calls.push({
            node,
            source,
            file: resolved.file,
            name: resolved.name,
          });
        }
      }
    });
  }
  return calls;
}

/** Boot view closures may dispatch only a resolved action creator, never a raw action. */
export function isRawStoreDispatch(
  checker: ts.TypeChecker,
  node: ts.CallExpression,
  storeFile: string,
  actionsFile: string
) {
  const signature = checker.getResolvedSignature(node)?.declaration;
  if (!signature || signature.getSourceFile().fileName !== storeFile) {
    return false;
  }
  const parent = signature.parent as ts.NamedDeclaration;
  const parentName =
    parent.name && ts.isIdentifier(parent.name) ? parent.name.text : '';
  if (
    declarationName(signature) !== 'dispatch' &&
    parentName !== 'DispatchFunction'
  ) {
    return false;
  }
  const argument = node.arguments[0];
  return (
    node.arguments.length !== 1 ||
    !argument ||
    !ts.isCallExpression(argument) ||
    checker.getResolvedSignature(argument)?.declaration?.getSourceFile()
      .fileName !== actionsFile
  );
}

export function viewCapabilityReads(
  checker: ts.TypeChecker,
  source: ts.SourceFile,
  managerFile: string,
  names: Set<string>
) {
  const issues: string[] = [];
  visit(source, (node) => {
    const symbol = propertyReadSymbol(checker, node);
    if (
      names.has(symbol?.name ?? '') &&
      symbol?.declarations?.some(
        (d) => d.getSourceFile().fileName === managerFile
      )
    ) {
      issues.push(`${source.fileName}: ${symbol.name}`);
    }
  });
  return issues;
}
