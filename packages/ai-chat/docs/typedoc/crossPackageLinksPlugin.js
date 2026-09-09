/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Links signature references to `@carbon/ai-chat-components` types at the local
 * page that documents them, and fails the build on any that has no such page.
 * [crossPackageLinksCore.js](./crossPackageLinksCore.js) carries the mechanism
 * and the resolution rules; this file is the TypeDoc wiring.
 *
 * Hooks `Converter.EVENT_RESOLVE_END` — before the renderer, so every consumer
 * of the resolved project (the theme, and apiIndexPlugin.js at
 * `Renderer.EVENT_END`) sees the re-pointed references.
 *
 * Residue is reported with `logger.error`, not `logger.validationWarning`: a
 * validation warning raised during conversion is sampled into the
 * pre-validation warning count and never trips
 * `treatValidationWarningsAsErrors` — see the caveat in
 * [demoteValidationWarningsPlugin.js](./demoteValidationWarningsPlugin.js).
 * There is no allowlist. Every gap this can currently find is closed, so an
 * allowlist would ship empty, and an escape hatch would only let the next
 * author skip the re-declaration that is the point of the check.
 *
 * Note that an error here suppresses all rendered output, so a red docs build
 * leaves no site at all rather than a half-linked one.
 *
 * @type {import("typedoc").PluginHost}
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { Converter } from 'typedoc';
import ts from 'typescript';

import {
  LINKED_PACKAGE,
  repointCrossPackageReferences,
} from './crossPackageLinksCore.js';

/**
 * `src/types/`, derived from TypeDoc's own resolved entry point — it hands back
 * an absolute path, so this holds wherever the build is launched from. Not
 * `import.meta.url`: that does not survive the CommonJS transform the specs
 * run under, and the spec imports this module.
 */
function typesRootFor(app) {
  const [entryPoint] = app.options.getValue('entryPoints');
  return join(dirname(entryPoint), 'types');
}

const SECTION = 'packages/ai-chat/src/types/references/cross-package-types.md';

const GUIDANCE = {
  missing: `Add a local re-declaration — see ${SECTION}.`,
  bypassed: `Import the local re-declaration rather than the upstream source — see "Internal imports use the local alias too" in ${SECTION}.`,
  ambiguous: `Two upstream files declare this name, so the local page cannot be matched by name. Rename one re-declaration or narrow the reference — see ${SECTION}.`,
};

/** Every `.ts` file under src/types/. */
function typeSources(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return typeSources(full);
    }
    return entry.isFile() && full.endsWith('.ts') ? [full] : [];
  });
}

/**
 * The names this package re-declares from {@link LINKED_PACKAGE}, read from
 * source.
 *
 * The core needs this because a name match alone does not prove the local
 * export documents the upstream type — it may be an unrelated local type that
 * happens to share the name. TypeDoc cannot answer it: `@interface` conversion
 * resolves the alias away, and `getSymbolIdFromReflection` reports the local
 * declaration site, not the upstream one. Matching the import specifier
 * instead fails too, because most of these are imported through a barrel
 * (`prompt-line/index.js`) while TypeDoc names the declaring file.
 *
 * So it is read the same way
 * [alias_members_spec.ts](../../tests/typedoc/spec/alias_members_spec.ts)
 * reads it: an `export type X = _X` (or `export const X = _X`) whose
 * right-hand side is imported from the upstream package.
 */
export function collectReDeclaredNames(root) {
  const names = new Set();

  for (const file of typeSources(root)) {
    const source = ts.createSourceFile(
      file,
      readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true
    );

    // Locals bound to an import from the upstream package.
    const upstream = new Set();
    for (const statement of source.statements) {
      if (
        !ts.isImportDeclaration(statement) ||
        !ts.isStringLiteral(statement.moduleSpecifier) ||
        !statement.moduleSpecifier.text.startsWith(LINKED_PACKAGE)
      ) {
        continue;
      }
      const bindings = statement.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          upstream.add(element.name.escapedText.toString());
        }
      }
    }
    if (upstream.size === 0) {
      continue;
    }

    const exported = (statement) =>
      statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
      );

    for (const statement of source.statements) {
      if (ts.isTypeAliasDeclaration(statement) && exported(statement)) {
        const target = statement.type;
        if (
          ts.isTypeReferenceNode(target) &&
          ts.isIdentifier(target.typeName) &&
          upstream.has(target.typeName.escapedText.toString())
        ) {
          names.add(statement.name.escapedText.toString());
        }
      }
      if (ts.isVariableStatement(statement) && exported(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (
            ts.isIdentifier(declaration.name) &&
            declaration.initializer &&
            ts.isIdentifier(declaration.initializer) &&
            upstream.has(declaration.initializer.escapedText.toString())
          ) {
            names.add(declaration.name.escapedText.toString());
          }
        }
      }
    }
  }

  return names;
}

/**
 * TypeDoc calls this with `app` alone. `reDeclaredNames` is a seam for the
 * spec, which drives the handler against a fixture project and must not have
 * the real `src/types/` scan answering for it.
 *
 * @param {import("typedoc").Application} app
 * @param {{ reDeclaredNames?: Set<string> }} [options]
 */
export function load(app, options = {}) {
  app.converter.on(Converter.EVENT_RESOLVE_END, (context) => {
    const reDeclaredNames =
      options.reDeclaredNames ?? collectReDeclaredNames(typesRootFor(app));
    if (reDeclaredNames.size === 0) {
      app.logger.error(
        `crossPackageLinksPlugin: found no ${LINKED_PACKAGE} re-declarations under src/types/. The source scan is broken; every cross-package reference below is a false failure.`
      );
    }

    const { fixed, skipped, residue, failures } = repointCrossPackageReferences(
      context.project,
      reDeclaredNames
    );

    app.logger.info(
      `crossPackageLinksPlugin: re-pointed ${fixed} ${LINKED_PACKAGE} reference(s) at local pages, skipped ${skipped} self-reference(s), ${residue.length} unresolved.`
    );

    for (const entry of residue) {
      app.logger.error(
        `crossPackageLinksPlugin: ${entry.qualifiedName} (${entry.source}) is referenced by ${entry.owner} but resolves to no local page. ${GUIDANCE[entry.reason]}`
      );
    }

    for (const entry of failures) {
      app.logger.error(
        `crossPackageLinksPlugin: failed to re-point ${entry.qualifiedName}, referenced by ${entry.owner}. TypeDoc's ReferenceType._target may have been renamed; crossPackageLinksCore.js needs updating for this TypeDoc version.`
      );
    }
  });
}
