/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

// Setup for the components browser project.

import { expect } from 'vitest';
import { DiffableDom } from './dom-snapshot.js';

expect.addSnapshotSerializer({
  test: (value) => value instanceof DiffableDom,
  serialize: (value: DiffableDom) => value.html,
});
