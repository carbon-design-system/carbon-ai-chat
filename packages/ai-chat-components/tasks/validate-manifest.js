/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { readFileSync } from 'node:fs';
import { readSource } from './manifest-source.js';
import { readWrappers } from './manifest-wrappers.js';
import { validateEvents } from './manifest-events.js';

const model = readSource();
const manifest = JSON.parse(
  readFileSync(new URL('../custom-elements.json', import.meta.url), 'utf8')
);
const wrappers = readWrappers(model);
const { pairs, producers } = validateEvents(model, manifest, wrappers);
console.info(
  `Validated ${pairs.length} element/event pairs and ${producers.filter((producer) => producer.protocol).length} helper protocol dispatches.`
);
