/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Transitive import-graph boundary test. Walks every module reachable from the `sdk` barrel
 * (`src/chat/sdk/index.ts`) via plain `fs`-based static analysis (no bundler/AST — the codebase's
 * uniform ESM import style makes a simple import-regex sufficient) and fails if any reached
 * module:
 *
 *  (a) has a *runtime* import of react/react-dom/lit/@lit/react or of `@tiptap/*` — anywhere in the
 *      graph. A runtime import of a `@carbon/ai-chat-components` module is not banned outright: the
 *      walker resolves it to its source and follows it, so an import-free / type-only-only leaf (a
 *      per-component `defs.js`, `globals/utils/uuid.js`, the `json-utils.js` POJO helpers) rides in
 *      fine, while a module that transitively pulls Lit/React/Tiptap at runtime is flagged at the
 *      file that pulls it. Inside the component package only this runtime rule applies — the package
 *      references framework *types* internally and those are erased at build;
 *  (b) (ai-chat modules only) imports (even type-only) a view-layer or app-boot module (`components/`,
 *      `components-legacy/`, `hooks/`, `providers/`, `contexts/`, `hocs/`, `AppShell*`, `utils-react/`,
 *      `boot/`) — no exceptions;
 *  (c) (ai-chat modules only) has a *type-only* import of a react-ish module (react/lit or the
 *      component package) and is not on the exact allowlist below.
 *
 * This is the mechanical proof (alongside the eslint fence in the root `package.json`) that the
 * SDK core stays framework-agnostic while the parallel Lit-views migration churns the tree.
 */

import * as fs from "fs";
import * as path from "path";

const SRC_ROOT = path.resolve(__dirname, "../../../src");
const ENTRY = path.join(SRC_ROOT, "chat/sdk/index.ts");

// The sibling component package's source root. A runtime import of one of its modules is verified
// by resolution, not banned outright: the walker maps the specifier here and follows it (the build
// mirrors `src/` into `es/`), so a framework-free leaf rides in while a framework-carrying module is
// flagged at the file that pulls it. See `resolveComponentsPackage` and the walker below.
const COMPONENTS_PKG_SRC = path.resolve(
  SRC_ROOT,
  "../../ai-chat-components/src",
);

// Bare framework runtime packages. A *runtime* import of any of these — anywhere in the reachable
// graph, including inside the component package the walker follows into — pulls a framework into
// the SDK bundle. Type-only imports are erased; a react/lit type on an ai-chat public-types file is
// separately governed by the decision-10 allowlist (rule c), and Tiptap *types* are always fine.
const REACT_ISH_BARE = new Set(["react", "react-dom", "lit", "@lit/react"]);
const TIPTAP_BARE = /^@tiptap\//;
// Classifies a `@carbon/ai-chat-components` specifier (used by both the resolve-and-follow runtime
// branch and the decision-10 type-only check).
const REACT_ISH_PATTERN = /^@carbon\/ai-chat-components(\/|$)/;
const COMPONENTS_PKG_SPECIFIER =
  /^@carbon\/ai-chat-components\/(?:es|es-custom)\/(.+)$/;

const VIEW_DIR_SEGMENTS = [
  "/components/",
  "/components-legacy/",
  "/hooks/",
  "/providers/",
  "/contexts/",
  "/hocs/",
  "/utils-react/",
  "/boot/",
];

/** Matches the eslint fence's view-directory glob list (`**\/AppShell*`, etc.). */
function isViewDirPath(absPath: string): boolean {
  const normalized = absPath.split(path.sep).join("/");
  if (VIEW_DIR_SEGMENTS.some((segment) => normalized.includes(segment))) {
    return true;
  }
  return normalized
    .split("/")
    .some((segment) => segment.startsWith("AppShell"));
}

/**
 * The exact, exhaustive allowlist of ai-chat public-types files permitted a type-only react-ish
 * import. Each unavoidably re-declares a react-ish type from the component package on today's
 * combined public surface — a `ReactNode`-shaped callback (`MarkdownConfig`, `PublicConfig`), the
 * `ToolbarAction` react type (`HeaderConfig`), or the prompt-line config types (`InputConfig`).
 * Type-only imports are erased at build time, so nothing framework-specific ships in the SDK graph.
 * Aspires to shrink to zero when 2.0 splits these public types into framework-neutral + per-surface
 * variants; the exactness test below fails on stale entries, so it can never carry a dead entry.
 *
 * `types/utilities/HasChildren.d.ts` also carries a react-ish type, but on this branch it is only
 * imported from view-layer files (`components/`, `components-legacy/`, `providers/`) — it is not
 * reachable from the sdk barrel at all, so it is intentionally omitted here (an unreached file
 * can't be "used" and would fail the exactness check below). Add it back if a future change makes
 * it reachable from `src/chat/sdk/index.ts` and it needs the exemption at that point.
 */
