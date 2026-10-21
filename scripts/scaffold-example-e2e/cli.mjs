#!/usr/bin/env node
/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { parseArgs } from 'node:util';
import { scaffoldExampleE2e } from './scaffold-lib.mjs';

try {
  const { values } = parseArgs({
    options: {
      example: { type: 'string', multiple: true },
      concern: { type: 'string' },
      startup: { type: 'string' },
      purpose: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
  });
  if (values.help) {
    console.log(`Usage:
  npm run scaffold:example-e2e -- --example <flavor/slug> --concern <slug> --startup <input|launcher|homescreen> --purpose "Behavior to test."

Repeat --example to scaffold each host. Add --dry-run to preview changes.`);
  } else {
    const result = await scaffoldExampleE2e(values);
    console.log(
      result.dryRun ? 'Dry run; no files written.' : 'Scaffold complete.'
    );
    for (const change of result.changes) {
      console.log(`${result.dryRun ? 'Would write' : 'Wrote'} ${change.path}`);
    }
    if (!result.changes.length) {
      console.log('Scaffold already matches; no files changed.');
    }
    console.log(
      'Behavior coverage is incomplete. Replace the test.fixme placeholder with meaningful assertions; the mount check alone does not cover the concern.'
    );
    console.log(
      '\nAfter applying changes, run npm install to update the lockfile.'
    );
    console.log('Check discovery:');
    for (const { workspace } of result.examples) {
      console.log(`npm run test:e2e --workspace=${workspace} -- --list`);
    }
    console.log(
      '\nAfter the required package setup and build authorization, run:'
    );
    for (const { workspace } of result.examples) {
      console.log(`npm run test:e2e --workspace=${workspace}`);
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
