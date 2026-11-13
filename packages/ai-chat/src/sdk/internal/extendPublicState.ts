/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { PublicStateService } from '../../shared/services/PublicStateService';
import type { PublicStateFieldDefinition } from '../../shared/utils/publicState';

/**
 * Adds public state fields that a store partition builds. The prebuilt chat's
 * view uses it for the `PublicChatState` fields that aren't on
 * `ChatSDKState`, so `getState()` keeps its shape. Call it after attaching the
 * partition the fields read.
 */
function extendPublicState<S>(
  chat: { publicStateService: PublicStateService },
  definitions: readonly PublicStateFieldDefinition<S>[]
): void {
  chat.publicStateService.addFields(
    definitions as readonly PublicStateFieldDefinition<never>[]
  );
}

export { extendPublicState };
export type { PublicStateFieldDefinition };
