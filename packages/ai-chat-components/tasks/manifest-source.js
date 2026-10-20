/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const compilerOptions = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  experimentalDecorators: true,
  jsx: ts.JsxEmit.ReactJSX,
  strict: true,
  skipLibCheck: true,
  allowSyntheticDefaultImports: true,
  noEmit: true,
};
const sourceIncludes = [
  'index.ts',
  'components/aichat-*/**/*',
  'components/shared/**/*',
  'globals/**/*',
  'react/**/*',
  'testing/**/*',
  'typings/**/*',
];
const sourceExcludes = [
  '**/__tests__/**',
  '**/__stories__/**',
  '**/*.d.ts',
  '**/*.test.ts',
  '**/*.stories.ts',
  '**/*.scss.ts',
  'globals/internal/storybook-cdn.ts',
];

export function visit(node, callback) {
  callback(node);
  ts.forEachChild(node, (child) => visit(child, callback));
}

function createHost(virtual) {
  const host = ts.createCompilerHost(compilerOptions);
  if (!virtual) {
    return host;
  }
  const originalRead = host.readFile.bind(host);
  const originalExists = host.fileExists.bind(host);
  host.readFile = (file) =>
    virtual.get(path.resolve(file)) ?? originalRead(file);
  host.fileExists = (file) =>
    virtual.has(path.resolve(file)) || originalExists(file);
  host.directoryExists = (directory) =>
    [...virtual.keys()].some((file) =>
      file.startsWith(`${path.resolve(directory)}/`)
    ) || ts.sys.directoryExists(directory);
  host.getSourceFile = (file, languageVersion) => {
    const text = host.readFile(file);
    return text === undefined
      ? undefined
      : ts.createSourceFile(file, text, languageVersion, true);
  };
  return host;
}

function createProgram(root, files) {
  const virtual =
    files &&
    new Map(
      Object.entries(files).map(([file, text]) => [
        path.resolve(root, file),
        text,
      ])
    );
  const sourceRoot = path.join(root, 'src');
  const names = virtual
    ? [...virtual.keys()]
    : [
        ...ts.sys.readDirectory(
          sourceRoot,
          ['.ts', '.tsx'],
          sourceExcludes,
          sourceIncludes
        ),
        ...ts.sys.readDirectory(path.join(sourceRoot, 'typings'), ['.d.ts']),
      ];
  const program = ts.createProgram(names, compilerOptions, createHost(virtual));
  const sources = names
    .filter((file) => !file.endsWith('.d.ts'))
    .map((file) => program.getSourceFile(file))
    .filter(Boolean);
  return { program, checker: program.getTypeChecker(), sources };
}

function sourceSymbol(checker, node) {
  if (!node) {
    return undefined;
  }
  const parent = ts.isShorthandPropertyAssignment(node) ? node : node.parent;
  const shorthand = parent && ts.isShorthandPropertyAssignment(parent);
  let result = shorthand
    ? checker.getShorthandAssignmentValueSymbol(parent)
    : checker.getSymbolAtLocation(node);
  if (result && result.flags & ts.SymbolFlags.Alias) {
    result = checker.getAliasedSymbol(result);
  }
  return result;
}

function indexCalls(sources, symbol) {
  const calls = new Map();
  for (const source of sources) {
    visit(source, (node) => {
      if (!ts.isCallExpression(node) && !ts.isNewExpression(node)) {
        return;
      }
      const target = symbol(node.expression);
      if (!target) {
        return;
      }
      const entries = calls.get(target) ?? [];
      entries.push(node);
      calls.set(target, entries);
    });
  }
  return calls;
}

