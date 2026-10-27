/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { MessageResponseTypes } from '../../types/messaging/Messages';
import type { GenericItem } from '../../types/messaging/Messages';
import { isSingleItemCarousel, isFullWidthUserDefined } from './messageUtils';

/**
 * Response types that always use the full-width bubble layout regardless of
 * the host container width.
 */
const FULL_WIDTH_TYPES = new Set<MessageResponseTypes>([
  MessageResponseTypes.CONVERSATIONAL_SEARCH,
]);

/**
 * Returns true when the given message item should render inside a full-width
 * bubble (no leading margin, edge-to-edge in the message column).
 *
 * This is the single place in `@carbon/ai-chat` that maps response content to
 * bubble layout.  Nothing outside this module should condition layout on a
 * response type.
 *
 * Full-width items:
 * - Conversational-search responses
 * - Multi-item carousels (single-item carousels render at card width)
 * - User-defined responses whose `full_width` flag is `true`
 */
export function isFullWidthItem(item: GenericItem): boolean {
  if (!item) {
    return false;
  }
  if (
    item.response_type === MessageResponseTypes.CAROUSEL &&
    !isSingleItemCarousel(item)
  ) {
    return true;
  }
  if (isFullWidthUserDefined(item)) {
    return true;
  }
  return FULL_WIDTH_TYPES.has(item.response_type as MessageResponseTypes);
}
