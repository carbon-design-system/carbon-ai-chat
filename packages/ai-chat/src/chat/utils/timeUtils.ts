/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import dayjs from "dayjs";

/**
 * Returns the time from the given timestamp localized into the user's current timezone and formatted with the
 * given locale.
 *
 * The `locale` is applied per call rather than read from dayjs's process-global default. Several chat
 * instances can share one page (see `featureFlags.reuseInstance` and per-namespace instances), and each
 * boot registers its locale globally; reading the global would let the last instance to boot format every
 * other instance's timestamps. The locale is only applied when it has been registered (loaded at boot);
 * otherwise dayjs's default is used, matching prior behavior for an unrecognized locale.
 */
function timestampToTimeString(
  timestamp: number | Date | string,
  locale?: string,
) {
  const time = dayjs(timestamp);
  return (locale && dayjs.Ls[locale] ? time.locale(locale) : time).format("LT");
}

export { timestampToTimeString };
