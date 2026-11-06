/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import path from 'node:path';
import ts from 'typescript';

/** The interfaces whose fields are the conversation partition's top level. */
const ROOTS = new Set(['ConversationState', 'AppStateMessages']);

/** Top-level fields that hold config, not conversation data. */
const NOT_DATA = new Set(['config', 'languagePack']);

/**
 * Lists each read of conversation data in `files`, as `file: read`. A read is
 * one of:
 *
 * - a field of the conversation partition's top level, read from the store
 *   state, written as the path of state fields it continues through, such as
 *   `persistedToBrowserStorage.humanAgentState.isConnected`;
 * - a use of a selector (a function in `src/` whose first parameter holds
 *   part of the store state) that reads one, written as `selectName()`.
 *
 * It uses the type checker, so a read through a destructured state, a
 * selector callback's parameter, or a re-exported selector still counts.
 */
export function conversationReads(
  program: ts.Program,
  packageRoot: string,
  files: string[]
) {
  const checker = program.getTypeChecker();
  const src = (folder: string) =>
    path.join(packageRoot, 'src', folder, '/').replaceAll('\\', '/');
  const sources = src('');
  const state = src('types/state');
  const selectors = new Map<ts.Declaration, boolean>();
  const reads = new Set<string>();

  const isRoot = (symbol: ts.Symbol | undefined) =>
    Boolean(
      symbol &&
      !NOT_DATA.has(symbol.name) &&
      rootDeclarations(symbol).some(
        (declaration) =>
          ts.isInterfaceDeclaration(declaration.parent) &&
          ROOTS.has(declaration.parent.name.text) &&
          declaration.getSourceFile().fileName.startsWith(state)
      )
    );

  /** Whether `node` reads conversation data, directly or through a selector. */
  const readsData = (node: ts.Node): boolean => {
    let found = false;
    const visit = (child: ts.Node) => {
      if (found) {
        return;
      }
      if (rootRead(child) || selectorOf(child)) {
        found = true;
        return;
      }
      ts.forEachChild(child, visit);
    };
    visit(node);
    return found;
  };

  /** The root field `node` reads, if it reads one. */
  const rootRead = (node: ts.Node) => {
    if (ts.isPropertyAccessExpression(node)) {
      return isRoot(checker.getSymbolAtLocation(node.name)) ? node : undefined;
    }
    if (
      ts.isBindingElement(node) &&
      ts.isObjectBindingPattern(node.parent) &&
      !node.dotDotDotToken
    ) {
      const type = checker.getTypeAtLocation(node.parent);
      const name = (node.propertyName ?? node.name).getText();
      return isRoot(type.getProperty(name)) ? node : undefined;
    }
    return undefined;
  };

  /** The shared selector `node` names, if it names one that reads data. */
  const selectorOf = (node: ts.Node) => {
    if (
      !ts.isIdentifier(node) ||
      ts.isImportSpecifier(node.parent) ||
      ts.isExportSpecifier(node.parent)
    ) {
      return undefined;
    }
    let symbol = checker.getSymbolAtLocation(node);
    if (symbol && symbol.flags & ts.SymbolFlags.Alias) {
      symbol = checker.getAliasedSymbol(symbol);
    }
    const declaration = symbol?.valueDeclaration;
    const fn = declaration && selectorFunction(declaration);
    if (!fn || !fn.getSourceFile().fileName.startsWith(sources)) {
      return undefined;
    }
    if (!selectors.has(fn)) {
      // Guards a selector that reaches itself.
      selectors.set(fn, false);
      selectors.set(fn, readsData(fn));
    }
    return selectors.get(fn) ? symbol.name : undefined;
  };

  /** The function, when its first parameter holds part of the store state. */
  const selectorFunction = (declaration: ts.Declaration) => {
    const fn =
      ts.isVariableDeclaration(declaration) && declaration.initializer
        ? declaration.initializer
        : declaration;
    if (
      !ts.isFunctionDeclaration(fn) &&
      !ts.isArrowFunction(fn) &&
      !ts.isFunctionExpression(fn)
    ) {
      return undefined;
    }
    const first = fn.parameters[0];
    if (!first) {
      return undefined;
    }
    const type = checker.getTypeAtLocation(first);
    return type.getProperties().some(isRoot) ? fn : undefined;
  };

  /** The read's path: the root field, then each state field after it. */
  const pathOf = (node: ts.PropertyAccessExpression | ts.BindingElement) => {
    if (ts.isBindingElement(node)) {
      return (node.propertyName ?? node.name).getText();
    }
    const names = [node.name.text];
    let current: ts.Node = node;
    while (
      ts.isPropertyAccessExpression(current.parent) &&
      current.parent.expression === current &&
      declaredIn(checker, current.parent.name, state)
    ) {
      current = current.parent;
      names.push((current as ts.PropertyAccessExpression).name.text);
    }
    return names.join('.');
  };

  for (const file of files) {
    const source = program.getSourceFile(path.join(packageRoot, file));
    if (!source) {
      throw new Error(`Missing source file ${file}`);
    }
    const visit = (node: ts.Node) => {
      const root = rootRead(node);
      if (root) {
        reads.add(`${file}: ${pathOf(root)}`);
      }
      const selector = selectorOf(node);
      if (selector) {
        reads.add(`${file}: ${selector}()`);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return reads;
}

/** A property's declarations, through the mapped types `Omit` and `Pick` make. */
function rootDeclarations(symbol: ts.Symbol): ts.Declaration[] {
  const declarations = symbol.declarations ?? [];
  if (declarations.length || !(symbol.flags & ts.SymbolFlags.Transient)) {
    return declarations;
  }
  const target = (symbol as ts.Symbol & { links?: { target?: ts.Symbol } })
    .links?.target;
  return target ? rootDeclarations(target) : [];
}

function declaredIn(checker: ts.TypeChecker, name: ts.Node, folder: string) {
  const symbol = checker.getSymbolAtLocation(name);
  return (symbol?.declarations ?? []).some((declaration) =>
    declaration.getSourceFile().fileName.startsWith(folder)
  );
}
