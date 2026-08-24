/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Guards `src/aiChatEntry.tsx` and `src/serverEntry.ts` against drift.
 *
 * Two mechanisms live here because neither covers the other's ground.
 *
 * The compile-time assertions are built on `typeof import(...)`, which yields a
 * module's *value* namespace. Types are erased from that namespace, so those
 * assertions can compare the types of shared values — something a name diff
 * cannot do — but they cannot see a type-only export at all.
 *
 * The runtime block diffs the *named exports* of the two entry files by
 * parsing them, which covers types and values alike, in both directions.
 * Diffing names rather than keying on the `type` keyword is deliberate: most
 * public types in `aiChatEntry.tsx` ship in plain `export { ... }` blocks
 * rather than `export type { ... }`, so a guard that looked for the keyword
 * would still miss most of the public type surface.
 *
 * If any of the type assertions fail, ts-jest surfaces a compilation error and
 * fails this whole file, runtime tests included.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import ts from 'typescript';

// Utility types for compile-time assertions
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type AssertTrue<T extends true> = T;

// Value-side export maps (enums and runtime exports)
type ClientValues = typeof import('../../../src/aiChatEntry');
type ServerValues = typeof import('../../../src/serverEntry');

// 1) Server exports must be a subset of client exports (additive changes allowed on client)
type ServerOnlyAllowedKeys = 'loadAllLazyDeps';
type _NoExtraServerExports = AssertTrue<
  Equals<
    Exclude<
      Exclude<keyof ServerValues, keyof ClientValues>,
      ServerOnlyAllowedKeys
    >,
    never
  >
>;

// 2) All shared exports must have identical types on both sides (no breaking changes)
type SharedKeys = Extract<keyof ServerValues, keyof ClientValues>;
type _AllSharedExact = AssertTrue<
  {
    [K in SharedKeys]: Equals<ServerValues[K], ClientValues[K]>;
  }[SharedKeys] extends true
    ? true
    : false
>;

// 3) Server must not export React component values
type ForbiddenComponentKeys = 'ChatContainer' | 'ChatCustomElement';
type _ServerHasNoComponents = AssertTrue<
  Equals<Extract<keyof ServerValues, ForbiddenComponentKeys>, never>
>;

const CLIENT_ENTRY = 'aiChatEntry.tsx';
const SERVER_ENTRY = 'serverEntry.ts';

/**
 * Exported from `aiChatEntry.tsx` only, on purpose. `serverEntry.ts` is the
 * SSR-safe surface, so it carries no React component values and no helper that
 * touches the DOM or browser storage.
 *
 * Adding an entry is a deliberate, reviewable decision — an omission that is
 * not recorded here fails the test below. The stale-entry test keeps the list
 * from rotting once a name is exported from both entries or dropped entirely.
 */
const CLIENT_ONLY: Record<string, string> = {
  ChatContainer: 'React component value.',
  ChatCustomElement: 'React component value.',
  ChatContainerProps: 'Props of a React component, so client-surface only.',
  ChatCustomElementProps: 'Props of a React component, so client-surface only.',
  readCarbonChatSession: 'Reads browser session storage.',
  renderTokenChip: 'Renders into the DOM.',
  renderInLightDom: 'Renders into the DOM.',
};

/**
 * Exported from `serverEntry.ts` only, on purpose. Empty — every server export
 * is also a client export today.
 *
 * `loadAllLazyDeps` is not an entry: both files export the name, the client as
 * a type and the server as a value. That asymmetry is a value-side concern and
 * is covered by `ServerOnlyAllowedKeys` above.
 */
const SERVER_ONLY: Record<string, string> = {};

/**
 * Every name an entry file exports. Both entries consist entirely of
 * `export { ... } from '...'` and `export type { ... } from '...'`
 * re-exports; any other exporting form throws rather than being skipped,
 * because a form this cannot read would silently shrink the diff below.
 */
function readNamedExports(label: string, path: string): Set<string> {
  const source = ts.createSourceFile(
    path,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  const names = new Set<string>();

  source.forEachChild((node) => {
    if (ts.isExportDeclaration(node)) {
      if (!node.exportClause || !ts.isNamedExports(node.exportClause)) {
        throw new Error(
          `${label} uses a star re-export. This guard diffs named exports and ` +
            `cannot enumerate names through one — re-export them explicitly.`
        );
      }
      for (const element of node.exportClause.elements) {
        names.add(element.name.text);
      }
      return;
    }

    const isExported =
      ts.canHaveModifiers(node) &&
      ts
        .getModifiers(node)
        ?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);

    if (isExported || ts.isExportAssignment(node)) {
      throw new Error(
        `${label} declares an export locally. This guard only reads ` +
          `re-export statements — declare the symbol in src/types/ and ` +
          `re-export it here, or teach this parser the new form.`
      );
    }
  });

  return names;
}

const clientExports = readNamedExports(
  CLIENT_ENTRY,
  resolve(__dirname, '../../../src/aiChatEntry.tsx')
);
const serverExports = readNamedExports(
  SERVER_ENTRY,
  resolve(__dirname, '../../../src/serverEntry.ts')
);

/** `["X: exported from a, missing from b", ...]`, sorted and allowlist-filtered. */
function missingFrom(
  from: Set<string>,
  to: Set<string>,
  allowed: Record<string, string>,
  fromLabel: string,
  toLabel: string
): string[] {
  return [...from]
    .filter((name) => !to.has(name) && !(name in allowed))
    .sort()
    .map(
      (name) => `${name}: exported from ${fromLabel}, missing from ${toLabel}`
    );
}

/** Allowlist entries that no longer describe a real asymmetry. */
function staleEntries(
  allowed: Record<string, string>,
  present: Set<string>,
  absent: Set<string>
): string[] {
  return Object.keys(allowed)
    .filter((name) => absent.has(name) || !present.has(name))
    .sort();
}

// Keep a minimal runtime test so Jest reports a passing spec when compilation succeeds.
describe('API compatibility (server vs client)', () => {
  it('compiles with matching export surface', () => {
    expect(true).toBe(true);
  });
});

describe('entry point export parity', () => {
  it('reads both entry points', () => {
    // A parser that quietly returned nothing would leave both diffs empty and
    // this suite green, which is the failure mode the guard exists to stop.
    expect(clientExports.size).toBeGreaterThan(200);
    expect(serverExports.size).toBeGreaterThan(200);
  });

  it('exports every client symbol from the server entry', () => {
    expect(
      missingFrom(
        clientExports,
        serverExports,
        CLIENT_ONLY,
        CLIENT_ENTRY,
        SERVER_ENTRY
      )
    ).toEqual([]);
  });

  it('exports every server symbol from the client entry', () => {
    expect(
      missingFrom(
        serverExports,
        clientExports,
        SERVER_ONLY,
        SERVER_ENTRY,
        CLIENT_ENTRY
      )
    ).toEqual([]);
  });

  it('keeps the client-only allowlist free of stale entries', () => {
    expect(staleEntries(CLIENT_ONLY, clientExports, serverExports)).toEqual([]);
  });

  it('keeps the server-only allowlist free of stale entries', () => {
    expect(staleEntries(SERVER_ONLY, serverExports, clientExports)).toEqual([]);
  });
});
