/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cloneDeep from 'lodash-es/cloneDeep.js';
import type { MessageResponse } from '../../../types/messaging/Messages';
import type { LocalMessageItem } from '../../../types/messaging/LocalMessageItem';

const nativeContent = new WeakMap<object, WeakSet<object>>();
const noOptions = {};

export function retainNativeMessageOrigin(message: MessageResponse) {
  if (!message.output) {
    return;
  }
  let options = nativeContent.get(message.output);
  if (!options) {
    options = new WeakSet();
    nativeContent.set(message.output, options);
  }
  options.add(message.message_options ?? noOptions);
}

export function snapshotNativeMessageEvent<T>(values: T): T {
  const copies = new WeakMap<object, any>();
  const copy = (value: any): any => {
    if (
      value === null ||
      (typeof value !== 'object' && typeof value !== 'function')
    ) {
      return value;
    }
    if (copies.has(value)) {
      return copies.get(value);
    }
    let owned: any;
    if (typeof value === 'function') {
      owned = function (this: unknown, ...args: unknown[]) {
        return Reflect.apply(value, this, args);
      };
    } else if (value instanceof Map) {
      owned = new Map();
    } else if (value instanceof Set) {
      owned = new Set();
    } else if (ArrayBuffer.isView(value)) {
      const buffer = copy(value.buffer);
      if (copies.has(value)) {
        return copies.get(value);
      }
      owned =
        value instanceof DataView
          ? new DataView(buffer, value.byteOffset, value.byteLength)
          : new (value.constructor as any)(
              buffer,
              value.byteOffset,
              (value as any).length
            );
    } else if (Array.isArray(value)) {
      owned = new Array(value.length);
    } else if (Object.prototype.toString.call(value) === '[object Object]') {
      owned = Object.create(Object.getPrototypeOf(value));
    } else {
      owned = cloneDeep(value);
    }
    copies.set(value, owned);
    if (value instanceof Map) {
      value.forEach((entry, key) => owned.set(copy(key), copy(entry)));
    } else if (value instanceof Set) {
      value.forEach((entry) => owned.add(copy(entry)));
    }
    for (const key of Reflect.ownKeys(value)) {
      if (Object.prototype.propertyIsEnumerable.call(value, key)) {
        Object.defineProperty(owned, key, {
          value: copy(value[key]),
          enumerable: true,
          configurable: true,
          writable: true,
        });
      }
    }
    return Array.isArray(value) ||
      Object.prototype.toString.call(value) === '[object Object]'
      ? Object.freeze(owned)
      : owned;
  };
  return copy(values);
}

export function prepareReasoningMessageEvent(
  message: MessageResponse,
  localItem: LocalMessageItem
) {
  const values = { message, localItem };
  return nativeContent
    .get(message.output)
    ?.has(message.message_options ?? noOptions)
    ? snapshotNativeMessageEvent(values)
    : values;
}
