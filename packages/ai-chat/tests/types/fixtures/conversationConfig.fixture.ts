/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Compiled under `strict: true` by sdkTypes_spec.ts and never run. The prebuilt chat stores its
 * `PublicConfig` where conversation code reads `ConversationConfig`, so each field must have the
 * same type in both. The package's own compile checks function parameters loosely, so this checks
 * each field for exact equality instead.
 */

import type { InputConfig } from '../../../src/types/config/InputConfig';
import type { PublicConfig } from '../../../src/types/config/PublicConfig';
import type {
  ConversationAppConfig,
  ConversationConfig,
} from '../../../src/types/state/ConversationState';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

/** `PublicConfig` leaves out the agent connection config, which only the SDK sets. */
type SdkOnly = 'humanAgentState';

/** Restated as the three flags conversation code reads; checked below. */
type Narrowed = 'input';

type Matches = {
  [K in Exclude<keyof ConversationConfig, SdkOnly | Narrowed>]-?: Equal<
    ConversationConfig[K],
    PublicConfig[K]
  >;
};

// A new conversation field needs a line here, and fails it unless PublicConfig types it the same.
export const fieldsMatch: Matches = {
  onError: true,
  debug: true,
  serviceDeskFactory: true,
  serviceDesk: true,
  namespace: true,
  messaging: true,
  isReadonly: true,
  locale: true,
  strings: true,
  assistantName: true,
  upload: true,
  homescreen: true,
  persistedState: true,
};

type ConversationInput = NonNullable<ConversationConfig['input']>;

export const inputFlagsMatch: {
  [K in keyof ConversationInput]-?: Equal<ConversationInput[K], InputConfig[K]>;
} = {
  isVisible: true,
  isDisabled: true,
  showStopStreamingButton: true,
};

export const sdkOnlyIsAbsent: Equal<
  Extract<keyof PublicConfig, SdkOnly>,
  never
> = true;

/** The values the prebuilt chat derives from its config live in its view partition, not here. */
export const conversationAppConfigIsPublicOnly: Equal<
  keyof ConversationAppConfig,
  'public'
> = true;
