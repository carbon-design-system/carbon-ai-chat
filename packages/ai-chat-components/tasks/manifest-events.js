/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { validateEventTypes } from './manifest-event-types.js';
import { fireTags, readEvents } from './manifest-event-producers.js';
import {
  isLitSymbol,
  renderedTemplateContent,
  returnedExpressions,
} from './manifest-template-source.js';
export { fireTags, readEvents } from './manifest-event-producers.js';

function inside(node, owner) {
  for (let current = node; current; current = current.parent) {
    if (current === owner) {
      return true;
    }
  }
  return false;
}

function childExpressions(model, node) {
  const { ts } = model;
  if (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isNonNullExpression(node) ||
    ts.isSpreadElement(node)
  ) {
    return [node.expression];
  }
  if (ts.isConditionalExpression(node)) {
    return [node.whenTrue, node.whenFalse];
  }
  if (ts.isBinaryExpression(node)) {
    return node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
      ? [node.right]
      : [];
  }
  if (ts.isArrayLiteralExpression(node)) {
    return [...node.elements];
  }
  return [];
}

function callReturns(model, call) {
  const { ts } = model;
  const declaration = model.symbol(call.expression)?.valueDeclaration;
  const callable =
    declaration && ts.isFunctionLike(declaration)
      ? declaration
      : declaration?.initializer;
  if (callable?.body) {
    return returnedExpressions(model, callable);
  }
  const mapping =
    ts.isPropertyAccessExpression(call.expression) &&
    call.expression.name.text === 'map' &&
    model.checker.isArrayType(
      model.checker.getTypeAtLocation(call.expression.expression)
    );
  const repeat = isLitSymbol(model, call.expression, 'repeat');
  if (!mapping && !repeat) {
    return [];
  }
  const callback = repeat ? call.arguments.at(-1) : call.arguments[0];
  return callback && ts.isFunctionLike(callback)
    ? returnedExpressions(model, callback)
    : [];
}

function renderedChildren(model, element) {
  const names = new Set();
  const visited = new Set();
  const read = (node) => {
    if (!node || visited.has(node)) {
      return;
    }
    visited.add(node);
    const children = renderedExpressions(model, node, names);
    children.forEach(read);
  };
  const render = element.node.members.find(
    (member) => member.name?.getText() === 'render'
  );
  for (const expression of render ? returnedExpressions(model, render) : []) {
    read(expression);
  }
  return model.elements.filter((entry) => names.has(entry.tagName));
}

function renderedExpressions(model, node, names) {
  const { ts } = model;
  if (ts.isTaggedTemplateExpression(node)) {
    if (!isLitSymbol(model, node.tag, 'html')) {
      return [];
    }
    const content = renderedTemplateContent(model, node.template);
    content.tags.forEach((name) => names.add(name));
    return content.expressions;
  }
  if (ts.isCallExpression(node)) {
    return callReturns(model, node);
  }
  if (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node)) {
    const initializer = model.symbol(node)?.valueDeclaration?.initializer;
    return initializer ? [initializer] : [];
  }
  return childExpressions(model, node);
}

function reexposes(model, element, producer, seen = new Set()) {
  if (inside(producer.node, element.node)) {
    return true;
  }
  if (seen.has(element)) {
    return false;
  }
  seen.add(element);
  return renderedChildren(model, element).some(
    (child) =>
      child === producer.element || reexposes(model, child, producer, seen)
  );
}

const normalize = (type) => type?.replace(/\s+/g, '');
const usefulType = (type) =>
  Boolean(type && !/\bany\b/.test(type) && type !== 'CustomEvent');

