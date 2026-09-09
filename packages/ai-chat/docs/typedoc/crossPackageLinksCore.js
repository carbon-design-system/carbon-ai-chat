/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Pure resolution logic behind crossPackageLinksPlugin.js: point signature
 * references at the local page that documents them, and report the ones that
 * have no such page.
 *
 * ### The problem
 *
 * Public types declared in `@carbon/ai-chat-components` reach this package's
 * docs through a local re-declaration (`export type StartersConfig =
 * _StartersConfig`) — see
 * [cross-package-types.md](../../src/types/references/cross-package-types.md).
 * That alias is transparent
 * to the type checker: it creates no `aliasSymbol`, so when TypeDoc converts an
 * interface member from the checker's type it resolves the reference to the
 * *upstream* declaration and keeps the local name only as display text. The
 * page for `StartersConfig` is built and populated, but nothing links to it.
 *
 * TypeDoc's own `notExported` validation cannot catch this — it returns early
 * on any reference whose package differs from the project's own — so the build
 * exits 0 with an unlinked site.
 *
 * ### What this does
 *
 * Every unresolved reference into `@carbon/ai-chat-components` is matched by
 * name against the project's module-level exports. A hit is re-pointed at that
 * reflection; a miss is residue, which the plugin turns into a build error.
 *
 * No filesystem access and no `app` object, so the rules are unit-testable
 * against a fixture project — see
 * [tests/typedoc/spec/cross_package_links_spec.ts](../../tests/typedoc/spec/cross_package_links_spec.ts).
 */

import {
  ContainerReflection,
  DeclarationReflection,
  ParameterReflection,
  Reflection,
  ReflectionKind,
  SignatureReflection,
  TypeParameterReflection,
  makeRecursiveVisitor,
} from 'typedoc';

/**
 * The only package we re-point into. Third-party types (`@tiptap/core`,
 * `@types/react`, `@types/markdown-it`, `prosemirror-state`) are deliberately
 * never re-declared here, so they have no local page to link to and must stay
 * external. Widening this would invent links to pages that do not exist and
 * would make the residue gate fire on types we have decided not to document.
 */
export const LINKED_PACKAGE = '@carbon/ai-chat-components';

/**
 * Reflections that can own a documented page and be named by a signature.
 * `SomeExport` already spans both halves of an `export const X` +
 * `export type X` pair, so an enum surfaced that way is eligible under either
 * declaration.
 */
const MODULE_EXPORT_KINDS = ReflectionKind.SomeExport;

/**
 * Walk a resolved project and collect every `ReferenceType` in it, paired with
 * the reflection that reaches it.
 *
 * This reimplements TypeDoc's internal `discoverAllReferenceTypes` (exported
 * from `#node-utils`, which is not on the package's public export map — that
 * carries only `.`, `./models`, and `./browser`). It mirrors the
 * `forExportValidation: true` variant: inherited and extended edges are left
 * out, so the set matches the one TypeDoc's own export validation walks. That
 * covers every reference rendered into a signature — property types, parameter
 * types, return types, index signatures, type arguments — while keeping an
 * inherited member's reference to an upstream type from being reported as a
 * gap in our naming surface.
 *
 * @param {import("typedoc").ProjectReflection} project
 * @returns {{ type: import("typedoc").ReferenceType, owner: Reflection }[]}
 */
export function discoverReferenceTypes(project) {
  let current = project;
  const queue = [];
  const result = [];

  const visitor = makeRecursiveVisitor({
    reference(type) {
      result.push({ type, owner: current });
    },
    reflection(type) {
      queue.push(type.declaration);
    },
  });

  const add = (item) => {
    if (!item) {
      return;
    }
    if (item instanceof Reflection) {
      queue.push(item);
    } else {
      queue.push(...item);
    }
  };

  do {
    if (current instanceof ContainerReflection) {
      add(current.children);
    }
    if (current instanceof DeclarationReflection) {
      current.type?.visit(visitor);
      add(current.typeParameters);
      add(current.signatures);
      add(current.indexSignatures);
      add(current.getSignature);
      add(current.setSignature);
      current.overwrites?.visit(visitor);
      current.implementedTypes?.forEach((type) => type.visit(visitor));
    }
    if (current instanceof SignatureReflection) {
      add(current.parameters);
      add(current.typeParameters);
      current.type?.visit(visitor);
      current.overwrites?.visit(visitor);
    }
    if (current instanceof ParameterReflection) {
      current.type?.visit(visitor);
    }
    if (current instanceof TypeParameterReflection) {
      current.type?.visit(visitor);
      current.default?.visit(visitor);
    }
  } while ((current = queue.shift()));

  return result;
}

