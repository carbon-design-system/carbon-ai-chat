/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect } from '@open-wc/testing';
import defaultDefineCustomElement, {
  defineCustomElement,
} from '@carbon/ai-chat-components/es/globals/register.js';

let sequence = 0;
function nextName(): string {
  return `test-register-${++sequence}`;
}

describe('defineCustomElement', () => {
  let originalProcess: PropertyDescriptor | undefined;
  let originalWarn: typeof console.warn;
  let warnings: unknown[][];

  beforeEach(() => {
    originalProcess = Object.getOwnPropertyDescriptor(globalThis, 'process');
    Object.defineProperty(globalThis, 'process', {
      configurable: true,
      writable: true,
      value: { env: { NODE_ENV: 'development' } },
    });
    originalWarn = console.warn;
    warnings = [];
    console.warn = (...args) => warnings.push(args);
  });

  afterEach(() => {
    console.warn = originalWarn;
    if (originalProcess) {
      Object.defineProperty(globalThis, 'process', originalProcess);
    } else {
      Reflect.deleteProperty(globalThis, 'process');
    }
  });

  it('exports the same function as the default and named helper', () => {
    expect(defaultDefineCustomElement).to.equal(defineCustomElement);
  });

  it('uses static is and the current global registry by default', () => {
    class Example extends HTMLElement {
      static is = nextName();
    }
    expect(defineCustomElement(Example)).to.equal(Example);
    expect(customElements.get(Example.is)).to.equal(Example);
    expect(document.createElement(Example.is)).to.be.instanceOf(Example);
  });

  it('accepts an explicit name for a class without static is', () => {
    class Example extends HTMLElement {}
    const name = nextName();
    expect(defineCustomElement(Example, { name })).to.equal(Example);
    expect(customElements.get(name)).to.equal(Example);
  });

  it('registers into an injected registry without defining a global tag', () => {
    const iframe = document.createElement('iframe');
    document.body.append(iframe);
    try {
      const registry = iframe.contentWindow!.customElements;
      class Example extends HTMLElement {
        static is = nextName();
      }
      expect(defineCustomElement(Example, { registry })).to.equal(Example);
      expect(registry.get(Example.is)).to.equal(Example);
      expect(customElements.get(Example.is)).to.equal(undefined);
    } finally {
      iframe.remove();
    }
  });

  it('registers the same class twice without warning or replacing it', () => {
    class Example extends HTMLElement {
      static is = nextName();
    }
    expect(defineCustomElement(Example)).to.equal(Example);
    expect(defineCustomElement(Example)).to.equal(Example);
    expect(customElements.get(Example.is)).to.equal(Example);
    expect(warnings).to.have.length(0);
  });

  it('retains the first class but returns the attempted class on collision', () => {
    const name = nextName();
    class First extends HTMLElement {}
    class Attempted extends HTMLElement {}
    defineCustomElement(First, { name });
    expect(defineCustomElement(Attempted, { name })).to.equal(Attempted);
    expect(customElements.get(name)).to.equal(First);
    expect(warnings).to.have.length(1);
    expect(warnings[0][0]).to.include(name);
    expect(warnings[0][0]).to.include('@carbon/ai-chat-components');
  });

  it('returns and registers a subclass when a constructor needs an alias', () => {
    class Example extends HTMLElement {
      static is = nextName();
    }
    defineCustomElement(Example);
    const name = nextName();
    const Alias = defineCustomElement(Example, { name });
    expect(Alias).not.to.equal(Example);
    expect(customElements.get(name)).to.equal(Alias);
    expect(customElements.get(Example.is)).to.equal(Example);
    expect(Object.prototype.hasOwnProperty.call(Alias, 'is')).to.equal(true);
    expect(Alias.is).to.equal(name);
    expect(new Alias()).to.be.instanceOf(Example);
    expect(warnings).to.have.length(0);
  });

  it('does not consult the registry when both names are missing', () => {
    class Example extends HTMLElement {}
    const registry = {
      get() {
        throw new Error('The registry must not be consulted.');
      },
      define() {
        throw new Error('The class must not be registered.');
      },
    } as unknown as CustomElementRegistry;
    expect(defineCustomElement(Example, { registry })).to.equal(Example);
  });

  it('treats an explicit empty name as missing instead of using static is', () => {
    class Example extends HTMLElement {
      static is = nextName();
    }
    expect(defineCustomElement(Example, { name: '' })).to.equal(Example);
    expect(customElements.get(Example.is)).to.equal(undefined);
  });

  for (const mode of ['production', undefined]) {
    it(`does not warn on collisions when NODE_ENV is ${String(mode)}`, () => {
      process.env.NODE_ENV = mode;
      const name = nextName();
      class First extends HTMLElement {}
      class Attempted extends HTMLElement {}
      defineCustomElement(First, { name });
      expect(defineCustomElement(Attempted, { name })).to.equal(Attempted);
      expect(customElements.get(name)).to.equal(First);
      expect(warnings).to.have.length(0);
    });
  }

  it('keeps the first class without throwing when process is absent', () => {
    Reflect.deleteProperty(globalThis, 'process');
    const name = nextName();
    class First extends HTMLElement {}
    class Attempted extends HTMLElement {}
    defineCustomElement(First, { name });
    expect(defineCustomElement(Attempted, { name })).to.equal(Attempted);
    expect(customElements.get(name)).to.equal(First);
    expect(warnings).to.have.length(0);
  });

  it('propagates errors from registry lookup', () => {
    class Example extends HTMLElement {}
    const failure = new Error('Registry lookup failed.');
    const registry = {
      get() {
        throw failure;
      },
    } as unknown as CustomElementRegistry;
    expect(() =>
      defineCustomElement(Example, { name: nextName(), registry })
    ).to.throw(failure);
  });

  for (const failure of [new Error('Definition failed.'), null, undefined]) {
    it(`propagates non-NotSupportedError failures, including ${String(failure)}`, () => {
      class Example extends HTMLElement {}
      const registry = {
        get() {
          return undefined;
        },
        define() {
          throw failure;
        },
      } as unknown as CustomElementRegistry;
      let threw = false;
      try {
        defineCustomElement(Example, { name: nextName(), registry });
      } catch (error) {
        threw = true;
        expect(error).to.equal(failure);
      }
      expect(threw).to.equal(true);
    });
  }

  it('propagates a failure when the alias registration also fails', () => {
    class Example extends HTMLElement {}
    const failure = new Error('Alias registration failed.');
    let attempts = 0;
    const registry = {
      get() {
        return undefined;
      },
      define() {
        attempts++;
        if (attempts === 1) {
          throw new DOMException(
            'Constructor already registered.',
            'NotSupportedError'
          );
        }
        throw failure;
      },
    } as unknown as CustomElementRegistry;
    expect(() =>
      defineCustomElement(Example, { name: nextName(), registry })
    ).to.throw(failure);
    expect(attempts).to.equal(2);
  });
});