function checkMetadata({ name, tags, rows, context }, add) {
  if (!name) {
    add(`${context} needs a name.`);
  }
  if (tags.length > 1 || rows.length > 1) {
    add(`Repeated ${context}.`);
  }
  if (tags.length !== 1) {
    add(`${context} needs one complete @fires declaration.`);
  }
  if (rows.length !== 1) {
    add(`Missing manifest entry for ${context}.`);
  }
  const tag = tags[0];
  const row = rows[0];
  if (!usefulType(tag?.type) || !usefulType(row?.type?.text)) {
    add(`${context} needs a useful event type.`);
  }
  if (!tag?.description || !row?.description?.trim()) {
    add(`${context} needs a description.`);
  }
  if (tag && row && normalize(tag.type) !== normalize(row.type?.text)) {
    add(`${context} source and manifest types differ.`);
  }
}

function elementSurface(model, element, declaration, wrappers, producers) {
  const tags = fireTags(model, element.node);
  const direct = producers.filter((producer) => producer.element === element);
  const bindings = wrappers
    .filter((wrapper) => wrapper.element === element)
    .flatMap((wrapper) => wrapper.callbacks);
  const names = new Set([
    ...direct.map((producer) => producer.name),
    ...bindings.map((binding) => binding.eventName),
    ...tags.map((tag) => tag.name),
    ...(declaration.events ?? []).map((event) => event.name),
  ]);
  return { element, declaration, tags, direct, bindings, names };
}

function checkPair(model, surface, name, producers, errors) {
  const { element, declaration, direct, bindings } = surface;
  const tags = surface.tags.filter((tag) => tag.name === name);
  const rows = (declaration.events ?? []).filter(
    (event) => event.name === name
  );
  const owned = direct.filter((entry) => entry.name === name);
  const producer = owned[0];
  const binding = bindings.find((entry) => entry.eventName === name);
  const origin =
    producer?.node ?? binding?.node ?? tags[0]?.node ?? element.node;
  const add = (message) => errors.push(`${model.location(origin)}: ${message}`);
  const context = `${element.tagName} event ${name ?? '<unnamed>'}`;
  const descendants = producers.filter(
    (entry) => entry.name === name && reexposes(model, element, entry)
  );
  const inherited = descendants.filter(
    (entry) => entry.bubbles && entry.composed
  );
  if (!producer && !binding && !inherited.length) {
    add(`Unjustified ${context}.`);
  }
  if (
    !producer &&
    descendants.some((entry) => !entry.bubbles || !entry.composed)
  ) {
    add(
      `${context} cannot re-expose a child event without bubbles and composed.`
    );
  }
  checkMetadata({ name, tags, rows, context }, add);
  return {
    element,
    name,
    type: rows[0]?.type?.text,
    description: rows[0]?.description,
    producer,
    producers: [...new Set([...owned, ...inherited])],
  };
}

function checkProtocols(model, producers, errors) {
  for (const producer of producers.filter((entry) => entry.protocol)) {
    const tags = producer.tags.filter((tag) => tag.name === producer.name);
    if (
      tags.length !== 1 ||
      !usefulType(tags[0]?.type) ||
      !tags[0]?.description
    ) {
      errors.push(
        `${model.location(producer.node)}: Protocol event ${producer.name} needs one typed, described @fires declaration.`
      );
    }
  }
}

export function validateEvents(
  model,
  manifest,
  wrappers = [],
  producers = readEvents(model)
) {
  const errors = [];
  const declarations = manifest.modules.flatMap(
    (module) => module.declarations ?? []
  );
  const pairs = [];
  for (const element of model.elements) {
    const declaration = declarations.find(
      (entry) => entry.tagName === element.tagName
    );
    if (!declaration) {
      errors.push(
        `${element.location}: Missing manifest element ${element.tagName}.`
      );
      continue;
    }
    const surface = elementSurface(
      model,
      element,
      declaration,
      wrappers,
      producers
    );
    for (const name of surface.names) {
      pairs.push(checkPair(model, surface, name, producers, errors));
    }
  }
  checkProtocols(model, producers, errors);
  errors.push(...validateEventTypes(model, producers, pairs));
  if (errors.length) {
    throw new Error(`Event contract validation failed:\n${errors.join('\n')}`);
  }
  return { producers, pairs };
}
