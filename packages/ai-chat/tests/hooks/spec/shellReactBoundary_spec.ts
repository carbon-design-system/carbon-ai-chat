/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const packageRoot = path.resolve(__dirname, '../../..');
const componentsRoot = path.resolve(packageRoot, '../ai-chat-components/src');
const nativeViews = [
  'src/chat/components/shell/ChatShell.ts',
  'src/chat/components/shell/renderShellLayout.ts',
  'src/chat/utils/shellLifecycle.ts',
  'src/chat/components/shared/NativeChatView.ts',
  'src/chat/components/homeScreen/home-screen.ts',
  'src/chat/components/header/chat-header.ts',
  'src/chat/components/launcher/launcher.ts',
  'src/chat/components/input/ChatInput.ts',
  'src/chat/components/input/NativeAutocomplete.ts',
  'src/chat/components/input/native/InputActions.ts',
  'src/chat/components/input/native/PromptLineSlot.ts',
  'src/chat/components/panels/NativePanels.ts',
  'src/chat/components/panels/native/ConfirmationBody.ts',
  'src/chat/components/panels/native/DisclaimerBody.ts',
  'src/chat/components/panels/native/HydrationBody.ts',
  'src/chat/components/panels/native/IFrameBody.ts',
  'src/chat/components/panels/native/ErrorBody.ts',
];

function runtimeImports(file: string, text: string): string[] {
  const { outputText } = ts.transpileModule(text, {
    fileName: file,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      experimentalDecorators: true,
    },
  });
  const source = ts.createSourceFile(
    file + '.js',
    outputText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  );
  const imports: string[] = [];
  function visit(node: ts.Node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      imports.push(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === 'require')) &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      imports.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return imports;
}

function resolveSource(
  importer: string,
  specifier: string
): string | undefined {
  const componentPrefix = '@carbon/ai-chat-components/es/';
  let base: string;
  if (specifier.startsWith('.')) {
    base = path.resolve(path.dirname(importer), specifier);
  } else if (specifier.startsWith(componentPrefix)) {
    base = path.join(componentsRoot, specifier.slice(componentPrefix.length));
  } else {
    return undefined;
  }
  base = base.replace(/\.js$/, '');
  return [base + '.ts', base + '.tsx', base + '/index.ts'].find((file) =>
    fs.existsSync(file)
  );
}

function reactRoutes(
  roots: string[],
  readSource: (file: string) => string,
  resolve: (importer: string, specifier: string) => string | undefined
): string[] {
  const pending = roots.map((file) => [file]);
  const visited = new Set<string>();
  const violations: string[] = [];
  while (pending.length) {
    const route = pending.pop()!;
    const file = route[route.length - 1];
    if (visited.has(file)) {
      continue;
    }
    visited.add(file);
    for (const specifier of runtimeImports(file, readSource(file))) {
      if (
        /^(react(?:-dom)?(?:\/|$)|@lit\/react(?:\/|$)|@carbon\/react(?:\/|$))/.test(
          specifier
        ) ||
        specifier.startsWith('@carbon/ai-chat-components/es/react/')
      ) {
        violations.push(
          [
            ...route.map((name) => path.relative(packageRoot, name)),
            specifier,
          ].join(' -> ')
        );
      }
      const source = resolve(file, specifier);
      if (source) {
        pending.push([...route, source]);
      }
    }
  }
  return violations;
}

it('keeps native shell views and their runtime dependencies free of React', () => {
  // Retained content enters through callbacks and targets, never a runtime import.
  // Public React hosts and content adapters are outside these native entry points.
  expect(
    reactRoutes(
      nativeViews.map((name) => path.join(packageRoot, name)),
      (file) => fs.readFileSync(file, 'utf8'),
      resolveSource
    )
  ).toEqual([]);
});

it('detects a transitive React re-export behind a native helper', () => {
  const modules: Record<string, string> = {
    '/view.ts': "export { helper } from './helper';",
    '/helper.ts': "export { createElement as helper } from 'react';",
  };
  const routes = reactRoutes(
    ['/view.ts'],
    (file) => modules[file],
    (importer, specifier) =>
      specifier.startsWith('.')
        ? path.resolve(path.dirname(importer), specifier) + '.ts'
        : undefined
  );
  expect(routes).toHaveLength(1);
  expect(routes[0]).toContain('view.ts ->');
  expect(routes[0]).toContain('helper.ts -> react');
});

it('ignores type-only React imports and re-exports', () => {
  expect(
    runtimeImports(
      'types.ts',
      `import type { ReactNode } from 'react';
       export type { ComponentType } from 'react';
       export type Content = ReactNode;`
    )
  ).toEqual([]);
});

it('includes dynamic imports, require calls, and the automatic JSX runtime', () => {
  expect(
    runtimeImports(
      'content.tsx',
      `export const load = () => import('react-dom/client');
       export const bindings = require('@lit/react');
       export const content = <div />;`
    )
  ).toEqual(
    expect.arrayContaining([
      'react-dom/client',
      '@lit/react',
      'react/jsx-runtime',
    ])
  );
});
