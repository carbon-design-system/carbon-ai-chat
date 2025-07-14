/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

/**
 * Represents an item that has an optional className.
 */

interface HasChildren {
  /**
   * The class name to add to the component.
   */
  children?: React.ReactNode;
}

export { HasChildren };
