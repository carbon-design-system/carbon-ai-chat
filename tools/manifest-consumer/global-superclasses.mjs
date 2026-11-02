/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

// A manifest can only name a top-level class: a declaration, or the
// `let Name = class Name …` binding that tsc emits for a decorated class.
function topLevelClass(ts, source, name) {
  for (const statement of source.statements) {
    if (ts.isClassDeclaration(statement) && statement.name?.text === name) {
      return statement;
    }
    if (ts.isVariableStatement(statement)) {
      const binding = statement.declarationList.declarations.find(
        (entry) =>
          ts.isIdentifier(entry.name) &&
          entry.name.text === name &&
          entry.initializer &&
          ts.isClassExpression(entry.initializer)
      );
      if (binding) {
        return binding.initializer;
      }
    }
  }
  return undefined;
}

/**
 * Whether `name` in the packed source at `path` extends `base`, and `base`
 * resolves to the default library rather than any local or imported binding.
 */
export function extendsLibraryGlobal(ts, program, path, name, base) {
  const source = program.getSourceFile(path);
  const heritage =
    source &&
    topLevelClass(ts, source, name)?.heritageClauses?.find(
      (clause) => clause.token === ts.SyntaxKind.ExtendsKeyword
    )?.types[0]?.expression;
  if (!heritage || !ts.isIdentifier(heritage) || heritage.text !== base) {
    return false;
  }
  const declaration = program
    .getTypeChecker()
    .getSymbolAtLocation(heritage)?.valueDeclaration;
  return Boolean(
    declaration &&
    program.isSourceFileDefaultLibrary(declaration.getSourceFile())
  );
}
