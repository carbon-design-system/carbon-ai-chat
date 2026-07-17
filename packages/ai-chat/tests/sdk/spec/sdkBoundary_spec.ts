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
 *  (a) has a *runtime* import of react/react-dom/lit/@lit/react or the `@carbon/ai-chat-components`
 *      package (Lit can ride in through any of its modules) — the sole exception being the
 *      import-free per-component `defs.js` enum modules;
 *  (b) imports (even type-only) a view-layer or app-boot module (`components/`, `components-legacy/`,
 *      `hooks/`, `providers/`, `contexts/`, `hocs/`, `AppShell*`, `utils-react/`, `boot/`) — no exceptions;
 *  (c) has a *type-only* import of a react-ish module and is not on the exact allowlist below.
 *
 * This is the mechanical proof (alongside the eslint fence in the root `package.json`) that the
 * SDK core stays framework-agnostic while the parallel Lit-views migration churns the tree.
 */

import * as fs from "fs";
import * as path from "path";

const SRC_ROOT = path.resolve(__dirname, "../../../src");
const ENTRY = path.join(SRC_ROOT, "chat/sdk/index.ts");

const REACT_ISH_BARE = new Set(["react", "react-dom", "lit", "@lit/react"]);
// The whole component package is banned, not just its React bindings: Lit (and any other
// framework runtime) can ride into the SDK graph through any of its modules. The sole exception
// is the per-component `defs.js` constant/enum modules — import-free contract files the public
// message types legitimately share with the component package.
const REACT_ISH_PATTERN = /^@carbon\/ai-chat-components(\/|$)/;
const COMPONENTS_DEFS_EXCEPTION =
  /^@carbon\/ai-chat-components\/es\/components\/[^/]+\/defs\.js$/;

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
 * The exact, exhaustive allowlist of public-types files permitted a type-only react-ish import.
 * These files unavoidably carry a `ReactNode`-shaped callback type on today's combined public
 * surface; type-only imports are erased at build time, so nothing framework-specific ships in the
 * SDK graph. Must not grow — the exactness test below fails on stale entries, so the list can only
 * shrink; it reaches zero when 2.0 splits these public types into framework-neutral + per-surface
 * variants.
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
 * Extracts every `import`/`export ... from` reference in a file's source text, classifying each
 * as runtime or type-only. Files ending in `.d.ts` are ambient declaration files — ALL their
 * imports are erased at compile time regardless of `import type` syntax (decision 10), so every
 * reference from such a file is forced type-only here.
 */
function extractImports(content: string, isDts: boolean): ImportRef[] {
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

describe("sdk boundary import graph", () => {
  const visited = new Set<string>();
  const runtimeViolations: string[] = [];
  const viewDirViolations: string[] = [];
  const typeOnlyViolations: string[] = [];
  const allowlistUsed = new Set<string>();

  function walk(file: string): void {
    if (visited.has(file)) {
      return;
    }
    visited.add(file);

    const content = fs.readFileSync(file, "utf8");
    const isDts = file.endsWith(".d.ts");
    const refs = extractImports(content, isDts);

    for (const ref of refs) {
      const { specifier, typeOnly } = ref;

      if (specifier.startsWith(".")) {
        const resolved = resolveRelative(file, specifier);
        if (!resolved) {
          throw new Error(
            `sdkBoundary_spec: could not resolve "${specifier}" imported from ${file}. ` +
              "Update the walker's resolution logic if this is a legitimate new import shape.",
          );
        }
        if (isViewDirPath(resolved)) {
          viewDirViolations.push(
            `${path.relative(SRC_ROOT, file)} -> ${path.relative(SRC_ROOT, resolved)}`,
          );
        }
        walk(resolved);
        continue;
      }

      const isReactIsh =
        REACT_ISH_BARE.has(specifier) ||
        (REACT_ISH_PATTERN.test(specifier) &&
          !COMPONENTS_DEFS_EXCEPTION.test(specifier));
      if (!isReactIsh) {
        continue;
      }

      if (!typeOnly) {
        runtimeViolations.push(
          `${path.relative(SRC_ROOT, file)} -> ${specifier}`,
        );
      } else if (ALLOWLIST.includes(file)) {
        allowlistUsed.add(file);
      } else {
        typeOnlyViolations.push(
          `${path.relative(SRC_ROOT, file)} -> ${specifier}`,
        );
      }
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
