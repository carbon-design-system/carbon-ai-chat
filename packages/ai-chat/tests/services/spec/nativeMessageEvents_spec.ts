/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { runInNewContext } from 'node:vm';
import {
  prepareReasoningMessageEvent,
  retainCopiedNativeMessageOrigin,
  retainNativeMessageOrigin,
  snapshotNativeMessageEvent,
} from '../../../src/sdk/services/messaging/nativeMessageEvents';
import { synthesizeReasoningLocalMessageItem } from '../../../src/sdk/utils/reasoningContent';
import {
  MessageResponse,
  MessageResponseTypes,
} from '../../../src/types/messaging/Messages';

function fixture() {
  const item = {
    response_type: MessageResponseTypes.USER_DEFINED,
    user_defined: { value: 'before' },
  };
  const message: MessageResponse = {
    id: 'reasoning',
    output: { generic: [] },
    message_options: { reasoning: { content: [item] } },
  };
  return {
    message,
    localItem: synthesizeReasoningLocalMessageItem(
      item,
      message.id,
      'reasoning-intro-0'
    ),
  };
}

it('copies and freezes one graph while preserving cycles and aliases', () => {
  const source = fixture();
  source.localItem.item.user_defined.self = source.localItem.item;
  const event = snapshotNativeMessageEvent(source);
  expect(event.localItem.item).toBe(
    event.message.message_options.reasoning.content[0]
  );
  expect(event.localItem.item.user_defined.self).toBe(event.localItem.item);
  expect(event.localItem.item).not.toBe(source.localItem.item);
  expect(() => {
    event.localItem.item.user_defined.value = 'after';
  }).toThrow(TypeError);
  expect(Object.isFrozen(source.localItem.item)).toBe(false);
});

it('owns function properties without freezing or replacing the caller function', () => {
  const shared = { value: 'before' };
  const callback = Object.assign(
    function (this: { offset: number }, value: number) {
      return this.offset + value;
    },
    { shared }
  );
  const event = snapshotNativeMessageEvent({ callback, shared });
  expect(event.callback).not.toBe(callback);
  expect(event.callback.shared).toBe(event.shared);
  expect(event.callback.call({ offset: 2 }, 3)).toBe(5);
  expect(() => {
    event.callback.shared.value = 'after';
  }).toThrow(TypeError);
  expect(Object.isFrozen(callback)).toBe(false);
  expect(Object.isFrozen(shared)).toBe(false);
});

it('owns collection keys and values while retaining collection methods', () => {
  const key = { value: 'before' };
  const map = new Map([[key, key]]);
  const set = new Set([key]);
  const event = snapshotNativeMessageEvent({ key, map, set });
  expect(event.map.get(event.key)).toBe(event.key);
  expect(event.set.has(event.key)).toBe(true);
  expect(event.map.has(key)).toBe(false);
  event.map.clear();
  event.set.clear();
  expect(map.get(key)).toBe(key);
  expect(set.has(key)).toBe(true);
  expect(Object.isFrozen(key)).toBe(false);
});

it('recognizes the content pair on a retained message rather than its ID', () => {
  const native = fixture();
  retainNativeMessageOrigin(native.message);
  const retained = { ...native.message, history: { timestamp: 1 } };
  expect(
    Object.isFrozen(
      prepareReasoningMessageEvent(retained, native.localItem).message
    )
  ).toBe(true);
  const legacy: MessageResponse = {
    ...native.message,
    message_options: { reasoning: { content: [] } },
  };
  expect(prepareReasoningMessageEvent(legacy, native.localItem).message).toBe(
    legacy
  );
  const replacement = fixture();
  expect(
    prepareReasoningMessageEvent(replacement.message, replacement.localItem)
      .message
  ).toBe(replacement.message);
  expect(
    Object.isFrozen(
      prepareReasoningMessageEvent(native.message, native.localItem).message
    )
  ).toBe(true);
});

