/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { HasAddRemoveClassName } from "../instance/ChatInstance";

/**
 * A utility interface that contains an array for managing extra class names.
 */
interface HasExtraClassNames {
  /**
   * Additional class names that were provided by the user that should be added to the main window.
   */
  extraClassNames: string[];
}

/**
 * Returns a function that can be used to modify a state object to add a class name.
 */
function addClassNameToState(name: string) {
  return (previousState: HasExtraClassNames) => {
    const currentIndex = previousState.extraClassNames.indexOf(name);
    if (currentIndex === -1) {
      return {
        extraClassNames: [...previousState.extraClassNames, name],
      };
    }
    return null;
  };
}

/**
 * Returns a function that can be used to modify a state object to remove a class name.
 */
function removeClassNameFromState(name: string) {
  return (previousState: HasExtraClassNames) => {
    return {
      extraClassNames: previousState.extraClassNames.filter(
        (value) => value !== name,
      ),
    };
  };
}

export {
  HasAddRemoveClassName,
  HasExtraClassNames,
  addClassNameToState,
  removeClassNameFromState,
};