const ALLOWLIST = [
  "types/config/MarkdownConfig.ts",
  "types/config/PublicConfig.ts",
  "types/config/HeaderConfig.ts",
  "types/config/InputConfig.ts",
].map((relativePath) => path.join(SRC_ROOT, relativePath));

interface ImportRef {
  specifier: string;
  typeOnly: boolean;
}

/** True only if every entry in a `{ ... }` named-import list is individually `type`-prefixed. */
function isFullyTypeOnlyNamedList(namedList: string): boolean {
  const entries = namedList
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return entries.length > 0 && entries.every((entry) => /^type\s+/.test(entry));
}

/**
 * Strips block and line comments so import-like text inside a comment — for example a
 * doc comment illustrating `import { X } from "./foo"` — is never mistaken for a real reference.
 * The line-comment pass spares `://` so a protocol in a string specifier survives. Good enough for
 * this heuristic scanner; it does not attempt to honor comment-like sequences inside string literals.
 */
function stripComments(content: string): string {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
}

/**
 * Extracts every `import`/`export ... from` reference in a file's source text, classifying each
 * as runtime or type-only. Files ending in `.d.ts` are ambient declaration files — ALL their
 * imports are erased at compile time regardless of `import type` syntax (decision 10), so every
 * reference from such a file is forced type-only here.
 */
function extractImports(source: string, isDts: boolean): ImportRef[] {
  const content = stripComments(source);
  const refs: ImportRef[] = [];

  // import [type] <clause> from "specifier" — default, named, namespace, and combined forms.
  const importFromRe =
    /\bimport\s+(type\s+)?(\{[\s\S]*?\}|\*\s+as\s+[\w$]+|[\w$]+(?:\s*,\s*\{[\s\S]*?\})?)\s+from\s+["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = importFromRe.exec(content))) {
    const [, typeKeyword, clause, specifier] = match;
    let typeOnly = Boolean(typeKeyword);
    const trimmedClause = clause.trim();
    if (
      !typeOnly &&
      trimmedClause.startsWith("{") &&
      trimmedClause.endsWith("}")
    ) {
      typeOnly = isFullyTypeOnlyNamedList(trimmedClause.slice(1, -1));
    }
    refs.push({ specifier, typeOnly: typeOnly || isDts });
  }

  // Side-effect-only: import "specifier"; (no clause/from at all).
  const sideEffectRe = /\bimport\s+["']([^"']+)["']/g;
  while ((match = sideEffectRe.exec(content))) {
    refs.push({ specifier: match[1], typeOnly: isDts });
  }

  // export [type] {...} from "specifier"  /  export [type] * from "specifier" (re-exports).
  const exportFromRe =
    /\bexport\s+(type\s+)?(\*|\{[\s\S]*?\})\s+from\s+["']([^"']+)["']/g;
  while ((match = exportFromRe.exec(content))) {
    const [, typeKeyword, clause, specifier] = match;
    let typeOnly = Boolean(typeKeyword);
    const trimmedClause = clause.trim();
    if (!typeOnly && trimmedClause.startsWith("{")) {
      typeOnly = isFullyTypeOnlyNamedList(trimmedClause.slice(1, -1));
    }
    refs.push({ specifier, typeOnly: typeOnly || isDts });
  }

  return refs;
}

/** Resolves a relative specifier back to its `.ts`/`.tsx`/`.d.ts` source file (the repo's ESM
 * `.js`-extension convention on relative imports). Returns `null` if nothing resolves. */
