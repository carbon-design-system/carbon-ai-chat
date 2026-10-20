/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createProcessor } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';

const containers = new Set([
  'div',
  'section',
  'main',
  'article',
  'aside',
  'nav',
  'span',
  'p',
  'ul',
  'ol',
  'li',
  'blockquote',
  'figure',
  'figcaption',
  'table',
  'thead',
  'tbody',
  'tr',
  'td',
  'th',
]);

function expression(attribute) {
  return attribute?.value?.data?.estree?.body?.[0]?.expression;
}

function literal(node) {
  if (!node) {
    return undefined;
  }
  if (node.type === 'Literal') {
    return node.regex
      ? new RegExp(node.regex.pattern, node.regex.flags)
      : node.value;
  }
  if (node.type === 'ArrayExpression') {
    return node.elements.map(literal);
  }
  throw new Error(
    'Use a literal array or regular expression for Docs row filters.'
  );
}

function filter(attribute) {
  if (!attribute) {
    return undefined;
  }
  if (attribute.value?.type !== 'mdxJsxAttributeValueExpression') {
    throw new Error(
      'Use a literal array or regular expression for Docs row filters.'
    );
  }
  return literal(expression(attribute));
}

function importedName(specifier) {
  if (specifier.type === 'ImportNamespaceSpecifier') {
    return '*';
  }
  if (specifier.type === 'ImportDefaultSpecifier') {
    return 'default';
  }
  return specifier.imported.name;
}

function importBindings(statement, filename, model) {
  return statement.specifiers.map((specifier) => [
    specifier.local.name,
    {
      module: statement.source.value,
      source: model.resolveModule(statement.source.value, filename),
      name: importedName(specifier),
    },
  ]);
}

function imports(tree, filename, model) {
  const statements = tree.children
    .filter((node) => node.type === 'mdxjsEsm')
    .flatMap((node) => node.data.estree.body);
  return new Map(
    statements
      .filter((statement) => statement.type === 'ImportDeclaration')
      .flatMap((statement) => importBindings(statement, filename, model))
  );
}

function importedStory(binding, story) {
  return binding?.source && { source: binding.source, story };
}

function storyReference(node, bindings) {
  if (node?.type === 'Identifier') {
    const binding = bindings.get(node.name);
    return importedStory(
      binding,
      binding?.name === '*' ? undefined : binding?.name
    );
  }
  if (
    node?.type !== 'MemberExpression' ||
    node.computed ||
    node.object.type !== 'Identifier'
  ) {
    return undefined;
  }
  const binding = bindings.get(node.object.name);
  return binding?.name === '*' && importedStory(binding, node.property.name);
}

function tagReference(attribute) {
  if (typeof attribute?.value === 'string') {
    return attribute.value;
  }
  const node = expression(attribute);
  return node?.type === 'Literal' && typeof node.value === 'string'
    ? node.value
    : undefined;
}

function visible(node) {
  return !node.attributes.some(
    (attribute) =>
      attribute.type === 'mdxJsxAttribute' &&
      ['hidden', 'aria-hidden', 'style'].includes(attribute.name)
  );
}

function blockBinding(bindings, name) {
  const [local, member] = (name ?? '').split('.');
  const binding = bindings.get(local);
  return binding?.name === '*' && member
    ? { ...binding, name: member }
    : binding;
}

function docsBlock(node, bindings, filename) {
  const binding = blockBinding(bindings, node.name);
  if (
    binding?.module !== '@storybook/addon-docs/blocks' ||
    !['Meta', 'ArgTypes'].includes(binding.name)
  ) {
    return undefined;
  }
  if (
    node.attributes.some((attribute) => attribute.type !== 'mdxJsxAttribute')
  ) {
    throw new Error(
      `${filename}:${node.position.start.line}: Use explicit Docs block attributes.`
    );
  }
  const attributes = new Map(node.attributes.map((item) => [item.name, item]));
  return {
    kind: binding.name,
    reference: storyReference(expression(attributes.get('of')), bindings),
    tagName: tagReference(attributes.get('of')),
    include: filter(attributes.get('include')),
    exclude: filter(attributes.get('exclude')),
    explicit: attributes.has('of'),
    line: node.position.start.line,
  };
}

function resolveTable(block, attached, filename) {
  let reference = attached;
  if (block.explicit && !block.tagName) {
    reference = block.reference;
  }
  if (!reference) {
    throw new Error(
      `${filename}:${block.line}: Resolve the Docs ArgTypes story reference.`
    );
  }
  return { ...block, ...reference, filename };
}

export function mdxTables(text, filename, model) {
  const tree = createProcessor({ remarkPlugins: [remarkGfm] }).parse(text);
  const bindings = imports(tree, filename, model);
  const blocks = [];
  const visit = (node) => {
    if (
      ['root', 'paragraph', 'blockquote', 'list', 'listItem'].includes(
        node.type
      )
    ) {
      return node.children.forEach(visit);
    }
    if (
      !['mdxJsxFlowElement', 'mdxJsxTextElement'].includes(node.type) ||
      !visible(node)
    ) {
      return;
    }
    const block = docsBlock(node, bindings, filename);
    if (block) {
      blocks.push(block);
      return;
    }
    if (!node.name || containers.has(node.name)) {
      node.children.forEach(visit);
    }
  };
  visit(tree);
  const attached = blocks.find((block) => block.kind === 'Meta')?.reference;
  return blocks
    .filter((block) => block.kind === 'ArgTypes')
    .map((block) => resolveTable(block, attached, filename));
}
