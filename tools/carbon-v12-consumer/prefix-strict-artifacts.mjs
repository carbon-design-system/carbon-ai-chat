/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { readFile } from 'node:fs/promises';
import { assertGeneratedEdges } from './prefix-edges.mjs';

const descriptor = JSON.parse(await readFile(process.argv[2], 'utf8'));
for (const receipt of descriptor.receipts) {
  await assertGeneratedEdges({
    receipt,
    consumer: descriptor.consumer,
    strictMetadata: descriptor.strictMetadata,
  });
  console.log(
    `${receipt.prefix}: supplemental strict whole-artifact graph passed.`
  );
}
