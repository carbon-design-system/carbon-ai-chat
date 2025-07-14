/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This interface can be used as the interface for a functional component with imperative functions. These functions
 * may be called by anyone that has a reference to the component.
 */
interface HasRequestFocus {
  /**
   * This function can be called when another component wishes this component to gain focus. It is up to the
   * component to decide where focus belongs. This may return true or false to indicate if a suitable focus location
   * was found.
   */
  requestFocus: () => boolean | void;
}

export { HasRequestFocus };
