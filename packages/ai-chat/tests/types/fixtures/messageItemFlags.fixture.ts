/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Compiled under `strict: true` by sdkTypes_spec.ts and never run. The choice an item's option,
 * date, or post-back button sent, whether a screen reader still has to announce the item, and
 * whether the chat can't draw it are view state: the view partition keys them by public item ID,
 * and the item's local copy, which conversation code builds, no longer holds them.
 */

import type { LocalMessageUIState } from '../../../src/types/messaging/LocalMessageItem';
import type { MessageRequest } from '../../../src/types/messaging/Messages';
import type {
  MessageItemViewFlags,
  ViewPartitionState,
} from '../../../src/types/state/ViewPartitionState';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

export const localCopyHasNoChoice: Equal<
  Extract<keyof LocalMessageUIState, 'optionSelected'>,
  never
> = true;

export const localCopyHasNoAnnouncementFlags: Equal<
  Extract<keyof LocalMessageUIState, 'needsAnnouncement' | 'wasAnnounced'>,
  never
> = true;

export const localCopyHasNoCannotDraw: Equal<
  Extract<keyof LocalMessageUIState, 'cannotDraw'>,
  never
> = true;

export const viewKeysFlagsByItemID: Equal<
  ViewPartitionState['messageItemFlags'],
  Readonly<Record<string, Readonly<MessageItemViewFlags>>>
> = true;

export const flagsHoldTheChoiceAnnouncementAndDrawability: Equal<
  MessageItemViewFlags,
  {
    messageID: string;
    optionSelected?: MessageRequest;
    needsAnnouncement?: boolean;
    wasAnnounced?: boolean;
    cannotDraw?: { missing: string[] };
  }
> = true;
