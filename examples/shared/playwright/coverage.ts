/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Records a test's V8 coverage for its target's example. Turned on when
 * `CAIC_E2E_COVERAGE` holds an output directory.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Page } from '@playwright/test';
import MCR from 'monocart-coverage-reports';

import { COVERAGE_HOST, coverageOptions } from './coverage-options.mjs';
import { targets, type TargetId } from './targets';

const examplesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);

export const coverageRoot = process.env.CAIC_E2E_COVERAGE;

/** One output directory per example, so each report merges only its own data. */
export function exampleCoverageDir(root: string, example: string) {
  return path.join(root, example.replace('/', '__'));
}

export async function startCoverage(page: Page) {
  await page.coverage.startJSCoverage({ resetOnNavigation: false });
}

export async function stopCoverage(page: Page, target: TargetId) {
  if (!coverageRoot) {
    return;
  }
  const { example } = targets[target];
  const entries = (await page.coverage.stopJSCoverage()).flatMap((entry) => {
    const { pathname } = new URL(entry.url);
    // The launcher serves the example's build output, built with sourcemaps
    // when coverage is on. Read each map from disk and file the bundle under
    // its example, so the same asset name from two examples stays apart.
    const mapFile = path.join(examplesDir, example, 'dist', `${pathname}.map`);
    if (!pathname.endsWith('.js') || !existsSync(mapFile)) {
      return [];
    }
    return [
      {
        ...entry,
        url: `${COVERAGE_HOST}/examples/${example}/dist${pathname}`,
        sourceMap: JSON.parse(readFileSync(mapFile, 'utf8')),
      },
    ];
  });
  const outputDir = exampleCoverageDir(coverageRoot, example);
  await MCR(coverageOptions(outputDir, example)).add(entries);
}
