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
  const staticReceivers = new WeakMap<object, WeakMap<object, object>>();
  const ordinaryCopies = new Set<object>();
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
    let ordinary = false;
    if (typeof value === 'function') {
      // Binding preserves constructability. Shield metadata reads from host getters.
      const bindingTarget = new Proxy(value, {
        get: (_target, key) => {
          const descriptor = Object.getOwnPropertyDescriptor(value, key);
          if (descriptor && !descriptor.configurable) {
            if ('value' in descriptor && !descriptor.writable) {
              return descriptor.value;
            }
            if (!('value' in descriptor) && descriptor.get === undefined) {
              return undefined;
            }
          }
          return key === 'length'
            ? 0
            : key === 'name'
              ? ''
              : Reflect.get(value, key);
        },
      });
      owned = new Proxy(
        Function.prototype.bind.call(bindingTarget, undefined),
        {
          apply: (_target, receiver, args) =>
            Reflect.apply(
              value,
              typeof receiver === 'function'
                ? (staticReceivers.get(value)?.get(receiver) ?? receiver)
                : receiver,
              args
            ),
          construct: (_target, args, newTarget) =>
            Reflect.construct(
              value,
              args,
              newTarget === owned ? value : newTarget
            ),
        }
      );
      if (!Object.prototype.hasOwnProperty.call(value, Symbol.hasInstance)) {
        Object.defineProperty(owned, Symbol.hasInstance, {
          configurable: true,
          value: function (this: unknown, instance: unknown) {
            return Reflect.apply(
              value[Symbol.hasInstance] ??
                Function.prototype[Symbol.hasInstance],
              this === owned ? value : this,
              [instance]
            );
          },
        });
      }
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
      ordinary = true;
    } else {
      const prototype = Object.getPrototypeOf(value);
      if (
        prototype === null ||
        prototype === Object.prototype ||
        Object.prototype.toString.call(value) === '[object Object]'
      ) {
        owned = Object.create(prototype);
        ordinary = true;
      } else {
        // Match nested message cloning: opaque values keep their existing APIs.
        owned = cloneDeep({ value }).value;
        if (owned === value) {
          copies.set(value, value);
          return value;
        }
      }
    }
    copies.set(value, owned);
    if (value instanceof Map) {
      value.forEach((entry, key) => owned.set(copy(key), copy(entry)));
    } else if (value instanceof Set) {
      value.forEach((entry) => owned.add(copy(entry)));
    }
    const copyStaticMember =
      typeof value === 'function'
        ? (member: any) => {
            if (typeof member === 'function') {
              let receivers = staticReceivers.get(member);
              if (!receivers) {
                receivers = new WeakMap();
                staticReceivers.set(member, receivers);
              }
              receivers.set(owned, value);
            }
            return copy(member);
          }
        : undefined;
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (typeof value === 'function') {
        if ('value' in descriptor) {
          const original = descriptor.value;
          descriptor.value =
            key === 'prototype' ? copy(original) : copyStaticMember(original);
          if (
            key === 'prototype' &&
            descriptor.value !== original &&
            original !== null &&
            (typeof original === 'object' || typeof original === 'function')
          ) {
            Object.setPrototypeOf(descriptor.value, original);
          }
        } else {
          descriptor.get = copyStaticMember(descriptor.get);
          descriptor.set = copyStaticMember(descriptor.set);
        }
        Object.defineProperty(owned, key, descriptor);
      } else if (descriptor.enumerable) {
        Object.defineProperty(owned, key, {
          value: copy(value[key]),
          enumerable: true,
          configurable: true,
          writable: true,
        });
      }
    }
    if (ordinary) {
      ordinaryCopies.add(owned);
    }
    return owned;
  };
  const result = copy(values);
  ordinaryCopies.forEach((owned) => Object.freeze(owned));
  return result;
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
