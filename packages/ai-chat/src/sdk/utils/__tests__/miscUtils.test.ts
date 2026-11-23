/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { getResponsiveElementPaddingValue } from '../miscUtils';

// The top padding that keeps an embedded media player at its aspect ratio,
// relative to a 320px-wide frame.
describe('getResponsiveElementPaddingValue', () => {
  it('should return correct padding for default height', () => {
    expect(getResponsiveElementPaddingValue()).toBe('56.25%');
  });

  it('should return correct padding for custom height', () => {
    expect(getResponsiveElementPaddingValue(100)).toBe('31.25%');
  });
});