function resolveRelative(fromFile: string, specifier: string): string | null {
  const dir = path.dirname(fromFile);
  const clean = specifier.replace(/\.js$/, "");
  const base = path.resolve(dir, clean);
  const candidates = [
    base, // already has a literal extension the repo doesn't strip (e.g. "en.json")
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.d.ts`,
    `${base}.json`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

/** Maps a `@carbon/ai-chat-components/es[-custom]/<rest>.js` specifier to its source `.ts(x)` file in
 * the sibling package (the build mirrors `src/` into `es/`). Returns `null` if nothing resolves. */
function resolveComponentsPackage(specifier: string): string | null {
  const match = COMPONENTS_PKG_SPECIFIER.exec(specifier);
  if (!match) {
    return null;
  }
  const rest = match[1].replace(/\.js$/, "");
  const base = path.join(COMPONENTS_PKG_SRC, rest);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.d.ts`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

describe("sdk boundary import graph", () => {
  const visited = new Set<string>();
  const runtimeViolations: string[] = [];
  const viewDirViolations: string[] = [];
  const typeOnlyViolations: string[] = [];
  const allowlistUsed = new Set<string>();

  /** Records a type-only react-ish import from an ai-chat public-types file against the decision-10
   * allowlist (rule c). Only meaningful for files under `SRC_ROOT`. */
  function chargeTypeOnly(file: string, specifier: string): void {
    if (ALLOWLIST.includes(file)) {
      allowlistUsed.add(file);
    } else {
      typeOnlyViolations.push(
        `${path.relative(SRC_ROOT, file)} -> ${specifier}`,
      );
    }
  }

  function walk(file: string): void {
    if (visited.has(file)) {
      return;
    }
    visited.add(file);

    // Files the walker followed into the sibling component package. There only the runtime rule (a)
    // applies: the package references react/lit/web-components *types* internally (all erased), and
    // its own `src/components/…` shape is unrelated to the ai-chat view-layer ban (b) / allowlist (c).
    const inComponentsPkg = file.startsWith(COMPONENTS_PKG_SRC);

    const content = fs.readFileSync(file, "utf8");
    const isDts = file.endsWith(".d.ts");
    const refs = extractImports(content, isDts);

    for (const ref of refs) {
      const { specifier, typeOnly } = ref;

      // Relative import: resolve within whichever tree `file` lives in and recurse.
      if (specifier.startsWith(".")) {
        const resolved = resolveRelative(file, specifier);
        if (!resolved) {
          throw new Error(
            `sdkBoundary_spec: could not resolve "${specifier}" imported from ${file}. ` +
              "Update the walker's resolution logic if this is a legitimate new import shape.",
          );
        }
        if (!inComponentsPkg && isViewDirPath(resolved)) {
          viewDirViolations.push(
            `${path.relative(SRC_ROOT, file)} -> ${path.relative(SRC_ROOT, resolved)}`,
          );
        }
        walk(resolved);
        continue;
      }

      // Rule (a): a runtime import of a bare framework package (react/lit) or Tiptap pulls a
      // framework into the bundle wherever it appears — including inside the component package.
      if (REACT_ISH_BARE.has(specifier) || TIPTAP_BARE.test(specifier)) {
        if (!typeOnly) {
          runtimeViolations.push(
            `${path.relative(SRC_ROOT, file)} -> ${specifier}`,
          );
        } else if (!inComponentsPkg && REACT_ISH_BARE.has(specifier)) {
          // A react/lit *type* on an ai-chat public-types file is decision-10 territory (c). Tiptap
          // types, and any framework type inside the component package, are erased and allowed.
          chargeTypeOnly(file, specifier);
        }
        continue;
      }

      // The component package: verify by resolution rather than banning wholesale.
      if (REACT_ISH_PATTERN.test(specifier)) {
        if (typeOnly) {
          // Rule (c) for ai-chat public-types files; an erased internal type inside the package.
          if (!inComponentsPkg) {
            chargeTypeOnly(file, specifier);
          }
          continue;
        }
        const resolved = resolveComponentsPackage(specifier);
        if (!resolved) {
          // A built-only artifact with no source counterpart — can't prove it framework-free.
          runtimeViolations.push(
            `${path.relative(SRC_ROOT, file)} -> ${specifier} (unresolved)`,
          );
          continue;
        }
        walk(resolved);
        continue;
      }

      // Any other bare package (lodash, @formatjs, @carbon/web-components, …): not our concern.
    }
  }

  beforeAll(() => {
    walk(ENTRY);
  });

  it("has no runtime react/lit imports anywhere in the reachable graph", () => {
    expect(runtimeViolations).toEqual([]);
  });

  it("does not import view-layer modules anywhere in the reachable graph", () => {
    expect(viewDirViolations).toEqual([]);
  });

  it("limits type-only react-ish imports to the exact decision-10 allowlist", () => {
    expect(typeOnlyViolations).toEqual([]);
  });

  it("keeps the decision-10 allowlist exact (every entry still needs its exemption)", () => {
    const stale = ALLOWLIST.filter((file) => !allowlistUsed.has(file)).map(
      (file) => path.relative(SRC_ROOT, file),
    );
    expect(stale).toEqual([]);
  });
});
