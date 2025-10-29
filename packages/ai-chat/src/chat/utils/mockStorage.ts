/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import ObjectMap from "../../types/utilities/ObjectMap";

// This file is a mock of the localStorage API. In IE11 when developing on localhost, we can get access denied errors.
// This is just a small fallback for that use case.

let innerStorage: ObjectMap<any> = {};

const storage: Storage = {
  getItem(key: string) {
    return innerStorage[key];
  },
  setItem(key: string, value: string) {
    innerStorage[key] = value;
  },
  removeItem(key: string) {
    delete innerStorage[key];
  },
  length: Object.keys(innerStorage).length,
  clear() {
    innerStorage = {};
  },
  key(index: number) {
    return Object.keys(innerStorage)[index];
  },
};

export default storage;
