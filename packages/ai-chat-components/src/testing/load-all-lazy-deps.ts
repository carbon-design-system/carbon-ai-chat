/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { loadCodeMirrorRuntime } from '../components/code-snippet/src/codemirror/codemirror-loader.js';
import { loadTableDeps } from '../components/table/src/table-loader.js';

/**
 * Preloads all lazily loaded dependencies so test environments (like Jest)
 * can ensure the heavy components are ready before rendering.
 *
 * Consumers can call this once during their test setup files.
 */
export async function loadAllLazyDeps(): Promise<void> {
  await Promise.all([loadCodeMirrorRuntime(), loadTableDeps()]);
}

export { loadTableDeps };