it('tracks native messages without options without claiming a later options merge', () => {
  const native = fixture();
  delete native.message.message_options;
  retainNativeMessageOrigin(native.message);
  expect(
    Object.isFrozen(
      prepareReasoningMessageEvent(native.message, native.localItem).message
    )
  ).toBe(true);
  const legacy = { ...native.message, message_options: {} };
  expect(prepareReasoningMessageEvent(legacy, native.localItem).message).toBe(
    legacy
  );
});

it('copies special values and shared buffers without freezing the caller', () => {
  const date = new Date(1000);
  const bytes = new Uint8Array([1, 2, 3]);
  const view = new DataView(bytes.buffer);
  const event = snapshotNativeMessageEvent({
    date,
    bytes,
    view,
    buffer: bytes.buffer,
  });
  expect(event.bytes.buffer).toBe(event.buffer);
  expect(event.view.buffer).toBe(event.buffer);
  event.date.setTime(2000);
  event.bytes[0] = 9;
  event.view.setUint8(1, 8);
  expect(date.getTime()).toBe(1000);
  expect(Array.from(bytes)).toEqual([1, 2, 3]);
  expect(Array.from(event.bytes)).toEqual([9, 8, 3]);
  expect(Object.isFrozen(event)).toBe(true);
  expect(Object.isFrozen(date)).toBe(false);
});

it('preserves sparse arrays and freezes their owned entries', () => {
  const sparse = new Array(4);
  sparse[1] = { value: 'before' };
  const event = snapshotNativeMessageEvent(sparse);
  expect(event).toHaveLength(4);
  expect(0 in event).toBe(false);
  expect(3 in event).toBe(false);
  expect(event[1]).not.toBe(sparse[1]);
  expect(Object.isFrozen(event[1])).toBe(true);
  expect(Object.isFrozen(event)).toBe(true);
});

it('preserves an alias from a shared buffer back to its view', () => {
  const bytes = new Uint8Array([1, 2, 3]);
  const buffer = bytes.buffer as ArrayBuffer & { owner?: Uint8Array };
  buffer.owner = bytes;
  const event = snapshotNativeMessageEvent({ bytes, buffer });
  expect(event.bytes.buffer).toBe(event.buffer);
  expect(event.buffer.owner).toBe(event.bytes);
  expect(event.buffer).not.toBe(buffer);
  event.bytes[0] = 9;
  expect(bytes[0]).toBe(1);
});

it('keeps classes constructable without running them while copying, including subclass new.target', () => {
  let constructions = 0;
  class Widget {
    target: typeof Widget;
    constructor(public label: string) {
      constructions++;
      this.target = new.target;
    }
    render() {
      return this.label;
    }
  }
  const source = Object.assign(Widget, { settings: { value: 'before' } });
  const event = snapshotNativeMessageEvent({
    prototype: source.prototype,
    source,
    alias: source,
  });
  expect(constructions).toBe(0);
  expect(event.source).toBe(event.alias);
  expect(event.source.prototype).toBe(event.prototype);
  const instance = new event.source('label');
  expect(instance.render()).toBe('label');
  expect(instance.target).toBe(source);
  expect(instance).toBeInstanceOf(source);
  expect(instance).toBeInstanceOf(event.source);
  class Child extends event.source {}
  const child = new Child('child');
  expect(child.target).toBe(Child);
  expect(child).toBeInstanceOf(Child);
  expect(child).toBeInstanceOf(event.source);
  expect(event.source.settings).not.toBe(source.settings);
  expect(() => {
    event.source.settings.value = 'after';
  }).toThrow(TypeError);
  expect(source.settings.value).toBe('before');
  expect(Object.isFrozen(source)).toBe(false);
  expect(Object.isFrozen(source.prototype)).toBe(false);
});

