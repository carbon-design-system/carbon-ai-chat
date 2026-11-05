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
        if (argument && ts.isStringLiteral(argument)) {
          add(argument.text);
        } else {
          issues.push(`${file}: nonliteral dynamic import`);
        }
      }
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'require' &&
        !bindings.getSymbolAtLocation(node.expression)?.declarations?.length
      ) {
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

/** Check data surfaces by resolved type, including mapped-type inputs. */
export function capabilityIssues(
  checker: ts.TypeChecker,
  source: ts.SourceFile,
  dataLeaves: Set<ts.Symbol>,
  allowMethods = false
) {
  const issues = new Set<string>();
  const checked = new Set<ts.Type>();
  const checkedOrigins = new Set<ts.Symbol>();
  const sensitive = (symbol: ts.Symbol | undefined) =>
    symbol?.declarations?.some((d) => {
      const file = d.getSourceFile().fileName.replaceAll('\\', '/');
      return (
        /\/(?:ServiceManager|ChatInstance|ChatInstanceService|appStore|AppState|PublicConfig)\.[^/]+$/.test(
          file
        ) ||
        (/\/lib\.[^/]+\.d\.ts$/.test(file) &&
          [
            'Promise',
            'AbortController',
            'AbortSignal',
            'Window',
            'Document',
            'HTMLElement',
          ].includes(declarationName(d) ?? ''))
      );
    });
  const inspect = (type: ts.Type, label: string, methodContainer = false) => {
    if (checked.has(type)) {
      return;
    }
    checked.add(type);
    for (const symbol of [type.symbol, type.aliasSymbol]) {
      if (!symbol || checkedOrigins.has(symbol) || dataLeaves.has(symbol)) {
        continue;
      }
      checkedOrigins.add(symbol);
      for (const d of symbol.declarations ?? []) {
        if (ts.isTypeAliasDeclaration(d)) {
          visit(d.type, (node) => {
            if (ts.isTypeReferenceNode(node) || ts.isImportTypeNode(node)) {
              inspect(checker.getTypeAtLocation(node), label);
            }
          });
        }
      }
    }
    if (sensitive(type.symbol) || sensitive(type.aliasSymbol)) {
      issues.add(`${label}: effect capability`);
      return;
    }
    if (dataLeaves.has(type.symbol) || dataLeaves.has(type.aliasSymbol)) {
      return;
    }
    const args = [
      ...(type.aliasTypeArguments ?? []),
      ...(type.flags & ts.TypeFlags.Object
        ? checker.getTypeArguments(type as ts.TypeReference)
        : []),
    ];
    for (const arg of args) {
      inspect(arg, label);
    }
    const wrapper = type.aliasSymbol;
    if (
      wrapper &&
      args.length &&
      wrapper.declarations?.every((d) =>
        /(?:\/lib\.[^/]+\.d\.ts|\/types\/utilities\/DeepPartial(?:\.d)?\.ts)$/.test(
          d.getSourceFile().fileName
        )
      )
    ) {
      return;
    }
    if (type.isUnionOrIntersection()) {
      type.types.forEach((t) => inspect(t, label));
      return;
    }
    if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) {
      issues.add(`${label}: unscoped opaque type`);
      return;
    }
    const declarations = type.symbol?.declarations ?? [];
    const library =
      declarations.length &&
      declarations.every((d) =>
        /\/lib\.[^/]+\.d\.ts$/.test(d.getSourceFile().fileName)
      );
    if (
      library &&
      [
        'Array',
        'ReadonlyArray',
        'Map',
        'ReadonlyMap',
        'Set',
        'ReadonlySet',
        'Date',
      ].includes(type.symbol.name)
    ) {
      return;
    }
    if (
      type.getCallSignatures().length ||
      type.getConstructSignatures().length
    ) {
      issues.add(`${label}: callback capability`);
      return;
    }
    if (!(type.flags & ts.TypeFlags.Object)) {
      return;
    }
    for (const index of checker.getIndexInfosOfType(type)) {
      inspect(index.type, label + ' indexed value');
    }
    for (const property of checker.getPropertiesOfType(type)) {
      const d = property.valueDeclaration ?? property.declarations?.[0];
      if (!d) {
        continue;
      }
      const propertyType = checker.getTypeOfSymbolAtLocation(property, d);
      if (
        methodContainer &&
        (ts.isMethodSignature(d) || ts.isMethodDeclaration(d))
      ) {
        for (const sig of propertyType.getCallSignatures()) {
          for (const param of sig.getParameters()) {
            inspect(
              checker.getTypeOfSymbolAtLocation(param, d),
              `${label}.${property.name} argument`
            );
          }
          inspect(sig.getReturnType(), `${label}.${property.name} result`);
        }
      } else {
        inspect(propertyType, `${label}.${property.name}`);
      }
    }
  };
  // Explicit references catch a Pick that erases the sensitive part of its source.
  visit(source, (node) => {
    if (ts.isTypeReferenceNode(node) || ts.isImportTypeNode(node)) {
      const t = checker.getTypeAtLocation(node);
      if (sensitive(t.symbol) || sensitive(t.aliasSymbol)) {
        issues.add(`${node.getText(source)}: effect type origin`);
      }
    }
    if (allowMethods && ts.isInterfaceDeclaration(node)) {
      inspect(checker.getTypeAtLocation(node), node.name.text, true);
    }
    if (ts.isClassDeclaration(node)) {
      for (const member of node.members) {
        if (
          ts.isConstructorDeclaration(member) ||
          ts.isMethodDeclaration(member)
        ) {
          member.parameters.forEach((p) =>
            inspect(
              checker.getTypeAtLocation(p),
              p.name.getText(source),
              allowMethods
            )
          );
          if (ts.isMethodDeclaration(member)) {
            const sig = checker.getSignatureFromDeclaration(member);
            if (sig) {
              inspect(
                sig.getReturnType(),
                member.name.getText(source) + ' result'
              );
            }
          }
        } else if (ts.isPropertyDeclaration(member)) {
          let symbol =
            member.initializer && ts.isIdentifier(member.initializer)
              ? checker.getSymbolAtLocation(member.initializer)
              : undefined;
          if (symbol && symbol.flags & ts.SymbolFlags.Alias) {
            symbol = checker.getAliasedSymbol(symbol);
          }
          if (symbol?.declarations?.every(ts.isFunctionDeclaration)) {
            const type = checker.getTypeAtLocation(member);
            for (const sig of type.getCallSignatures()) {
              for (const param of sig.getParameters()) {
                inspect(
                  checker.getTypeOfSymbolAtLocation(param, member),
                  member.name.getText(source) + ' argument'
                );
              }
              inspect(
                sig.getReturnType(),
                member.name.getText(source) + ' result'
              );
            }
          } else {
            inspect(
              checker.getTypeAtLocation(member),
              member.name.getText(source),
              allowMethods
            );
          }
        }
      }
    }
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isArrowFunction(node) ||
      ts.isFunctionExpression(node)
    ) {
      node.parameters.forEach((p) =>
        inspect(checker.getTypeAtLocation(p), p.name.getText(source))
      );
      const sig = checker.getSignatureFromDeclaration(node);
      if (sig) {
        inspect(
          sig.getReturnType(),
          (('name' in node && node.name?.text) || 'function') + ' result'
        );
      }
    }
  });
  return [...issues];
}

