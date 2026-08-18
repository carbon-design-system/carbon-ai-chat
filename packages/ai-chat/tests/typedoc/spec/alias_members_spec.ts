/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Guards the cross-package re-export pattern documented in
 * src/types/AGENTS.md.
 *
 * A public type surfaced as a bare `export type X = _X` alias of an upstream
 * interface renders on the docs site with **no properties at all** — TypeDoc
 * documents the alias, not what it resolves to. The same empty record then
 * feeds the search index and the MCP server, so every property of that type is
 * absent from all three surfaces while the build still exits 0.
 *
 * The fix is the `@interface` modifier tag, which makes TypeDoc emit the
 * checker-resolved member list. Nothing else catches a missing one: the build
 * passes, and the rendered page exists — it is just empty.
 *
 * Reads the TypeScript source rather than built or generated output, so it
 * needs no docs build and stays correct between releases (docs/api/ is
 * regenerated at release time, not per PR).
 */

import { readdirSync, readFileSync } from 'fs';
import { join, relative, resolve } from 'path';
import ts from 'typescript';

/**
 * Aliases that must NOT carry `@interface`, with the reason. `@interface`
 * resolves the target's *properties*, so it is only correct for object-shaped
 * targets. On a union TypeDoc warns (`converting_union_as_interface`) and emits
 * only the members common to every branch.
 *
 * Adding an entry here is a deliberate, reviewable decision. The second test
 * fails on stale entries, so this list cannot rot.
 */
const NOT_OBJECT_SHAPED: Record<string, string> = {
  MarkdownItPlugin: 'union of markdown-it plugin function types and tuples',
  FileStatusValue: 'enum — paired with `export const FileStatusValue`',
  ChainOfThoughtStepStatus:
    'enum — paired with `export const ChainOfThoughtStepStatus`',
  CHAT_BUTTON_KIND: 'enum — paired with `export const CHAT_BUTTON_KIND`',
  CHAT_BUTTON_SIZE: 'enum — paired with `export const CHAT_BUTTON_SIZE`',
};

const TYPES_ROOT = resolve(__dirname, '../../../src/types');

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(full);
    }
    return entry.isFile() && full.endsWith('.ts') ? [full] : [];
  });
}

interface Alias {
  name: string;
  target: string;
  file: string;
  hasInterfaceTag: boolean;
}

/** Every `export type X = _Y;` in src/types/, with its JSDoc tags resolved. */
function collectAliases(): Alias[] {
  const found: Alias[] = [];

  for (const file of walk(TYPES_ROOT)) {
    const source = ts.createSourceFile(
      file,
      readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true
    );

    for (const statement of source.statements) {
      if (!ts.isTypeAliasDeclaration(statement)) {
        continue;
      }
      const exported = statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
      );
      if (!exported) {
        continue;
      }
      // The cross-package form: `export type X = _X;` — a bare reference to an
      // underscore-prefixed import alias of an upstream declaration.
      if (
        !ts.isTypeReferenceNode(statement.type) ||
        !ts.isIdentifier(statement.type.typeName) ||
        !statement.type.typeName.escapedText.toString().startsWith('_')
      ) {
        continue;
      }

      found.push({
        name: statement.name.escapedText.toString(),
        target: statement.type.typeName.escapedText.toString(),
        file: relative(TYPES_ROOT, file),
        hasInterfaceTag: ts
          .getJSDocTags(statement)
          .some((tag) => tag.tagName.escapedText === 'interface'),
      });
    }
  }

  return found;
}

const aliases = collectAliases();

describe('cross-package type aliases render their properties', () => {
  it('finds the aliases to check', () => {
    // Guards the parser itself: a refactor that breaks collection would
    // otherwise make every assertion below vacuously pass.
    expect(aliases.length).toBeGreaterThan(20);
  });

  it('tags every object-shaped alias with @interface', () => {
    const untagged = aliases
      .filter((a) => !a.hasInterfaceTag && !(a.name in NOT_OBJECT_SHAPED))
      .map((a) => `${a.name} (${a.file})`)
      .sort();

    expect(untagged).toEqual([]);
  });

  it('keeps the allowlist free of stale entries', () => {
    const names = new Set(aliases.map((a) => a.name));
    const stale = Object.keys(NOT_OBJECT_SHAPED)
      .filter((name) => !names.has(name))
      .sort();

    expect(stale).toEqual([]);
  });

  it('does not tag an allowlisted alias', () => {
    const contradictory = aliases
      .filter((a) => a.name in NOT_OBJECT_SHAPED && a.hasInterfaceTag)
      .map((a) => a.name)
      .sort();

    expect(contradictory).toEqual([]);
  });
});
