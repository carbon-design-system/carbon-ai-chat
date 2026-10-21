/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { spawnSync } from 'node:child_process';

const concurrency = Number(process.env.E2E_CONCURRENCY ?? 4);
if (!Number.isInteger(concurrency) || concurrency < 1) {
  throw new Error('E2E_CONCURRENCY must be a positive integer.');
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const shell = process.platform === 'win32';

// The central golden suite runs once here. Lerna then runs any `test:e2e` script
// a workspace defines; none do today.
const goldens = spawnSync(npm, ['run', 'test:e2e:goldens'], {
  stdio: 'inherit',
  shell,
});
const workspaces = spawnSync(
  npm,
  [
    'exec',
    '--',
    'lerna',
    'run',
    'test:e2e',
    '--stream',
    '--concurrency',
    String(concurrency),
  ],
  { stdio: 'inherit', shell }
);

for (const result of [goldens, workspaces]) {
  if (result.error) {
    throw result.error;
  }
  if (result.signal) {
    process.kill(process.pid, result.signal);
  }
}
process.exitCode = goldens.status || workspaces.status || 0;
