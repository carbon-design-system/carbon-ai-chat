/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { conditionalSetTimeout, getURLHostName } from '../browserUtils';

describe('getURLHostName', () => {
  it('should return original string for invalid URLs', () => {
    expect(getURLHostName('not-a-url')).toBe('not-a-url');
    expect(getURLHostName('')).toBe('');
    expect(getURLHostName('just-text')).toBe('just-text');
  });
});

describe('conditionalSetTimeout', () => {
  it('should execute operation immediately when timeout is 0', () => {
    const operation = vi.fn();
    const result = conditionalSetTimeout(operation, 0);

    expect(operation).toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('should execute operation immediately when timeout is falsy', () => {
    const operation = vi.fn();
    conditionalSetTimeout(operation, null as unknown as number);
    conditionalSetTimeout(operation, undefined as unknown as number);

    expect(operation).toHaveBeenCalledTimes(2);
  });
});
