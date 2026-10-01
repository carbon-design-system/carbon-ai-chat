/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * `use-sync-external-store` added an `exports` map in 1.5.0, and our dependency range still allows 1.2.0. So we import
 * the `.js` file path, which every version resolves. Its types only resolve through the extensionless path, so this
 * points one at the other.
 */
declare module 'use-sync-external-store/shim/with-selector.js' {
  export * from 'use-sync-external-store/shim/with-selector';
}