/** Resolve calls to built-in declarations; supplied Date methods are data operations. */
export function pureEffectIssues(
  checker: ts.TypeChecker,
  source: ts.SourceFile,
  allowedDataCalls = new Set<ts.Node>()
) {
  const issues: string[] = [];
  const knownFunction = (
    expression: ts.Expression,
    seen = new Set<ts.Symbol>()
  ): boolean => {
    if (ts.isParenthesizedExpression(expression)) {
      return knownFunction(expression.expression, seen);
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
      symbol.declarations?.some((d) => {
        let imported: ts.Node | undefined = d;
        while (imported && !ts.isImportDeclaration(imported)) {
          imported = imported.parent;
        }
        if (
          imported &&
          ts.isImportDeclaration(imported) &&
          ts.isStringLiteral(imported.moduleSpecifier) &&
          [
            'lodash-es/cloneDeep.js',
            'lodash-es/isEqual.js',
            'lodash-es/merge.js',
          ].includes(imported.moduleSpecifier.text)
        ) {
          return true;
        }
        if (ts.isFunctionDeclaration(d) && d.body) {
          return true;
        }
        if (ts.isVariableDeclaration(d) && d.initializer) {
          return (
            ts.isArrowFunction(d.initializer) ||
            ts.isFunctionExpression(d.initializer) ||
            knownFunction(d.initializer, seen)
          );
        }
        return false;
      })
    );
  };
  visit(source, (node) => {
    if (ts.isPropertyAccessExpression(node)) {
      const symbol = checker.getSymbolAtLocation(node.name);
      for (const d of symbol?.declarations ?? []) {
        const file = d.getSourceFile().fileName;
        const parent = d.parent as ts.NamedDeclaration;
        const owner =
          parent.name && ts.isIdentifier(parent.name) ? parent.name.text : '';
        if (
          /\/lib\.[^/]+\.d\.ts$/.test(file) &&
          (['Window', 'Document', 'Element', 'HTMLElement'].includes(owner) ||
            (owner === 'Performance' && node.name.text === 'timeOrigin'))
        ) {
          issues.push(
            `${source.fileName}: ambient read ${owner}.${node.name.text}`
          );
        }
      }
    }
    if (!ts.isCallExpression(node) && !ts.isNewExpression(node)) {
      return;
    }
    const call = resolvedCall(checker, node);
    const lib =
      call &&
      /(?:\/lib\.[^/]+\.d\.ts|\/@types\/node\/.*\.d\.ts)$/.test(call.file);
    const ambientEffect =
      call &&
      call.file.endsWith('.d.ts') &&
      [
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
      ].includes(call.name ?? '');
    if (lib || ambientEffect) {
      const parent = call.declaration.parent as ts.NamedDeclaration;
      const owner =
        parent.name && ts.isIdentifier(parent.name) ? parent.name.text : '';
      if (
        (owner === 'DateConstructor' &&
          (call.name === 'now' ||
            (!call.name &&
              (!ts.isNewExpression(node) || !node.arguments?.length)))) ||
        (owner === 'Math' && call.name === 'random') ||
        (owner === 'Performance' && call.name === 'now') ||
        (owner === 'Crypto' &&
          ['getRandomValues', 'randomUUID'].includes(call.name ?? '')) ||
        [
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
        ].includes(call.name ?? '') ||
        [
          'Window',
          'Document',
          'Element',
          'HTMLElement',
          'EventTarget',
          'AbortController',
        ].includes(owner)
      ) {
        issues.push(
          `${source.fileName}: effect ${owner}.${call.name ?? 'new'}`
        );
      }
    }
    if (allowedDataCalls.has(node)) {
      return;
    }
    if (
      call &&
      lib &&
      ts.isModuleBlock(call.declaration.parent) &&
      ts.isModuleDeclaration(call.declaration.parent.parent) &&
      call.declaration.parent.parent.name.text === 'Reflect' &&
      ['apply', 'construct'].includes(call.name ?? '')
    ) {
      issues.push(`${source.fileName}: reflective host invocation`);
    }
    if (
      call &&
      lib &&
      ts.isInterfaceDeclaration(call.declaration.parent) &&
      ['Function', 'CallableFunction', 'NewableFunction'].includes(
        call.declaration.parent.name.text
      ) &&
      ['apply', 'call'].includes(call.name ?? '')
    ) {
      issues.push(`${source.fileName}: indirect host invocation`);
    }
    if (
      call &&
      !lib &&
      !knownFunction(node.expression) &&
      (ts.isFunctionTypeNode(call.declaration) ||
        ts.isCallSignatureDeclaration(call.declaration) ||
        ts.isMethodSignature(call.declaration))
    ) {
      issues.push(`${source.fileName}: invocation of supplied callable`);
    }
    if (call && /\/uuid\.[tj]s$/.test(call.file)) {
      issues.push(`${source.fileName}: UUID allocation`);
    }
    // An opaque host value is valid data, but invoking it is not processor work.
    if (
      !call &&
      checker.getTypeAtLocation(node.expression).flags &
        (ts.TypeFlags.Any | ts.TypeFlags.Unknown)
    ) {
      issues.push(`${source.fileName}: invocation of opaque data`);
    }
  });
  return issues;
}

