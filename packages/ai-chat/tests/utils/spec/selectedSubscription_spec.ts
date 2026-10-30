/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { subscribeToSelectedValue } from '../../../src/chat/utils/selectedSubscription';

function createSource<Snapshot>(initial: Snapshot) {
  let snapshot = initial;
  const listeners = new Set<() => void>();
  const unsubscribe = jest.fn();
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
  it('keeps a change delivered synchronously while subscribing', () => {
    const fixture = createSource({ value: 0 });
    fixture.onSubscribe = () => fixture.set({ value: 1 });
    const onChange = jest.fn();
    const onError = jest.fn();
    const release = subscribeToSelectedValue(
      fixture.source,
      (snapshot) => snapshot.value,
      onChange,
      { onError }
    );

    expect(onChange.mock.calls).toEqual([[1]]);
    expect(onError).not.toHaveBeenCalled();
    release();
    expect(fixture.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('ignores unrelated fields with the supplied selected-value equality', () => {
    const fixture = createSource({ value: 0, other: 0 });
    const onChange = jest.fn();
    const release = subscribeToSelectedValue(
      fixture.source,
      ({ value }) => ({ value }),
      onChange,
      {
        isEqual: (left, right) => left.value === right.value,
        onError: jest.fn(),
      }
    );

    fixture.set({ value: 0, other: 1 });
    fixture.set({ value: 1, other: 1 });
    fixture.set({ value: 1, other: 2 });
    expect(onChange.mock.calls).toEqual([[{ value: 0 }], [{ value: 1 }]]);
    release();
  });

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
      { onError: jest.fn() }
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
      { onError: jest.fn() }
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
    const onChange = jest.fn();
    const onError = jest.fn();
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

  it('releases a callback that fails before subscribe returns its cleanup', () => {
    const fixture = createSource({ value: 0 });
    fixture.onSubscribe = () => fixture.set({ value: 1 });
    const failure = new Error('view update failed');
    const onError = jest.fn();
    const release = subscribeToSelectedValue(
      fixture.source,
      (snapshot) => snapshot.value,
      () => {
        throw failure;
      },
      { onError }
    );

    release();
    expect(onError.mock.calls).toEqual([[failure]]);
    expect(fixture.listeners.size).toBe(0);
    expect(fixture.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('ignores retained callbacks after repeated release', () => {
    const fixture = createSource({ value: 0 });
    const onChange = jest.fn();
    const onError = jest.fn();
    const release = subscribeToSelectedValue(
      fixture.source,
      (snapshot) => snapshot.value,
      onChange,
      { onError }
    );
    const lateNotification = [...fixture.listeners][0];

    release();
    release();
    fixture.set({ value: 1 });
    lateNotification();
    expect(onChange.mock.calls).toEqual([[0]]);
    expect(onError).not.toHaveBeenCalled();
    expect(fixture.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
