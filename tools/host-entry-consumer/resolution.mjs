/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, realpath, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { isAbsolute, join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as sass from 'sass';
import ts from 'typescript';

// Both packed packages publish these two trees.
const trees = ['es', 'es-custom'];
const source = `
import type { CSSResult } from 'lit';
import { createElement, type ComponentType } from 'react';
import { ChatContainer, ChatCustomElement } from '@carbon/ai-chat';
import { ChatContainer as CustomChatContainer } from '@carbon/ai-chat/es-custom';
import ContainerHost from '@carbon/ai-chat/dist/es/web-components/cds-aichat-container/index.js';
import CustomElementHost from '@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js';
import type { ChatInstance, PublicConfig } from '@carbon/ai-chat/dist/es/web-components/cds-aichat-container/index.js';
import type { ChatInstance as OuterInstance, PublicConfig as OuterConfig } from '@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js';
import { inlineMarkdownStyles } from '@carbon/ai-chat-components/es/components/markdown/index.js';
import { inlineMarkdownStyles as customInlineMarkdownStyles } from '@carbon/ai-chat-components/es-custom/components/markdown/index.js';
const containerConstructor: CustomElementConstructor = ContainerHost;
const outerConstructor: CustomElementConstructor = CustomElementHost;
const container = new ContainerHost();
const outer = new CustomElementHost();
container.aiEnabled = true;
container.openChatByDefault = true;
container.header = { title: 'Packed host' };
outer.aiEnabled = true;
outer.openChatByDefault = true;
outer.header = { title: 'Packed host' };
createElement(ChatContainer, { openChatByDefault: true });
createElement(ChatCustomElement, { className: 'packed-host', openChatByDefault: true });
createElement(CustomChatContainer, { openChatByDefault: true });
// @ts-expect-error Hosts are HTMLElement constructors rather than React components.
const containerAsReact: ComponentType<any> = ContainerHost;
// @ts-expect-error Hosts are HTMLElement constructors rather than React components.
const outerAsReact: ComponentType<any> = CustomElementHost;
// @ts-expect-error A React wrapper is not the browser host constructor.
const reactAsHost: typeof ContainerHost = ChatContainer;
// @ts-expect-error Inherited config fields retain their Boolean types.
container.aiEnabled = 'yes';
// @ts-expect-error Both hosts retain their config field types.
outer.openChatByDefault = 'yes';
// Host paths still publish the root types they resolved to before.
const hostConfig: PublicConfig = { openChatByDefault: true };
const outerConfig: OuterConfig = hostConfig;
type HostInstances = [ChatInstance, OuterInstance];
// Both trees publish inline Markdown styles as a resolvable CSSResult.
const regularStyles: CSSResult = inlineMarkdownStyles;
const customStyles: CSSResult = customInlineMarkdownStyles;
type IsAny<T> = 0 extends 1 & T ? true : false;
const regularIsAny: IsAny<typeof inlineMarkdownStyles> = false;
const customIsAny: IsAny<typeof customInlineMarkdownStyles> = false;
// @ts-expect-error The regular style value is not a number.
const regularNumber: number = inlineMarkdownStyles;
// @ts-expect-error The custom style value is not a number.
const customNumber: number = customInlineMarkdownStyles;
export { containerConstructor, outerConstructor, container, outer, outerConfig };
export { regularStyles, customStyles, regularIsAny, customIsAny };
export type { HostInstances };
`;

// Match a whole '..' segment so a name like '..foo' stays inside.
// A cross-drive Windows path is absolute rather than starting with '..'.
function inside(root, path) {
  const local = relative(root, path);
  return local !== '..' && !local.startsWith(`..${sep}`) && !isAbsolute(local);
}

async function declaredPackages(root) {
  const manifest = JSON.parse(
    await readFile(join(root, 'package.json'), 'utf8')
  );
  return new Set([
    manifest.name,
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
  ]);
}

// Strict installs resolve only declared packages from published declarations.
function assertDeclaredImport(name, declared, specifier, from) {
  const packageName = specifier
    .split('/')
    .slice(0, specifier.startsWith('@') ? 2 : 1)
    .join('/');
  assert.ok(
    declared.has(packageName),
    `${name}: ${from} imports undeclared ${packageName}.`
  );
}

async function assertLocalDeclarations(consumer, name, program, options) {
  const chatRoot = await realpath(
    join(consumer, 'node_modules/@carbon/ai-chat')
  );
  const declared = await declaredPackages(chatRoot);
  for (const declaration of program.getSourceFiles()) {
    if (
      !declaration.isDeclarationFile ||
      !inside(chatRoot, declaration.fileName)
    ) {
      continue;
    }
    for (const imported of ts.preProcessFile(declaration.text).importedFiles) {
      if (!imported.fileName.startsWith('.')) {
        assertDeclaredImport(
          name,
          declared,
          imported.fileName,
          declaration.fileName
        );
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
        `${name}: missing published declaration dependency ${imported.fileName} from ${declaration.fileName}.`
      );
      assert.ok(
        inside(chatRoot, await realpath(resolved.resolvedFileName)),
        'Local declaration references must stay inside the packed chat package.'
      );
    }
  }
}

async function assertTypePaths(consumer, name, program, fixture, options) {
  const installed = await realpath(join(consumer, 'node_modules'));
  for (const statement of program.getSourceFile(fixture).statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !statement.moduleSpecifier.text.startsWith('@carbon/')
    ) {
      continue;
    }
    const specifier = statement.moduleSpecifier.text;
    const resolved = ts.resolveModuleName(
      specifier,
      fixture,
      options,
      ts.sys,
      undefined,
      undefined,
      ts.ModuleKind.ESNext
    ).resolvedModule;
    assert.ok(resolved, `${name}: unresolved import ${specifier}.`);
    assert.ok(
      inside(installed, await realpath(resolved.resolvedFileName)),
      `${specifier} must resolve inside the packed consumer.`
    );
  }
  await assertLocalDeclarations(consumer, name, program, options);
}

