/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { TourStepGenericItem } from "../messaging/Messages";

/**
 * The persisted state of the tour component. Whether the tour is visible is controlled by {@link launcherState.viewState}.
 */
interface PersistedTourState {
  /**
   * The id of the active tour. If there is no active tour the id will be an empty string.
   */
  activeTourID?: string;

  /**
   * The index of the step in the active tour array that was last viewed.
   */
  activeTourCurrentStepIndex?: number;
}

/**
 * The non-persisted state of the tour component.
 */
interface TourState {
  /**
   * The {@link TourStepGenericItem} for each tour step.
   */
  activeTourStepItems: TourStepGenericItem[];
}

export { PersistedTourState, TourState };
