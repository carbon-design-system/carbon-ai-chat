/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

/** How an import reaches its target. A `type` edge is erased from emitted code. */
export type EdgeKind = 'runtime' | 'type';

export interface SourceEdge {
  from: string;
  /** A package-relative path, or the bare specifier of an external module. */
  to: string;
  kind: EdgeKind;
  external: boolean;
}

/** A folder this rule's files may import, limited to some edge kinds or to JSON data. */
export interface AllowedFolder {
  folder: string;
  only?: Array<EdgeKind | 'data'>;
}

/**
 * Rules are data so a later layer can add its own folder.
 * A file falls under the most specific rule whose folder contains it.
 */
export interface FolderRule {
  folder: string;
  mayImport: Array<string | AllowedFolder>;
  /**
   * Forbids anything the folder reaches, through any edge kind, from importing
   * a framework or registering a custom element.
   */
  frameworkFree?: boolean;
}

export interface BoundaryException {
  /** For a framework exception, the framework-free folder whose walk reaches it. */
  folder?: string;
  from: string;
  to: string;
  /** The chunk or issue that removes this exception. */
  owner: string;
  reason: string;
}

// Both builds map to the same source; `es-custom` only renames tags.
const COMPONENTS_PREFIX = /^@carbon\/ai-chat-components\/es(-custom)?\//;
const FRAMEWORKS = [
  /^react(\/|$)/,
  /^react-dom(\/|$)/,
  /^use-sync-external-store(\/|$)/,
  /^lit(\/|$)/,
  /^lit-html(\/|$)/,
  /^lit-element(\/|$)/,
  /^@lit\//,
  /^@lit-labs\//,
  /^@carbon\/react(\/|$)/,
  // Carbon's element modules register on load; only `defs` modules are data.
  /^@carbon\/web-components\/es(-custom)?\/components\/(?!.*\/defs\.js$)/,
];
const COMPONENTS_SOURCE = '../ai-chat-components/src';
// Style sheets the components package imports; they carry no code edges.
const STYLES = /\.s?css(\?.*)?$/;
// A decorator, or any use of `customElements` besides a lookup, aliases included.
const REGISTERS =
  /@carbonElement\(|@customElement\(|\bcustomElements\b(?!\s*\??\.\s*(get|whenDefined)\b)/;

/** A string literal under any casts and parentheses, as in `import(('x' as any))`. */
function literalText(node: ts.Expression | undefined) {
  while (
    node &&
    (ts.isAsExpression(node) || ts.isParenthesizedExpression(node))
  ) {
    node = node.expression;
  }
  return node && ts.isStringLiteralLike(node) ? node.text : undefined;
}

/**
 * The module a node imports: an import or export declaration, an `import()`
 * type or call, or a `require` call. Null marks a dynamic import whose
 * argument isn't a literal.
 */
function importedModule(node: ts.Node): string | null | undefined {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
    return literalText(node.moduleSpecifier);
  }
  if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
    return literalText(node.argument.literal as ts.Expression);
  }
  if (!ts.isCallExpression(node)) {
    return undefined;
  }
  if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
    return literalText(node.arguments[0]) ?? null;
  }
  const isRequire =
    ts.isIdentifier(node.expression) && node.expression.text === 'require';
  return isRequire ? literalText(node.arguments[0]) : undefined;
}

export function isFramework(specifier: string) {
  return FRAMEWORKS.some((pattern) => pattern.test(specifier));
}

/**
 * Builds the import graph of every file reachable from `roots`, including
 * type-only edges. Runtime edges come from transpiled output, so imports that
 * TypeScript erases count as type edges. Files in the components package are
 * followed through their source so a transitive registration is found.
 */
export class SourceGraph {
  readonly edges = new Map<string, SourceEdge[]>();
  readonly issues: string[] = [];

  private registrations = new Map<string, boolean>();

  constructor(
    private packageRoot: string,
    private read: (file: string) => string = (file) =>
      fs.readFileSync(file, 'utf8')
  ) {}

  /**
   * Returns a graph that reads `replaced` (package-relative paths) in place of
   * those files' contents and reuses this graph's other parsed files.
   */
  fork(replaced: Record<string, string>) {
    const fork = new SourceGraph(this.packageRoot, (file) => {
      const replacement = replaced[this.relative(file)];
      return replacement ?? this.read(file);
    });
    for (const [file, edges] of this.edges) {
      if (!(file in replaced)) {
        fork.edges.set(file, edges);
      }
    }
    for (const [file, registers] of this.registrations) {
      if (!(file in replaced)) {
        fork.registrations.set(file, registers);
      }
    }
    return fork;
  }