it('preserves ordinary constructors, bound constructors and nonconstructable arrows', () => {
  function Widget(this: { label: string }, label: string) {
    this.label = label;
  }
  Widget.prototype.render = function () {
    return this.label;
  };
  const source = {
    Widget,
    bound: Widget.bind(null, 'bound'),
    arrow: () => 'called',
  };
  const event = snapshotNativeMessageEvent(source);
  const Constructor = event.Widget as unknown as new (label: string) => {
    render(): string;
  };
  const Bound = event.bound as unknown as new () => { render(): string };
  expect(new Constructor('ordinary').render()).toBe('ordinary');
  expect(new Constructor('ordinary')).toBeInstanceOf(Widget);
  expect(new Bound().render()).toBe('bound');
  expect(new Bound()).toBeInstanceOf(Bound);
  expect(event.arrow()).toBe('called');
  expect(() => Reflect.construct(event.arrow, [])).toThrow(TypeError);
});

it('leaves objects explicitly returned by a constructor untouched', () => {
  const cached = Object.freeze({ value: 'cached' });
  function Returning() {
    return cached;
  }
  const event = snapshotNativeMessageEvent({ Returning });
  expect(Reflect.construct(event.Returning, [])).toBe(cached);
  expect(Object.getPrototypeOf(cached)).toBe(Object.prototype);
});

it('preserves static methods, accessors and custom instanceof without reading getters during copy', () => {
  let reads = 0;
  class Widget {
    static #value = 4;
    static method() {
      return this.#value;
    }
    static get value() {
      reads++;
      return this.#value;
    }
    static set value(value: number) {
      this.#value = value;
    }
    static receiver() {
      return this;
    }
  }
  Object.defineProperty(Widget, Symbol.hasInstance, {
    enumerable: true,
    value: function (this: unknown) {
      return this === Widget;
    },
  });
  const event = snapshotNativeMessageEvent({ Widget });
  expect(reads).toBe(0);
  expect(event.Widget.name).toBe(Widget.name);
  expect(event.Widget.length).toBe(Widget.length);
  expect(event.Widget.method()).toBe(4);
  expect(event.Widget.value).toBe(4);
  event.Widget.value = 5;
  expect(event.Widget.method()).toBe(5);
  expect(event.Widget.receiver()).toBe(Widget);
  const custom = {};
  expect(event.Widget.receiver.call(custom)).toBe(custom);
  expect({} instanceof event.Widget).toBe(true);
  expect(
    Object.getOwnPropertyDescriptor(event.Widget, 'method').enumerable
  ).toBe(false);
});

it('preserves getter metadata without invoking it while binding the callable', () => {
  function Source() {}
  let reads = 0;
  Object.defineProperty(Source, 'name', {
    configurable: true,
    get: () => {
      reads++;
      return 'source';
    },
  });
  Object.defineProperty(Source, 'length', {
    configurable: true,
    get: () => {
      reads++;
      return 3;
    },
  });
  const event = snapshotNativeMessageEvent({ Source });
  expect(reads).toBe(0);
  expect(event.Source.name).toBe('source');
  expect(event.Source.length).toBe(3);
  expect(reads).toBe(2);
});

it.each([false, true])(
  'links prototype-first aliases without a constructor backlink; callable prototype=%s',
  (callable) => {
    function Source() {}
    const prototype = Object.assign(callable ? function Prototype() {} : {}, {
      method: () => 'method',
      settings: { value: 1 },
    });
    Source.prototype = prototype;
    const event = snapshotNativeMessageEvent({ prototype, Source });
    expect(event.Source.prototype).toBe(event.prototype);
    class Child extends (event.Source as unknown as new () => {
      method(): string;
    }) {}
    const child = new Child();
    expect(child).toBeInstanceOf(Source);
    expect(child).toBeInstanceOf(event.Source);
    expect(child.method()).toBe('method');
    expect(event.prototype.settings).not.toBe(prototype.settings);
    expect(Object.isFrozen(event.prototype.settings)).toBe(true);
    expect(Object.isFrozen(prototype.settings)).toBe(false);
  }
);

