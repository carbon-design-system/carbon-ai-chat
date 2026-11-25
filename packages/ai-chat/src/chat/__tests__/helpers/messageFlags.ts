/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { AppState } from '../../../types/state/AppState';
import {
  itemIDsByLocalID,
  planStateMessageItems,
} from '../../../sdk/utils/publicMessageItems';

/**
 * The view's flags for the item a local item draws, which the view partition
 * keys by public item ID.
 */
export function itemFlagsFor(state: AppState, localItemID: string) {
  const itemID = itemIDsByLocalID(planStateMessageItems(state)).get(
    localItemID
  );
  return itemID === undefined ? undefined : state.view.messageItemFlags[itemID];
}

/** What the view records the item a local item draws as missing, if the chat can't draw it. */
export function cannotDrawOf(state: AppState, localItemID: string) {
  return itemFlagsFor(state, localItemID)?.cannotDraw;
}

/** Each drawn local item whose view flags record a choice, with the request it sent. */
export function itemsWithOptionSelected(state: AppState) {
  return planStateMessageItems(state).flatMap((plan) => {
    const optionSelected = state.view.messageItemFlags[plan.id]?.optionSelected;
    return optionSelected ? [{ local: plan.local, optionSelected }] : [];
  });
}

/**
 * Whether the view waits to announce the item a local item draws: `undefined`
 * when the list doesn't draw the local item, else whether its view flags ask
 * for an announcement.
 */
export function needsAnnouncementOf(
  state: AppState,
  localItemID: string
): boolean | undefined {
  const itemID = itemIDsByLocalID(planStateMessageItems(state)).get(
    localItemID
  );
  return itemID === undefined
    ? undefined
    : Boolean(state.view.messageItemFlags[itemID]?.needsAnnouncement);
}