async function assertInlineStyleDeclarations(
  consumer,
  name,
  program,
  fixture,
  options
) {
  const root = await realpath(
    join(consumer, 'node_modules/@carbon/ai-chat-components')
  );
  const declared = await declaredPackages(root);
  const resolve = (specifier, from) =>
    ts.resolveModuleName(specifier, from, options, ts.sys).resolvedModule
      ?.resolvedFileName;
  // The program keeps a symlink inside a package under the path TypeScript
  // resolved, so the walk keys files by that path. Real paths only check
  // containment.
  const pending = [];
  for (const tree of trees) {
    const specifier = `@carbon/ai-chat-components/${tree}/components/markdown/index.js`;
    const index = resolve(specifier, fixture);
    assert.ok(index, `${name}: unresolved style import ${specifier}.`);
    assert.equal(
      await realpath(index),
      join(root, tree, 'components/markdown/index.d.ts'),
      `${name}: style imports must resolve to the installed packed declarations.`
    );
    const styles = resolve('./src/inline-markdown.js', index);
    assert.ok(styles, `${name}: unresolved inline Markdown styles in ${tree}.`);
    pending.push(styles);
  }
  const visited = new Set();
  while (pending.length) {
    const path = pending.pop();
    if (visited.has(path)) {
      continue;
    }
    visited.add(path);
    // A sibling .ts source wins resolution, and consumers would type-check it.
    assert.match(path, /\.d\.[cm]?ts$/);
    const declaration = program.getSourceFile(path);
    assert.ok(declaration, `${name}: missing style declaration ${path}.`);
    for (const imported of ts.preProcessFile(declaration.text).importedFiles) {
      if (!imported.fileName.startsWith('.')) {
        assertDeclaredImport(name, declared, imported.fileName, path);
        continue;
      }
      const dependency = resolve(imported.fileName, declaration.fileName);
      assert.ok(
        dependency,
        `${name}: missing published declaration dependency ${imported.fileName} from ${path}.`
      );
      assert.ok(
        inside(root, await realpath(dependency)),
        `${name}: local style declaration dependencies must stay inside the packed components package.`
      );
      pending.push(dependency);
    }
  }
}

