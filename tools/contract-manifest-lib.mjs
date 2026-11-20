/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @license
 */

import { createHash } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import ts from 'typescript';

export const CONTRACT = 'packages/ai-chat/tests/contract';
export const MANIFEST = `${CONTRACT}/MANIFEST.tsv`;
const PACKAGE = 'packages/ai-chat';
const COLOCATED_ROOTS = ['sdk', 'chat', 'react', 'web-components'].map(
  (area) => `${PACKAGE}/src/${area}/__tests__`
);
const COLOCATED_HELPERS = new Set([
  `${PACKAGE}/src/sdk/__tests__/helpers/publicContract.ts`,
]);
const PUBLIC_ENTRIES = new Set([
  `${PACKAGE}/src/aiChatEntry.tsx`,
  `${PACKAGE}/src/serverEntry.ts`,
  `${PACKAGE}/src/sdk/index.ts`,
  `${PACKAGE}/src/web-components/cds-aichat-container/index.ts`,
  `${PACKAGE}/src/web-components/cds-aichat-custom-element/index.ts`,
]);
const PUBLIC_IMPORTS = new Set([
  '@carbon/ai-chat',
  '@carbon/ai-chat/es-custom',
  '@carbon/ai-chat/server',
  ...['cds-aichat-container', 'cds-aichat-custom-element'].map(
    (tag) => `@carbon/ai-chat/dist/es/web-components/${tag}/index.js`
  ),
]);
const HEADER = 'kind\tfile\ttitle\tsha256\n';
const KINDS = new Set(['test', 'helper', 'context']);
const REGISTRATIONS = new Set(['it', 'test', 'describe', 'describeShared']);
const TEXT_HELPER =
  /\.(?:[cm]?[jt]sx?|json|txt|mdx?|css|scss|html?|svg|xml|ya?ml|[ct]sv)$/i;
export const hash = (value) =>
  createHash('sha256')
    .update(typeof value === 'string' ? value.replace(/\r\n?/g, '\n') : value)
    .digest('hex');
const posix = (path) => path.replaceAll('\\', '/');
const identity = (row) =>
  `${row.kind}\t${row.file}\t${JSON.stringify(row.title)}`;

function isContractSpec(file) {
  return (
    (file.startsWith(`${CONTRACT}/spec/`) && /_spec\.tsx?$/.test(file)) ||
    (COLOCATED_ROOTS.some((root) => file.startsWith(`${root}/`)) &&
      /\.contract(?:\.browser)?\.test\.tsx?$/.test(file))
  );
}

function isContractHelper(file) {
  return file.startsWith(`${CONTRACT}/helpers/`) || COLOCATED_HELPERS.has(file);
}

export function contractInventory(root) {
  const read = (path) =>
    existsSync(join(root, path)) ? filesIn(root, path) : [];
  const specs = [
    ...read(`${CONTRACT}/spec`),
    ...COLOCATED_ROOTS.flatMap(read),
  ].filter(isContractSpec);
  const helpers = [
    ...read(`${CONTRACT}/helpers`),
    ...[...COLOCATED_HELPERS].filter((file) => existsSync(join(root, file))),
  ];
  for (const file of [...specs, ...helpers]) {
    if (lstatSync(join(root, file)).isSymbolicLink()) {
      throw new Error(`Unexpected symlink: ${file}`);
    }
    assertContractImports(root, file);
  }
  return { specs, helpers };
}

