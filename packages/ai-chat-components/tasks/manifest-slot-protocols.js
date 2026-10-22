/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { returnedExpressions } from './manifest-template-source.js';

function declarationSymbol(model, declaration) {
  return model.symbol(declaration.name ?? declaration.parent?.name);
}

function callable(model, declaration) {
  return model.ts.isFunctionLike(declaration)
    ? declaration
    : declaration.initializer;
}

function valuesAtParameter(model, declaration) {
  const owner = declaration.parent;
  const index = owner.parameters.indexOf(declaration);
  const symbol = declarationSymbol(model, owner);
  return (model.calls.get(symbol) ?? [])
    .map((call) => {
      const argument = call.arguments[index] ?? declaration.initializer;
      if (!argument && !declaration.questionToken) {
        model.fail(
          call,
          `Missing generated slot argument ${declaration.name.getText()}.`
        );
      }
      return argument;
    })
    .filter(Boolean);
}

function argumentEnvironment(model, call, declaration, environment) {
  const body = callable(model, declaration);
  const next = new Map(environment);
  body?.parameters?.forEach((parameter, index) => {
    next.set(
      model.symbol(parameter.name),
      call.arguments[index] ?? parameter.initializer
    );
  });
  return next;
}

function concatenate(left, right) {
  return left.flatMap((first) =>
    right.map((last) => ({
      text: first.dynamic ? first.text : first.text + last.text,
      dynamic: first.dynamic || last.dynamic,
    }))
  );
}

function transparentExpression(model, node) {
  const { ts } = model;
  return (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isNonNullExpression(node)
  );
}

function expressionShape(model, node, environment, seen, writes) {
  const { ts } = model;
  if (ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) {
    return [{ text: node.text, dynamic: false }];
  }
  if (ts.isConditionalExpression(node)) {
    return [node.whenTrue, node.whenFalse].flatMap((branch) =>
      generatedShape(model, branch, environment, seen, writes)
    );
  }
  if (ts.isTemplateExpression(node)) {
    let result = [{ text: node.head.text, dynamic: false }];
    for (const span of node.templateSpans) {
      result = concatenate(
        result,
        generatedShape(model, span.expression, environment, seen, writes)
      );
      result = concatenate(result, [
        { text: span.literal.text, dynamic: false },
      ]);
    }
    return result;
  }
  if (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    return concatenate(
      generatedShape(model, node.left, environment, seen, writes),
      generatedShape(model, node.right, environment, seen, writes)
    );
  }
  return transparentExpression(model, node)
    ? generatedShape(model, node.expression, environment, seen, writes)
    : undefined;
}

function symbolShape(model, node, environment, seen, writes) {
  const call = model.ts.isCallExpression(node);
  const symbol = model.symbol(call ? node.expression : node);
  if (writes.has(symbol)) {
    model.fail(
      node,
      'A generated slot producer dependency cannot be reassigned.'
    );
  }
  if (environment.has(symbol)) {
    return generatedShape(
      model,
      environment.get(symbol),
      environment,
      seen,
      writes
    );
  }
  const declaration = symbol?.valueDeclaration;
  if (call && declaration) {
    const owner = callable(model, declaration);
    if (owner?.body) {
      const argumentsAtCall = argumentEnvironment(
        model,
        node,
        declaration,
        environment
      );
      return returnedExpressions(model, owner).flatMap((returned) =>
        generatedShape(model, returned, argumentsAtCall, seen, writes)
      );
    }
  }
  if (declaration && model.ts.isParameter(declaration)) {
    const argumentsAtCalls = valuesAtParameter(model, declaration);
    if (argumentsAtCalls.length) {
      return argumentsAtCalls.flatMap((argument) =>
        generatedShape(model, argument, environment, seen, writes)
      );
    }
  }
  return declaration?.initializer && !call
    ? generatedShape(model, declaration.initializer, environment, seen, writes)
    : [{ text: '', dynamic: true }];
}

function generatedShape(model, node, environment, seen, writes) {
  if (!node) {
    return [{ text: '', dynamic: true }];
  }
  if (seen.has(node)) {
    model.fail(node, 'Resolve an acyclic generated slot name producer.');
  }
  const next = new Set([...seen, node]);
  return (
    expressionShape(model, node, environment, next, writes) ??
    symbolShape(model, node, environment, next, writes)
  );
}

function protocolDeclaration(model, node) {
  const { ts } = model;
  if (
    ts.isVariableStatement(node) &&
    node.declarationList.declarations.length === 1
  ) {
    return node.declarationList.declarations[0];
  }
  return ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)
    ? node
    : undefined;
}

function protocolRecord(model, node, tag, writes) {
  const declaration = protocolDeclaration(model, node);
  const name = tag
    .getText()
    .match(/^@slotNameProtocol\s+\{([\w$]+)\}\s*$/)?.[1];
  const prefix =
    name &&
    model.checker.resolveName(
      name,
      node,
      model.ts.SymbolFlags.Value | model.ts.SymbolFlags.Alias,
      false
    );
  const target =
    prefix?.flags & model.ts.SymbolFlags.Alias
      ? model.checker.getAliasedSymbol(prefix)
      : prefix;
  const initializer = target?.valueDeclaration?.initializer;
  if (!declaration || !initializer) {
    model.fail(
      node,
      'Declare a generated slot protocol on its name producer with a source prefix constant.'
    );
  }
  const prefixes = model.values(target.valueDeclaration.name);
  const owner = callable(model, declaration);
  const returned = owner?.body
    ? returnedExpressions(model, owner)
    : [declaration.initializer];
  const shapes = returned.flatMap((expression) =>
    generatedShape(model, expression, new Map(), new Set(), writes)
  );
  if (
    !prefixes.length ||
    prefixes.some((value) => !value) ||
    !shapes.length ||
    shapes.some(
      (shape) =>
        !shape.dynamic ||
        !prefixes.some((value) => shape.text.startsWith(value))
    )
  ) {
    model.fail(
      node,
      'A generated slot protocol must preserve its declared prefix and produce an opaque suffix on every return.'
    );
  }
  return {
    node,
    declaration,
    symbol: declarationSymbol(model, declaration),
    prefixes,
  };
}

