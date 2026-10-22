/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { globby } from 'globby';
import { readSource } from './manifest-source.js';
import { sourceValues } from './manifest-react-docs-values.js';

export async function readDocsInputs(root, configuration) {
  const directory = path.join(root, configuration);
  const config = path.join(directory, 'main.js');
  const initial = readSource({ root, additionalFiles: [config] });
  const options = sourceValues(initial).exported(
    initial.program.getSourceFile(config),
    'default'
  );
  if (
    !Array.isArray(options?.stories) ||
    options.stories.some((entry) => typeof entry !== 'string')
  ) {
    throw new Error(`Resolve ${configuration} stories as static string globs.`);
  }
  const included = await globby(options.stories, {
    cwd: directory,
    absolute: true,
  });
  const storyFiles = new Set(included.filter((file) => !file.endsWith('.mdx')));
  const previews = await globby('preview.{js,jsx,ts,tsx}', {
    cwd: directory,
    absolute: true,
  });
  if (previews.length !== 1) {
    throw new Error(`Resolve one ${configuration} preview module.`);
  }
  const model = readSource({
    root,
    additionalFiles: [config, ...previews, ...storyFiles],
  });
  const values = sourceValues(model);
  const previewSource = model.program.getSourceFile(previews[0]);
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
  return { model, preview, documents, storyFiles };
}
