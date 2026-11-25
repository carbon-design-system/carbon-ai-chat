/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type {
  CustomFooterSlotState,
  CustomRequestFooterSlotState,
  UserDefinedSlotState,
} from '../slotTracking';
import type {
  RenderCustomMessageFooterState,
  RenderCustomRequestFooterState,
  RenderUserDefinedState,
} from '../../../types/component/ChatContainer';

// Shared code can't import the public types (their module imports React), so
// the tracking restates them. Each pair must match exactly.
type Exactly<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
const userDefinedMatches: Exactly<
  UserDefinedSlotState,
  RenderUserDefinedState
> = true;
const footerMatches: Exactly<
  CustomFooterSlotState,
  RenderCustomMessageFooterState
> = true;
const requestFooterMatches: Exactly<
  CustomRequestFooterSlotState,
  RenderCustomRequestFooterState
> = true;

describe('attachSlotTracking', () => {
  it('restates the public slot-state types exactly', () => {
    expect([userDefinedMatches, footerMatches, requestFooterMatches]).toEqual([
      true,
      true,
      true,
    ]);
  });
});
