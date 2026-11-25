/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

// DOM snapshots for the components browser tests. This stores the same
// string that `expect(el).dom.to.equalSnapshot()` stored under
// web-test-runner: `getDiffableHTML(el)` from `@open-wc/semantic-dom-diff`.
// A snapshot serializer (./setup.ts) writes it without quotes or escaping,
// so the saved file holds the diffable HTML as it is.

import { getDiffableHTML } from '@open-wc/semantic-dom-diff/get-diffable-html.js';
import { expect } from 'vitest';

export class DiffableDom {
  constructor(readonly html: string) {}
}

export function expectDomSnapshot(el: Node) {
  expect(new DiffableDom(getDiffableHTML(el))).toMatchSnapshot();
}