function importedModule(node) {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
    return node.moduleSpecifier;
  }
  if (
    ts.isImportEqualsDeclaration(node) &&
    ts.isExternalModuleReference(node.moduleReference)
  ) {
    return node.moduleReference.expression;
  }
  if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
    return node.argument.literal;
  }
  if (
    ts.isCallExpression(node) &&
    (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
      (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
  ) {
    return node.arguments[0] ?? node;
  }
  return undefined;
}

function assertContractImports(root, file) {
  if (!/\.[cm]?[jt]sx?$/.test(file)) {
    return;
  }
  const bytes = readFileSync(join(root, file));
  if (!isUtf8(bytes) || bytes.includes(0)) {
    return;
  }
  const source = ts.createSourceFile(
    file,
    bytes.toString('utf8'),
    ts.ScriptTarget.Latest,
    true
  );
  if (source.parseDiagnostics.length) {
    throw new Error(`Cannot parse ${file}`);
  }
  walk(source, (node) => {
    const module = importedModule(node);
    if (!module) {
      return;
    }
    if (!ts.isStringLiteralLike(module)) {
      throw new Error(`Nonliteral contract import in ${file}`);
    }
    const specifier = module.text;
    if (!specifier.startsWith('.') && !isAbsolute(specifier)) {
      if (
        specifier.startsWith('@carbon/ai-chat/') &&
        !PUBLIC_IMPORTS.has(specifier)
      ) {
        throw new Error(`Private contract import: ${file} -> ${specifier}`);
      }
      return;
    }
    const resolved = ts.resolveModuleName(
      specifier,
      resolve(root, file),
      { moduleResolution: ts.ModuleResolutionKind.Bundler },
      ts.sys
    ).resolvedModule?.resolvedFileName;
    const target = resolved ? posix(relative(root, resolved)) : '';
    const publicSupport =
      !target.includes('/__tests__/') &&
      (target.startsWith(`${PACKAGE}/src/types/`) ||
        target.startsWith(`${PACKAGE}/src/testing/`));
    const allowed =
      PUBLIC_ENTRIES.has(target) || isContractHelper(target) || publicSupport;
    if (!target || !allowed) {
      throw new Error(
        `Private or unresolved contract import: ${file} -> ${specifier}`
      );
    }
  });
}

export function filesIn(root, path) {
  if (lstatSync(join(root, path)).isSymbolicLink()) {
    throw new Error(`Unexpected symlink: ${path}`);
  }
  return readdirSync(join(root, path), { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name, 'en'))
    .flatMap((entry) => {
      const child = `${path}/${entry.name}`;
      if (entry.isSymbolicLink()) {
        throw new Error(`Unexpected symlink: ${child}`);
      }
      if (entry.isDirectory()) {
        return filesIn(root, child);
      }
      if (!entry.isFile()) {
        throw new Error(`Not a regular file: ${child}`);
      }
      return [child];
    });
}

function rootName(node) {
  if (ts.isIdentifier(node)) {
    return node.text;
  }
  if (ts.isPropertyAccessExpression(node)) {
    return rootName(node.expression);
  }
  if (ts.isCallExpression(node) || ts.isTaggedTemplateExpression(node)) {
    return rootName(node.expression ?? node.tag);
  }
  return '';
}

function registration(node) {
  if (!ts.isCallExpression(node)) {
    return null;
  }
  const name = rootName(node.expression);
  if (!REGISTRATIONS.has(name)) {
    return null;
  }
  const callback = node.arguments[1];
  if (
    !callback ||
    (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback))
  ) {
    return null;
  }
  return { node, name, callback, test: name === 'it' || name === 'test' };
}

function walk(node, visit) {
  visit(node);
  ts.forEachChild(node, (child) => walk(child, visit));
}

function scopeText(scope, source, omitted) {
  if (omitted.includes(scope)) {
    return '';
  }
  const start = scope.getStart(source);
  const ranges = omitted
    .filter(
      (node) =>
        node !== scope &&
        node.getStart(source) >= start &&
        node.end <= scope.end
    )
    .map((node) => [node.getStart(source), node.end])
    .sort((a, b) => a[0] - b[0]);
  let cursor = start;
  let text = '';
  for (const [from, to] of ranges) {
    if (from < cursor) {
      continue;
    }
    text += source.text.slice(cursor, from);
    cursor = to;
  }
  const context = ts.createSourceFile(
    source.fileName,
    text + source.text.slice(cursor, scope.end),
    ts.ScriptTarget.Latest,
    true
  );
  if (context.parseDiagnostics.length) {
    throw new Error(`Unresolved context in ${source.fileName}`);
  }
  return ts
    .createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed })
    .printFile(context);
}

function statementOf(node) {
  return ts.isExpressionStatement(node.parent) ? node.parent : node;
}

function declaredFunction(node) {
  if (ts.isFunctionDeclaration(node) && node.name) {
    return { node, name: node.name.text };
  }
  if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name)) {
    return null;
  }
  const body = node.initializer;
  if (body && (ts.isArrowFunction(body) || ts.isFunctionExpression(body))) {
    return { node: body, name: node.name.text };
  }
  return null;
}

function assertUnfocused(node, source) {
  if (!ts.isCallExpression(node)) {
    return;
  }
  const spelling = node.expression.getText(source);
  if (
    /^(?:fit|xit|fdescribe|xdescribe)$|^(?:it|test|describe)\.(?:only|skip|todo)\b/.test(
      spelling
    )
  ) {
    throw new Error(`Focused or skipped registration in ${source.fileName}`);
  }
}

