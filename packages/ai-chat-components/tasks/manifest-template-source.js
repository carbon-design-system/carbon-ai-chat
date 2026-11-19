/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

export function templateMarkup(model, template) {
  const { ts } = model;
  if (ts.isNoSubstitutionTemplateLiteral(template)) {
    return {
      markup: template.text,
      expressions: [],
      marker: '__caic_expression__',
    };
  }
  const literals = [
    template.head.text,
    ...template.templateSpans.map((span) => span.literal.text),
  ];
  let marker = '__caic_expression__';
  while (literals.some((literal) => literal.includes(marker))) {
    marker += '_';
  }
  let markup = template.head.text;
  const expressions = [];
  for (const [index, span] of template.templateSpans.entries()) {
    expressions.push(span.expression);
    markup += `${marker}${index}${marker}${span.literal.text}`;
  }
  return { markup, expressions, marker };
}

export function isLitSymbol(model, node, name, seen = new Set()) {
  const symbol = model.symbol(node);
  if (!symbol || seen.has(symbol)) {
    return false;
  }
  seen.add(symbol);
  return (symbol.declarations ?? []).some((declaration) => {
    const filename = declaration.getSourceFile().fileName.replaceAll('\\', '/');
    if (
      symbol.name === name &&
      /\/node_modules\/(?:lit|lit-html)\//.test(filename)
    ) {
      return true;
    }
    return Boolean(
      declaration.initializer &&
      isLitSymbol(model, declaration.initializer, name, seen)
    );
  });
}

export function returnedExpressions(model, callable) {
  const { ts } = model;
  const implementation = callable.initializer ?? callable;
  if (ts.isArrowFunction(implementation) && !ts.isBlock(implementation.body)) {
    return [implementation.body];
  }
  const expressions = [];
  const collect = (node) => {
    if (ts.isFunctionLike(node)) {
      return;
    }
    if (ts.isReturnStatement(node) && node.expression) {
      expressions.push(node.expression);
    }
    ts.forEachChild(node, collect);
  };
  if (implementation.body) {
    collect(implementation.body);
  }
  return expressions;
}

export function renderedMarkup(markup) {
  const attributes = String.raw`(?:[^"'<>]|"[^"]*"|'[^']*')*`;
  const raw = new RegExp(
    String.raw`<!--[\s\S]*?(?:-->|$)|<(script|style|textarea|title|xmp|iframe|noembed|noframes|noscript)(?=[\s/>])${attributes}>[\s\S]*?(?:<\/\1\s*>|$)|<(plaintext)(?=[\s/>])${attributes}>[\s\S]*|<\/?[a-z][\w:-]*\b${attributes}>`,
    'gi'
  );
  const visible = markup.replace(raw, (match, rawText, plainText) =>
    rawText || plainText || match.startsWith('<!--') ? '' : match
  );
  const tags = new RegExp(String.raw`(<\/?[a-z][\w:-]*\b${attributes}>)`, 'gi');
  let depth = 0;
  return visible
    .split(tags)
    .map((part) => {
      const inert = part.match(/^<(\/?)template(?=[\s/>])/i);
      if (inert) {
        depth = Math.max(0, depth + (inert[1] ? -1 : 1));
        return '';
      }
      return depth ? '' : part;
    })
    .join('');
}

export function renderedTemplateContent(model, template) {
  const { markup, expressions, marker } = templateMarkup(model, template);
  const tags = [];
  const children = [];
  const tokens = new RegExp(
    String.raw`<(\/?)([a-z][a-z0-9-]*)(?:[^"'<>]|"[^"]*"|'[^']*')*>|${marker}(\d+)${marker}`,
    'gi'
  );
  for (const match of renderedMarkup(markup).matchAll(tokens)) {
    if (match[2] && !match[1]) {
      tags.push(match[2].toLowerCase());
    }
    if (match[3] !== undefined) {
      children.push(expressions[Number(match[3])]);
    }
  }
  return { tags, expressions: children };
}
