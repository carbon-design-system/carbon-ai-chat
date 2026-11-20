/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { runtimeGraph } from '../helpers/messagingBoundary';

function inspect(source: string) {
  return runtimeGraph(
    ['/entry.ts'],
    () => source,
    () => undefined,
    new Set()
  );
}

it.each([
  "const load = require; load('./effect');",
  "const loader = { require }; loader.require('./effect');",
  "const load = require.bind(undefined); load('./effect');",
  "const load = globalThis.require; load('./effect');",
  "const load = globalThis['require']; load('./effect');",
  "const load = globalThis[`require`]; load('./effect');",
  "const { require: load } = global; load('./effect');",
  "const { require } = globalThis; require('./effect');",
  "let load; ({ require: load } = globalThis); load('./effect');",
  "let require; ({ require } = global); require('./effect');",
  "const { ['require']: load } = globalThis; load('./effect');",
  "let load; ({ ['require']: load } = global); load('./effect');",
])('rejects an alias of the unbound module loader: %s', (source) => {
  expect(inspect(source).issues.length).toBeGreaterThan(0);
});

it.each([
  "function require(value: string) { return value; } const load = require; load('data');",
  "const helper = { require(value: string) { return value; } }; helper.require('data');",
  "export function read(helper: { require(value: string): string }) { return helper.require('data'); }",
  "export function read(globalThis: { require(value: string): string }) { const load = globalThis.require; return load('data'); }",
  "const global = { require(value: string) { return value; } }; const { require: load } = global; load('data');",
  'require: for (;;) { break require; }',
  "const [require] = globalThis; require('data');",
])(
  'accepts locally bound functions and properties named require: %s',
  (source) => {
    expect(inspect(source).issues).toEqual([]);
  }
);

it.each(["'./effect'", '`./effect`'])(
  'follows a literal dynamic import %s to its runtime dependency',
  (specifier) => {
    const files: Record<string, string> = {
      '/entry.ts': `export const load = () => import(${specifier});`,
      '/effect.ts': 'export const effect = 1;',
    };
    const result = runtimeGraph(
      ['/entry.ts'],
      (file) => files[file],
      (_file, specifier) =>
        specifier === './effect' ? '/effect.ts' : undefined,
      new Set()
    );
    expect(result.issues).toEqual([]);
    expect([...result.files]).toEqual(['/entry.ts', '/effect.ts']);
    expect(result.edges).toEqual([['/entry.ts', '/effect.ts']]);
  }
);

it('does not follow a module used only for an imported type', () => {
  const result = inspect(
    "import type { Manager } from './forbidden'; export const value: Manager | undefined = undefined;"
  );
  expect(result.issues).toEqual([]);
  expect([...result.files]).toEqual(['/entry.ts']);
});