it('copies frozen constructors and immutable metadata without violating proxy invariants', () => {
  class Frozen {
    constructor(public value: string) {}
    render() {
      return this.value;
    }
  }
  Object.freeze(Frozen);
  function NoMetadata() {}
  Object.defineProperty(NoMetadata, 'name', {
    configurable: false,
    get: undefined,
  });
  Object.defineProperty(NoMetadata, 'length', {
    configurable: false,
    get: undefined,
  });
  const event = snapshotNativeMessageEvent({ Frozen, NoMetadata });
  expect(new event.Frozen('value').render()).toBe('value');
  expect(event.Frozen.name).toBe(Frozen.name);
  expect(event.Frozen.length).toBe(Frozen.length);
  expect(event.NoMetadata.name).toBeUndefined();
  expect(event.NoMetadata.length).toBeUndefined();
  expect(() => Reflect.construct(event.NoMetadata, [])).not.toThrow();
});

it('keeps unrelated copied function receivers while remapping owning static members', () => {
  class Owner {
    static #value = 7;
    static read() {
      return this.#value;
    }
    static inspect() {
      return this;
    }
  }
  function Other() {}
  function inspect(this: unknown) {
    return this;
  }
  const event = snapshotNativeMessageEvent({ Owner, Other, inspect });
  expect(event.Owner.read()).toBe(7);
  expect(event.Owner.inspect()).toBe(Owner);
  expect(event.inspect.call(event.Other)).toBe(event.Other);
  expect(event.Owner.inspect.call(event.Other)).toBe(event.Other);
  const custom = {};
  expect(event.Owner.inspect.call(custom)).toBe(custom);
});

it('preserves opaque references and APIs without reading their enumerable properties', async () => {
  const key = {};
  const weakMap = new WeakMap([[key, 7]]);
  const weakSet = new WeakSet([key]);
  const promise = Promise.resolve(7);
  const error = new Error('host failure');
  const getter = jest.fn(() => {
    throw new Error('opaque getter');
  });
  Object.defineProperty(weakMap, 'extra', { enumerable: true, get: getter });
  const source = { weakMap, alias: weakMap, weakSet, promise, error };
  const event = snapshotNativeMessageEvent(source);
  expect(event).not.toBe(source);
  expect(Object.isFrozen(event)).toBe(true);
  expect(event.weakMap).toBe(weakMap);
  expect(event.alias).toBe(weakMap);
  expect(event.weakSet).toBe(weakSet);
  expect(event.promise).toBe(promise);
  expect(event.error).toBe(error);
  expect(event.weakMap.get(key)).toBe(7);
  expect(event.weakSet.has(key)).toBe(true);
  await expect(event.promise).resolves.toBe(7);
  event.weakMap.set(key, 8);
  expect(weakMap.get(key)).toBe(8); // Approved opaque-reference exception.
  expect(getter).not.toHaveBeenCalled();
  expect(Object.isFrozen(weakMap)).toBe(false);
});

it('retains cloneable fallback values and does not mistake a spoofed tag for opaque state', () => {
  const buffer = new ArrayBuffer(2);
  const date = new Date(123);
  const regexp = /answer/gi;
  const source = {
    date,
    regexp,
    buffer,
    tagged: { [Symbol.toStringTag]: 'Promise', nested: { value: 1 } },
  };
  const event = snapshotNativeMessageEvent(source);
  expect(event.date).not.toBe(date);
  expect(event.date.getTime()).toBe(123);
  expect(event.regexp).not.toBe(regexp);
  expect(event.regexp.source).toBe(regexp.source);
  expect(event.regexp.flags).toBe(regexp.flags);
  expect(event.buffer).not.toBe(buffer);
  new Uint8Array(event.buffer)[0] = 9;
  expect(new Uint8Array(buffer)[0]).toBe(0);
  expect(event.tagged).not.toBe(source.tagged);
  expect(Object.isFrozen(event.tagged)).toBe(true);
  expect(event.tagged.nested).not.toBe(source.tagged.nested);
});

it('does not mutate an opaque value used as a callable prototype', () => {
  function Host() {}
  const prototype = new WeakMap();
  Host.prototype = prototype;
  const originalParent = Object.getPrototypeOf(prototype);
  const event = snapshotNativeMessageEvent({ Host, prototype });
  expect(event.Host.prototype).toBe(prototype);
  expect(event.prototype).toBe(prototype);
  expect(Object.getPrototypeOf(prototype)).toBe(originalParent);
  expect(Reflect.construct(event.Host, [])).toBeInstanceOf(Host);
});

