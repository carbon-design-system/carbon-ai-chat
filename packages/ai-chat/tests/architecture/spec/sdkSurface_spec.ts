/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import path from 'node:path';
import ts from 'typescript';
import { surfaceReport } from '../helpers/sdkSurface';

const root = path.resolve(__dirname, '../../..');
const entry = path.join(root, 'src/sdk/index.ts');
const options: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.React,
  skipLibCheck: true,
  strictNullChecks: false,
  experimentalDecorators: true,
  esModuleInterop: true,
  resolveJsonModule: true,
  noEmit: true,
  types: [],
};

function report(virtual: Record<string, string> = {}) {
  const host = ts.createCompilerHost(options);
  const read = host.readFile.bind(host);
  host.readFile = (file) => virtual[file] ?? read(file);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (file, version, ...rest) =>
    file in virtual
      ? ts.createSourceFile(file, virtual[file], version, true)
      : getSourceFile(file, version, ...rest);
  return surfaceReport(ts.createProgram([entry], options, host), entry, root);
}

// The checked-in snapshot is the review record for #1732 O20: a new type or
// field the SDK reaches shows up as a diff in the pull request that adds it.
it('reports every type and field the SDK entry reaches', () => {
  expect(report()).toMatchSnapshot();
});

it('changes the report when a field is added to ChatSDKState', () => {
  const file = path.join(root, 'src/types/instance/ChatSDKState.ts');
  const text = ts.sys.readFile(file)!;
  const changed = text.replace(
    'export interface ChatSDKState {',
    'export interface ChatSDKState {\n  plantedField: number;'
  );
  expect(changed).not.toBe(text);
  const before = report();
  const after = report({ [file]: changed });
  expect(after).not.toBe(before);
  expect(after).toContain('  plantedField: number');
});