/** Exact deferred callable-data seams in the native snapshot copier, not a file exemption. */
export function snapshotDataCalls(
  checker: ts.TypeChecker,
  source: ts.SourceFile
) {
  const allowed = new Set<ts.Node>();
  const compact = (node: ts.Node) => node.getText(source).replace(/\s/g, '');
  const builtIn = (
    node: ts.CallExpression | ts.NewExpression,
    name: string
  ) => {
    const call = resolvedCall(checker, node);
    return call?.name === name && /\/lib\.[^/]+\.d\.ts$/.test(call.file);
  };
  const withinBranch = (node: ts.Node, condition: string) => {
    for (
      let child = node, parent = node.parent;
      parent;
      child = parent, parent = parent.parent
    ) {
      if (
        ts.isIfStatement(parent) &&
        parent.thenStatement === child &&
        compact(parent.expression) === condition
      ) {
        return true;
      }
    }
    return false;
  };
  // A collection flag is a type guard only when every assignment directly follows creating that collection.
  const flagGuards = (flag: string, collection: string) => {
    let marked = false;
    let exact = true;
    visit(source, (node) => {
      if (
        !ts.isBinaryExpression(node) ||
        node.operatorToken.kind !== ts.SyntaxKind.EqualsToken ||
        compact(node.left) !== flag
      ) {
        return;
      }
      const statement = node.parent;
      const block = statement.parent;
      const previous =
        ts.isExpressionStatement(statement) && ts.isBlock(block)
          ? block.statements[block.statements.indexOf(statement) - 1]
          : undefined;
      if (
        compact(node.right) === 'true' &&
        previous &&
        compact(previous) === `owned=new${collection}();`
      ) {
        marked = true;
      } else {
        exact = false;
      }
    });
    return marked && exact;
  };
  const initializer = (node: ts.Node | undefined) => {
    const symbol = node && checker.getSymbolAtLocation(node);
    const declaration = symbol?.valueDeclaration;
    return declaration && ts.isVariableDeclaration(declaration)
      ? declaration
      : undefined;
  };
  // The copier's buffer loop visits exactly the built-in buffer constructors.
  const bufferConstructor = (node: ts.Node | undefined) => {
    const declaration = initializer(node);
    const loop = declaration?.parent.parent;
    return Boolean(
      loop &&
      ts.isForOfStatement(loop) &&
      compact(initializer(loop.expression)?.initializer ?? loop) ===
        "typeofSharedArrayBuffer==='undefined'?[ArrayBuffer]:[ArrayBuffer,SharedArrayBuffer]"
    );
  };
  const bufferPrototype = (node: ts.Node | undefined) => {
    const value = initializer(node)?.initializer;
    return Boolean(
      value &&
      ts.isPropertyAccessExpression(value) &&
      value.name.text === 'prototype' &&
      bufferConstructor(value.expression)
    );
  };
  const slotGetters = new Set([
    "Object.getOwnPropertyDescriptor(prototype,'byteLength').get.call",
    "Object.getOwnPropertyDescriptor(prototype,BufferConstructor===ArrayBuffer?'resizable':'growable')?.get.call",
    "Object.getOwnPropertyDescriptor(prototype,'maxByteLength').get.call",
  ]);
  const descriptorTarget = (node: ts.CallExpression) => {
    let expression: ts.Expression = node.expression;
    while (ts.isPropertyAccessExpression(expression)) {
      expression = expression.expression;
    }
    return ts.isCallExpression(expression)
      ? expression.arguments[0]
      : undefined;
  };
  // isCollection is a brand check only when every use passes a built-in collection prototype.
  const collectionUses: ts.Node[] = [];
  visit(source, (node) => {
    if (
      ts.isIdentifier(node) &&
      node.text === 'isCollection' &&
      !ts.isFunctionDeclaration(node.parent)
    ) {
      collectionUses.push(node);
    }
  });
  const collectionPrototypes =
    collectionUses.length > 0 &&
    collectionUses.every(
      (use) =>
        ts.isCallExpression(use.parent) &&
        use.parent.expression === use &&
        ['Map.prototype', 'Set.prototype'].includes(
          compact(use.parent.arguments[1])
        )
    );
  const mapGuard = flagGuards('map', 'Map');
  const setGuard = flagGuards('set', 'Set');
  visit(source, (node) => {
    if (!ts.isCallExpression(node) && !ts.isNewExpression(node)) {
      return;
    }
    const call = resolvedCall(checker, node);
    if (
      call &&
      /\/lib\.[^/]+\.d\.ts$/.test(call.file) &&
      ts.isModuleBlock(call.declaration.parent) &&
      ts.isModuleDeclaration(call.declaration.parent.parent) &&
      call.declaration.parent.parent.name.text === 'Reflect' &&
      ['apply', 'construct'].includes(call.name ?? '')
    ) {
      for (let parent = node.parent; parent; parent = parent.parent) {
        if (!ts.isArrowFunction(parent) && !ts.isFunctionExpression(parent)) {
          continue;
        }
        const property = parent.parent;
        if (
          !ts.isPropertyAssignment(property) ||
          !ts.isObjectLiteralExpression(property.parent)
        ) {
          break;
        }
        const container = property.parent.parent;
        // Proxy apply/construct traps execute only when the returned callable is used.
        if (
          ts.isNewExpression(container) &&
          container.expression.getText(source) === 'Proxy' &&
          container.arguments?.[1] === property.parent &&
          ['apply', 'construct'].includes(property.name.getText(source)) &&
          compact(container.arguments[0]) ===
            'Function.prototype.bind.call(bindingTarget,undefined)'
        ) {
          const signature =
            checker.getResolvedSignature(container)?.declaration;
          if (
            signature &&
            /\/lib\.[^/]+\.d\.ts$/.test(signature.getSourceFile().fileName)
          ) {
            allowed.add(node);
          }
        }
        // Object.defineProperty stores this function; snapshot creation does not invoke it.
        if (
          ts.isCallExpression(container) &&
          builtIn(container, 'defineProperty') &&
          compact(container.expression) === 'Object.defineProperty' &&
          compact(container.arguments[0]) === 'owned' &&
          compact(container.arguments[1]) === 'Symbol.hasInstance' &&
          property.name.getText(source) === 'value'
        ) {
          allowed.add(node);
        }
        break;
      }
    }
    // Binding creates callable data without invoking the target. Its get trap remains checked.
    if (
      ts.isCallExpression(node) &&
      builtIn(node, 'call') &&
      compact(node) === 'Function.prototype.bind.call(bindingTarget,undefined)'
    ) {
      allowed.add(node);
    }
    // Intrinsic object inspection does not invoke an opaque callable value.
    if (
      ts.isCallExpression(node) &&
      builtIn(node, 'call') &&
      [
        'Object.prototype.hasOwnProperty.call',
        'Object.prototype.toString.call',
        'Function.prototype.toString.call',
      ].includes(compact(node.expression))
    ) {
      allowed.add(node);
    }
    // Built-in brand checks and slot getters read an internal slot or throw; they never run host code.
    if (
      ts.isCallExpression(node) &&
      builtIn(node, 'call') &&
      ((compact(node.expression) === 'prototype.has.call' &&
        collectionPrototypes) ||
        (slotGetters.has(compact(node.expression)) &&
          bufferPrototype(descriptorTarget(node))) ||
        compact(node.expression) ===
          "Object.getOwnPropertyDescriptor(DataView.prototype,'byteLength').get.call")
    ) {
      allowed.add(node);
    }
    if (
      ts.isCallExpression(node) &&
      builtIn(node, 'construct') &&
      compact(node.expression) === 'Reflect.construct' &&
      bufferConstructor(node.arguments[0])
    ) {
      allowed.add(node);
    }
    // Existing data allocation/mutation on owned values, under their exact type guards.
    if (
      ts.isNewExpression(node) &&
      compact(node.expression) === '(value.constructorasany)' &&
      withinBranch(node, 'ArrayBuffer.isView(value)')
    ) {
      allowed.add(node);
    }
    if (
      ts.isCallExpression(node) &&
      ((compact(node) === 'owned.set(copy(key),copy(entry))' &&
        mapGuard &&
        withinBranch(node, 'map')) ||
        (compact(node) === 'owned.add(copy(entry))' &&
          setGuard &&
          withinBranch(node, 'set')))
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
    let symbol: ts.Symbol | undefined;
    if (ts.isPropertyAccessExpression(node)) {
      symbol = checker.getSymbolAtLocation(node.name);
    } else if (
      ts.isElementAccessExpression(node) &&
      ts.isStringLiteral(node.argumentExpression)
    ) {
      symbol = checker
        .getTypeAtLocation(node.expression)
        .getProperty(node.argumentExpression.text);
    } else if (
      ts.isBindingElement(node) &&
      ts.isObjectBindingPattern(node.parent) &&
      ts.isVariableDeclaration(node.parent.parent) &&
      node.parent.parent.initializer
    ) {
      const key = node.propertyName ?? node.name;
      if (ts.isIdentifier(key) || ts.isStringLiteral(key)) {
        symbol = checker
          .getTypeAtLocation(node.parent.parent.initializer)
          .getProperty(key.text);
      }
    }
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