  relative(file: string) {
    return path.relative(this.packageRoot, file).replaceAll('\\', '/');
  }

  /** Returns the package-relative files reachable from `roots`, roots included. */
  reach(roots: string[], follow: (edge: SourceEdge) => boolean = () => true) {
    const seen = new Set<string>();
    const pending = [...roots];
    while (pending.length) {
      const file = pending.shift()!;
      if (seen.has(file)) {
        continue;
      }
      seen.add(file);
      for (const edge of this.edgesOf(file)) {
        if (!edge.external && follow(edge)) {
          pending.push(edge.to);
        }
      }
    }
    return seen;
  }

  edgesOf(file: string): SourceEdge[] {
    const cached = this.edges.get(file);
    if (cached) {
      return cached;
    }
    const edges = file.endsWith('.json') ? [] : this.parse(file);
    this.edges.set(file, edges);
    return edges;
  }

  /** True when this file registers a custom element when it loads. */
  registers(file: string) {
    if (!this.registrations.has(file)) {
      this.registrations.set(
        file,
        !file.endsWith('.json') &&
          REGISTERS.test(this.read(this.absolute(file)))
      );
    }
    return this.registrations.get(file);
  }

  private absolute(file: string) {
    return path.join(this.packageRoot, file);
  }

  private parse(file: string): SourceEdge[] {
    const text = this.read(this.absolute(file));
    const all = new Set<string>();
    const source = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true
    );
    const visit = (node: ts.Node) => {
      const specifier = importedModule(node);
      if (specifier === null) {
        this.issues.push(`${file}: nonliteral dynamic import`);
      } else if (specifier) {
        all.add(specifier);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    for (const reference of source.referencedFiles) {
      all.add(reference.fileName);
    }
    for (const reference of source.typeReferenceDirectives) {
      all.add(reference.fileName);
    }
    const runtime = file.endsWith('.d.ts')
      ? new Set<string>()
      : this.runtimeSpecifiers(file, text);
    // Emit can add a specifier the source never names, such as a JSX runtime.
    runtime.forEach((specifier) => all.add(specifier));
    return [...all]
      .filter((specifier) => !STYLES.test(specifier))
      .map((specifier) => {
        const kind: EdgeKind = runtime.has(specifier) ? 'runtime' : 'type';
        const target = this.resolve(file, specifier);
        if (target === null) {
          this.issues.push(`${file}: unresolved ${specifier}`);
        }
        return target
          ? { from: file, to: target, kind, external: false }
          : { from: file, to: specifier, kind, external: true };
      });
  }

  private runtimeSpecifiers(file: string, text: string) {
    const output = ts.transpileModule(text, {
      fileName: file,
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        experimentalDecorators: true,
      },
    }).outputText;
    const specifiers = new Set<string>();
    const emitted = ts.createSourceFile(
      file + '.js',
      output,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS
    );
    const visit = (node: ts.Node) => {
      const specifier = importedModule(node);
      if (specifier) {
        specifiers.add(specifier);
      }
      ts.forEachChild(node, visit);
    };
    visit(emitted);
    return specifiers;
  }

  /**
   * Resolves a specifier to a package-relative file. Returns `undefined` for an
   * external module, or `null` for a local path that doesn't exist.
   */
  private resolve(file: string, specifier: string): string | undefined | null {
    let base: string;
    if (specifier.startsWith('.')) {
      base = path.resolve(path.dirname(this.absolute(file)), specifier);
    } else if (COMPONENTS_PREFIX.test(specifier)) {
      base = path.resolve(
        this.packageRoot,
        COMPONENTS_SOURCE,
        specifier.replace(COMPONENTS_PREFIX, '')
      );
    } else {
      return undefined;
    }
    if (base.endsWith('.json')) {
      return fs.existsSync(base) ? this.relative(base) : null;
    }
    base = base.replace(/\.js$/, '');
    const found = [
      base + '.ts',
      base + '.tsx',
      base + '.d.ts',
      base + '/index.ts',
      base + '/index.tsx',
    ].find((candidate) => fs.existsSync(candidate));
    return found ? this.relative(found) : null;
  }
}

function ruleFor(rules: FolderRule[], file: string) {
  return rules
    .filter((rule) => file.startsWith(rule.folder))
    .sort((a, b) => b.folder.length - a.folder.length)[0];
}

