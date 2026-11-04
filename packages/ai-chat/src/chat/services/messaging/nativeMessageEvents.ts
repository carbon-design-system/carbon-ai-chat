/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cloneDeep from 'lodash-es/cloneDeep.js';
import isEqual from 'lodash-es/isEqual.js';
import type { MessageResponse } from '../../../types/messaging/Messages';
import type { LocalMessageItem } from '../../../types/messaging/LocalMessageItem';

const nativeContent = new WeakMap<object, WeakSet<object>>();
const noOptions = {};
const constructorSource = (constructor: object) =>
  Function.prototype.toString.call(constructor);
const opaqueConstructors = new Set(
  [WeakMap, WeakSet, Promise, Error].map(constructorSource)
);
const objectConstructor = constructorSource(Object);

function nativeConstructorSource(value: object): string | undefined {
  let firstNativeSource: string;
  for (
    let prototype = Object.getPrototypeOf(value);
    prototype;
    prototype = Object.getPrototypeOf(prototype)
  ) {
    const constructor = Object.getOwnPropertyDescriptor(
      prototype,
      'constructor'
    )?.value;
    if (
      typeof constructor === 'function' &&
      Object.getOwnPropertyDescriptor(constructor, 'prototype')?.value ===
        prototype
    ) {
      const source = constructorSource(constructor);
      if (/^function\b[^{}]*\{\s*\[native code\]\s*\}$/.test(source)) {
        if (opaqueConstructors.has(source)) {
          return source;
        }
        firstNativeSource ??= source;
      }
    }
  }
  return firstNativeSource;
}

function isCollection(value: object, prototype: Map<any, any> | Set<any>) {
  try {
    prototype.has.call(value, noOptions);
    return true;
  } catch {
    return false;
  }
}

function copyBuffer(value: object): ArrayBufferLike | undefined {
  const constructors =
    typeof SharedArrayBuffer === 'undefined'
      ? [ArrayBuffer]
      : [ArrayBuffer, SharedArrayBuffer];
  for (const BufferConstructor of constructors) {
    const prototype = BufferConstructor.prototype;
    let byteLength: number;
    try {
      byteLength = Object.getOwnPropertyDescriptor(
        prototype,
        'byteLength'
      ).get.call(value);
    } catch {
      continue;
    }
    const flexible = Object.getOwnPropertyDescriptor(
      prototype,
      BufferConstructor === ArrayBuffer ? 'resizable' : 'growable'
    )?.get.call(value);
    const maxByteLength = flexible
      ? Object.getOwnPropertyDescriptor(prototype, 'maxByteLength').get.call(
          value
        )
      : undefined;
    const owned = Reflect.construct(
      BufferConstructor,
      flexible ? [byteLength, { maxByteLength }] : [byteLength]
    );
    new Uint8Array(owned).set(new Uint8Array(value as ArrayBufferLike));
    return owned;
  }
  return undefined;
}

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

export function retainCopiedNativeMessageOrigin(
  source: MessageResponse,
  copied: MessageResponse
) {
  if (
    nativeContent
      .get(source.output)
      ?.has(source.message_options ?? noOptions) &&
    isEqual(source.output, copied.output) &&
    isEqual(source.message_options, copied.message_options)
  ) {
    retainNativeMessageOrigin(copied);
  }
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
    let map = false;
    let set = false;
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
    } else if (Array.isArray(value)) {
      owned = new Array(value.length);
      ordinary = true;
    } else if (ArrayBuffer.isView(value)) {
      const buffer = copy(value.buffer);
      if (copies.has(value)) {
        return copies.get(value);
      }
      let viewByteLength: number;
      try {
        viewByteLength = Object.getOwnPropertyDescriptor(
          DataView.prototype,
          'byteLength'
        ).get.call(value);
      } catch {
        // Typed arrays lack the DataView slot, even when they share its realm.
      }
      owned =
        viewByteLength === undefined
          ? new (value.constructor as any)(
              buffer,
              value.byteOffset,
              (value as any).length
            )
          : new DataView(buffer, value.byteOffset, viewByteLength);
    } else {
      const prototype = Object.getPrototypeOf(value);
      const nativeConstructor =
        prototype === null || prototype === Object.prototype
          ? undefined
          : nativeConstructorSource(value);
      if (
        value instanceof WeakMap ||
        value instanceof WeakSet ||
        value instanceof Promise ||
        value instanceof Error ||
        opaqueConstructors.has(nativeConstructor)
      ) {
        copies.set(value, value);
        return value;
      }
      if (prototype === null || prototype === Object.prototype) {
        owned = Object.create(prototype);
        ordinary = true;
      } else if (isCollection(value, Map.prototype)) {
        owned = new Map();
        map = true;
      } else if (isCollection(value, Set.prototype)) {
        owned = new Set();
        set = true;
      } else {
        owned = copyBuffer(value);
        if (
          !owned &&
          (nativeConstructor === objectConstructor ||
            Object.prototype.toString.call(value) === '[object Object]')
        ) {
          owned = Object.create(prototype);
          ordinary = true;
        } else if (!owned) {
          // Match nested message cloning: opaque values keep their existing APIs.
          owned = cloneDeep({ value }).value;
        }
        if (owned === value) {
          copies.set(value, value);
          return value;
        }
      }
    }
    copies.set(value, owned);
    if (map) {
      (value as Map<unknown, unknown>).forEach((entry, key) =>
        owned.set(copy(key), copy(entry))
      );
    } else if (set) {
      (value as Set<unknown>).forEach((entry) => owned.add(copy(entry)));
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
        const existing = Object.getOwnPropertyDescriptor(owned, key);
        if (
          existing &&
          !existing.configurable &&
          'value' in existing &&
          !existing.writable &&
          Object.is(existing.value, descriptor.value)
        ) {
          continue;
        }
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