function assignedSymbols(model) {
  const writes = new Set();
  for (const source of model.sources) {
    model.visit(source, (node) => {
      if (
        model.ts.isBinaryExpression(node) &&
        node.operatorToken.kind >= model.ts.SyntaxKind.FirstAssignment &&
        node.operatorToken.kind <= model.ts.SyntaxKind.LastAssignment
      ) {
        const symbol = model.symbol(node.left);
        if (symbol) {
          writes.add(symbol);
        }
      }
    });
  }
  return writes;
}

function protocolRecords(model) {
  const records = new Map();
  const writes = assignedSymbols(model);
  const seen = new Set();
  for (const source of model.sources) {
    model.visit(source, (node) => {
      const tags = model.ts
        .getJSDocTags(node)
        .filter((tag) => tag.tagName.text === 'slotNameProtocol');
      if (!tags.length || seen.has(tags[0])) {
        return;
      }
      seen.add(tags[0]);
      if (tags.length !== 1) {
        model.fail(node, 'Declare a generated slot name protocol once.');
      }
      const record = protocolRecord(
        model,
        tags[0].parent.parent,
        tags[0],
        writes
      );
      if (!record.symbol || records.has(record.symbol)) {
        model.fail(
          node,
          'Resolve one source symbol for the generated slot name producer.'
        );
      }
      records.set(record.symbol, record);
    });
  }
  for (const source of model.sources) {
    model.visit(source, (node) => {
      const assigned =
        model.ts.isBinaryExpression(node) &&
        node.operatorToken.kind >= model.ts.SyntaxKind.FirstAssignment &&
        node.operatorToken.kind <= model.ts.SyntaxKind.LastAssignment;
      if (assigned && records.has(model.symbol(node.left))) {
        model.fail(
          node,
          'A generated slot name producer cannot be reassigned.'
        );
      }
    });
  }
  return records;
}

function addPropertyValues(values, declarations, value) {
  for (const declaration of declarations ?? []) {
    values.set(declaration, [...(values.get(declaration) ?? []), value]);
  }
}

function recordAssignedValues(model, node, values) {
  const { ts } = model;
  if (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
    node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
  ) {
    const value =
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken
        ? node.right
        : undefined;
    addPropertyValues(values, model.symbol(node.left)?.declarations, value);
  }
}

function recordContextualValues(model, node, values) {
  if (!model.ts.isObjectLiteralExpression(node)) {
    return;
  }
  const contextual = model.checker.getContextualType(node);
  if (!contextual) {
    return;
  }
  for (const property of node.properties) {
    const symbol =
      property.name &&
      model.checker.getPropertyOfType(contextual, property.name.getText());
    const value =
      property.initializer ??
      (model.ts.isShorthandPropertyAssignment(property)
        ? property.name
        : undefined);
    if (value) {
      addPropertyValues(values, symbol?.declarations, value);
    }
  }
}

function contextualPropertyValues(model) {
  const values = new Map();
  for (const source of model.sources) {
    model.visit(source, (node) => {
      recordAssignedValues(model, node, values);
      recordContextualValues(model, node, values);
    });
  }
  return values;
}

function originExpressions(model, node) {
  const { ts } = model;
  const type = model.checker.getTypeAtLocation(node);
  if (type.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined)) {
    return [];
  }
  if (transparentExpression(model, node)) {
    return [node.expression];
  }
  return ts.isConditionalExpression(node)
    ? [node.whenTrue, node.whenFalse]
    : undefined;
}

export function createSlotProtocolReader(model) {
  const { ts } = model;
  const records = protocolRecords(model);
  const properties = contextualPropertyValues(model);
  const origins = (node, seen = new Set()) => {
    if (!node || seen.has(node)) {
      return [null];
    }
    const next = new Set([...seen, node]);
    const alternatives = originExpressions(model, node);
    if (alternatives) {
      return alternatives.flatMap((expression) => origins(expression, next));
    }
    const symbol = model.symbol(
      ts.isCallExpression(node) ? node.expression : node
    );
    if (records.has(symbol)) {
      return [records.get(symbol)];
    }
    const declarations = symbol?.declarations ?? [];
    const sources = declarations.flatMap((declaration) => {
      if (ts.isParameter(declaration)) {
        return valuesAtParameter(model, declaration);
      }
      return [
        ...(properties.get(declaration) ?? []),
        ...(declaration.initializer ? [declaration.initializer] : []),
      ];
    });
    if (!sources.length) {
      return [null];
    }
    return sources.flatMap((value) => origins(value, next));
  };
  return (expression) => {
    const found = origins(expression);
    return found.length && !found.includes(null) ? [...new Set(found)] : [];
  };
}
