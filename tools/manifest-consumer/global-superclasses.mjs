/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

let libraryProgram;

// Uses the caller's TypeScript so the lib globals match the parser that read the source.
function libraryValue(ts, name) {
  libraryProgram ??= ts.createProgram(
    [ts.getDefaultLibFilePath({ target: ts.ScriptTarget.ESNext })],
    { target: ts.ScriptTarget.ESNext, types: [], noEmit: true }
  );
  const symbol = libraryProgram
    .getTypeChecker()
    .resolveName(name, undefined, ts.SymbolFlags.Value, false);
  return (
    Boolean(symbol?.declarations?.length) &&
    symbol.declarations.every((declaration) =>
      libraryProgram.isSourceFileDefaultLibrary(declaration.getSourceFile())
    )
  );
}

function bindsName(ts, declaration, name) {
  if (!declaration) {
    return false;
  }
  if (ts.isIdentifier(declaration)) {
    return declaration.text === name;
  }
  if (
    ts.isObjectBindingPattern(declaration) ||
    ts.isArrayBindingPattern(declaration)
  ) {
    return declaration.elements.some((entry) =>
      bindsName(ts, entry.name, name)
    );
  }
  return false;
}

function statementBinds(ts, statement, name) {
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.some((entry) =>
      bindsName(ts, entry.name, name)
    );
  }
  if (ts.isImportDeclaration(statement)) {
    const clause = statement.importClause;
    const bindings = clause?.namedBindings;
    return (
      bindsName(ts, clause?.name, name) ||
      Boolean(
        bindings &&
        (ts.isNamedImports(bindings)
          ? bindings.elements.some((entry) => entry.name.text === name)
          : bindings.name.text === name)
      )
    );
  }
  return (
    (ts.isClassDeclaration(statement) ||
      ts.isFunctionDeclaration(statement) ||
      ts.isEnumDeclaration(statement) ||
      ts.isModuleDeclaration(statement) ||
      ts.isImportEqualsDeclaration(statement)) &&
    bindsName(ts, statement.name, name)
  );
}

function hoistedBinding(ts, scope, name) {
  let found = false;
  const visit = (node) => {
    if (node !== scope && (ts.isFunctionLike(node) || ts.isClassLike(node))) {
      return;
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isVariableDeclarationList(node.parent) &&
      !(node.parent.flags & ts.NodeFlags.BlockScoped) &&
      bindsName(ts, node.name, name)
    ) {
      found = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(scope);
  return found;
}

function scopeNameBinds(ts, scope, name) {
  return (
    (ts.isClassLike(scope) ||
      ts.isFunctionDeclaration(scope) ||
      ts.isFunctionExpression(scope)) &&
    bindsName(ts, scope.name, name)
  );
}

function scopeBinds(ts, scope, name) {
  if (scopeNameBinds(ts, scope, name)) {
    return true;
  }
  if (
    scope.parameters?.some((parameter) => bindsName(ts, parameter.name, name))
  ) {
    return true;
  }
  if (
    ts.isCatchClause(scope) &&
    bindsName(ts, scope.variableDeclaration?.name, name)
  ) {
    return true;
  }
  const statements = ts.isCaseBlock(scope)
    ? scope.clauses.flatMap((clause) => [...clause.statements])
    : (scope.statements ?? []);
  if (statements.some((statement) => statementBinds(ts, statement, name))) {
    return true;
  }
  if (
    scope.initializer &&
    ts.isVariableDeclarationList(scope.initializer) &&
    scope.initializer.declarations.some((entry) =>
      bindsName(ts, entry.name, name)
    )
  ) {
    return true;
  }
  return (
    (ts.isSourceFile(scope) || ts.isFunctionLike(scope)) &&
    hoistedBinding(ts, scope, name)
  );
}

function lexicalBinding(ts, expression, name) {
  for (let scope = expression.parent; scope; scope = scope.parent) {
    if (scopeBinds(ts, scope, name)) {
      return true;
    }
  }
  return false;
}

export function globalSuperclassReferences(ts, source) {
  const references = new Map();
  const seen = new Set();
  const ambiguous = new Set();
  const visit = (node) => {
    if (ts.isClassDeclaration(node) && node.name) {
      const name = node.name.text;
      if (seen.has(name)) {
        ambiguous.add(name);
      }
      seen.add(name);
      const base = node.heritageClauses?.find(
        (clause) => clause.token === ts.SyntaxKind.ExtendsKeyword
      )?.types[0]?.expression;
      if (
        base &&
        ts.isIdentifier(base) &&
        !lexicalBinding(ts, base, base.text) &&
        libraryValue(ts, base.text)
      ) {
        references.set(name, base.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  for (const name of ambiguous) {
    references.delete(name);
  }
  return references;
}
