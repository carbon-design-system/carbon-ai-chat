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
 * Maximum width a bubble's content may grow inside the message column.
 *
 * - `none`: no cap; the bubble sizes to its content.
 * - `reduced`: narrower than the column, leaving space beside the content.
 * - `fill`: the full width of the column.
 * - `contain`: the full width of the column, clipping overflow so long content
 *   cannot widen the bubble.
 */
export type BubbleWidthCap = 'none' | 'reduced' | 'fill' | 'contain';

export interface BubbleLayout {
  /**
   * Render edge-to-edge in the message column instead of in the inset column.
   */
  fullWidth: boolean;

  /**
   * Width cap for the bubble content.
   */
  widthCap: BubbleWidthCap;

  /**
   * Inset the feedback footer to line up with the content in narrow widths.
   */
  insetFooter: boolean;
}

const WIDTH_CAPS: Partial<Record<MessageResponseTypes, BubbleWidthCap>> = {
  [MessageResponseTypes.IMAGE]: 'reduced',
  [MessageResponseTypes.VIDEO]: 'fill',
  [MessageResponseTypes.AUDIO]: 'fill',
  [MessageResponseTypes.IFRAME]: 'contain',
};

/**
 * Resolves a message item to the layout its bubble renders with.
 *
 * Bubble width and inset come from this mapping alone. The renderer turns the
 * result into modifier classes, and the SCSS keys off those classes, never off
 * a response type. Typography and text wrapping are not layout and stay with
 * the response-type classes in `MessageComponent.scss`.
 */
export function getBubbleLayout(item: GenericItem): BubbleLayout {
  if (!item) {
    return { fullWidth: false, widthCap: 'none', insetFooter: false };
  }

  const responseType = item.response_type as MessageResponseTypes;
  const isConversationalSearch =
    responseType === MessageResponseTypes.CONVERSATIONAL_SEARCH;
  const isMultiItemCarousel =
    responseType === MessageResponseTypes.CAROUSEL &&
    !isSingleItemCarousel(item);

  return {
    fullWidth:
      isConversationalSearch ||
      isMultiItemCarousel ||
      // `full_width` can be undefined; `=== true` keeps `fullWidth` a strict boolean.
      isFullWidthUserDefined(item) === true,
    widthCap: WIDTH_CAPS[responseType] ?? 'none',
    insetFooter: isConversationalSearch,
  };
}
