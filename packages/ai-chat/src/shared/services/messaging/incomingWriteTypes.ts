/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { MessageResponse } from '../../../types/messaging/Messages';

interface UpsertStamp {
  generation: number;
  /** The `updaterGeneration` when the upsert was called. */
  updaterGeneration: number;
  /** Set once the updater resolves, when a restart began before it did. */
  droppedByRestart?: boolean;
  restartCount: number;
  isCurrent: () => boolean;
  eventMessage?: MessageResponse;
  eventHoldFromIndex?: number;
  originalLocalIDs?: string[];
}

export type { UpsertStamp };
