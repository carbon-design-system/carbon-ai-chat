/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { addedLines, contentOf, parseNumstat } from './measure-lib.mjs';
import { produceCoverage } from './contract-coverage-jest.mjs';

const PACKAGE = 'packages/ai-chat';
const RUNTIME = /^packages\/ai-chat\/src\/.*\.[jt]sx?$/;
const INPUTS = [
  'package.json',
  'package-lock.json',
  'scripts/contract-coverage.mjs',
  'scripts/contract-coverage-jest.mjs',
  `${PACKAGE}/package.json`,
  `${PACKAGE}/jest.config.cjs`,
  `${PACKAGE}/tsconfig.json`,
  `${PACKAGE}/src`,
  `${PACKAGE}/tests`,
  'packages/ai-chat-components/package.json',
  'packages/ai-chat-components/src',
];

function filesAt(path) {
  if (!existsSync(path)) {
    return [];
  }
  if (lstatSync(path).isSymbolicLink()) {
    throw new Error(`unexpected coverage-input symlink: ${path}`);
  }
  return lstatSync(path).isDirectory()
    ? readdirSync(path)
        .sort()
        .flatMap((name) => filesAt(join(path, name)))
    : [path];
}

export function fingerprint(inputs, environment = process.env) {
  const overrides = Object.fromEntries(
    Object.entries(environment)
      .filter(
        ([key]) =>
          ![
            'npm_lifecycle_event',
            'npm_lifecycle_script',
            'CONTRACT_COVERAGE_REPORT',
          ].includes(key)
      )
      .sort(([left], [right]) => left.localeCompare(right))
  );
  const execution = {
    versions: process.versions,
    executable: process.execPath,
    platform: process.platform,
    arch: process.arch,
    execArgv: process.execArgv,
    intl: Intl.DateTimeFormat().resolvedOptions(),
    environment: overrides,
  };
  const hash = createHash('sha256')
    .update(JSON.stringify(execution))
    .update('\0');
  for (const path of inputs.flatMap(filesAt).sort()) {
    hash.update(path).update('\0').update(readFileSync(path)).update('\0');
  }
  return hash.digest('hex');
}

function selectedTreeMatches(source) {
  if (source === 'worktree') {
    return true;
  }
  const tree = source === 'head' ? ['HEAD'] : [];
  const result = spawnSync('git', [
    'diff',
    '--quiet',
    ...tree,
    '--',
    ...INPUTS,
  ]);
  const untracked = spawnSync(
    'git',
    ['ls-files', '--others', '--exclude-standard', '--', ...INPUTS],
    { encoding: 'utf8' }
  );
  return result.status === 0 && untracked.status === 0 && !untracked.stdout;
}

function producerInputs() {
  const requireFromPackage = createRequire(resolve(PACKAGE, 'package.json'));
  const components = requireFromPackage.resolve(
    '@carbon/ai-chat-components/package.json'
  );
  const built = join(components, '..', 'es');
  if (!existsSync(built)) {
    throw new Error('components output is missing; run the build preflight');
  }
  return [...INPUTS, components, built];
}

function overlaps(loc, line) {
  return (
    Number.isFinite(loc?.start?.line) &&
    Number.isFinite(loc?.end?.line) &&
    loc.start.line <= line &&
    loc.end.line >= line
  );
}

function statementsAt(data, line, owner) {
  return Object.entries(data.statementMap).filter(([, loc]) => {
    const startsInOwner =
      !owner ||
      loc.start.line > owner.line ||
      (loc.start.line === owner.line && loc.start.column >= owner.column);
    return overlaps(loc, line) && startsInOwner;
  });
}

function executed(data, statements) {
  const width = (loc) => loc.end.line - loc.start.line;
  const narrowest = Math.min(...statements.map(([, loc]) => width(loc)));
  return statements
    .filter(([, loc]) => width(loc) === narrowest)
    .some(([id]) => data.s[id] > 0);
}

function typeOnly(text, file) {
  return (
    ts
      .transpileModule(text, {
        fileName: file,
        compilerOptions: {
          target: ts.ScriptTarget.ESNext,
          module: ts.ModuleKind.ESNext,
        },
      })
      .outputText.replace(/export\s*\{\s*\};?/, '')
      .trim() === ''
  );
}