function assertRootExportParity(name, program, fixture, options) {
  const checker = program.getTypeChecker();
  const exportsOf = (specifier) => {
    const resolved = ts.resolveModuleName(
      specifier,
      fixture,
      options,
      ts.sys
    ).resolvedModule;
    assert.ok(resolved, `${name}: unresolved ${specifier}.`);
    const source = program.getSourceFile(resolved.resolvedFileName);
    assert.ok(source, `${name}: ${specifier} is not in the program.`);
    return new Map(
      checker
        .getExportsOfModule(checker.getSymbolAtLocation(source))
        .map((symbol) => [
          symbol.name,
          symbol.flags & ts.SymbolFlags.Alias
            ? checker.getAliasedSymbol(symbol)
            : symbol,
        ])
    );
  };
  const root = exportsOf('@carbon/ai-chat');
  assert.ok(root.size > 0, `${name}: the root entry exports nothing.`);
  for (const host of ['cds-aichat-container', 'cds-aichat-custom-element']) {
    const exported = exportsOf(
      `@carbon/ai-chat/dist/es/web-components/${host}/index.js`
    );
    for (const [exportName, symbol] of root) {
      // Main resolved these paths to the root types, so each name must stay.
      // Compare identity only: inspecting a checker symbol walks the whole program.
      assert.ok(
        exported.get(exportName) === symbol,
        `${name}: ${host} must re-export the root ${exportName}.`
      );
    }
  }
}

async function compileTypes(consumer, name, module, moduleResolution) {
  const fixture = join(consumer, 'resolution.ts');
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
  const diagnostics = ts.getPreEmitDiagnostics(program);
  const formatted = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCurrentDirectory: () => consumer,
    getCanonicalFileName: (path) => path,
    getNewLine: () => '\n',
  });
  await writeFile(join(consumer, `${name}.log`), formatted);
  assert.equal(
    diagnostics.length,
    0,
    `${name}: packed host type errors:\n${formatted}`
  );
  await assertTypePaths(consumer, name, program, fixture, options);
  await assertInlineStyleDeclarations(
    consumer,
    name,
    program,
    fixture,
    options
  );
  assertRootExportParity(name, program, fixture, options);
  console.log(
    `${name}: packed host constructors, config fields, negative types, root React exports, and inline Markdown styles passed.`
  );
}

export async function assertPackedResolution(consumer) {
  const require = createRequire(join(consumer, 'package.json'));
  const chat = JSON.parse(
    await readFile(
      join(consumer, 'node_modules/@carbon/ai-chat/package.json'),
      'utf8'
    )
  );
  for (const host of ['cds-aichat-container', 'cds-aichat-custom-element']) {
    const types = `dist/types/web-components/${host}/index.d.ts`;
    assert.equal(
      chat.exports[`./dist/es/web-components/${host}/index.js`].types,
      `./${types}`
    );
    assert.deepEqual(chat.typesVersions['*'][`web-components/${host}`], [
      types,
    ]);
    await readFile(join(consumer, 'node_modules/@carbon/ai-chat', types));
    const legacy = ts.resolveModuleName(
      `@carbon/ai-chat/web-components/${host}`,
      join(consumer, 'legacy.ts'),
      { moduleResolution: ts.ModuleResolutionKind.Node10 },
      ts.sys
    ).resolvedModule;
    assert.ok(
      legacy,
      `The existing legacy typesVersions entry must resolve ${host}.`
    );
    assert.equal(
      await realpath(legacy.resolvedFileName),
      await realpath(join(consumer, 'node_modules/@carbon/ai-chat', types))
    );

    for (const tree of trees) {
      const specifier = `@carbon/ai-chat/dist/${tree}/web-components/${host}/index.js`;
      const url = execFileSync(
        process.execPath,
        [
          '--input-type=module',
          '--eval',
          `process.stdout.write(import.meta.resolve(${JSON.stringify(specifier)}))`,
        ],
        { cwd: consumer, encoding: 'utf8' }
      );
      await readFile(new URL(url));
    }
  }
  await writeFile(join(consumer, 'resolution.ts'), source);
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
  const theme = require
    .resolve('@carbon/ai-chat/scss/_chat-theme.scss')
    .replaceAll('\\', '/');
  const scss = `@use '@carbon/ai-chat-components/scss/utilities' as utilities;\n@use ${JSON.stringify(theme)} as chat;\n.packed-host { --consumer-prefix: #{utilities.$prefix}; z-index: chat.$z-index; }`;
  const result = sass.compileString(scss, {
    url: pathToFileURL(join(consumer, 'resolution.scss')),
    loadPaths: [join(consumer, 'node_modules')],
    quietDeps: true,
  });
  assert.match(result.css, /--consumer-prefix: cds;/);
  await writeFile(join(consumer, 'resolution.css'), result.css);
  console.log('Styles: existing packed Sass exports compile.');
}
