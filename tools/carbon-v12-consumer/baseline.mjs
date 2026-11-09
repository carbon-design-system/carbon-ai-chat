/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const removedDecorator = (path) =>
  /\/globals\/decorators\/(?:carbon-element|index)\.(?:js|d\.ts)$/.test(path);

export async function assertParentBaseline({ consumer, baselinePath }) {
  if (!baselinePath) {
    return;
  }
  const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
  const results = [];
  for (const [name, expected] of Object.entries(baseline.packages)) {
    const root = join(consumer, 'node_modules', name);
    const componentPackage = name === '@carbon/ai-chat-components';
    const publicPath = (path) =>
      componentPackage ||
      /(?:aiChatEntry|serverEntry)\.(?:js|d\.ts)$|\/web-components\//.test(
        path
      );
    const paths = expected.paths.filter(
      (path) => publicPath(path) && !removedDecorator(path)
    );
    for (const path of paths) {
      await access(join(root, path));
    }
    const exportEntries = [
      ...Object.entries(expected.exports),
      ...Object.entries(expected.types),
    ].filter(([path]) => publicPath(path) && !removedDecorator(path));
    const program = ts.createProgram(
      exportEntries.map(([path]) => join(root, path)),
      {
        allowJs: true,
        checkJs: false,
        noEmit: true,
        skipLibCheck: true,
        types: [],
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        moduleDetection: ts.ModuleDetectionKind.Force,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
      }
    );
    const checker = program.getTypeChecker();
    for (const [path, names] of exportEntries) {
      const source = program.getSourceFile(join(root, path));
      const symbol = source && checker.getSymbolAtLocation(source);
      assert.ok(symbol, `Missing parent public module ${name}/${path}`);
      const actual = checker.getExportsOfModule(symbol).map(({ name }) => name);
      assert.deepEqual(
        names.filter((name) => !actual.includes(name)),
        [],
        `Removed parent public exports: ${name}/${path}`
      );
    }
    for (const [path, css] of Object.entries(expected.css)) {
      const file = join(root, path);
      const content = path.endsWith('.js')
        ? (await import(pathToFileURL(file).href)).default.cssText
        : await readFile(file);
      assert.equal(
        createHash('sha256').update(content).digest('hex'),
        css.sha256,
        `Emitted CSS changed: ${name}/${path}`
      );
      assert.equal(
        content.length,
        css.length,
        `Emitted CSS length changed: ${name}/${path}`
      );
    }
    results.push({
      name,
      publicPaths: paths.length,
      exportSets: exportEntries.length,
      unchangedCss: Object.keys(expected.css).length,
    });
  }
  await writeFile(
    join(consumer, 'parent-baseline.json'),
    JSON.stringify({ parent: baseline.parent, results }, null, 2)
  );
  console.log(
    'Parent baseline: retained public paths/exports and byte-identical emitted CSS passed.'
  );
}
