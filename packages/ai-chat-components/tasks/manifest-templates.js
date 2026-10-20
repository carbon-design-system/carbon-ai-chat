/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  isLitSymbol,
  renderedTemplateContent,
  returnedExpressions,
  templateMarkup,
} from './manifest-template-source.js';

function assignedValues(model) {
  const assignments = new Map();
  for (const source of model.sources) {
    model.visit(source, (node) => {
      if (
        !model.ts.isBinaryExpression(node) ||
        node.operatorToken.kind !== model.ts.SyntaxKind.EqualsToken
      ) {
        return;
      }
      const symbol = model.symbol(node.left);
      if (symbol) {
        assignments.set(symbol, [
          ...(assignments.get(symbol) ?? []),
          node.right,
        ]);
      }
    });
  }
  return assignments;
}

function parameterArguments(model, declaration) {
  const owner = declaration.parent;
  const symbol = model.symbol(owner.name ?? owner.parent?.name);
  const index = owner.parameters.indexOf(declaration);
  return (model.calls.get(symbol) ?? [])
    .map((call) => call.arguments[index] ?? declaration.initializer)
    .filter(Boolean);
}

function declaredCallableReturns(
  model,
  expression,
  assignments,
  seen = new Set()
) {
  if (
    model.ts.isParenthesizedExpression(expression) ||
    model.ts.isAsExpression(expression) ||
    model.ts.isSatisfiesExpression(expression) ||
    model.ts.isNonNullExpression(expression)
  ) {
    return declaredCallableReturns(
      model,
      expression.expression,
      assignments,
      seen
    );
  }
  if (model.ts.isFunctionLike(expression)) {
    return returnedExpressions(model, expression);
  }
  const symbol = model.symbol(expression);
  if (!symbol || seen.has(symbol)) {
    return [];
  }
  const next = new Set([...seen, symbol]);
  const assigned = (assignments.get(symbol) ?? []).flatMap((value) =>
    declaredCallableReturns(model, value, assignments, next)
  );
  return [
    ...assigned,
    ...(symbol.declarations ?? []).flatMap((declaration) => {
      if (model.ts.isParameter(declaration)) {
        return parameterArguments(model, declaration).flatMap((argument) =>
          model.ts.isFunctionLike(argument)
            ? returnedExpressions(model, argument)
            : declaredCallableReturns(model, argument, assignments, next)
        );
      }
      const callable = model.ts.isFunctionLike(declaration)
        ? declaration
        : declaration.initializer;
      if (callable?.body) {
        return returnedExpressions(model, callable);
      }
      return declaration.initializer
        ? declaredCallableReturns(
            model,
            declaration.initializer,
            assignments,
            next
          )
        : [];
    }),
  ];
}

function callResults(model, call, assignments) {
  const returned = declaredCallableReturns(model, call.expression, assignments);
  if (returned.length) {
    return returned;
  }
  const mapping =
    model.ts.isPropertyAccessExpression(call.expression) &&
    ['map', 'flatMap'].includes(call.expression.name.text) &&
    model.checker.isArrayLikeType(
      model.checker.getTypeAtLocation(call.expression.expression)
    );
  const repeat = isLitSymbol(model, call.expression, 'repeat');
  const callback = repeat ? call.arguments.at(-1) : call.arguments[0];
  if ((mapping || repeat) && callback) {
    return model.ts.isFunctionLike(callback)
      ? returnedExpressions(model, callback)
      : declaredCallableReturns(model, callback, assignments);
  }
  for (const argument of call.arguments) {
    const candidates = [
      argument,
      ...declaredCallableReturns(model, argument, assignments),
    ];
    for (const candidate of candidates) {
      model.visit(candidate, (node) => {
        if (
          model.ts.isTaggedTemplateExpression(node) &&
          isLitSymbol(model, node.tag, 'html') &&
          /<slot(?=[\s/>])/i.test(templateMarkup(model, node.template).markup)
        ) {
          model.fail(
            call,
            'Resolve the returned slot template through a supported source renderer.'
          );
        }
      });
    }
  }
  return [];
}

function renderableChildren(model, node) {
  const { ts } = model;
  if (ts.isConditionalExpression(node)) {
    return [node.whenTrue, node.whenFalse];
  }
  if (ts.isArrayLiteralExpression(node)) {
    return [...node.elements];
  }
  if (ts.isBinaryExpression(node)) {
    const kind = node.operatorToken.kind;
    if (kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      return [node.right];
    }
    return [
      ts.SyntaxKind.BarBarToken,
      ts.SyntaxKind.QuestionQuestionToken,
    ].includes(kind)
      ? [node.left, node.right]
      : [];
  }
  if (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isNonNullExpression(node) ||
    ts.isSpreadElement(node)
  ) {
    return [node.expression];
  }
  return [];
}

