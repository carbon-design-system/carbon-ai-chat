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
  const walker = new SurfaceWalker(checker, packageRoot);
  checker
    .getExportsOfModule(checker.getSymbolAtLocation(source)!)
    .forEach((symbol) =>
      walker.enqueue(
        symbol.flags & ts.SymbolFlags.Alias
          ? checker.getAliasedSymbol(symbol)
          : symbol
      )
    );
  return walker.run();
}

class SurfaceWalker {
  private pending: ts.Symbol[] = [];
  private seen = new Set<ts.Symbol>();
  private printer = ts.createPrinter({ removeComments: true });
  // TypeScript reports file names with forward slashes on every platform.
  private src: string;

  constructor(
    private checker: ts.TypeChecker,
    private packageRoot: string
  ) {
    this.src = path.join(packageRoot, 'src').replaceAll('\\', '/') + '/';
  }

  enqueue(symbol: ts.Symbol) {
    this.pending.push(symbol);
  }

  run() {
    const blocks: string[] = [];
    while (this.pending.length) {
      const symbol = this.pending.shift()!;
      if (this.seen.has(symbol)) {
        continue;
      }
      this.seen.add(symbol);
      const declaration = this.ownDeclaration(symbol);
      // An enum member and a type parameter are reported by their owner.
      if (
        declaration &&
        !(
          symbol.flags &
          (ts.SymbolFlags.EnumMember | ts.SymbolFlags.TypeParameter)
        )
      ) {
        blocks.push(this.block(symbol, declaration));
      }
    }
    return blocks.sort().join('\n\n') + '\n';
  }

  /** Only named declarations get a block; anonymous types are walked through. */
  private ownDeclaration(symbol: ts.Symbol | undefined) {
    return symbol?.declarations?.find(
      (d) =>
        d.getSourceFile().fileName.startsWith(this.src) &&
        (ts.isInterfaceDeclaration(d) ||
          ts.isTypeAliasDeclaration(d) ||
          ts.isEnumDeclaration(d) ||
          ts.isClassDeclaration(d))
    );
  }

  private block(symbol: ts.Symbol, declaration: ts.Declaration) {
    const file = path
      .relative(this.packageRoot, declaration.getSourceFile().fileName)
      .replaceAll('\\', '/');
    const name = this.checker.symbolToString(symbol);
    if (ts.isTypeAliasDeclaration(declaration)) {
      return `type ${name} (${file})\n  = ${this.aliasText(declaration)}`;
    }
    if (ts.isEnumDeclaration(declaration)) {
      return `enum ${name} (${file})\n${this.enumLines(declaration)}`;
    }
    return `interface ${name} (${file})\n${this.memberLines(symbol, declaration)}`;
  }

  private aliasText(declaration: ts.TypeAliasDeclaration) {
    this.collect(this.checker.getTypeAtLocation(declaration.type));
    return this.printer
      .printNode(
        ts.EmitHint.Unspecified,
        declaration.type,
        declaration.getSourceFile()
      )
      .replace(/\s+/g, ' ');
  }

  private enumLines(declaration: ts.EnumDeclaration) {
    return declaration.members
      .map((m) =>
        m.initializer
          ? `  ${m.name.getText()} = ${m.initializer.getText()}`
          : `  ${m.name.getText()}`
      )
      .join('\n');
  }

  private memberLines(symbol: ts.Symbol, declaration: ts.Declaration) {
    const { checker } = this;
    const type = checker.getDeclaredTypeOfSymbol(symbol);
    const write = (member: ts.Type) =>
      checker.typeToString(member, declaration, FORMAT);
    const lines = type
      .getProperties()
      .map((property) => {
        const optional = property.flags & ts.SymbolFlags.Optional ? '?' : '';
        const member = checker.getTypeOfSymbolAtLocation(property, declaration);
        this.collect(member);
        return `  ${property.name}${optional}: ${write(member)}`;
      })
      .sort();
    for (const index of checker.getIndexInfosOfType(type)) {
      lines.push(
        `  [key: ${checker.typeToString(index.keyType)}]: ${write(index.type)}`
      );
      this.collect(index.type);
    }
    if (type.isClassOrInterface()) {
      (checker.getBaseTypes(type) ?? []).forEach((base) => this.collect(base));
    }
    return lines.join('\n');
  }

  /** Queues each named type `type` reaches, a few levels deep. */
  private collect(type: ts.Type, depth = 0) {
    if (depth > 4) {
      return;
    }
    for (const symbol of [type.aliasSymbol, type.getSymbol()]) {
      if (this.ownDeclaration(symbol) && !this.seen.has(symbol)) {
        this.pending.push(symbol);
      }
    }
    this.childTypes(type).forEach((child) => this.collect(child, depth + 1));
  }

  /** The types inside `type`: arguments, union members, and, for an anonymous object or function, its members. */
  private childTypes(type: ts.Type): ts.Type[] {
    const children = [...(type.aliasTypeArguments ?? [])];
    if (type.isUnionOrIntersection()) {
      children.push(...type.types);
    }
    if (!(type.flags & ts.TypeFlags.Object)) {
      return children;
    }
    const object = type as ts.ObjectType;
    if (object.objectFlags & ts.ObjectFlags.Reference) {
      children.push(
        ...this.checker.getTypeArguments(object as ts.TypeReference)
      );
    }
    if (this.ownDeclaration(type.getSymbol())) {
      return children;
    }
    for (const signature of type.getCallSignatures()) {
      signature.parameters.forEach((parameter) =>
        children.push(this.checker.getTypeOfSymbol(parameter))
      );
      children.push(signature.getReturnType());
    }
    if (object.objectFlags & ts.ObjectFlags.Anonymous) {
      type
        .getProperties()
        .forEach((property) =>
          children.push(this.checker.getTypeOfSymbol(property))
        );
    }
    return children;
  }
}
