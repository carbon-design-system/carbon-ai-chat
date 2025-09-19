/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The different types of things we can generate UUIDs for. Our test cases generate sequential IDs instead of random
 * UUIDs to produce deterministic IDs that can be hardcoded in tests and snapshots. To minimize the disruption that
 * changes in these IDs can cause (like if a new ID gets inserted), we divide IDs by type where each type gets its own
 * sequence. The type is set in the highest segment of the sequential IDs that are generated. This enum is only used
 * for testing purposes and has no impact on production code. If you change the values of any of these items, it
 * might break test cases that have IDs hardcoded in them.
 */
enum UUIDType {
  MISCELLANEOUS = 1,
  LOCAL_MESSAGE = 2,
  MESSAGE = 3,
  COMPONENT = 4,
  USER = 6,
  DEVICE_ID = 8,
  FILE = 9,
}

export { UUIDType };
