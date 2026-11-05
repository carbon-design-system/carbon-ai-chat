/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDocsInputs } from './manifest-docs-inputs.js';
import { sourceValues } from './manifest-react-docs-values.js';
import { mdxTables } from './manifest-react-docs-mdx.js';
import {
  docsTableContext,
  mergeDocsAnnotations,
  visibleArgTypeRows,
} from './manifest-react-docs-coverage.js';

function eventDeclarations(manifest) {
  const declarations = manifest.modules
    .flatMap((module) => module.declarations ?? [])
    .filter((declaration) => declaration.tagName && declaration.events?.length);
  const tags = new Map();
  for (const declaration of declarations) {
    if (tags.has(declaration.tagName)) {
      throw new Error(
        `Resolve one CEM declaration for ${declaration.tagName}.`
      );
    }
    tags.set(declaration.tagName, declaration);
  }
  return tags;
}

function manifestRows(declaration) {
  const rows = Object.fromEntries(
    declaration.events.map((event) => [
      event.name,
      {
        description: event.description,
        table: { category: 'events', type: { summary: event.type?.text } },
      },
    ])
  );
  for (const key of ['slots', 'cssProperties', 'cssParts']) {
    for (const item of declaration[key] ?? []) {
      if (Object.hasOwn(rows, item.name)) {
        rows[item.name] = { table: { category: key } };
      }
    }
  }
  return rows;
}

function blockFilters(table, defaults) {
  return {
    ...defaults,
    ...Object.fromEntries(
      ['include', 'exclude']
        .filter((key) => table[key] !== undefined)
        .map((key) => [key, table[key]])
    ),
  };
}

function tableRows(context, table, preview, declaration) {
  const rows = manifestRows(declaration);
  if (table.tagName) {
    return {
      argTypes: rows,
      filters: blockFilters(table, preview?.parameters?.docs?.argTypes),
    };
  }
  return {
    argTypes: mergeDocsAnnotations(rows, context.argTypes),
    filters: context.filters,
  };
}

function tableCoverage(model, values, tags, table, preview, storyFiles) {
  if (storyFiles && !storyFiles.has(table.source.fileName)) {
    throw new Error(
      `${table.filename}:${table.line}: Include the ArgTypes story in Storybook configuration.`
    );
  }
  const context = docsTableContext(model, values, table, preview);
  const tagName = table.tagName ?? context.meta.component;
  if (typeof tagName !== 'string') {
    throw new Error(
      `${table.filename}:${table.line}: Associate the WC ArgTypes table with a component tag.`
    );
  }
  const declaration = tags.get(tagName);
  if (!declaration) {
    return [];
  }
  return visibleArgTypeRows(
    tableRows(context, table, preview, declaration)
  ).flatMap(([name, row]) => {
    const event = declaration.events.find((event) => event.name === name);
    if (!event) {
      return [];
    }
    if (
      !event.description?.trim() ||
      !event.type?.text?.trim() ||
      row.description !== event.description ||
      row.table?.category !== 'events' ||
      row.table?.type?.summary !== event.type.text
    ) {
      throw new Error(
        `${table.filename}:${table.line}: Preserve the CEM description and type for ${tagName} ${name}.`
      );
    }
    return [`${tagName}:${name}`];
  });
}

export function validateWcDocs(
  model,
  manifest,
  documents,
  preview = {},
  storyFiles
) {
  const tags = eventDeclarations(manifest);
  const values = sourceValues(model);
  const covered = new Set();
  const errors = [];
  for (const [filename, text] of Object.entries(documents)) {
    try {
      for (const table of mdxTables(text, filename, model)) {
        tableCoverage(model, values, tags, table, preview, storyFiles).forEach(
          (key) => covered.add(key)
        );
      }
    } catch (error) {
      errors.push(error.message);
    }
  }
  for (const [tagName, declaration] of tags) {
    for (const event of declaration.events) {
      if (!covered.has(`${tagName}:${event.name}`)) {
        errors.push(
          `${tagName}: Show ${event.name} in a visible WC MDX ArgTypes table.`
        );
      }
    }
  }
  return [...new Set(errors)];
}

export async function checkWcDocs(
  root = fileURLToPath(new URL('../', import.meta.url))
) {
  const { model, documents, preview, storyFiles } = await readDocsInputs(
    root,
    '.storybook'
  );
  const manifest = JSON.parse(
    await readFile(path.join(root, 'custom-elements.json'), 'utf8')
  );
  const errors = validateWcDocs(
    model,
    manifest,
    documents,
    preview,
    storyFiles
  );
  if (errors.length) {
    throw new Error(errors.join('\n'));
  }
  const declarations = [...eventDeclarations(manifest).values()];
  console.info(
    `Verified WC documentation for ${declarations.length} event-bearing tags and ${declarations.reduce((count, declaration) => count + declaration.events.length, 0)} event rows.`
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await checkWcDocs();
}
