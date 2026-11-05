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

const FORMAT =
  ts.TypeFormatFlags.NoTruncation |
  ts.TypeFormatFlags.UseFullyQualifiedType |
  ts.TypeFormatFlags.WriteArrayAsGenericType;

/**
 * Lists every declaration an entry exports, and every named type those
 * declarations reach inside `src/`, with each member and its type. The result
 * is plain text so a new field shows up as a one-line diff in review.
 */
export function surfaceReport(
  program: ts.Program,
  entry: string,
  packageRoot: string
) {
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(entry);
  if (!source) {
    throw new Error(`Missing surface entry ${entry}`);
  }
  const src = path.join(packageRoot, 'src') + path.sep;
  // Only named declarations get a block; anonymous types are walked through.
  const ownDeclaration = (symbol: ts.Symbol | undefined) =>
    symbol?.declarations?.find(
      (d) =>
        d.getSourceFile().fileName.startsWith(src) &&
        (ts.isInterfaceDeclaration(d) ||
          ts.isTypeAliasDeclaration(d) ||
          ts.isEnumDeclaration(d) ||
          ts.isClassDeclaration(d))
    );
  const pending: ts.Symbol[] = checker
    .getExportsOfModule(checker.getSymbolAtLocation(source)!)
    .map((symbol) =>
      symbol.flags & ts.SymbolFlags.Alias
        ? checker.getAliasedSymbol(symbol)
        : symbol
    );
  const seen = new Set<ts.Symbol>();
  const blocks: string[] = [];

  const collect = (type: ts.Type, depth = 0) => {
    if (depth > 4) {
      return;
    }
    for (const symbol of [type.aliasSymbol, type.getSymbol()]) {
      if (ownDeclaration(symbol) && !seen.has(symbol)) {
        pending.push(symbol);
      }
    }
    for (const argument of type.aliasTypeArguments ?? []) {
      collect(argument, depth + 1);
    }
    if (type.isUnionOrIntersection()) {
      type.types.forEach((member) => collect(member, depth + 1));
    }
    if (type.flags & ts.TypeFlags.Object) {
      const object = type as ts.ObjectType;
      if (object.objectFlags & ts.ObjectFlags.Reference) {
        checker
          .getTypeArguments(object as ts.TypeReference)
          .forEach((argument) => collect(argument, depth + 1));
      }
      if (!ownDeclaration(type.getSymbol())) {
        // An anonymous object or a function: report what its members reach.
        for (const signature of type.getCallSignatures()) {
          signature.parameters.forEach((parameter) =>
            collect(checker.getTypeOfSymbol(parameter), depth + 1)
          );
          collect(signature.getReturnType(), depth + 1);
        }
        if (object.objectFlags & ts.ObjectFlags.Anonymous) {
          for (const property of type.getProperties()) {
            collect(checker.getTypeOfSymbol(property), depth + 1);
          }
        }
      }
    }
  };

  while (pending.length) {
    const symbol = pending.shift()!;
    if (seen.has(symbol)) {
      continue;
    }
    seen.add(symbol);
    const declaration = ownDeclaration(symbol);
    // An enum member and a type parameter are reported by their owner.
    if (
      !declaration ||
      symbol.flags & (ts.SymbolFlags.EnumMember | ts.SymbolFlags.TypeParameter)
    ) {
      continue;
    }
    const file = path
      .relative(packageRoot, declaration.getSourceFile().fileName)
      .replaceAll('\\', '/');
    const name = checker.symbolToString(symbol);
    if (ts.isTypeAliasDeclaration(declaration)) {
      const type = checker.getTypeAtLocation(declaration.type);
      blocks.push(
        `type ${name} (${file})\n  = ${declaration.type.getText().replace(/\s+/g, ' ')}`
      );
      collect(type);
      continue;
    }
    if (ts.isEnumDeclaration(declaration)) {
      blocks.push(
        `enum ${name} (${file})\n` +
          declaration.members.map((m) => `  ${m.name.getText()}`).join('\n')
      );
      continue;
    }
    const type = checker.getDeclaredTypeOfSymbol(symbol);
    const lines = type
      .getProperties()
      .map((property) => {
        const optional = property.flags & ts.SymbolFlags.Optional ? '?' : '';
        const member = checker.getTypeOfSymbolAtLocation(property, declaration);
        collect(member);
        return `  ${property.name}${optional}: ${checker.typeToString(member, declaration, FORMAT)}`;
      })
      .sort();
    for (const base of type.isClassOrInterface()
      ? (checker.getBaseTypes(type) ?? [])
      : []) {
      collect(base);
    }
    blocks.push(`interface ${name} (${file})\n${lines.join('\n')}`);
  }
  return blocks.sort().join('\n\n') + '\n';
}
