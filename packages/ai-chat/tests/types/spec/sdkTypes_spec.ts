/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Compile-only proofs for the SDK type split (#2350). ADR-0002 states its rules under `tsc --strict`,
 * while the package tsconfig turns `strictNullChecks` and `strictFunctionTypes` off, so the fixtures
 * compile here with every strict flag on. A fixture passes when it has no diagnostics: each line
 * compiles, and each `@ts-expect-error` marks a line that fails to.
 */

import { readdirSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const packageRoot = path.resolve(__dirname, '../../..');
const fixtureRoot = path.resolve(__dirname, '../fixtures');
const fixtures = readdirSync(fixtureRoot)
  .filter((name) => name.endsWith('.fixture.ts'))
  .map((name) => path.join(fixtureRoot, name));

const { config } = ts.readConfigFile(
  path.join(packageRoot, 'tsconfig.json'),
  ts.sys.readFile
);
const { options } = ts.parseJsonConfigFileContent(config, ts.sys, packageRoot);
const program = ts.createProgram(fixtures, {
  ...options,
  strict: true,
  strictNullChecks: true,
  strictFunctionTypes: true,
  noEmit: true,
  plugins: [],
});

const formatHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: (fileName) => fileName,
  getCurrentDirectory: () => packageRoot,
  getNewLine: () => '\n',
};

it('finds the fixtures', () => {
  expect(fixtures.length).toBeGreaterThan(0);
});

it.each(fixtures.map((file) => [path.basename(file), file]))(
  '%s compiles under strict, with every expected error present',
  (_name, file) => {
    const source = program.getSourceFile(file)!;
    const diagnostics = [
      ...program.getSyntacticDiagnostics(source),
      ...program.getSemanticDiagnostics(source),
    ];
    expect(ts.formatDiagnostics(diagnostics, formatHost)).toBe('');
  }
);

const checker = program.getTypeChecker();

/** Reads a `*Probe` type alias that a fixture exports. */
function probe(fixture: string, name: string) {
  const source = program.getSourceFile(path.join(fixtureRoot, fixture))!;
  const symbol = checker
    .getExportsOfModule(checker.getSymbolAtLocation(source)!)
    .find((candidate) => candidate.name === name)!;
  return checker.getDeclaredTypeOfSymbol(symbol);
}

it('keeps PublicConfig unassignable to ChatSDKConfig', () => {
  const config = (name: string) => probe('sdkConfig.fixture.ts', name);
  const publicConfig = config('PublicConfigProbe');
  // Its callbacks may use view members the SDK cannot supply.
  expect(
    checker.isTypeAssignableTo(publicConfig, config('ChatSDKConfigProbe'))
  ).toBe(false);
  // Only the callback instance type blocks it: bound to ChatInstance, the full config fits.
  expect(
    checker.isTypeAssignableTo(
      publicConfig,
      config('ChatSDKConfigForChatInstanceProbe')
    )
  ).toBe(true);
});

it('rejects a handler typed for the prebuilt chat as an SDK handler', () => {
  const instance = (name: string) => probe('sdkInstance.fixture.ts', name);
  const handlers = instance('ChatSDKHandlersProbe');
  expect(
    checker.isTypeAssignableTo(
      instance('PrebuiltReceiveHandlerProbe'),
      handlers
    )
  ).toBe(false);
  expect(
    checker.isTypeAssignableTo(instance('SDKReceiveHandlerProbe'), handlers)
  ).toBe(true);
});