/**
 * Index the project's module-level exports by name.
 *
 * Scoping the match to module-level exports is a guard, not a fix for an
 * observed bug: a first-wins match across every reflection in the project
 * happens to give the right answer today, but a property or parameter that
 * shares a name with an exported type would silently win.
 *
 * The parent check is on `ReflectionKind.Module`, not on the module's name.
 * [moduleNamePlugin.js](./moduleNamePlugin.js) renames the entry module to
 * "Type reference" on this same `EVENT_RESOLVE_END`, and plugin order is not
 * guaranteed — keying off the new name would make this depend on who runs
 * first.
 *
 * @param {import("typedoc").ProjectReflection} project
 * @returns {Map<string, Reflection[]>}
 */
export function collectModuleExports(project) {
  const byName = new Map();
  for (const reflection of project.getReflectionsByKind(MODULE_EXPORT_KINDS)) {
    if (reflection.parent?.kind !== ReflectionKind.Module) {
      continue;
    }
    const existing = byName.get(reflection.name);
    if (existing) {
      existing.push(reflection);
    } else {
      byName.set(reflection.name, [reflection]);
    }
  }
  return byName;
}

/**
 * Pick the reflection a reference should point at when a name resolves to more
 * than one module export.
 *
 * An enum surfaced through the `export const X = _X` + `export type X = _X`
 * pair produces two reflections under one name, and they render as two pages
 * (`variables/` and `types/`). Follows TypeDoc's own `ReferenceType.reflection`
 * getter, which honors `preferValues` first. Its second lookup — the one for
 * the opposite kind — can only ever land on the first candidate once the first
 * lookup has failed, so this collapses to that.
 *
 * @param {import("typedoc").ReferenceType} type
 * @param {Reflection[]} candidates
 * @returns {Reflection | undefined}
 */
function preferredTarget(type, candidates) {
  if (candidates.length === 1) {
    return candidates[0];
  }
  const wanted = type.preferValues
    ? ReflectionKind.ValueReferenceTarget
    : ReflectionKind.TypeReferenceTarget;
  return (
    candidates.find((reflection) => reflection.kindOf(wanted)) ?? candidates[0]
  );
}

/**
 * Whether a reference is an alias rendering its own right-hand side.
 *
 * A re-declaration that is not object-shaped keeps no `@interface` tag, so
 * TypeDoc documents the alias itself and renders its target as a reference:
 * `export type MarkdownItPlugin = _MarkdownItPlugin` yields a reference named
 * `_MarkdownItPlugin` owned by `MarkdownItPlugin`. Four reach this code:
 * `MarkdownItPlugin`, `FileStatusValue`, `ChainOfThoughtStepStatus`, and
 * `CHAT_BUTTON_SIZE`.
 * [alias_members_spec.ts](../../tests/typedoc/spec/alias_members_spec.ts)
 * exempts a fifth alias from `@interface`, `CHAT_BUTTON_KIND`, which resolves
 * into `@carbon/web-components` and so never gets this far.
 *
 * Re-pointing one would link a page to itself, so they are skipped. They are
 * not residue either: their names carry the upstream import alias's leading
 * underscore and never match, and stripping it to force a match would produce
 * exactly the self-link this avoids.
 *
 * Matching is on the reference's `qualifiedName` — the upstream symbol's real
 * name — against an owner that is itself a module-level export. That leaves
 * genuine property references alone: `FileUpload.status` is owned by `status`,
 * which is no module export, so it still gets re-pointed.
 *
 * @param {import("typedoc").ReferenceType} type
 * @param {Reflection} owner
 * @param {Map<string, Reflection[]>} moduleExports
 * @returns {boolean}
 */
function isSelfReference(type, owner, moduleExports) {
  if (!moduleExports.get(owner.name)?.includes(owner)) {
    return false;
  }
  return type.qualifiedName === owner.name;
}

/**
 * Why a reference could not be re-pointed.
 *
 * - `missing` — nothing local re-declares it, so no page exists.
 * - `bypassed` — a re-declaration exists, but the referring site imported the
 *   upstream symbol instead of the local alias.
 * - `ambiguous` — the name arrives from two different upstream files, so
 *   matching by name cannot tell which page is right.
 *
 * @typedef {"missing" | "bypassed" | "ambiguous"} ResidueReason
 */

/**
 * @typedef {object} Residue
 * @property {string} name Reference name as written at the referring site.
 * @property {string} qualifiedName Upstream symbol name.
 * @property {string} source "packageName/packagePath" of the declaration.
 * @property {string} owner Friendly full name of the reflection that reaches it.
 * @property {ResidueReason} reason
 */

/**
 * @typedef {object} RepointResult
 * @property {number} fixed References re-pointed at a local reflection.
 * @property {number} skipped Self-references left alone.
 * @property {Residue[]} residue Cross-package references with no local page, deduped.
 * @property {Residue[]} failures Re-points that did not take effect.
 */

