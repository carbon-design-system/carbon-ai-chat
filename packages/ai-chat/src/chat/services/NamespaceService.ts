/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

class NamespaceService {
  /**
   * The full provided namespace name.
   */
  public readonly originalName: string;

  /**
   * The namespace stripped of characters not safe to use in an attribute name in HTML. This is an empty string if
   * originalName is equal to the default.
   */
  public readonly attributeSafe: string;

  /**
   * The attribute safe namespace prepended by `--` to be used as a suffix on attributes like ID or class.
   * This is an empty string if originalName is equal by default.
   */
  public readonly suffix: string;

  constructor(namespace?: string) {
    this.originalName = namespace;
    this.attributeSafe = namespace;
    this.suffix = getSuffix(namespace);
  }
}

/**
 * From a given namespace, generate a unique token safe to be used as a suffix to a classname or attribute.
 * If no namespace provided, returns an empty string.
 */
function getSuffix(namespace?: string) {
  const computedName = computeNamespaceName(namespace);
  return computedName?.length ? `--${namespace}` : "";
}

/**
 * Given a namespace, trims and returns. If no namespace provided, returns an empty string.
 */
function computeNamespaceName(namespace?: string) {
  return namespace ? namespace.trim() : "";
}

export { NamespaceService };
