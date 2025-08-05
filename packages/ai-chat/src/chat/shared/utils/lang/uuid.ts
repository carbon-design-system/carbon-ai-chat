/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { UUIDType } from "./UUIDType";

/**
 * The function generates a new v4 UUID. This function is here to provide a nicer mechanism for mocking UUIDs in
 * test cases.
 *
 * @param _type This is the "type" of the UUID that is being generated. This is only used by the mock UUID generator
 * for test cases. Each "type" will get it's own set of IDs that don't overlap with other types.
 */
function uuid(_type?: UUIDType) {
  // Use native crypto.randomUUID() if available, otherwise fallback to a simple implementation
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older browsers or non-secure contexts
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export { uuid, UUIDType };
