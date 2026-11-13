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
 * The SDK instance's builder, as `file under src/: function`. Its verbs read
 * conversation state for the instance, the way they do for a host, so the
 * interface building the instance or calling a verb isn't a read. Only the
 * named function is exempt; another reader in its file still counts.
 */
const SDK_ROUTES = new Set([
  'shared/services/conversationInstance.ts: createConversationInstance',
]);

/**
 * Counts each read of conversation data in `files`, keyed `file: read`. A
 * read is one of:
 *
 * - a field of the conversation partition's top level, read from the store
 *   state by name, index, or destructuring (a rest binding reads each field it
 *   takes). It's written as the path of state fields it continues through,
 *   such as `persistedToBrowserStorage.humanAgentState.isConnected`.
 * - a use of a reader that reads one, written as `name()`. A reader is a
 *   function in `src/` with a parameter that holds part of the store state, a
 *   store, or a service manager. The SDK instance's builder isn't one.
 *
 * It uses the type checker, so a read through a destructured state, a
 * selector callback's parameter, or a re-exported selector still counts. Each
 * occurrence counts, so a second read in a file, or one through an alias,
 * raises its count.
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
  const readers = new Map<ts.Declaration, boolean>();
  const reads = new Map<string, number>();

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

  /** Whether a value of `type` holds state: its fields, a store, or a manager. */
  const holdsState = (type: ts.Type, depth = 0): boolean => {
    if (type.getProperties().some(isRoot)) {
      return true;
    }
    if (depth > 1) {
      return false;
    }
    const getState = type.getProperty('getState');
    const store = type.getProperty('store');
    return [getState, store].some((member) => {
      if (!member) {
        return false;
      }
      const memberType = checker.getTypeOfSymbol(member);
      const returned = memberType
        .getCallSignatures()
        .map((signature) => signature.getReturnType());
      return [memberType, ...returned].some((candidate) =>
        holdsState(candidate, depth + 1)
      );
    });
  };

  /** Whether `node` reads conversation data, directly or through a reader. */
  const readsData = (node: ts.Node): boolean => {
    let found = false;
    const visit = (child: ts.Node) => {
      if (found) {
        return;
      }
      if (rootReads(child).length || readerOf(child)) {
        found = true;
        return;
      }
      ts.forEachChild(child, visit);
    };
    visit(node);
    return found;
  };

  /** The paths of the root fields `node` reads, if it reads any. */
  const rootReads = (node: ts.Node): string[] => {
    if (ts.isPropertyAccessExpression(node)) {
      return isRoot(checker.getSymbolAtLocation(node.name))
        ? [pathOf(node, node.name.text)]
        : [];
    }
    if (ts.isElementAccessExpression(node)) {
      const key = checker.getTypeAtLocation(node.argumentExpression);
      const property =
        key.isStringLiteral() &&
        checker.getTypeAtLocation(node.expression).getProperty(key.value);
      return property && isRoot(property) ? [pathOf(node, key.value)] : [];
    }
    if (ts.isBindingElement(node) && ts.isObjectBindingPattern(node.parent)) {
      if (node.dotDotDotToken) {
        return checker
          .getTypeAtLocation(node)
          .getProperties()
          .filter(isRoot)
          .map((property) => property.name);
      }
      const type = checker.getTypeAtLocation(node.parent);
      const name = (node.propertyName ?? node.name).getText();
      return isRoot(type.getProperty(name)) ? [name] : [];
    }
    return [];
  };

  /** Whether a function under `src/` named `name` can count as a reader. */
  const inScope = (fn: ts.Node, name: string) => {
    const fileName = fn.getSourceFile().fileName;
    return (
      fileName.startsWith(sources) &&
      !SDK_ROUTES.has(`${fileName.slice(sources.length)}: ${name}`)
    );
  };

  /** The reader `node` names, if it names one that reads data. */
  const readerOf = (node: ts.Node) => {
    if (
      !ts.isIdentifier(node) ||
      ts.isImportSpecifier(node.parent) ||
      ts.isExportSpecifier(node.parent) ||
      // A reader's own name where it's declared isn't a use.
      ((ts.isFunctionDeclaration(node.parent) ||
        ts.isVariableDeclaration(node.parent)) &&
        node.parent.name === node)
    ) {
      return undefined;
    }
    let symbol = checker.getSymbolAtLocation(node);
    if (symbol && symbol.flags & ts.SymbolFlags.Alias) {
      symbol = checker.getAliasedSymbol(symbol);
    }
    const declaration = symbol?.valueDeclaration;
    const fn = declaration && readerFunction(declaration);
    if (!fn || !inScope(fn, symbol.name)) {
      return undefined;
    }
    if (!readers.has(fn)) {
      // Guards a reader that reaches itself.
      readers.set(fn, false);
      readers.set(fn, readsData(fn));
    }
    return readers.get(fn) ? symbol.name : undefined;
  };

  /** The function, when a parameter holds state, a store, or a manager. */
  const readerFunction = (declaration: ts.Declaration) => {
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
    return fn.parameters.some((parameter) =>
      holdsState(checker.getTypeAtLocation(parameter))
    )
      ? fn
      : undefined;
  };

  /** The read's path: the root field, then each state field after it. */
  const pathOf = (node: ts.Expression, root: string) => {
    const names = [root];
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

  const count = (read: string) => reads.set(read, (reads.get(read) ?? 0) + 1);

  for (const file of files) {
    const source = program.getSourceFile(path.join(packageRoot, file));
    if (!source) {
      throw new Error(`Missing source file ${file}`);
    }
    const visit = (node: ts.Node) => {
      rootReads(node).forEach((read) => count(`${file}: ${read}`));
      const reader = readerOf(node);
      if (reader) {
        count(`${file}: ${reader}()`);
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