function registrationsIn(source) {
  const registrations = [];
  const functions = [];
  walk(source, (node) => {
    assertUnfocused(node, source);
    const item = registration(node);
    if (item) {
      registrations.push(item);
    }
    const fn = declaredFunction(node);
    if (fn) {
      functions.push(fn);
    }
  });
  return { registrations, functions };
}

function helperCallsIn(source, registrations, functions) {
  const names = new Set(
    functions
      .filter(({ node: fn }) =>
        registrations.some(({ node }) => node.pos > fn.pos && node.end < fn.end)
      )
      .map(({ name }) => name)
  );
  const calls = [];
  walk(source, (node) => {
    if (
      !ts.isCallExpression(node) ||
      !ts.isIdentifier(node.expression) ||
      !names.has(node.expression.text)
    ) {
      return;
    }
    const title = node.arguments[0];
    if (!title || !ts.isStringLiteralLike(title)) {
      throw new Error(
        `Unresolved registration helper call in ${source.fileName}`
      );
    }
    calls.push({
      node,
      key: `call:${node.expression.text}:${JSON.stringify(title.text)}`,
    });
  });
  return calls;
}

function registrationContext(item, registrations, source, omitted) {
  const file = source.fileName;
  const parents = registrations.filter(
    ({ callback }) =>
      callback.pos < item.node.pos && callback.end > item.node.end
  );
  const key = [...parents, item]
    .map(({ node, name }) => `${name}:${node.arguments[0].getText(source)}`)
    .join('/');
  const metadata =
    source.text.slice(
      item.node.getStart(source),
      item.callback.body.getStart(source)
    ) +
    '<body>' +
    source.text.slice(item.callback.body.end, item.node.end);
  const rows = [
    {
      kind: 'context',
      file,
      title: `registration:${key}`,
      sha256: hash(metadata),
    },
  ];
  if (!item.test) {
    rows.push({
      kind: 'context',
      file,
      title: `scope:${key}`,
      sha256: hash(scopeText(item.callback.body, source, omitted)),
    });
  }
  const at = source.getLineAndCharacterOfPosition(
    ts.isCallExpression(item.node.expression) ||
      ts.isTaggedTemplateExpression(item.node.expression)
      ? item.node.expression.end
      : item.node.getStart(source)
  );
  item.location = { line: at.line + 1, column: at.character + 1 };
  item.sha256 = hash(item.callback.body.getText(source));
  return { key, rows };
}

export function analyze(file, content) {
  const source = ts.createSourceFile(
    file,
    content,
    ts.ScriptTarget.Latest,
    true
  );
  if (source.parseDiagnostics.length) {
    throw new Error(`Cannot parse ${file}`);
  }
  const { registrations, functions } = registrationsIn(source);
  const calls = helperCallsIn(source, registrations, functions);
  const omitted = [
    ...registrations.map(({ node }) => statementOf(node)),
    ...calls.map(({ node }) => statementOf(node)),
  ];
  const contexts = [
    {
      kind: 'context',
      file,
      title: 'file',
      sha256: hash(scopeText(source, source, omitted)),
    },
  ];
  const keys = new Set();
  for (const item of registrations) {
    const { key, rows } = registrationContext(
      item,
      registrations,
      source,
      omitted
    );
    if (keys.has(key)) {
      throw new Error(`Ambiguous registration scope in ${file}: ${key}`);
    }
    keys.add(key);
    contexts.push(...rows);
  }
  contexts.push(
    ...calls.map(({ node, key }) => ({
      kind: 'context',
      file,
      title: key,
      sha256: hash(node.getText(source)),
    }))
  );
  return { registrations: registrations.filter((item) => item.test), contexts };
}

function assertDiscoveryPassed(report) {
  if (
    !report.success ||
    report.numFailedTestSuites ||
    report.numFailedTests ||
    report.numPendingTests ||
    report.numTodoTests
  ) {
    throw new Error('Contract discovery must pass every case without skips');
  }
}

function indexSuites(root, report, specs) {
  const suites = new Map();
  for (const suite of report.testResults ?? []) {
    const file = posix(relative(root, suite.name));
    if (
      !specs.includes(file) ||
      suites.has(file) ||
      suite.status !== 'passed' ||
      !suite.assertionResults?.length
    ) {
      throw new Error(`Unexpected, duplicate, empty, or failed suite: ${file}`);
    }
    suites.set(file, suite);
  }
  if (suites.size !== specs.length) {
    throw new Error('Incomplete contract spec collection');
  }
  return suites;
}

