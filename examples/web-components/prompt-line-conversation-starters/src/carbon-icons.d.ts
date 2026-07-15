/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/*
 * TypeScript ambient declarations for `@carbon/icons/es/*` icon modules.
 * These modules export a single default object (a Carbon icon descriptor)
 * that is compatible with the `icon` field on `ToolbarAction`.
 */
declare module "@carbon/icons/es/*" {
  const icon: any;
  export default icon;
}
