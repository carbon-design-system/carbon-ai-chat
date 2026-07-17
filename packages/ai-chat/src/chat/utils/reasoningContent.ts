/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LocalMessageItem } from '../../types/messaging/LocalMessageItem';
import { GenericItem } from '../../types/messaging/Messages';

/**
 * Returns true when reasoning content is something the UI should render.
 *
 * Non-empty strings and non-empty `GenericItem[]` arrays count as content. `undefined`, empty strings, and
 * empty arrays do not — an empty array must not cause the reasoning container or step body to appear.
 */
function hasReasoningContent(
  content: string | GenericItem[] | undefined
): boolean {
  if (Array.isArray(content)) {
    return content.length > 0;
  }
  return Boolean(content);
}

/**
 * Builds a minimum-viable {@link LocalMessageItem} wrapper around a {@link GenericItem} so it can be rendered
 * by `MessageTypeComponent` without being inserted into the redux store. Used to render inline GenericItems
 * supplied via `ReasoningStep.content` / `ReasoningSteps.content`.
 *
 * The `id` must be stable across re-renders for the same logical slot (e.g. derived from the parent message
 * id + step index + item index), otherwise React will remount the child every time a streaming update lands.
 */
function synthesizeReasoningLocalMessageItem(
  item: GenericItem,
  fullMessageID: string,
  stableId: string
): LocalMessageItem {
  return {
    item,
    ui_state: {
      id: stableId,
      needsAnnouncement: false,
    },
    fullMessageID,
  };
}

export { hasReasoningContent, synthesizeReasoningLocalMessageItem };
