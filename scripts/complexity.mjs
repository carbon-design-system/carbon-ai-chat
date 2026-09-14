/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * complexity.mjs — score cyclomatic and cognitive complexity per function.
 *
 * Gives one number everyone can reproduce, so "simpler" is measured, not
 * argued. Cyclomatic comes from ESLint's `complexity` rule, cognitive from
 * `sonarjs/cognitive-complexity`; both run on an in-memory config, so the
 * project's own ESLint setup is never consulted.
 *
 * The longest script here, about twice the `scripts/` median. The score join,
 * the render walk, and the top-level count all read one parse of the file, so
 * splitting them would mean parsing three times or threading an AST between
 * modules. The length buys a single parse.
 *
 * Usage:
 *   node scripts/complexity.mjs <file> [more ...] [--max <n>] [--report <n>]
 *   node scripts/complexity.mjs --changed <base> [--max <n>] [--report <n>]
 *
 *   --report <n>  print functions at or above <n> on either metric (default 10)
 *   --max <n>     exit 1 when a function's cognitive score exceeds <n>
 *   --changed     score files changed since <base>; severity attaches only to
 *                 functions that are new or scored worse than at <base>
 *   --source <s>  what "after" means with --changed: worktree (default), index,
 *                 or head. They agree once the change is committed.
 *
 * Example:
 *   node scripts/complexity.mjs --changed origin/main --max 25
 */

import {
  changedFiles,
  contentAt,
  contentOf,
  labelsFor,
  makeLinter,
  parse,
  parseCli,
} from './measure-lib.mjs';

const USAGE = [
  'usage: node scripts/complexity.mjs <file> [more ...] [--max <n>] [--report <n>]',
  '   or: node scripts/complexity.mjs --changed <base> [--max <n>] [--report <n>]',
].join('\n');

const lint = makeLinter({
  complexity: ['error', 0],
  'sonarjs/cognitive-complexity': ['error', 0],
  'max-lines': ['error', { max: 0, skipBlankLines: true, skipComments: true }],
  'max-depth': ['error', 0],
  'max-params': ['error', 0],
});

const BRANCHES = ['IfStatement', 'ConditionalExpression', 'SwitchCase', 'CatchClause', 'ForStatement', 'ForInStatement', 'ForOfStatement', 'WhileStatement', 'DoWhileStatement'];
const FUNCTIONS = ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'];
const TOTALS = {
  lines: [/too many lines \((\d+)\)/, 'max-lines'],
  depth: [/nested too deeply \((\d+)\)/, 'max-depth'],
  params: [/too many parameters \((\d+)\)/, 'max-params'],
};
// A top-level statement runs on import; a declaration or an inert binding does not.
const DECLARED = ['ImportDeclaration', 'ExportNamedDeclaration', 'ExportDefaultDeclaration', 'ExportAllDeclaration', 'FunctionDeclaration', 'ClassDeclaration', 'TSTypeAliasDeclaration', 'TSInterfaceDeclaration', 'TSEnumDeclaration', 'TSModuleDeclaration', 'TSDeclareFunction', 'TSImportEqualsDeclaration'];
const INERT = ['Literal', 'TemplateLiteral', 'ArrowFunctionExpression', 'FunctionExpression', 'ClassExpression', 'ArrayExpression', 'ObjectExpression', 'Identifier', 'MemberExpression'];

// The regexes read these message shapes:
//   complexity: "Function 'x' has a complexity of N", "Arrow function has a
//   complexity of N", "Method 'x' …", "Class field initializer has a …"
//   sonarjs/cognitive-complexity: "… Cognitive Complexity from N to the 0 allowed."
function toFunction(m) {
  return {
    name: m.message.match(/'([^']+)'/)?.[1] ?? '<anonymous>',
    line: m.line,
    cyclomatic: Number(m.message.match(/complexity of (\d+)/)[1]),
    cognitive: 0,
    range: [m.line, m.column, m.endLine, m.endColumn],
  };
}

const notAfter = (l1, c1, l2, c2) => l1 < l2 || (l1 === l2 && c1 <= c2);

function contains([l1, c1, l2, c2], line, column) {
  return notAfter(l1, c1, line, column) && notAfter(line, column, l2, c2);
}

// sonarjs anchors its message on the name, the `function` keyword, or the
// `=>`, all inside the range the complexity rule reports for the same
// function. For a method it anchors on the key, whose end is where that range
// starts, so the join tests the token's end position, inclusive. Ranges nest,
// so the innermost owner is the one that starts last.
function owner(functions, m) {
  const start = (fn) => fn.range.slice(0, 2);
  return functions
    .filter((fn) => contains(fn.range, m.endLine, m.endColumn))
    .reduce((best, fn) => (!best || notAfter(...start(best), ...start(fn)) ? fn : best), null);
}

