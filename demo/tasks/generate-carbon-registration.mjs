/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

execFileSync(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  [
    'exec',
    '--offline',
    '--',
    'create-ai-chat-components-prefixed-build',
    '--prefix',
    'cds-custom',
    '--out',
    fileURLToPath(
      new URL('../.generated/carbon-registration', import.meta.url)
    ),
  ],
  { cwd: new URL('..', import.meta.url), stdio: 'inherit' }
);