function renderReturns(model, element, assignments) {
  if (!model.ts.isClassLike(element.node)) {
    const expression =
      element.node.name ?? element.node.expression ?? element.node;
    const returned = declaredCallableReturns(model, expression, assignments);
    return returned.length ? returned : [expression];
  }
  const render =
    element.node.members.find(
      (member) => member.name?.getText() === 'render'
    ) ??
    model.checker.getPropertyOfType(
      model.checker.getTypeAtLocation(element.node),
      'render'
    )?.valueDeclaration;
  return render ? returnedExpressions(model, render) : [];
}

function symbolValues(model, symbol, assignments) {
  const { ts } = model;
  return [
    ...(assignments.get(symbol) ?? []),
    ...(symbol?.declarations ?? []).flatMap((declaration) => {
      if (ts.isGetAccessorDeclaration(declaration)) {
        return returnedExpressions(model, declaration);
      }
      if (
        ts.isBindingElement(declaration) &&
        ts.isObjectBindingPattern(declaration.parent)
      ) {
        return selectedValues(
          model,
          declaration.parent.parent.initializer,
          assignments,
          (declaration.propertyName ?? declaration.name).getText()
        );
      }
      return declaration.initializer ? [declaration.initializer] : [];
    }),
  ];
}

function selectedValues(
  model,
  expression,
  assignments,
  name,
  seen = new Set()
) {
  const { ts } = model;
  if (!expression || seen.has(expression)) {
    return [];
  }
  const next = new Set([...seen, expression]);
  if (ts.isObjectLiteralExpression(expression)) {
    return expression.properties
      .filter(
        (entry) =>
          name === undefined ||
          (entry.name?.text ?? entry.name?.getText()) === name
      )
      .map((entry) => entry.initializer ?? entry.name)
      .filter(Boolean);
  }
  if (ts.isArrayLiteralExpression(expression)) {
    return name === undefined
      ? [...expression.elements]
      : [expression.elements[Number(name)]].filter(Boolean);
  }
  if (ts.isCallExpression(expression)) {
    return callResults(model, expression, assignments).flatMap((returned) =>
      selectedValues(model, returned, assignments, name, next)
    );
  }
  const initializers = symbolValues(
    model,
    model.symbol(expression),
    assignments
  );
  if (initializers.length) {
    return initializers.flatMap((value) =>
      selectedValues(model, value, assignments, name, next)
    );
  }
  const type = model.checker.getTypeAtLocation(expression);
  const properties =
    name === undefined
      ? model.checker.getPropertiesOfType(type)
      : [model.checker.getPropertyOfType(type, name)].filter(Boolean);
  return properties.flatMap((property) =>
    symbolValues(model, property, assignments)
  );
}

function elementAccessValues(model, node, assignments) {
  let names;
  try {
    names = model.ts.isNumericLiteral(node.argumentExpression)
      ? [node.argumentExpression.text]
      : model.values(node.argumentExpression);
  } catch {
    return selectedValues(model, node.expression, assignments);
  }
  return names.flatMap((name) =>
    selectedValues(model, node.expression, assignments, name)
  );
}

function readRenderedTemplates(model, element, assignments) {
  const { ts } = model;
  const templates = new Set();
  const visited = new Set();

  const children = (node) => {
    if (ts.isTaggedTemplateExpression(node)) {
      if (!isLitSymbol(model, node.tag, 'html')) {
        return [];
      }
      templates.add(node);
      return renderedTemplateContent(model, node.template).expressions;
    }
    if (ts.isCallExpression(node)) {
      return callResults(model, node, assignments);
    }
    if (ts.isElementAccessExpression(node)) {
      return elementAccessValues(model, node, assignments);
    }
    if (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node)) {
      return symbolValues(model, model.symbol(node), assignments);
    }
    return renderableChildren(model, node);
  };

  const read = (node) => {
    if (!node || visited.has(node)) {
      return;
    }
    visited.add(node);
    children(node).forEach(read);
  };
  renderReturns(model, element, assignments).forEach(read);
  return [...templates];
}

export function createTemplateReader(model) {
  const assignments = assignedValues(model);
  return (element) => readRenderedTemplates(model, element, assignments);
}