it.each([Object.prototype, null])(
  'copies and freezes plain records with a readonly opaque-looking tag',
  (prototype) => {
    const tagged = Object.assign(Object.create(prototype), {
      nested: { value: 1 },
    });
    const tagGetter = jest.fn(() => 'Promise');
    Object.defineProperty(tagged, Symbol.toStringTag, { get: tagGetter });
    const event = snapshotNativeMessageEvent({ tagged });
    expect(event.tagged).not.toBe(tagged);
    expect(event.tagged.nested).not.toBe(tagged.nested);
    expect(Object.isFrozen(event.tagged)).toBe(true);
    expect(Object.isFrozen(event.tagged.nested)).toBe(true);
    expect(Object.isFrozen(tagged)).toBe(false);
    expect(tagGetter).not.toHaveBeenCalled();
  }
);

it('isolates shared buffers while retaining aliases between copied views', () => {
  const buffer = new SharedArrayBuffer(8);
  const bytes = new Uint8Array(buffer, 1, 4);
  const view = new DataView(buffer, 2, 2);
  bytes.set([1, 2, 3, 4]);
  const event = snapshotNativeMessageEvent({ bytes, view, buffer });
  expect(event.buffer).not.toBe(buffer);
  expect(event.bytes.buffer).toBe(event.buffer);
  expect(event.view.buffer).toBe(event.buffer);
  expect(event.bytes.byteOffset).toBe(1);
  expect(event.view.byteOffset).toBe(2);
  expect(event.view.byteLength).toBe(2);
  event.bytes[1] = 9;
  expect(event.view.getUint8(0)).toBe(9);
  expect(bytes[1]).toBe(2);
  event.view.setUint8(1, 8);
  expect(event.bytes[2]).toBe(8);
  expect(bytes[2]).toBe(3);
});

it('copies boxed strings with immutable indices and owned custom fields', () => {
  const shared = { value: 'before' };
  const boxed = Object.assign(
    Object('text') as { valueOf(): string; [index: number]: string },
    { shared }
  );
  const event = snapshotNativeMessageEvent({ boxed, shared });
  expect(event.boxed).not.toBe(boxed);
  expect(event.boxed.valueOf()).toBe('text');
  expect(event.boxed[0]).toBe('t');
  expect(Object.getOwnPropertyDescriptor(event.boxed, '0')).toEqual(
    Object.getOwnPropertyDescriptor(boxed, '0')
  );
  expect(event.boxed.shared).toBe(event.shared);
  expect(event.shared).not.toBe(shared);
  expect(() => {
    event.boxed.shared.value = 'after';
  }).toThrow(TypeError);
  expect(shared.value).toBe('before');
});

it('copies foreign collection entries in the same snapshot graph', () => {
  const source = runInNewContext(`(() => {
    const key = { value: 'before' };
    return { key, map: new Map([[key, key]]), set: new Set([key]) };
  })()`) as {
    key: { value: string };
    map: Map<object, object>;
    set: Set<object>;
  };
  expect(source.map instanceof Map).toBe(false);
  expect(source.set instanceof Set).toBe(false);
  const event = snapshotNativeMessageEvent(source);
  expect(event.map.get(event.key)).toBe(event.key);
  expect(event.map.has(source.key)).toBe(false);
  expect(event.set.has(event.key)).toBe(true);
  expect(event.set.has(source.key)).toBe(false);
  expect(() => {
    (event.map.keys().next().value as { value: string }).value = 'after';
  }).toThrow(TypeError);
  event.map.clear();
  event.set.clear();
  expect(source.map.get(source.key)).toBe(source.key);
  expect(source.set.has(source.key)).toBe(true);
  expect(source.key.value).toBe('before');
});