function callbackForResult(file, result, registrations) {
  if (
    result.status !== 'passed' ||
    !result.location ||
    typeof result.fullName !== 'string'
  ) {
    throw new Error(`Missing case identity, location, or pass: ${file}`);
  }
  const matches = registrations.filter(
    ({ location }) =>
      location.line === result.location.line &&
      location.column === result.location.column
  );
  if (matches.length !== 1) {
    throw new Error(
      `Unresolved or ambiguous callback: ${file} ${result.fullName}`
    );
  }
  return matches[0];
}

function testRows(root, file, suite) {
  const { registrations, contexts } = analyze(
    file,
    readFileSync(join(root, file), 'utf8')
  );
  const seen = new Set();
  const rows = suite.assertionResults.map((result) => {
    const callback = callbackForResult(file, result, registrations);
    seen.add(callback);
    return {
      kind: 'test',
      file,
      title: result.fullName,
      sha256: callback.sha256,
    };
  });
  if (seen.size !== registrations.length) {
    throw new Error(`Uncollected registration in ${file}`);
  }
  return [...rows, ...contexts];
}

function helperRow(root, file) {
  const bytes = readFileSync(join(root, file));
  const content =
    TEXT_HELPER.test(file) && isUtf8(bytes) && !bytes.includes(0)
      ? bytes.toString('utf8')
      : bytes;
  return { kind: 'helper', file, title: '', sha256: hash(content) };
}

export function rowsFromReport(root, report) {
  assertDiscoveryPassed(report);
  const { specs, helpers } = contractInventory(root);
  const suites = indexSuites(root, report, specs);
  const rows = specs.flatMap((file) => testRows(root, file, suites.get(file)));
  if (
    rows.filter((row) => row.kind === 'test').length !== report.numTotalTests
  ) {
    throw new Error('Runtime case count mismatch');
  }
  return [...rows, ...helpers.map((file) => helperRow(root, file))];
}

function rowsInManifest(text) {
  return [...parseManifest(text)].map(([key, sha256]) => {
    const [kind, file, title] = key.split('\t');
    return { kind, file, title: JSON.parse(title), sha256 };
  });
}

function legacyRows(root, frozen, inventory) {
  const rows = rowsInManifest(frozen);
  const legacy = (file) => file.startsWith(`${CONTRACT}/`);
  if (
    !rows.length ||
    rows.some((row) => !legacy(row.file)) ||
    serialize(rows) !== frozen
  ) {
    throw new Error(
      'Colocated carry requires a canonical legacy-only base manifest'
    );
  }
  const current = rowsInManifest(readFileSync(join(root, MANIFEST), 'utf8'));
  if (
    JSON.stringify(current.filter((row) => legacy(row.file))) !==
    JSON.stringify(rows)
  ) {
    throw new Error('Current legacy manifest rows differ from the frozen base');
  }
  const specs = inventory.specs.filter(legacy);
  const helpers = inventory.helpers.filter(legacy);
  const selected = [...specs, ...helpers].sort();
  const frozenFiles = [...new Set(rows.map((row) => row.file))].sort();
  if (JSON.stringify(selected) !== JSON.stringify(frozenFiles)) {
    throw new Error('Current legacy inventory differs from the frozen base');
  }
  const checked = [];
  for (const file of specs) {
    const { registrations, contexts } = analyze(
      file,
      readFileSync(join(root, file), 'utf8')
    );
    const tests = rows.filter(
      (row) => row.file === file && row.kind === 'test'
    );
    const bodies = new Set(registrations.map((item) => item.sha256));
    if (
      !registrations.length ||
      tests.some((row) => !bodies.has(row.sha256)) ||
      registrations.some(
        (item) => !tests.some((row) => row.sha256 === item.sha256)
      ) ||
      tests.length < registrations.length
    ) {
      throw new Error(
        `Frozen legacy callback hashes do not match source: ${file}`
      );
    }
    checked.push(...tests, ...contexts);
  }
  checked.push(...helpers.map((file) => helperRow(root, file)));
  if (serialize(checked) !== frozen) {
    throw new Error('Frozen legacy helper or context rows do not match source');
  }
  return rows;
}

