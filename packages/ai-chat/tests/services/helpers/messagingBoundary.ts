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