it('keeps the bounds and shared-buffer links of a foreign DataView', () => {
  const source = runInNewContext(`(() => {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer, 2, 2);
    view.setUint8(0, 7);
    return { view, buffer };
  })()`) as { view: DataView; buffer: ArrayBuffer };
  expect(source.view instanceof DataView).toBe(false);
  const event = snapshotNativeMessageEvent(source);
  expect(event.view.buffer).toBe(event.buffer);
  expect(event.buffer).not.toBe(source.buffer);
  expect(event.view.byteOffset).toBe(2);
  expect(event.view.byteLength).toBe(2);
  expect(event.view.getUint8(0)).toBe(7);
  expect(() => event.view.getUint8(2)).toThrow(RangeError);
  event.view.setUint8(0, 9);
  expect(source.view.getUint8(0)).toBe(7);
});

it.each([
  [ArrayBuffer, 'resizable', 'resize'],
  [SharedArrayBuffer, 'growable', 'grow'],
] as const)(
  'retains the %s backing buffer growth API without sharing memory',
  (BufferConstructor, flexible, changeLength) => {
    const buffer = Reflect.construct(BufferConstructor, [
      4,
      { maxByteLength: 8 },
    ]);
    const bytes = new Uint8Array(buffer, 0, 4);
    bytes[0] = 7;
    const event = snapshotNativeMessageEvent({ buffer, bytes });
    expect(event.buffer).not.toBe(buffer);
    expect(event.buffer[flexible]).toBe(true);
    expect(event.buffer.maxByteLength).toBe(8);
    expect(event.bytes.buffer).toBe(event.buffer);
    event.buffer[changeLength](8);
    expect(event.buffer.byteLength).toBe(8);
    expect(buffer.byteLength).toBe(4);
    event.bytes[0] = 9;
    expect(bytes[0]).toBe(7);
  }
);

it.each([
  [ArrayBuffer, 'resizable', 'resize'],
  [SharedArrayBuffer, 'growable', 'grow'],
] as const)(
  'captures fixed bounds for length-tracking views over a %s buffer',
  (BufferConstructor, flexible, changeLength) => {
    const buffer = Reflect.construct(BufferConstructor, [
      4,
      { maxByteLength: 8 },
    ]);
    const bytes = new Uint8Array(buffer, 1);
    const view = new DataView(buffer, 2);
    bytes.set([1, 2, 3]);
    const event = snapshotNativeMessageEvent({ bytes, view, buffer });
    expect(event.buffer).not.toBe(buffer);
    expect(event.buffer[flexible]).toBe(true);
    expect(event.buffer.maxByteLength).toBe(8);
    expect(event.bytes.buffer).toBe(event.buffer);
    expect(event.view.buffer).toBe(event.buffer);
    expect(event.bytes.byteOffset).toBe(1);
    expect(event.bytes.length).toBe(3);
    expect(event.view.byteOffset).toBe(2);
    expect(event.view.byteLength).toBe(2);

    event.buffer[changeLength](8);
    expect(event.buffer.byteLength).toBe(8);
    expect(event.bytes.byteOffset).toBe(1);
    expect(event.bytes.length).toBe(3);
    expect(event.view.byteOffset).toBe(2);
    expect(event.view.byteLength).toBe(2);
    expect(() => event.view.getUint8(2)).toThrow(RangeError);
    event.bytes[1] = 9;
    expect(event.view.getUint8(0)).toBe(9);
    event.view.setUint8(1, 8);
    expect(event.bytes[2]).toBe(8);
    expect(buffer.byteLength).toBe(4);
    expect(bytes.length).toBe(3);
    expect(view.byteLength).toBe(2);
    expect(Array.from(new Uint8Array(buffer))).toEqual([0, 1, 2, 3]);
  }
);

