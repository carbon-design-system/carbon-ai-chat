/*
 *  Copyright IBM Corp. 2025, 2026
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
const coreFiles = [
  'src/chat/utils/writeableElementPresence.ts',
  'src/chat/utils/focusManager.ts',
  'src/chat/utils/counter.ts',
  'src/chat/utils/styleInjection.ts',
  'src/chat/utils/assistantUploadCallbacks.ts',
  'src/chat/utils/windowSize.ts',
  'src/chat/services/windowOpenState.ts',
  'src/chat/services/ariaAnnouncer.ts',
  'src/chat/utils/shouldSanitizeHTML.ts',
  'src/chat/utils/inputConfig.ts',
  'src/chat/utils/resizeObserver.ts',
  'src/chat/utils/derivedState.ts',
  'src/chat/utils/historyMobileDetection.ts',
  'src/chat/utils/panelCallbacks.ts',
  'src/chat/utils/carbonTheme.ts',
  'src/chat/services/humanAgentCallbacks.ts',
  'src/chat/utils/mobileViewportLayout.ts',
  'src/chat/services/inputCallbacks.ts',
  'src/chat/utils/removeHostsOnUnmount.ts',
  'src/chat/services/inputExtensions.ts',
];
const componentsRoot = path.resolve(packageRoot, '../ai-chat-components/src');

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

function runtimeImports(file: string): string[] {
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
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
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
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

it('keeps plain hook cores free of direct and transitive React runtime dependencies', () => {
  const pending = coreFiles.map((name) => path.join(packageRoot, name));
  expect(pending.length).toBeGreaterThan(0);
  const visited = new Set<string>();
  const violations: string[] = [];
  while (pending.length) {
    const file = pending.pop()!;
    if (visited.has(file)) {
      continue;
    }
    visited.add(file);
    for (const specifier of runtimeImports(file)) {
      if (
        /^(react(?:-dom)?(?:\/|$)|@lit\/react(?:\/|$))/.test(specifier) ||
        specifier.startsWith('@carbon/ai-chat-components/es/react/')
      ) {
        violations.push(`${path.relative(packageRoot, file)} -> ${specifier}`);
      }
      const source = resolveSource(file, specifier);
      if (source) {
        pending.push(source);
      }
    }
  }
  expect(violations).toEqual([]);
});
