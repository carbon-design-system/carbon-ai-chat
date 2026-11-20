/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Compiled under `strict: true` by sdkTypes_spec.ts and never run. The per-mount owner holds only
 * what belongs to one mount, and a confirmation is a question in the chat's view partition, whose
 * answers stay out of the store.
 */

import type {
  ChatMountState,
  ChatMountStateSnapshot,
} from '../../../src/chat/services/chatMountState';
import type {
  ChatPrompt,
  ViewPartitionState,
} from '../../../src/types/state/ViewPartitionState';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

export const snapshotIsPerMount: Equal<
  keyof ChatMountStateSnapshot,
  'serviceManager' | 'intl' | 'windowSize'
> = true;

/** The announcer and the initial-render holds stay; the confirmation members left. */
export const mountMembers: Equal<
  Extract<
    keyof ChatMountState,
    | 'announcer'
    | 'holdInitialReactCommit'
    | 'whenInitialReactCommitReady'
    | 'showEndChatConfirmation'
    | 'hideEndChatConfirmation'
    | 'openConfirmation'
  >,
  'announcer' | 'holdInitialReactCommit' | 'whenInitialReactCommitReady'
> = true;

export const viewHoldsThePrompt: Equal<
  ViewPartitionState['prompt'],
  ChatPrompt | null
> = true;

export const promptIsTheQuestionOnly: Equal<
  keyof ChatPrompt,
  'id' | 'kind' | 'title' | 'message'
> = true;

export const promptKinds: Equal<ChatPrompt['kind'], 'endChat' | 'humanAgent'> =
  true;
