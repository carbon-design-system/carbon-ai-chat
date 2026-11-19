/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDocsInputs } from './manifest-docs-inputs.js';
import { readWrappers } from './manifest-wrappers.js';
import {
  reactEventRegistry,
  renderReactRegistry,
} from './manifest-react-docs-registry.js';
import { validateReactDocs } from './manifest-react-docs-coverage.js';

export async function generateReactDocs(
  root = fileURLToPath(new URL('../', import.meta.url))
) {
  const { model, documents, preview, storyFiles } = await readDocsInputs(
    root,
    '.storybook-react'
  );
  const manifest = JSON.parse(
    await readFile(path.join(root, 'custom-elements.json'), 'utf8')
  );
  const registry = reactEventRegistry(readWrappers(model), manifest, model);
  const errors = validateReactDocs(
    model,
    registry,
    documents,
    preview,
    storyFiles
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
