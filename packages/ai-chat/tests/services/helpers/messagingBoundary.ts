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
        inspect(checker.getTypeAtLocation(base), label);
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