/**
 * Re-point every unresolved `@carbon/ai-chat-components` reference at the local
 * reflection that documents it.
 *
 * `_target` is private by convention — TypeDoc declares it with
 * `__publicField` and offers no setter — but the `reflection` getter reads the
 * field directly, and the renderer checks `type.reflection` before
 * `type.externalUrl`. The supported external-link hook is not an option here:
 * it only ever yields a URL string, emitted verbatim as an `external` anchor
 * with `target="_blank"`, so a same-site page would open in a new tab and a
 * relative href would break by page depth.
 *
 * Because the write is unsupported, each one is read back. A TypeDoc release
 * that renames the field turns into a loud build failure through `failures`
 * rather than a silently unlinked site.
 *
 * A name match alone is not enough to link. `reDeclaredNames` is the set of
 * names this package actually re-declares from {@link LINKED_PACKAGE}, read
 * from source by the plugin; a local export that merely shares a name with an
 * upstream type is not a page for it, and linking to it would be worse than
 * the plain text we started with. `@carbon/ai-chat-components` already declares
 * four separate `Action` interfaces, so the collision is available today.
 *
 * The same reasoning rules out guessing when one name arrives from two
 * different upstream files: only one of them can own the local page, and
 * nothing here can tell which.
 *
 * @param {import("typedoc").ProjectReflection} project
 * @param {Set<string>} reDeclaredNames
 * @returns {RepointResult}
 */
export function repointCrossPackageReferences(project, reDeclaredNames) {
  const moduleExports = collectModuleExports(project);
  const residue = new Map();
  const failures = [];
  let fixed = 0;
  let skipped = 0;

  const candidates = [];
  for (const { type, owner } of discoverReferenceTypes(project)) {
    if (type.package !== LINKED_PACKAGE) {
      continue;
    }
    // Already resolved, already carrying a URL, or a type parameter / mapped
    // type that is broken on purpose. Same guards TypeDoc's own export
    // validation applies before it reports a symbol as missing.
    if (type.reflection || type.externalUrl || type.isIntentionallyBroken()) {
      continue;
    }
    if (type.symbolId && project.symbolIdHasBeenRemoved(type.symbolId)) {
      continue;
    }
    if (isSelfReference(type, owner, moduleExports)) {
      skipped += 1;
      continue;
    }
    candidates.push({ type, owner });
  }

  const sourcesByName = new Map();
  for (const { type } of candidates) {
    const seen = sourcesByName.get(type.name) ?? new Set();
    seen.add(sourceOf(type));
    sourcesByName.set(type.name, seen);
  }

  for (const { type, owner } of candidates) {
    const ambiguous = sourcesByName.get(type.name).size > 1;
    const reDeclared = reDeclaredNames.has(type.name);
    const target =
      ambiguous || !reDeclared
        ? undefined
        : preferredTarget(
            type,
            (moduleExports.get(type.name) ?? []).filter(
              (reflection) => reflection !== owner
            )
          );

    if (!target) {
      const entry = describe(type, owner, reDeclaredNames, ambiguous);
      // One error per upstream symbol, however many signatures reach it. Keyed
      // like TypeDoc's own `symbolId.getStableKey()` so two upstream types
      // sharing a name report as two gaps rather than collapsing into one.
      const key = `${entry.source}#${entry.qualifiedName}`;
      if (!residue.has(key)) {
        residue.set(key, entry);
      }
      continue;
    }

    type._target = target.id;
    if (type.reflection?.id === target.id) {
      fixed += 1;
    } else {
      failures.push(describe(type, owner, reDeclaredNames, false));
    }
  }

  return {
    fixed,
    skipped,
    residue: [...residue.values()],
    failures,
  };
}

/**
 * @param {import("typedoc").ReferenceType} type
 * @returns {string} "packageName/packagePath" of the upstream declaration.
 */
function sourceOf(type) {
  const symbolId = type.symbolId;
  return symbolId
    ? `${symbolId.packageName}/${symbolId.packagePath}`
    : LINKED_PACKAGE;
}

/**
 * @param {import("typedoc").ReferenceType} type
 * @param {Reflection} owner
 * @param {Set<string>} reDeclaredNames
 * @param {boolean} ambiguous
 * @returns {Residue}
 */
function describe(type, owner, reDeclaredNames, ambiguous) {
  const qualifiedName = type.qualifiedName ?? type.name;
  let reason = 'missing';
  if (ambiguous) {
    reason = 'ambiguous';
  } else if (
    type.name !== qualifiedName &&
    reDeclaredNames.has(qualifiedName)
  ) {
    // The reference renders the upstream import alias (`_X`) while `X` is
    // re-declared locally: the referring site reached past our alias.
    reason = 'bypassed';
  }
  return {
    name: type.name,
    qualifiedName,
    source: sourceOf(type),
    owner: owner.getFriendlyFullName(),
    reason,
  };
}
