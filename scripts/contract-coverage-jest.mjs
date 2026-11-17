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
import { join } from 'node:path';

export function produceCoverage(directory) {
  const environment = { ...process.env };
  delete environment.CONTRACT_COVERAGE_REPORT;
  const result = spawnSync(
    'npm',
    [
      'run',
      'test',
      '--workspace=@carbon/ai-chat',
      '--',
      'tests/contract',
      '--maxWorkers=2',
      '--coverage',
      '--coverageReporters=json',
      `--coverageDirectory=${directory}`,
      '--collectCoverageFrom=src/**/*.{ts,tsx}',
      '--collectCoverageFrom=!src/**/*.d.ts',
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
