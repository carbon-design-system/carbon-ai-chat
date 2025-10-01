/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * A TypeScript definition file for ObjectMap.
 */

/**
 * This interface represents an object which behaves like a map. The object contains a set of properties representing
 * keys in the map and the values of those properties are all of the same type (TPropertyType). The type of the keys
 * defaults to any string but you can specify a type that is a string enum instead if you want a map that contains
 * only keys for a given enum (or other similar type).
 *
 * @category Utilities
 */
type ObjectMap<
  TPropertyType,
  TKeyType extends string | number = string,
> = Partial<Record<TKeyType, TPropertyType>>;

export default ObjectMap;
