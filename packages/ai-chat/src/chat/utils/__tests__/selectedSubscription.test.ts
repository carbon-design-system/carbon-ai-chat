/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { subscribeToSelectedValue } from '../selectedSubscription';

function createSource<Snapshot>(initial: Snapshot) {
  let snapshot = initial;
  const listeners = new Set<() => void>();
  const unsubscribe = vi.fn();
  const fixture = {
    onSubscribe: undefined as (() => void) | undefined,
    listeners,
    unsubscribe,
    set(next: Snapshot) {
      snapshot = next;
      [...listeners].forEach((listener) => listener());
    },
    source: {
      getSnapshot: () => snapshot,
      subscribe(listener: () => void) {
        listeners.add(listener);
        fixture.onSubscribe?.();
        return () => {
          listeners.delete(listener);
          unsubscribe();
        };
      },
    },
  };
  return fixture;
}

describe('subscribeToSelectedValue', () => {
  it('delivers a callback-triggered change after the current notification', () => {
    const fixture = createSource({ value: 0 });
    const values: number[] = [];
    let depth = 0;
    let maximumDepth = 0;
    const release = subscribeToSelectedValue(
      fixture.source,
      (snapshot) => snapshot.value,
      (value) => {
        depth += 1;
        maximumDepth = Math.max(maximumDepth, depth);
        values.push(value);
        if (value === 0) {
          fixture.set({ value: 1 });
        }
        depth -= 1;
      },
      { onError: vi.fn() }
    );

    expect(values).toEqual([0, 1]);
    expect(maximumDepth).toBe(1);
    release();
  });

  it('stops a reentrant change when the callback releases its subscription', () => {
    const fixture = createSource({ value: 0 });
    const values: number[] = [];
    let release = () => {};
    release = subscribeToSelectedValue(
      fixture.source,
      (snapshot) => snapshot.value,
      (value) => {
        values.push(value);
        if (value === 1) {
          release();
          fixture.set({ value: 2 });
        }
      },
      { onError: vi.fn() }
    );

    fixture.set({ value: 1 });
    fixture.set({ value: 3 });
    release();
    expect(values).toEqual([0, 1]);
    expect(fixture.listeners.size).toBe(0);
    expect(fixture.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('retires a selector that fails during a later notification', () => {
    const fixture = createSource({ value: 0 });
    const failure = new Error('selection failed');
    const onChange = vi.fn();
    const onError = vi.fn();
    const release = subscribeToSelectedValue(
      fixture.source,
      ({ value }) => {
        if (value === 1) {
          throw failure;
        }
        return value;
      },
      onChange,
      { onError }
    );
    const lateNotification = [...fixture.listeners][0];

    fixture.set({ value: 1 });
    fixture.set({ value: 2 });
    lateNotification();
    release();
    expect(onChange.mock.calls).toEqual([[0]]);
    expect(onError.mock.calls).toEqual([[failure]]);
    expect(fixture.listeners.size).toBe(0);
    expect(fixture.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
