/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { sanitizeDateFormat } from '../dateUtils';

// A locale's short date format can use one letter for the month or day. The
// date picker's formatter needs the two-letter tokens.
describe('sanitizeDateFormat', () => {
  it('should convert single m to mm', () => {
    expect(sanitizeDateFormat('m/dd/yyyy')).toBe('mm/dd/yyyy');
  });

  it('should convert single d to dd', () => {
    expect(sanitizeDateFormat('mm/d/yyyy')).toBe('mm/dd/yyyy');
  });

  it('should handle both single m and d', () => {
    expect(sanitizeDateFormat('m/d/yyyy')).toBe('mm/dd/yyyy');
  });
});
