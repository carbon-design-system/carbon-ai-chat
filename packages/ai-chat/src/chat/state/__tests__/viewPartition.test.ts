/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ServiceManager } from '../../../sdk/services/ServiceManager';

import type {
  ConversationPersistedState,
  ConversationState,
  InputState,
} from '../../../types/state/AppState';
import type {
  ViewPartitionState,
  ViewPersistedState,
} from '../../../types/state/ViewPartitionState';

import { setupAfterEach, setupBeforeEach } from '../../__tests__/helpers/chat';

// O1: each slice is in exactly one partition. Saved state is the one slice
// split by field (#1831 O4): each partition holds a half, with no field in both.
type Overlap = Exclude<
  keyof ConversationState & keyof ViewPartitionState,
  'persistedToBrowserStorage'
>;
type SavedOverlap = keyof ConversationPersistedState & keyof ViewPersistedState;
const noOverlap: [Overlap | SavedOverlap] extends [never] ? true : false = true;

// O3: the view partition holds no upload list; uploads are conversation state.
type ViewUploads = Extract<keyof ViewPartitionState, 'pendingUploads'>;
const noViewUploads: [ViewUploads] extends [never] ? true : false = true;
const conversationUploads: InputState['pendingUploads'] extends unknown[]
  ? true
  : false = true;

// O5/O6: the store shared code sees has no view partition.
type SharedStore = ServiceManager['store'];
type SharedState = ReturnType<SharedStore['getState']>;
const sharedSeesNoView: 'view' extends keyof SharedState ? false : true = true;

describe('the view partition', () => {
  beforeEach(setupBeforeEach);
  afterEach(async () => {
    vi.restoreAllMocks();
    await setupAfterEach();
  });

  it('declares every slice in one partition only', () => {
    expect([
      noOverlap,
      noViewUploads,
      conversationUploads,
      sharedSeesNoView,
    ]).toEqual([true, true, true, true]);
  });
});