function isBranch(node) {
  if (node.type === 'LogicalExpression') return ['&&', '||', '??'].includes(node.operator);
  if (node.type === 'SwitchCase') return node.test !== null;
  return BRANCHES.includes(node.type);
}

function isMarkup(node) {
  if (node.type === 'JSXElement' || node.type === 'JSXFragment') return true;
  return node.type === 'TaggedTemplateExpression' && ['html', 'svg'].includes(node.tag.name);
}

function* childNodes(node) {
  for (const value of Object.values(node)) {
    const items = Array.isArray(value) ? value : [value];
    for (const item of items) if (item && typeof item.type === 'string') yield item;
  }
}

// A branch is render code when markup encloses it, so position decides and the
// function's name never does. Markup context crosses a function boundary — a
// callback inside JSX is still rendering — but the count follows the nearest
// enclosing function, so a callback's branches are the callback's, not the
// component's.
function yieldsMarkup(node) {
  if (node.type === 'LogicalExpression') return isMarkup(node.right);
  if (node.type !== 'ConditionalExpression') return false;
  return isMarkup(node.consequent) || isMarkup(node.alternate);
}

function walkRender(node, fn, inMarkup, counts) {
  const owned = FUNCTIONS.includes(node.type) ? node : fn;
  const under = inMarkup || isMarkup(node);
  if (owned && (under || yieldsMarkup(node)) && isBranch(node)) {
    const key = `${owned.loc.start.line}:${owned.loc.start.column}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const child of childNodes(node)) walkRender(child, owned, under, counts);
}

// One parse per file, shared with the top-level count. A parse miss prints
// render 0 rather than a wrong number.
function attachRender(functions, ast) {
  const counts = new Map();
  if (ast !== null) walkRender(ast, null, false, counts);
  for (const fn of functions) fn.render = counts.get(`${fn.range[0]}:${fn.range[1] - 1}`) ?? 0;
}

function astOf(content, filePath) {
  try {
    return parse(content, filePath);
  } catch {
    return null;
  }
}

const EXPORTS = ['ExportNamedDeclaration', 'ExportDefaultDeclaration'];
// `require('x')` is the CommonJS spelling of an import, so it binds rather than works.
const isRequire = (n) =>
  n.type === 'CallExpression' && n.callee.type === 'Identifier' && n.callee.name === 'require';

function runsOnImport(node) {
  const stmt = EXPORTS.includes(node.type) && node.declaration ? node.declaration : node;
  if (DECLARED.includes(stmt.type)) return false;
  if (stmt.type !== 'VariableDeclaration') return !INERT.includes(stmt.type);
  return stmt.declarations.some(
    (d) => d.init !== null && !INERT.includes(d.init.type) && !isRequire(d.init),
  );
}

function fileTotals(messages, functions, ast) {
  const peak = (key) => {
    const [pattern, rule] = TOTALS[key];
    const found = messages.filter((m) => m.ruleId === rule).map((m) => Number(m.message.match(pattern)[1]));
    return found.length === 0 ? 0 : Math.max(...found);
  };
  return {
    lines: peak('lines'),
    cognitive: functions.reduce((sum, fn) => sum + fn.cognitive, 0),
    depth: peak('depth'),
    params: peak('params'),
    top: ast === null ? 0 : ast.body.filter(runsOnImport).length,
  };
}

async function score(content, filePath) {
  const messages = await lint(content, filePath);
  const functions = messages
    .filter((m) => m.ruleId === 'complexity' && !m.message.startsWith('Class field initializer'))
    .map(toFunction);
  for (const m of messages.filter((m) => m.ruleId === 'sonarjs/cognitive-complexity')) {
    const fn = owner(functions, m);
    if (fn) fn.cognitive = Number(m.message.match(/from (\d+) to/)[1]);
  }
  const ast = astOf(content, filePath);
  attachRender(functions, ast);
  return { functions: functions.sort((a, b) => a.line - b.line), messages, ast };
}

// Anonymous callbacks share a name, so ordinal matching alone shifts every
// later match when one is inserted above. Pairing identical scores first keeps
// an untouched callback paired with itself; the ordinal pass covers the rest.
function matchBase(afterFns, baseFns) {
  const pools = new Map();
  for (const fn of baseFns) pools.set(fn.name, [...(pools.get(fn.name) ?? []), fn]);
  const pool = (fn) => pools.get(fn.name) ?? [];
  for (const fn of afterFns) {
    const i = pool(fn).findIndex(
      (b) => b.cyclomatic === fn.cyclomatic && b.cognitive === fn.cognitive,
    );
    if (i !== -1) fn.base = pool(fn).splice(i, 1)[0];
  }
  for (const fn of afterFns) {
    if (fn.base === undefined) fn.base = pool(fn).shift() ?? null;
  }
}

function severity(fn, file) {
  const labels = labelsFor(file);
  const worse =
    !fn.base || fn.cyclomatic > fn.base.cyclomatic || fn.cognitive > fn.base.cognitive;
  if (!labels || !worse) return null;
  const top = Math.max(fn.cyclomatic, fn.cognitive);
  if (top > 25) return labels.blocker;
  if (top > 15) return labels.important;
  return null;
}

async function scoreFile(file, base, source) {
  const content = contentOf(source, file);
  if (content === null) return null;
  const { functions: afterFns, messages, ast } = await score(content, file);
  if (base !== null) {
    const baseContent = contentAt(base, file);
    const baseFns =
      baseContent === null ? [] : (await score(baseContent, file).catch(() => ({ functions: [] }))).functions;
    matchBase(afterFns, baseFns);
  }
  return {
    rows: afterFns.map((fn) => ({ fn, file, severity: severity(fn, file) })),
    totals: fileTotals(messages, afterFns, ast),
  };
}

function formatRow({ fn, file, severity: sev }, changed) {
  const cell = (key) => {
    if (!changed) return String(fn[key]).padEnd(4);
    return (fn.base ? `${fn.base[key]}→${fn[key]}` : `new→${fn[key]}`).padEnd(8);
  };
  return [
    (sev ?? '').padEnd(10),
    `cyc:${cell('cyclomatic')}`,
    `(render ${fn.render})`.padEnd(12),
    `cog:${cell('cognitive')}`,
    fn.name.padEnd(32),
    `${file}:${fn.line}`,
  ].join('  ');
}

function footer(file, t) {
  return `${file}: ${t.lines} code lines, cognitive total ${t.cognitive}, deepest block ${t.depth}, widest params ${t.params}, top-level ${t.top}`;
}

function printTable(shown, totals, changed) {
  const width = changed ? 12 : 8;
  const header = [
    'severity'.padEnd(10),
    'cyc'.padEnd(width),
    'render'.padEnd(12),
    'cog'.padEnd(width),
    'function'.padEnd(32),
    'location',
  ].join('  ');
  if (shown.length > 0) {
    console.log(header);
    console.log('-'.repeat(header.length));
  }
  // One footer per file scanned, after that file's rows. `--report` filters
  // rows; it never hides a footer.
  for (const [file, t] of totals) {
    for (const row of shown.filter((r) => r.file === file)) console.log(formatRow(row, changed));
    console.log(footer(file, t));
  }
}

function report(rows, totals, { max, report: floor, changed }, hadError) {
  const shown = rows
    .filter(({ fn }) => fn.cyclomatic >= floor || fn.cognitive >= floor)
    .sort((a, b) => a.file.localeCompare(b.file) || a.fn.line - b.fn.line);
  if (shown.length === 0) console.log('Nothing to report.');
  printTable(shown, totals, changed !== null);
  const violators = max === null ? [] : rows.filter(({ fn }) => fn.cognitive > max);
  if (violators.length > 0) {
    console.error(`\n--max ${max} exceeded by ${violators.length} function(s):`);
    for (const { fn, file } of violators) {
      console.error(`  cog:${fn.cognitive}  ${fn.name}  ${file}:${fn.line}`);
    }
    process.exit(1);
  }
  process.exit(hadError ? 1 : 0);
}

async function main() {
  const cli = parseCli({ ints: ['max', 'report'], defaults: { report: 10 }, usage: USAGE });
  const files = cli.changed === null ? cli.files : changedFiles(cli.base, cli.source);
  const rows = [];
  const totals = new Map();
  let hadError = false;
  for (const file of files) {
    try {
      const scored = await scoreFile(file, cli.base, cli.source);
      // Absent from the after side: renamed or deleted and not yet committed.
      if (scored === null) {
        console.log(`skipped ${file}: not in the ${cli.source}`);
        continue;
      }
      rows.push(...scored.rows);
      totals.set(file, scored.totals);
    } catch (e) {
      console.error(`ERROR: ${file}: ${e.message}`);
      hadError = true;
    }
  }
  report(rows, totals, cli, hadError);
}

await main();
