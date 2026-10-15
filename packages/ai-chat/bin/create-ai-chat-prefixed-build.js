#!/usr/bin/env node
/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

async function main() {
  const packageRequire = createRequire(import.meta.url);
  const componentsRoot = dirname(
    packageRequire.resolve('@carbon/ai-chat-components/package.json')
  );
  const { run } = await import(
    pathToFileURL(join(componentsRoot, 'bin/prefix-build.js')).href
  );
  await run({ packageRoot: fileURLToPath(new URL('..', import.meta.url)) });
}

main().catch((error) => {
  process.stderr.write(`${error?.stack ?? error}\n`);
  process.exitCode = 1;
});