function statementOwners(source) {
  const owners = new Map();
  function record(node) {
    const start = source.getLineAndCharacterOfPosition(node.getStart(source));
    const end = source.getLineAndCharacterOfPosition(node.end);
    for (let line = start.line; line <= end.line; line += 1) {
      owners.set(line + 1, { line: start.line + 1, column: start.character });
    }
  }
  function visit(node) {
    if (ts.isStatement(node) && !ts.isBlock(node)) {
      record(node);
    }
    if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) {
      let body = node.body;
      while (ts.isParenthesizedExpression(body)) {
        body = body.expression;
      }
      record(body);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return owners;
}

function sourceSyntax(text, file) {
  const lines = text.split('\n');
  const nonExecutable = new Set(lines.map((_, index) => index + 1));
  if (typeOnly(text, file)) {
    return { nonExecutable, owners: new Map() };
  }
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const types = [];
  function collect(node) {
    const typeDeclaration =
      ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node);
    const typeImport =
      ts.isImportDeclaration(node) && node.importClause?.isTypeOnly;
    const typeExport = ts.isExportDeclaration(node) && node.isTypeOnly;
    const runtimeExpression =
      ts.isExpressionWithTypeArguments(node) && !ts.isPartOfTypeNode(node);
    if (
      typeDeclaration ||
      typeImport ||
      typeExport ||
      (ts.isTypeNode(node) && !runtimeExpression)
    ) {
      types.push([node.getStart(source), node.end]);
    } else {
      ts.forEachChild(node, collect);
    }
  }
  collect(source);
  const delimiters = new Set(['{', '}', '(', ')', '[', ']', ';', ',']);
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    true,
    ts.LanguageVariant.JSX,
    text
  );
  for (
    let token = scanner.scan();
    token !== ts.SyntaxKind.EndOfFileToken;
    token = scanner.scan()
  ) {
    const start = scanner.getTokenPos();
    const end = scanner.getTextPos();
    if (
      delimiters.has(scanner.getTokenText()) ||
      types.some(([a, b]) => a <= start && end <= b)
    ) {
      continue;
    }
    const first = source.getLineAndCharacterOfPosition(start).line + 1;
    const last =
      source.getLineAndCharacterOfPosition(Math.max(start, end - 1)).line + 1;
    for (let line = first; line <= last; line += 1) {
      nonExecutable.delete(line);
    }
  }
  return { nonExecutable, owners: statementOwners(source) };
}

function lineCategory(data, line, syntaxOnly, owner) {
  if (syntaxOnly) {
    return 'nonExecutable';
  }
  const statements = data ? statementsAt(data, line, owner) : [];
  if (statements.length === 0) {
    return syntaxOnly ? 'nonExecutable' : 'unverified';
  }
  return executed(data, statements) ? 'covered' : 'gaps';
}

function untakenBranches(data, file, line) {
  const branches = [];
  for (const [id, branch] of Object.entries(data.branchMap)) {
    if (
      !overlaps(branch.loc, line) &&
      !branch.locations.some((loc) => overlaps(loc, line))
    ) {
      continue;
    }
    data.b[id].forEach((count, arm) => {
      if (count === 0) {
        const armLoc = branch.locations[arm];
        const loc = Number.isFinite(armLoc?.start?.line) ? armLoc : branch.loc;
        if (!Number.isFinite(loc?.start?.line)) {
          throw new Error(`missing branch location in ${file}`);
        }
        branches.push(`${file}:${loc.start.line} branch ${id}/${arm}`);
      }
    });
  }
  return branches;
}

function coveragePath(file) {
  const canonical = (path) => (existsSync(path) ? realpathSync(path) : path);
  return relative(
    canonical(process.cwd()),
    canonical(resolve(file))
  ).replaceAll('\\', '/');
}

/** Read Istanbul maps without depending on a test runner's result format. */
export function coverageGaps(rows, coverage, sourceText) {
  const indexed = new Map(
    Object.entries(coverage).map(([file, data]) => [
      coveragePath(data.path ?? file),
      data,
    ])
  );
  const result = { gaps: [], nonExecutable: [], unverified: [] };
  const branches = new Set();
  const syntax = new Map();
  for (const { file, line } of rows) {
    if (!syntax.has(file)) {
      syntax.set(file, sourceSyntax(sourceText(file), file));
    }
    const data = indexed.get(file);
    const { nonExecutable, owners } = syntax.get(file);
    const category = lineCategory(
      data,
      line,
      nonExecutable.has(line),
      owners.get(line)
    );
    if (category !== 'covered') {
      result[category].push(`${file}:${line}`);
    }
    if (data && category !== 'nonExecutable') {
      untakenBranches(data, file, line).forEach((branch) =>
        branches.add(branch)
      );
    }
  }
  return { ...result, branches: [...branches] };
}

