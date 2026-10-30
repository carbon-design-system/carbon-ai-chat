/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { collectHostRuntime } from '../host-entry-consumer/runtime.mjs';
import { readPackedManifest } from './manifests.mjs';
import {
  assertHostParity,
  proveParityFailures,
  readPublishedHostTypes,
} from './hosts.mjs';

export async function checkPackedHosts(consumer) {
  const { manifest, root, packageJson } = await readPackedManifest(
    consumer,
    '@carbon/ai-chat'
  );
  const publishedTypes = await readPublishedHostTypes(root, packageJson);
  const runtime = await collectHostRuntime(consumer);
  for (const tree of ['es', 'es-custom']) {
    assertHostParity(manifest, runtime[tree], publishedTypes);
    proveParityFailures(manifest, runtime[tree], publishedTypes);
    console.log(
      `${tree}: packed host manifest matches independent runtime properties, attributes, and declarations; negative parity mutations passed.`
    );
  }
}
