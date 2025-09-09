/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import dayjs from "dayjs";

/**
 * Returns the time from the given timestamp localized into the user's current timezone and formatted with the
 * current locale.
 */
function timestampToTimeString(timestamp: number | Date | string) {
  return dayjs(timestamp).format("LT");
}

export { timestampToTimeString };