function assertCompleteColocatedReport(report, specs) {
  assertDiscoveryPassed(report);
  if (
    report.wasInterrupted !== false ||
    report.numTotalTestSuites !== specs.length ||
    report.numPassedTestSuites !== specs.length ||
    report.numPassedTests !== report.numTotalTests ||
    !Number.isInteger(report.numTotalTests) ||
    report.numTotalTests <= 0 ||
    [
      'numFailedTestSuites',
      'numFailedTests',
      'numPendingTestSuites',
      'numPendingTests',
      'numRuntimeErrorTestSuites',
      'numTodoTests',
    ].some((field) => report[field] !== 0)
  ) {
    throw new Error(
      'Colocated carry requires a complete unfiltered passing colocated report'
    );
  }
}

export function rowsFromColocatedReport(root, report, frozen) {
  const inventory = contractInventory(root);
  const colocated = (file) => !file.startsWith(`${CONTRACT}/`);
  const specs = inventory.specs.filter(colocated);
  if (!specs.length) {
    throw new Error(
      'Colocated carry requires at least one colocated contract suite'
    );
  }
  const carried = legacyRows(root, frozen, inventory);
  assertCompleteColocatedReport(report, specs);
  const suites = indexSuites(root, report, specs);
  const executed = specs.flatMap((file) =>
    testRows(root, file, suites.get(file))
  );
  const executedCases = executed.filter((row) => row.kind === 'test').length;
  if (executedCases !== report.numTotalTests) {
    throw new Error('Runtime case count mismatch');
  }
  const rows = [
    ...carried,
    ...executed,
    ...inventory.helpers.filter(colocated).map((file) => helperRow(root, file)),
  ];
  const represented = [...new Set(rows.map((row) => row.file))].sort();
  const selected = [...inventory.specs, ...inventory.helpers].sort();
  if (JSON.stringify(represented) !== JSON.stringify(selected)) {
    throw new Error(
      'Colocated carry output does not match the full contract inventory'
    );
  }
  serialize(rows);
  return {
    rows,
    carriedRows: carried.length,
    carriedCases: carried.filter((row) => row.kind === 'test').length,
    executedCases,
    executedSuites: specs,
  };
}

export function serialize(rows) {
  const text =
    HEADER +
    rows
      .map((row) => `${identity(row)}\t${row.sha256}\n`)
      .sort()
      .join('');
  parseManifest(text);
  return text;
}

function manifestFields(line) {
  const fields = line.split('\t');
  const [kind, file, , sha256] = fields;
  if (
    fields.length !== 4 ||
    !KINDS.has(kind) ||
    !file ||
    file.includes('\\') ||
    file
      .split('/')
      .some((part) => part === '' || part === '.' || part === '..') ||
    !/^[a-f0-9]{64}$/.test(sha256)
  ) {
    throw new Error('Malformed manifest row');
  }
  return fields;
}

function manifestTitle(title) {
  let decoded;
  try {
    decoded = JSON.parse(title);
  } catch {
    throw new Error('Malformed manifest title');
  }
  if (typeof decoded !== 'string' || JSON.stringify(decoded) !== title) {
    throw new Error('Noncanonical manifest title');
  }
  return decoded;
}

function assertRowShape(kind, file, title) {
  const invalid =
    kind === 'helper'
      ? !isContractHelper(file) || title !== ''
      : !isContractSpec(file) || title === '';
  if (invalid) {
    throw new Error('Manifest kind does not match its file or title');
  }
}

export function parseManifest(text) {
  if (!text.startsWith(HEADER) || !text.endsWith('\n')) {
    throw new Error('Malformed manifest header or newline');
  }
  const rows = new Map();
  const body = text.slice(HEADER.length);
  for (const line of body === '' ? [] : body.slice(0, -1).split('\n')) {
    const [kind, file, title, sha256] = manifestFields(line);
    assertRowShape(kind, file, manifestTitle(title));
    const key = `${kind}\t${file}\t${title}`;
    if (rows.has(key)) {
      throw new Error('Duplicate manifest identity');
    }
    rows.set(key, sha256);
  }
  return rows;
}

export function compareManifests(base, head, labels = []) {
  const before = parseManifest(base);
  const after = parseManifest(head);
  const changed = [...before]
    .filter(([key, value]) => after.get(key) !== value)
    .map(([key]) => key);
  if (changed.length && !labels.includes('behavior-change')) {
    throw new Error(
      `${changed.length} changed or removed contract rows require behavior-change:\n${changed.join('\n')}`
    );
  }
  return {
    added: [...after.keys()].filter((key) => !before.has(key)).length,
    changed: changed.length,
  };
}

export const emptyManifest = () => HEADER;
