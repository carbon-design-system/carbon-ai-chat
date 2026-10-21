/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import { realpath, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import ts from 'typescript';

const trees = ['es', 'es-custom'];
const source = `
import type { CSSResult } from 'lit';
import { inlineMarkdownStyles } from '@carbon/ai-chat-components/es/components/markdown/index.js';
import { inlineMarkdownStyles as customInlineMarkdownStyles } from '@carbon/ai-chat-components/es-custom/components/markdown/index.js';
const regularStyles: CSSResult = inlineMarkdownStyles;
const customStyles: CSSResult = customInlineMarkdownStyles;
type IsAny<T> = 0 extends 1 & T ? true : false;
const regularIsAny: IsAny<typeof inlineMarkdownStyles> = false;
const customIsAny: IsAny<typeof customInlineMarkdownStyles> = false;
// @ts-expect-error The regular style value is not a number.
const regularNumber: number = inlineMarkdownStyles;
// @ts-expect-error The custom style value is not a number.
const customNumber: number = customInlineMarkdownStyles;
export { regularStyles, customStyles, regularIsAny, customIsAny };
`;

async function assertLocalDeclarations(root, name, program, options) {
  const pending = trees.map((tree) =>
    join(root, tree, 'components/markdown/src/inline-markdown.d.ts')
  );
  const visited = new Set();
  while (pending.length) {
    const path = pending.pop();
    if (visited.has(path)) {
      continue;
    }
    visited.add(path);
    const declaration = program.getSourceFile(path);
    assert.ok(declaration, `${name}: missing style declaration ${path}.`);
    for (const imported of ts.preProcessFile(declaration.text).importedFiles) {
      if (!imported.fileName.startsWith('.')) {
        continue;
      }
      const resolved = ts.resolveModuleName(
        imported.fileName,
        declaration.fileName,
        options,
        ts.sys
      ).resolvedModule;
      assert.ok(
        resolved,
        `${name}: missing published declaration dependency ${imported.fileName} from ${path}.`
      );
      const dependency = await realpath(resolved.resolvedFileName);
      assert.ok(
        !relative(root, dependency).startsWith('..'),
        `${name}: local style declaration dependencies must stay inside the packed components package.`
      );
      assert.match(dependency, /\.d\.[cm]?ts$/);
      pending.push(dependency);
    }
  }
}

async function compileTypes(consumer, name, module, moduleResolution) {
  const fixture = join(consumer, 'inline-styles.ts');
  const root = await realpath(
    join(consumer, 'node_modules/@carbon/ai-chat-components')
  );
  const options = {
    module,
    moduleResolution,
    target: ts.ScriptTarget.ES2022,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    types: [],
    esModuleInterop: true,
  };
  const program = ts.createProgram([fixture], options);
  for (const tree of trees) {
    const specifier = `@carbon/ai-chat-components/${tree}/components/markdown/index.js`;
    const resolved = ts.resolveModuleName(
      specifier,
      fixture,
      options,
      ts.sys
    ).resolvedModule;
    assert.ok(resolved, `${name}: unresolved style import ${specifier}.`);
    assert.equal(
      await realpath(resolved.resolvedFileName),
      join(root, tree, 'components/markdown/index.d.ts'),
      `${name}: style imports must resolve to the installed packed declarations.`
    );
  }
  await assertLocalDeclarations(root, name, program, options);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  const formatted = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCurrentDirectory: () => consumer,
    getCanonicalFileName: (path) => path,
    getNewLine: () => '\n',
  });
  await writeFile(join(consumer, `inline-styles-${name}.log`), formatted);
  assert.equal(
    diagnostics.length,
    0,
    `${name}: packed inline Markdown style type errors:\n${formatted}`
  );
  console.log(
    `${name}: both packed inline Markdown styles retain CSSResult, reject any and number, and resolve local declarations.`
  );
}

export async function assertPackedInlineStyles(consumer) {
  await writeFile(join(consumer, 'inline-styles.ts'), source);
  await compileTypes(
    consumer,
    'node16',
    ts.ModuleKind.Node16,
    ts.ModuleResolutionKind.Node16
  );
  await compileTypes(
    consumer,
    'bundler',
    ts.ModuleKind.ESNext,
    ts.ModuleResolutionKind.Bundler
  );
}