function assignmentTarget(node) {
  if (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
    node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
  ) {
    return node.left;
  }
  if (
    (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
    (node.operator === ts.SyntaxKind.PlusPlusToken ||
      node.operator === ts.SyntaxKind.MinusMinusToken)
  ) {
    return node.operand;
  }
  return undefined;
}

function assignmentDestinations(node) {
  if (ts.isObjectLiteralExpression(node)) {
    return node.properties.flatMap((property) => {
      if (ts.isPropertyAssignment(property)) {
        return assignmentDestinations(property.initializer);
      }
      if (ts.isShorthandPropertyAssignment(property)) {
        return [property.name];
      }
      return ts.isSpreadAssignment(property)
        ? assignmentDestinations(property.expression)
        : [];
    });
  }
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.flatMap(assignmentDestinations);
  }
  if (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isTypeAssertionExpression(node) ||
    ts.isNonNullExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isSpreadElement(node)
  ) {
    return assignmentDestinations(node.expression);
  }
  if (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.EqualsToken
  ) {
    return assignmentDestinations(node.left);
  }
  return [node];
}

function assignedSymbols(node, symbol, checker) {
  if (!ts.isElementAccessExpression(node)) {
    return [symbol(node)].filter(Boolean);
  }
  const target = checker.getTypeAtLocation(node.expression);
  const key = checker.getTypeAtLocation(node.argumentExpression);
  const keys = key.isUnion() ? key.types : [key];
  const finite = keys.every(
    (entry) => entry.isStringLiteral() || entry.isNumberLiteral()
  );
  if (!finite) {
    return checker.getPropertiesOfType(target);
  }
  return keys
    .map((entry) => checker.getPropertyOfType(target, String(entry.value)))
    .filter(Boolean);
}

function indexWrites(sources, symbol, checker) {
  const writes = new Map();
  for (const source of sources) {
    visit(source, (node) => {
      const target = assignmentTarget(node);
      if (target) {
        for (const destination of assignmentDestinations(target)) {
          for (const assigned of assignedSymbols(
            destination,
            symbol,
            checker
          )) {
            writes.set(assigned, node);
          }
        }
      }
    });
  }
  return writes;
}

function getterExpression(node, fail) {
  const statements = node.body?.statements;
  if (
    statements?.length !== 1 ||
    !ts.isReturnStatement(statements[0]) ||
    !statements[0].expression
  ) {
    return fail(node, 'Unsupported static is declaration.');
  }
  return statements[0].expression;
}

function templateValues(node, seen, values) {
  let result = [node.head.text];
  for (const span of node.templateSpans) {
    const strings = values(span.expression, seen);
    result = result.flatMap((left) =>
      strings.map((right) => left + right + span.literal.text)
    );
  }
  return [...new Set(result)];
}

function expressionValues(node, seen, values) {
  if (ts.isStringLiteralLike(node)) {
    return [node.text];
  }
  if (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isNonNullExpression(node) ||
    ts.isSatisfiesExpression(node)
  ) {
    return values(node.expression, seen);
  }
  if (ts.isConditionalExpression(node)) {
    return [
      ...new Set([
        ...values(node.whenTrue, seen),
        ...values(node.whenFalse, seen),
      ]),
    ];
  }
  if (ts.isTemplateExpression(node)) {
    return templateValues(node, seen, values);
  }
  if (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    return [
      ...new Set(
        values(node.left, seen).flatMap((left) =>
          values(node.right, seen).map((right) => left + right)
        )
      ),
    ];
  }
  return undefined;
}

function callableSymbol(owner, symbol) {
  if (owner.name) {
    return symbol(owner.name);
  }
  if (ts.isConstructorDeclaration(owner)) {
    return symbol(owner.parent.name);
  }
  return symbol(owner.parent?.name);
}

function parameterValues(declaration, seen, context, values) {
  const owner = declaration.parent;
  const index = owner.parameters.indexOf(declaration);
  const calls = context.calls.get(callableSymbol(owner, context.symbol)) ?? [];
  if (!calls.length) {
    return undefined;
  }
  const argumentsAtCalls = calls.map((call) => {
    const argument = call.arguments?.[index] ?? declaration.initializer;
    if (!argument) {
      return context.fail(
        call,
        `Missing contract argument: ${declaration.name.getText()}.`
      );
    }
    return argument;
  });
  return [
    ...new Set(argumentsAtCalls.flatMap((argument) => values(argument, seen))),
  ];
}

