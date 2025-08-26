/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * A simple class that can track a set of listeners and then fire them when needed.
 */
class ListenerList<TArgType extends any[] = []> {
  /**
   * The current set of listeners.
   */
  private listeners: ListenerFunction<TArgType>[] = [];

  /**
   * Adds the given listener to the list.
   */
  public addListener(listenerToAdd: ListenerFunction<TArgType>) {
    this.listeners = [...this.listeners, listenerToAdd];
  }

  /**
   * Removes all occurrences of the given listener from the list.
   */
  public removeListener(listenerToRemove: ListenerFunction<TArgType>) {
    this.listeners = this.listeners.filter(
      (listener) => listener !== listenerToRemove,
    );
  }

  /**
   * Calls all the listeners in the list passing each the given arguments.
   */
  public fireListeners(...args: TArgType) {
    if (this.listeners.length) {
      this.listeners.forEach((listener) => listener(...args));
    }
  }
}

type ListenerFunction<TArgType extends any[] = []> = (
  ...args: TArgType
) => void;

export { ListenerList };
