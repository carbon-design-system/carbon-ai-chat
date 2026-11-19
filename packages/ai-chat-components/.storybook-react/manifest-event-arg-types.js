/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { entries } from './manifest-wrapper-registry.generated.js';
import { createManifestEventArgTypes } from './manifest-event-arg-types-core.js';

export const manifestEventArgTypes = createManifestEventArgTypes(entries);