function declarationValues(node, seen, context, values) {
  const target = context.symbol(node);
  const assignment = target && context.writes.get(target);
  if (assignment) {
    return context.fail(
      assignment,
      `Assigned contract value cannot be resolved statically: ${node.getText()}.`
    );
  }
  for (const declaration of target?.declarations ?? []) {
    if (
      context.prefix !== undefined &&
      declaration.name?.getText() === 'prefix' &&
      declaration.getSourceFile().fileName.endsWith('/globals/settings.ts')
    ) {
      return [context.prefix];
    }
    if (ts.isParameter(declaration)) {
      return parameterValues(declaration, seen, context, values);
    }
    if (ts.isShorthandPropertyAssignment(declaration)) {
      return values(declaration.name, seen);
    }
    if (declaration.initializer) {
      return values(declaration.initializer, seen);
    }
    if (ts.isGetAccessorDeclaration(declaration)) {
      return values(getterExpression(declaration, context.fail), seen);
    }
  }
  return undefined;
}

function createValueReader(context) {
  const values = (node, seen = new Set()) => {
    if (!node) {
      throw new Error('Missing contract expression.');
    }
    if (seen.has(node)) {
      return context.fail(node, 'Circular contract expression.');
    }
    const next = new Set([...seen, node]);
    const result =
      expressionValues(node, next, values) ??
      declarationValues(node, next, context, values);
    return (
      result ??
      context.fail(node, `Unresolved contract expression: ${node.getText()}.`)
    );
  };
  return values;
}

function hasModifier(node, kind) {
  return node.modifiers?.some((modifier) => modifier.kind === kind);
}

function readElement(node, model) {
  if (
    !ts.isClassDeclaration(node) ||
    !node.name ||
    hasModifier(node, ts.SyntaxKind.AbstractKeyword)
  ) {
    return undefined;
  }
  const identity = node.members.find(
    (member) =>
      member.name?.getText() === 'is' &&
      hasModifier(member, ts.SyntaxKind.StaticKeyword)
  );
  if (!identity) {
    return undefined;
  }
  const expression = ts.isGetAccessorDeclaration(identity)
    ? getterExpression(identity, model.fail)
    : identity.initializer;
  const tags = model.values(expression);
  if (tags.length !== 1) {
    return model.fail(identity, 'An element needs one static tag name.');
  }
  return {
    node,
    tagName: tags[0],
    className: node.name.text,
    module: path.relative(model.root, node.getSourceFile().fileName),
    location: model.location(node),
  };
}

function readElements(model) {
  const elements = [];
  for (const source of model.sources) {
    visit(source, (node) => {
      const element = readElement(node, model);
      if (element) {
        elements.push(element);
      }
    });
  }
  return elements;
}

export function readSource({ root = packageRoot, files, prefix } = {}) {
  root = path.resolve(root);
  const { program, checker, sources } = createProgram(root, files);
  const symbol = (node) => sourceSymbol(checker, node);
  const location = (node) => {
    const source = node.getSourceFile();
    const point = source.getLineAndCharacterOfPosition(node.getStart(source));
    return `${path.relative(root, source.fileName)}:${point.line + 1}:${point.character + 1}`;
  };
  const fail = (node, message) => {
    throw new Error(`${location(node)}: ${message}`);
  };
  const calls = indexCalls(sources, symbol);
  const writes = indexWrites(sources, symbol, checker);
  const values = createValueReader({ symbol, calls, writes, fail, prefix });
  const model = {
    ts,
    root,
    program,
    checker,
    sources,
    symbol,
    values,
    location,
    fail,
    visit,
    calls,
  };
  return { ...model, elements: readElements(model) };
}
