/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

// Run the example Playwright suite with V8 coverage, then report it. Honors
// CAIC_E2E_TARGETS, so one example's targets can be measured alone.
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';

const coverageDir = path.resolve('coverage/examples-e2e');
rmSync(coverageDir, { recursive: true, force: true });

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const shell = process.platform === 'win32';

const suite = spawnSync(npm, ['run', 'test:e2e:goldens'], {
  stdio: 'inherit',
  shell,
  env: { ...process.env, CAIC_E2E_COVERAGE: coverageDir },
});
const report = spawnSync(
  process.execPath,
  ['scripts/report-example-coverage.mjs', coverageDir],
  { stdio: 'inherit' }
);

for (const result of [suite, report]) {
  if (result.error) {
    throw result.error;
  }
}
process.exitCode = suite.status || report.status || 0;
