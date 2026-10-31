/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

interface SelectionSource<Snapshot> {
  getSnapshot(): Snapshot;
  subscribe(listener: () => void): () => void;
}

function subscribeToSelectedValue<Snapshot, Value>(
  source: SelectionSource<Snapshot>,
  selector: (snapshot: Snapshot) => Value,
  onChange: (value: Value) => void,
  options: {
    isEqual?: (left: Value, right: Value) => boolean;
    onError: (error: unknown) => void;
  }
): () => void {
  const { isEqual = Object.is, onError } = options;
  let active = true;
  let hasValue = false;
  let selected: Value;
  let notifying = false;
  let pending = false;
  // A source can notify before subscribe returns its cleanup.
  let unsubscribe = () => {};
  const release = () => {
    if (active) {
      active = false;
      unsubscribe();
    }
  };
  const update = () => {
    if (!active) {
      return;
    }
    if (notifying) {
      pending = true;
      return;
    }
    notifying = true;
    try {
      do {
        pending = false;
        const next = selector(source.getSnapshot());
        if (!hasValue || !isEqual(selected, next)) {
          hasValue = true;
          selected = next;
          onChange(next);
        }
      } while (active && pending);
    } catch (error) {
      release();
      onError(error);
    } finally {
      notifying = false;
    }
  };
  unsubscribe = source.subscribe(update);
  if (active) {
    update();
  } else {
    unsubscribe();
  }
  return release;
}

export { subscribeToSelectedValue };