function allows(rule: FolderRule | undefined, edge: SourceEdge) {
  return (
    !!rule &&
    rule.mayImport.some((entry) => {
      const allowed = typeof entry === 'string' ? { folder: entry } : entry;
      if (!edge.to.startsWith(allowed.folder)) {
        return false;
      }
      return (
        !allowed.only ||
        allowed.only.includes(edge.kind) ||
        (allowed.only.includes('data') && edge.to.endsWith('.json'))
      );
    })
  );
}

/**
 * Checks each file under a ruled folder. Returns one violation per offending
 * edge, as `from -> to`, so the caller can compare it with its exceptions.
 */
export function folderViolations(
  graph: SourceGraph,
  rules: FolderRule[],
  files: string[]
) {
  const violations = new Set<string>();
  for (const file of files) {
    const rule = ruleFor(rules, file);
    if (!rule) {
      continue;
    }
    for (const edge of graph.edgesOf(file)) {
      if (edge.external || isComponents(edge.to)) {
        continue;
      }
      // Any other path out of this package is never allowed.
      if (edge.to.startsWith('../') || !allows(rule, edge)) {
        violations.add(`${edge.from} -> ${edge.to}`);
      }
    }
  }
  return violations;
}

/**
 * For each framework-free folder, follows every edge from its files through
 * this package's own files. Reports each edge that imports a framework, or
 * that enters the components package at a module that reaches a framework or
 * registers an element, through any edge kind. A root that registers an
 * element is reported too. Each violation is `folder: from -> to`, so one
 * folder's exception doesn't cover a new path from another.
 */
export function frameworkViolations(
  graph: SourceGraph,
  rules: FolderRule[],
  files: string[]
) {
  const taints = componentTaint(graph);
  const violations = new Set<string>();
  for (const rule of rules.filter((candidate) => candidate.frameworkFree)) {
    const roots = files.filter((file) => ruleFor(rules, file) === rule);
    const report = (from: string, to: string) =>
      violations.add(`${rule.folder}: ${from} -> ${to}`);
    roots
      .filter((root) => graph.registers(root))
      .forEach((root) => report(root, 'customElements'));
    walkFrameworkFree(graph, rules, roots, taints, report);
  }
  return violations;
}

/** Whether a components-package module reaches a framework or a registration. */
function componentTaint(graph: SourceGraph) {
  const tainted = new Map<string, boolean>();
  return (entry: string) => {
    if (!tainted.has(entry)) {
      const reached = [...graph.reach([entry])];
      tainted.set(
        entry,
        reached.some(
          (file) =>
            graph.registers(file) ||
            graph.edgesOf(file).some((e) => e.external && isFramework(e.to))
        )
      );
    }
    return tainted.get(entry);
  };
}

/** Reports each framework edge reachable from `roots` through allowed edges. */
function walkFrameworkFree(
  graph: SourceGraph,
  rules: FolderRule[],
  roots: string[],
  taints: (entry: string) => boolean,
  report: (from: string, to: string) => void
) {
  const seen = new Set<string>();
  const pending = [...roots];
  while (pending.length) {
    const file = pending.shift()!;
    if (seen.has(file)) {
      continue;
    }
    seen.add(file);
    for (const edge of graph.edgesOf(file)) {
      if (frameworkEdge(graph, edge, taints)) {
        report(edge.from, edge.to);
      } else if (
        !edge.external &&
        !isComponents(edge.to) &&
        !edge.to.startsWith('../') &&
        allows(ruleFor(rules, file), edge)
      ) {
        // A disallowed edge is a folder violation; don't follow it into view code.
        pending.push(edge.to);
      }
    }
  }
}

function frameworkEdge(
  graph: SourceGraph,
  edge: SourceEdge,
  taints: (entry: string) => boolean
) {
  if (edge.external) {
    return isFramework(edge.to);
  }
  return isComponents(edge.to) ? taints(edge.to) : graph.registers(edge.to);
}

function isComponents(file: string) {
  return file.startsWith(COMPONENTS_SOURCE + '/');
}

/**
 * Lists each named type a file refers to from `names`, as `file: Name`. It
 * reads syntax only, so it finds a field, parameter or variable typed with a
 * view object or a view handle, without needing a type checker.
 */
export function typeReferences(
  read: (file: string) => string,
  files: string[],
  names: Set<string>
) {
  const found = new Set<string>();
  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      read(file),
      ts.ScriptTarget.Latest,
      true
    );
    const visit = (node: ts.Node) => {
      if (
        ts.isTypeReferenceNode(node) &&
        ts.isIdentifier(node.typeName) &&
        names.has(node.typeName.text)
      ) {
        found.add(`${file}: ${node.typeName.text}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return found;
}
