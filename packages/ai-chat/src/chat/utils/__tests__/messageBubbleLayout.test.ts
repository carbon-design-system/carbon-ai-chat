/*
 *  Copyright IBM Corp. 2026, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { getBubbleLayout } from '../messageBubbleLayout';
import {
  MessageResponseTypes,
  type GenericItem,
} from '../../../types/messaging/Messages';

const item = (value: Record<string, unknown>) =>
  value as unknown as GenericItem;

const DEFAULT_LAYOUT = {
  fullWidth: false,
  widthCap: 'none',
  insetFooter: false,
};

describe('getBubbleLayout', () => {
  it('renders a user-defined item full width when full_width is true', () => {
    const layout = getBubbleLayout(
      item({
        response_type: MessageResponseTypes.USER_DEFINED,
        full_width: true,
      })
    );

    expect(layout).toEqual({ ...DEFAULT_LAYOUT, fullWidth: true });
  });

  it('renders a user-defined item in the inset column when full_width is false', () => {
    const layout = getBubbleLayout(
      item({
        response_type: MessageResponseTypes.USER_DEFINED,
        full_width: false,
      })
    );

    expect(layout).toEqual(DEFAULT_LAYOUT);
  });
});
