/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { parse } from '@babel/parser';

const rename = (content, prefix) => content.replace(/(?<!--)cds/g, prefix);

function literalValue(node) {
  if (node.type === 'StringLiteral') {
    return node.value;
  }
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis[0].value.cooked;
  }
  return undefined;
}

function moduleArgument(node) {
  if (
    node.type === 'ImportDeclaration' ||
    node.type === 'ExportNamedDeclaration' ||
    node.type === 'ExportAllDeclaration' ||
    node.type === 'ImportExpression'
  ) {
    return node.source;
  }
  if (node.type === 'TSImportType') {
    return node.argument;
  }
  if (node.type === 'TSExternalModuleReference') {
    return node.expression;
  }
  return undefined;
}

function interfaceRanges(node) {
  const names = [];
  for (const specifier of node.specifiers ?? []) {
    if (specifier.type === 'ImportSpecifier') {
      names.push(specifier.imported);
    } else if (specifier.type === 'ExportSpecifier') {
      names.push(specifier.exported);
      if (node.source) {
        names.push(specifier.local);
      }
    } else if (specifier.type === 'ExportNamespaceSpecifier') {
      names.push(specifier.exported);
    }
  }
  // Public module names link callers to definitions; they are not tag names.
  return names.map(({ start, end }) => ({ start, end }));
}

function moduleRanges(ast) {
  const ranges = [];
  function visit(node) {
    if (!node || typeof node !== 'object') {
      return;
    }
    ranges.push(...interfaceRanges(node));
    const argument = moduleArgument(node);
    if (argument) {
      ranges.push({
        start: argument.start,
        end: argument.end,
        specifier: literalValue(argument),
      });
      return;
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        value.forEach(visit);
      } else if (value?.type) {
        visit(value);
      }
    }
  }
  visit(ast.program);
  for (const comment of ast.comments) {
    if (/^[#@]\s*sourceMappingURL\s*=/.test(comment.value.trim())) {
      ranges.push({ start: comment.start, end: comment.end });
    } else if (
      comment.type === 'CommentLine' &&
      /^\/\s*<reference\b/.test(comment.value)
    ) {
      for (const match of comment.value.matchAll(
        /\b(?:path|types)\s*=\s*(["'])(.*?)\1/g
      )) {
        const start =
          comment.start + 2 + match.index + match[0].indexOf(match[1]);
        ranges.push({
          start,
          end: start + match[2].length + 2,
          specifier: match[2],
        });
      }
    }
  }
  const unique = new Map(
    ranges.map((range) => [`${range.start}:${range.end}`, range])
  );
  return [...unique.values()].sort((a, b) => a.start - b.start);
}

function setterAnnotations(ast) {
  const annotations = [];
  function visit(node) {
    if (!node || typeof node !== 'object') {
      return;
    }
    if (
      node.type === 'TSMethodSignature' &&
      node.kind === 'set' &&
      node.typeAnnotation?.typeAnnotation?.type === 'TSAnyKeyword'
    ) {
      annotations.push(node.typeAnnotation);
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        value.forEach(visit);
      } else if (value?.type) {
        visit(value);
      }
    }
  }
  visit(ast.program);
  return annotations.sort((a, b) => a.start - b.start);
}

function parseDeclaration(content, options, originalError) {
  const recovered = parse(content, { ...options, errorRecovery: true });
  const annotations = setterAnnotations(recovered);
  const matches = (error, annotation) =>
    error.reasonCode === 'SetAccesorCannotHaveReturnType' &&
    error.pos === annotation.start;
  const errorsMatch = recovered.errors.every((error) =>
    annotations.some((annotation) => matches(error, annotation))
  );
  const annotationsMatch = annotations.every((annotation) =>
    recovered.errors.some((error) => matches(error, annotation))
  );
  if (!recovered.errors.length || !errorsMatch || !annotationsMatch) {
    throw originalError;
  }
  // Alpha.3 emits `: any` on mixin setters. A same-length parser view preserves
  // every original offset and output byte; strict parsing still rejects errors.
  let view = content;
  for (const annotation of [...annotations].reverse()) {
    view =
      view.slice(0, annotation.start) +
      view.slice(annotation.start, annotation.end).replace(/[^\r\n]/g, ' ') +
      view.slice(annotation.end);
  }
  return parse(view, options);
}

function parseModule(content, declaration) {
  const options = {
    sourceType: 'module',
    createImportExpressions: true,
    plugins: declaration
      ? [['typescript', { dts: true }], 'decoratorAutoAccessors']
      : [],
  };
  try {
    return parse(content, options);
  } catch (error) {
    if (!declaration || error.reasonCode !== 'SetAccesorCannotHaveReturnType') {
      throw error;
    }
    return parseDeclaration(content, options, error);
  }
}

export async function transformModule(content, file, prefix, resolveSpecifier) {
  const declaration = /\.d\.[cm]?ts$/.test(file);
  let ast;
  try {
    ast = parseModule(content, declaration);
  } catch (error) {
    const message = `${file}: ${error.message}`;
    if (error.stack) {
      error.stack = error.stack.replace(error.message, message);
    }
    error.message = message;
    throw error;
  }
  let updated = '';
  let offset = 0;
  for (const range of moduleRanges(ast)) {
    updated += rename(content.slice(offset, range.start), prefix);
    const specifier =
      range.specifier === undefined
        ? undefined
        : await resolveSpecifier(range.specifier, declaration);
    updated +=
      specifier === undefined || specifier === range.specifier
        ? content.slice(range.start, range.end)
        : JSON.stringify(specifier);
    offset = range.end;
  }
  return updated + rename(content.slice(offset), prefix);
}

export function transformMetadata(value, prefix, mapPath, layers) {
  if (typeof value === 'string') {
    return rename(value, prefix);
  }
  if (Array.isArray(value)) {
    return value.map((item) =>
      transformMetadata(item, prefix, mapPath, layers)
    );
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  const result = {};
  const localPackage = layers.find(
    (layer) => layer.metadata.name === value.package
  );
  const mappedModule =
    typeof value.module === 'string'
      ? mapPath(value.module, localPackage)
      : undefined;
  for (const [key, item] of Object.entries(value)) {
    if (key === 'package') {
      if (!localPackage || !value.module || mappedModule === value.module) {
        result[key] = item;
      }
    } else if (
      (key === 'path' || key === 'module') &&
      typeof item === 'string'
    ) {
      result[key] = mapPath(item, localPackage);
    } else {
      result[key] = transformMetadata(item, prefix, mapPath, layers);
    }
  }
  return result;
}
