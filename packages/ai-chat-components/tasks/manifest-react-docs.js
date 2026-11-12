/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { globby } from 'globby';
import { readSource } from './manifest-source.js';
import { readWrappers } from './manifest-wrappers.js';
import { sourceValues } from './manifest-react-docs-values.js';
import {
  reactEventRegistry,
  renderReactRegistry,
} from './manifest-react-docs-registry.js';
import { validateReactDocs } from './manifest-react-docs-coverage.js';

export async function generateReactDocs(
  root = fileURLToPath(new URL('../', import.meta.url))
) {
  const config = path.join(root, '.storybook-react/main.js');
  const previewFile = path.join(root, '.storybook-react/preview.jsx');
  const initial = readSource({ root, additionalFiles: [config] });
  const options = sourceValues(initial, []).exported(
    initial.program.getSourceFile(config),
    'default'
  );
  if (
    !Array.isArray(options?.stories) ||
    options.stories.some((entry) => typeof entry !== 'string')
  ) {
    throw new Error('Resolve React Storybook stories as static string globs.');
  }
  const included = await globby(options.stories, {
    cwd: path.dirname(config),
    absolute: true,
  });
  const stories = included.filter((file) => !file.endsWith('.mdx'));
  const model = readSource({
    root,
    additionalFiles: [config, previewFile, ...stories],
  });
  const manifest = JSON.parse(
    await readFile(path.join(root, 'custom-elements.json'), 'utf8')
  );
  const registry = reactEventRegistry(readWrappers(model), manifest, model);
  const values = sourceValues(model, registry);
  const previewSource = model.program.getSourceFile(previewFile);
  const preview = {
    argTypes: values.exported(previewSource, 'argTypes'),
    parameters: values.exported(previewSource, 'parameters'),
  };
  const documents = Object.fromEntries(
    await Promise.all(
      included
        .filter((file) => file.endsWith('.mdx'))
        .map(async (file) => [file, await readFile(file, 'utf8')])
    )
  );
  const errors = validateReactDocs(
    model,
    registry,
    documents,
    preview,
    new Set(stories)
  );
  if (errors.length) {
    throw new Error(errors.join('\n'));
  }
  await writeFile(
    path.join(root, '.storybook-react/manifest-wrapper-registry.generated.js'),
    renderReactRegistry(registry, '.storybook-react')
  );
  console.info(
    `Generated React event documentation for ${registry.length} exports; verified ${Object.keys(documents).length} MDX pages.`
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await generateReactDocs();
}
