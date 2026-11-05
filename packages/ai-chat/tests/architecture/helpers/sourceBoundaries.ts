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
 * Rules are data so a later layer can add its own folder (#2706 adds `view/`).
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
  from: string;
  to: string;
  /** The chunk or issue that removes this exception. */
  owner: string;
  reason: string;
}

const COMPONENTS_PREFIX = '@carbon/ai-chat-components/es/';
const FRAMEWORKS = [
  /^react(\/|$)/,
  /^react-dom(\/|$)/,
  /^lit(\/|$)/,
  /^@lit\//,
];
// Style sheets the components package imports; they carry no code edges.
const STYLES = /\.s?css(\?.*)?$/;
const REGISTERS = /@carbonElement\(|@customElement\(|customElements\.define\(/;

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
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        all.add(node.moduleSpecifier.text);
      } else if (
        ts.isImportTypeNode(node) &&
        ts.isLiteralTypeNode(node.argument) &&
        ts.isStringLiteral(node.argument.literal)
      ) {
        all.add(node.argument.literal.text);
      } else if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword
      ) {
        let [argument] = node.arguments;
        // `import('x' as any)` keeps a literal under the cast.
        while (
          argument &&
          (ts.isAsExpression(argument) ||
            ts.isParenthesizedExpression(argument))
        ) {
          argument = argument.expression;
        }
        if (argument && ts.isStringLiteralLike(argument)) {
          all.add(argument.text);
        } else {
          this.issues.push(`${file}: nonliteral dynamic import`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    const runtime = file.endsWith('.d.ts')
      ? new Set<string>()
      : this.runtimeSpecifiers(file, text);
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
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        specifiers.add(node.moduleSpecifier.text);
      } else if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments[0] &&
        ts.isStringLiteralLike(node.arguments[0])
      ) {
        specifiers.add(node.arguments[0].text);
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
    } else if (specifier.startsWith(COMPONENTS_PREFIX)) {
      base = path.resolve(
        this.packageRoot,
        '../ai-chat-components/src',
        specifier.slice(COMPONENTS_PREFIX.length)
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
      if (edge.external || edge.to.startsWith('../')) {
        continue;
      }
      if (!allows(rule, edge)) {
        violations.add(`${edge.from} -> ${edge.to}`);
      }
    }
  }
  return violations;
}

/**
 * Follows every edge from the framework-free folders through this package's
 * own files. Reports each edge that imports a framework, or that enters the
 * components package at a module that reaches a framework or registers an
 * element, through any edge kind. Each violation is `from -> to`.
 */
export function frameworkViolations(
  graph: SourceGraph,
  rules: FolderRule[],
  files: string[]
) {
  const tainted = new Map<string, boolean>();
  const taints = (entry: string) => {
    if (!tainted.has(entry)) {
      const reached = graph.reach([entry]);
      tainted.set(
        entry,
        [...reached].some(
          (file) =>
            graph.registers(file) ||
            graph.edgesOf(file).some((e) => e.external && isFramework(e.to))
        )
      );
    }
    return tainted.get(entry);
  };
  const roots = files.filter((file) => ruleFor(rules, file)?.frameworkFree);
  const violations = new Set<string>();
  const seen = new Set<string>();
  const pending = [...roots];
  while (pending.length) {
    const file = pending.shift()!;
    if (seen.has(file)) {
      continue;
    }
    seen.add(file);
    for (const edge of graph.edgesOf(file)) {
      if (edge.external) {
        if (isFramework(edge.to)) {
          violations.add(`${edge.from} -> ${edge.to}`);
        }
      } else if (edge.to.startsWith('../')) {
        if (taints(edge.to)) {
          violations.add(`${edge.from} -> ${edge.to}`);
        }
      } else if (graph.registers(edge.to)) {
        violations.add(`${edge.from} -> ${edge.to}`);
      } else if (allows(ruleFor(rules, file), edge)) {
        // A disallowed edge is a folder violation; don't follow it into view code.
        pending.push(edge.to);
      }
    }
  }
  return violations;
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
