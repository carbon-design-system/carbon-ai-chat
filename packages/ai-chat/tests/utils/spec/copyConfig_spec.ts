/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { copyConfig } from '../../../src/shared/utils/copyConfig';

class Renderer {
  constructor(readonly name: string) {}
}

describe('copyConfig (#1833 O6, O7)', () => {
  it('copies plain objects and arrays all the way down', () => {
    const source = {
      messaging: { skipWelcome: true, options: { retries: [1, 2] } },
      list: [{ id: 'a' }],
    };
    const copy = copyConfig(source);
    expect(copy).toStrictEqual(source);
    expect(copy).not.toBe(source);
    expect(copy.messaging).not.toBe(source.messaging);
    expect(copy.messaging.options.retries).not.toBe(
      source.messaging.options.retries
    );
    expect(copy.list[0]).not.toBe(source.list[0]);
  });

  it('keeps functions, class instances, dates, and nodes by reference', () => {
    const callback = jest.fn();
    const renderer = new Renderer('r');
    const date = new Date();
    const node = document.createElement('div');
    const map = new Map([['k', 1]]);
    const copy = copyConfig({ callback, renderer, date, node, map });
    expect(copy.callback).toBe(callback);
    expect(copy.renderer).toBe(renderer);
    expect(copy.date).toBe(date);
    expect(copy.node).toBe(node);
    expect(copy.map).toBe(map);
  });

  it('leaves the caller free to edit its object, and never freezes it', () => {
    const source = { input: { isDisabled: false }, strings: ['a'] };
    const copy = copyConfig(source);
    source.input.isDisabled = true;
    source.strings.push('b');
    expect(copy).toStrictEqual({
      input: { isDisabled: false },
      strings: ['a'],
    });
    expect(Object.isFrozen(source)).toBe(false);
    expect(Object.isFrozen(copy)).toBe(false);
  });

  it('copies a cycle as a cycle, and objects with no prototype', () => {
    const source: Record<string, unknown> = Object.create(null);
    source.self = source;
    const copy = copyConfig(source);
    expect(copy).not.toBe(source);
    expect(copy.self).toBe(copy);
    expect(Object.getPrototypeOf(copy)).toBeNull();
  });
});