export function readVerifiedCoverage(report, expected) {
  const metadata = JSON.parse(readFileSync(`${report}.meta.json`, 'utf8'));
  if (metadata.fingerprint !== expected) {
    throw new Error(
      'coverage source fingerprint does not match the selected tree'
    );
  }
  const bytes = readFileSync(report);
  if (metadata.report !== createHash('sha256').update(bytes).digest('hex')) {
    throw new Error(
      'coverage report digest does not match its contract metadata'
    );
  }
  return JSON.parse(bytes.toString('utf8'));
}

function changedRuntimeLines(base, source) {
  const rows = addedLines(base, source);
  if (source === 'worktree') {
    const result = spawnSync(
      'git',
      [
        'ls-files',
        '--others',
        '--exclude-standard',
        '-z',
        '--',
        `${PACKAGE}/src`,
      ],
      { encoding: 'utf8' }
    );
    if (result.status !== 0) {
      throw new Error('cannot discover untracked runtime source');
    }
    for (const file of result.stdout
      .split('\0')
      .filter((path) => RUNTIME.test(path) && !path.endsWith('.d.ts'))) {
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((text, index) => {
          rows.push({ file, line: index + 1, text });
        });
    }
  }
  return rows.filter(
    ({ file }) => RUNTIME.test(file) && !file.endsWith('.d.ts')
  );
}

function selectionIdentity(source) {
  if (source === 'worktree') {
    return source;
  }
  const args =
    source === 'head' ? ['rev-parse', 'HEAD'] : ['ls-files', '--stage', '-z'];
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`cannot read selected ${source} identity`);
  }
  return result.stdout;
}

function deletedRuntimeLines(base, source) {
  const endpoints = {
    head: [base, 'HEAD'],
    index: ['--cached', base],
    worktree: [base],
  }[source];
  const result = spawnSync('git', ['diff', '--numstat', '-z', ...endpoints], {
    encoding: 'utf8',
    maxBuffer: Infinity,
  });
  if (result.status !== 0) {
    throw new Error('cannot inspect runtime source deletions');
  }
  return parseNumstat(result.stdout)
    .filter(({ path, oldPath }) =>
      [path, oldPath].some(
        (file) => file && RUNTIME.test(file) && !file.endsWith('.d.ts')
      )
    )
    .reduce((total, row) => total + row.deleted, 0);
}

function verifySelection({ base, source, selected, rows }) {
  if (selectionIdentity(source) !== selected || !selectedTreeMatches(source)) {
    throw new Error(`selected ${source} changed during coverage production`);
  }
  if (
    JSON.stringify(changedRuntimeLines(base, source)) !== JSON.stringify(rows)
  ) {
    throw new Error('selected runtime diff changed during coverage production');
  }
}

function formatResult(result) {
  return [
    `uncovered changed runtime lines: ${result.gaps.length}`,
    ...result.gaps,
    `untaken affected branch arms: ${result.branches.length}`,
    ...result.branches,
    `non-executable/type-only changed lines: ${result.nonExecutable.length}`,
    `unverified changed lines (missing file data): ${result.unverified.length}`,
    ...result.unverified,
    'Executed lines still need assertions and a named planted-break proof.',
  ].join('\n');
}

export function contractCoverage(
  base,
  source,
  cached = process.env.CONTRACT_COVERAGE_REPORT
) {
  try {
    const selected = selectionIdentity(source);
    const rows = changedRuntimeLines(base, source);
    if (!rows.length) {
      const deleted = deletedRuntimeLines(base, source);
      return deleted
        ? `skipped producer: ${deleted} deleted source lines have no after-side runtime lines to attribute`
        : 'skipped: no changed ai-chat runtime source lines';
    }
    if (!selectedTreeMatches(source)) {
      throw new Error(
        `worktree inputs differ from --source ${source}; use a matching clean checkout`
      );
    }
    const inputs = producerInputs();
    const before = fingerprint(inputs);
    const text = new Map(
      [...new Set(rows.map(({ file }) => file))].map((file) => [
        file,
        contentOf(source, file),
      ])
    );
    const report =
      cached ??
      produceCoverage(mkdtempSync(join(tmpdir(), 'contract-coverage-')));
    if (fingerprint(inputs) !== before) {
      throw new Error('coverage inputs changed during the run');
    }
    verifySelection({ base, source, selected, rows });
    if (!cached) {
      writeFileSync(
        `${report}.meta.json`,
        JSON.stringify({
          fingerprint: before,
          report: createHash('sha256')
            .update(readFileSync(report))
            .digest('hex'),
        }) + '\n'
      );
    }
    const coverage = readVerifiedCoverage(report, before);
    const result = coverageGaps(rows, coverage, (file) => text.get(file));
    return `${formatResult(result)}\nreport: ${report}`;
  } catch (error) {
    return `unverified: ${error.message}`;
  }
}
