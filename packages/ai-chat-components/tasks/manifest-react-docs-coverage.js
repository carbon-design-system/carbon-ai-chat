/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { sourceValues } from './manifest-react-docs-values.js';
import { mdxTables } from './manifest-react-docs-mdx.js';

export function matchesDocsFilter(filter, name) {
  if (!filter) {
    return false;
  }
  if (Array.isArray(filter)) {
    return filter.includes(name);
  }
  if (filter instanceof RegExp) {
    filter.lastIndex = 0;
    return filter.test(name);
  }
  throw new Error(
    'Resolve Docs include/exclude filters as an array or regular expression.'
  );
}

function exportedStories(model, source, meta) {
  const symbol = model.checker.getSymbolAtLocation(source);
  return model.checker
    .getExportsOfModule(symbol)
    .filter(
      (entry) =>
        entry.name !== 'default' &&
        (!meta.includeStories ||
          matchesDocsFilter(meta.includeStories, entry.name)) &&
        !matchesDocsFilter(meta.excludeStories, entry.name)
    );
}

function docsParameters(...values) {
  return Object.assign(
    {},
    ...values.map((value) => value?.parameters?.docs?.argTypes)
  );
}

export function mergeDocsAnnotations(...layers) {
  const merged = {};
  for (const layer of layers) {
    for (const [key, value] of Object.entries(layer ?? {})) {
      const object = value && Object.getPrototypeOf(value) === Object.prototype;
      const previous =
        merged[key] && Object.getPrototypeOf(merged[key]) === Object.prototype;
      merged[key] =
        object && previous ? mergeDocsAnnotations(merged[key], value) : value;
    }
  }
  return merged;
}

export function docsTableContext(model, values, table, preview = {}) {
  const meta = values.exported(table.source, 'default') ?? {};
  const stories = exportedStories(model, table.source, meta);
  const name = table.story === 'default' ? undefined : table.story;
  if (
    !stories.length ||
    (name && !stories.some((story) => story.name === name))
  ) {
    throw new Error(
      `${table.filename}:${table.line}: ArgTypes must reference an included story.`
    );
  }
  const story = name ? values.exported(table.source, name) : {};
  if (!story || story === values.unresolved) {
    throw new Error(
      `${table.filename}:${table.line}: Resolve the ArgTypes story metadata.`
    );
  }
  const docs = Object.assign(
    {},
    ...[preview, meta, story].map((value) => value?.parameters?.docs)
  );
  if (docs.disable || (Object.hasOwn(docs, 'page') && docs.page == null)) {
    throw new Error(
      `${table.filename}:${table.line}: Show the ArgTypes table on an enabled Docs page.`
    );
  }
  const filters = {
    ...docsParameters(preview, meta, story),
    ...Object.fromEntries(
      ['include', 'exclude']
        .filter((key) => table[key] !== undefined)
        .map((key) => [key, table[key]])
    ),
  };
  const rows = mergeDocsAnnotations(
    preview?.argTypes,
    meta.argTypes,
    story.argTypes
  );
  return { meta, story, filters, argTypes: rows };
}

export function visibleArgTypeRows({ filters, argTypes }) {
  return Object.entries(argTypes).filter(
    ([name, row]) =>
      row &&
      !row.table?.disable &&
      (!filters.include || matchesDocsFilter(filters.include, name)) &&
      !matchesDocsFilter(filters.exclude, name)
  );
}

function coveredCallback(table, callback, row) {
  const entry = row.manifestEntry;
  if (!entry) {
    return undefined;
  }
  const event = entry.events.find((event) => event.callback === callback);
  if (
    !event ||
    row.description !== event.description ||
    row.table?.type?.summary !== event.type
  ) {
    throw new Error(
      `${table.filename}:${table.line}: Preserve generated description and type for ${callback}.`
    );
  }
  return `${entry.identity}:${callback}`;
}

function documentCoverage(
  model,
  values,
  filename,
  text,
  preview,
  includedStories
) {
  return mdxTables(text, filename, model).flatMap((table) => {
    if (table.tagName) {
      throw new Error(
        `${filename}:${table.line}: Use a CSF story for React callback rows.`
      );
    }
    if (includedStories && !includedStories.has(table.source.fileName)) {
      throw new Error(
        `${filename}:${table.line}: Include the ArgTypes story in Storybook configuration.`
      );
    }
    return visibleArgTypeRows(docsTableContext(model, values, table, preview))
      .map(([callback, row]) => coveredCallback(table, callback, row))
      .filter(Boolean);
  });
}

export function validateReactDocs(
  model,
  registry,
  documents,
  preview = {},
  includedStories
) {
  const values = sourceValues(model, registry);
  const covered = new Set();
  const errors = [];
  for (const [filename, text] of Object.entries(documents)) {
    try {
      documentCoverage(
        model,
        values,
        filename,
        text,
        preview,
        includedStories
      ).forEach((key) => covered.add(key));
    } catch (error) {
      errors.push(error.message);
    }
  }
  const required = registry.flatMap((entry) =>
    entry.events.map((event) => ({ entry, event }))
  );
  for (const { entry, event } of required) {
    if (!covered.has(`${entry.identity}:${event.callback}`)) {
      errors.push(
        `${entry.module}#${entry.exportName}: Show ${event.callback} in a visible MDX ArgTypes table.`
      );
    }
  }
  return [...new Set(errors)];
}
