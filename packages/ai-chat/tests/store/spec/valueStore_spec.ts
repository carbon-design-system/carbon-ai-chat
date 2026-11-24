/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import fs from 'node:fs';
import path from 'node:path';
import { createValueStore } from '../../../src/shared/store/valueStore';

// One case per #1741 outcome, O1 to O9.
describe('createValueStore', () => {
  it('keeps get and subscribe working as bare function references (O1)', () => {
    const store = createValueStore(1);
    const { get, subscribe, set } = store;
    const listener = jest.fn();
    subscribe(listener);
    set(2);
    expect(get()).toBe(2);
    expect(listener).toHaveBeenCalledWith(2);
  });

  it('makes no call when a listener subscribes (O2)', () => {
    const store = createValueStore({ a: 1 });
    const listener = jest.fn();
    store.subscribe(listener);
    expect(listener).not.toHaveBeenCalled();
  });

  it('stops only its own listener on unsubscribe, even for one function subscribed twice (O3)', () => {
    const store = createValueStore(0);
    const shared = jest.fn();
    const other = jest.fn();
    const stopFirst = store.subscribe(shared);
    store.subscribe(shared);
    store.subscribe(other);

    stopFirst();
    stopFirst();
    store.set(1);

    expect(shared).toHaveBeenCalledTimes(1);
    expect(other).toHaveBeenCalledTimes(1);
  });

  it('passes the new value to listeners (O4)', () => {
    const store = createValueStore<{ id: string }>({ id: 'a' });
    const next = { id: 'b' };
    const listener = jest.fn();
    store.subscribe(listener);
    store.set(next);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toBe(next);
  });

  it('notifies nobody for a write equal by Object.is (O5)', () => {
    const value = { id: 'a' };
    const store = createValueStore(value);
    const nan = createValueStore(Number.NaN);
    const listener = jest.fn();
    store.subscribe(listener);
    nan.subscribe(listener);

    store.set(value);
    nan.set(Number.NaN);

    expect(listener).not.toHaveBeenCalled();
  });

  it('notifies each listener once for a write that differs by Object.is (O6)', () => {
    const store = createValueStore(0);
    const listeners = [jest.fn(), jest.fn(), jest.fn()];
    listeners.forEach((listener) => store.subscribe(listener));

    store.set(-0);

    listeners.forEach((listener) => {
      expect(listener).toHaveBeenCalledTimes(1);
      expect(Object.is(listener.mock.calls[0][0], -0)).toBe(true);
    });
  });

  it('keeps the read reference until the next notification, across a no-op write (O7)', () => {
    const first = { items: [1] };
    const store = createValueStore(first);
    expect(store.get()).toBe(first);
    store.set(first);
    expect(store.get()).toBe(first);

    const second = { items: [1] };
    const seen: unknown[] = [];
    store.subscribe(() => seen.push(store.get()));
    store.set(second);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBe(second);
    expect(store.get()).toBe(second);
  });

  it('keeps the store object and its methods the same for its lifetime (O8)', () => {
    const store = createValueStore('a');
    const { get, subscribe, set } = store;
    const stop = store.subscribe(() => {});
    store.set('b');
    stop();
    store.set('c');

    expect(Object.isFrozen(store)).toBe(true);
    expect(store.get).toBe(get);
    expect(store.subscribe).toBe(subscribe);
    expect(store.set).toBe(set);
  });

  it('returns the stored value without rebuilding it (O9)', () => {
    const value = Object.freeze({ nested: Object.freeze({ list: [1, 2] }) });
    const store = createValueStore(value);
    const reads = [store.get(), store.get(), store.get()];
    reads.forEach((read) => expect(read).toBe(value));
  });

  describe('changes during notification', () => {
    it('skips a listener that an earlier listener removed in the same round', () => {
      const store = createValueStore(0);
      const later = jest.fn();
      let stopLater: () => void = () => {};
      store.subscribe(() => stopLater());
      stopLater = store.subscribe(later);

      store.set(1);

      expect(later).not.toHaveBeenCalled();
    });

    it('does not call a listener added during the round until the next write', () => {
      const store = createValueStore(0);
      const added = jest.fn();
      const stop = store.subscribe(() => {
        store.subscribe(added);
        stop();
      });

      store.set(1);
      expect(added).not.toHaveBeenCalled();
      store.set(2);
      expect(added).toHaveBeenCalledWith(2);
    });

    it('gives every listener the newest value last when a listener writes again', () => {
      const store = createValueStore(0);
      const seenByLater: number[] = [];
      store.subscribe((value) => {
        if (value === 1) {
          store.set(2);
        }
      });
      store.subscribe((value) => seenByLater.push(value));

      store.set(1);

      expect(seenByLater).toEqual([2]);
      expect(store.get()).toBe(2);
    });
  });

  it('imports nothing', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../../src/shared/store/valueStore.ts'),
      'utf8'
    );
    expect(source).not.toMatch(/^\s*import\s/m);
    expect(source).not.toMatch(/^\s*export\s[^;]*\sfrom\s/m);
    expect(source).not.toMatch(/\brequire\(|\bimport\(/);
  });
});
