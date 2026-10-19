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
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as sass from 'sass';
import ts from 'typescript';

const source = `
import { createElement, type ComponentType } from 'react';
import { ChatContainer, ChatCustomElement } from '@carbon/ai-chat';
import { ChatContainer as CustomChatContainer } from '@carbon/ai-chat/es-custom';
import ContainerHost from '@carbon/ai-chat/dist/es/web-components/cds-aichat-container/index.js';
import CustomElementHost from '@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js';
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
export { containerConstructor, outerConstructor, container, outer };
`;

async function assertLocalDeclarations(consumer, name, program, options) {
  const chatRoot = await realpath(
    join(consumer, 'node_modules/@carbon/ai-chat')
  );
  for (const declaration of program.getSourceFiles()) {
    if (
      !declaration.isDeclarationFile ||
      relative(chatRoot, declaration.fileName).startsWith('..')
    ) {
      continue;
    }
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
        `${name}: missing published declaration dependency ${imported.fileName} from ${declaration.fileName}.`
      );
      assert.ok(
        !relative(
          chatRoot,
          await realpath(resolved.resolvedFileName)
        ).startsWith('..'),
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
      !relative(
        installed,
        await realpath(resolved.resolvedFileName)
      ).startsWith('..'),
      `${specifier} must resolve inside the packed consumer.`
    );
  }
  await assertLocalDeclarations(consumer, name, program, options);
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
  console.log(
    `${name}: packed host constructors, config fields, negative types, and root React exports passed.`
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

    for (const tree of ['es', 'es-custom']) {
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
  assert.match(result.css, /--consumer-prefix: cds-aichat/);
  await writeFile(join(consumer, 'resolution.css'), result.css);
  console.log('Styles: existing packed Sass exports compile.');
}
