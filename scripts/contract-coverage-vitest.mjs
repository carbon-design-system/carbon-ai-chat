/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { contractInventory } from '../tools/contract-manifest-lib.mjs';

export function produceCoverage(directory) {
  const { specs } = contractInventory(process.cwd());
  if (!specs.length) {
    throw new Error('No contract suites found');
  }
  const environment = { ...process.env };
  delete environment.CONTRACT_COVERAGE_REPORT;
  const result = spawnSync(
    'npm',
    [
      'run',
      'test',
      '--workspace=@carbon/ai-chat',
      '--',
      ...specs.map((file) => resolve(file)),
      '--maxWorkers=2',
      '--coverage.enabled',
      '--coverage.provider=v8',
      '--coverage.reporter=json',
      `--coverage.reportsDirectory=${directory}`,
      '--coverage.include=src/**/*.{ts,tsx}',
      '--coverage.exclude=src/**/*.d.ts',
      '--coverage.exclude=src/**/__tests__/**',
    ],
    { encoding: 'utf8', maxBuffer: Infinity, env: environment }
  );
  writeFileSync(
    join(directory, 'producer.log'),
    `${result.stdout ?? ''}${result.stderr ?? ''}`
  );
  if (result.status !== 0) {
    throw new Error(
      `contract coverage producer failed; see ${join(directory, 'producer.log')}`
    );
  }
  return join(directory, 'coverage-final.json');
}