it.each([ArrayBuffer, SharedArrayBuffer])(
  'copies a real %s buffer whose display tag looks like an ordinary object',
  (BufferConstructor) => {
    const buffer = new BufferConstructor(4);
    Object.defineProperty(buffer, Symbol.toStringTag, { value: 'Object' });
    const bytes = new Uint8Array(buffer);
    bytes[0] = 7;
    const event = snapshotNativeMessageEvent({ bytes, buffer });
    expect(event.buffer).not.toBe(buffer);
    expect(event.bytes.buffer).toBe(event.buffer);
    expect(event.bytes[0]).toBe(7);
    event.bytes[0] = 9;
    expect(bytes[0]).toBe(7);
  }
);

it.each([false, true])(
  'retains opaque values despite an Object display tag; foreign realm=%s',
  async (foreign) => {
    const source = (
      foreign
        ? runInNewContext(`({
          weakMap: new WeakMap(),
          weakSet: new WeakSet(),
          promise: Promise.resolve(7),
          error: new Error('host error'),
          typeError: new TypeError('host type error'),
          aggregateError: new AggregateError([], 'host aggregate error'),
          customError: new (class extends TypeError {})('host subclass'),
        })`)
        : {
            weakMap: new WeakMap(),
            weakSet: new WeakSet(),
            promise: Promise.resolve(7),
            error: new Error('host error'),
            typeError: new TypeError('host type error'),
            aggregateError: new AggregateError([], 'host aggregate error'),
            customError: new (class extends TypeError {})('host subclass'),
          }
    ) as {
      weakMap: WeakMap<object, unknown>;
      weakSet: WeakSet<object>;
      promise: Promise<number>;
      error: Error;
      typeError: TypeError;
      aggregateError: AggregateError;
      customError: TypeError;
    };
    const getter = jest.fn(() => {
      throw new Error('opaque getter');
    });
    for (const value of Object.values(source)) {
      Object.defineProperty(value, Symbol.toStringTag, { value: 'Object' });
      Object.defineProperty(value, 'extra', { enumerable: true, get: getter });
    }
    const event = snapshotNativeMessageEvent(source);
    for (const key of Object.keys(source) as (keyof typeof source)[]) {
      expect(event[key]).toBe(source[key]);
      expect(Object.isFrozen(source[key])).toBe(false);
    }
    const key = {};
    event.weakMap.set(key, 9);
    event.weakSet.add(key);
    expect(source.weakMap.get(key)).toBe(9);
    expect(source.weakSet.has(key)).toBe(true);
    await expect(event.promise).resolves.toBe(7);
    expect(event.error.message).toBe('host error');
    expect(getter).not.toHaveBeenCalled();
  }
);

it('carries native origin only to equal copied content', () => {
  const source = fixture();
  retainNativeMessageOrigin(source.message);
  const copied = fixture();
  copied.message.history = { timestamp: 1 };
  retainCopiedNativeMessageOrigin(source.message, copied.message);
  expect(
    Object.isFrozen(
      prepareReasoningMessageEvent(copied.message, copied.localItem).message
    )
  ).toBe(true);
  const changed = fixture();
  changed.localItem.item.user_defined.value = 'legacy';
  retainCopiedNativeMessageOrigin(source.message, changed.message);
  expect(
    prepareReasoningMessageEvent(changed.message, changed.localItem).message
  ).toBe(changed.message);
  const legacy = fixture();
  const legacyCopy = fixture();
  retainCopiedNativeMessageOrigin(legacy.message, legacyCopy.message);
  expect(
    prepareReasoningMessageEvent(legacyCopy.message, legacyCopy.localItem)
      .message
  ).toBe(legacyCopy.message);
});

it('copies ordinary class data despite an opaque-looking display tag', () => {
  class Payload {
    nested = { value: 'before' };
  }
  const payload = new Payload();
  Object.defineProperty(payload, Symbol.toStringTag, { value: 'Promise' });
  const event = snapshotNativeMessageEvent({ payload });
  expect(event.payload).not.toBe(payload);
  expect(event.payload).toBeInstanceOf(Payload);
  expect(event.payload.nested).not.toBe(payload.nested);
  expect(Object.isFrozen(event.payload)).toBe(true);
  expect(Object.isFrozen(event.payload.nested)).toBe(true);
  expect(Object.isFrozen(payload)).toBe(false);
});
