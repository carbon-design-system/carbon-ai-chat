/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Explicit registration for custom element classes. Existing components still
 * register through their decorators when imported.
 */

/** A custom element constructor whose static `is` supplies its default tag. */
export interface CarbonCustomElementConstructor extends CustomElementConstructor {
  /** The default tag name for this class. */
  is: string;
}

/** Options for {@link defineCustomElement}. */
export interface DefineCustomElementOptions {
  /** The tag to register. Defaults to the class's static `is`. */
  name?: string;
  /** The registry to use. Defaults to the global `customElements` registry. */
  registry?: CustomElementRegistry;
}

function isDevelopment(): boolean {
  try {
    return process.env.NODE_ENV === 'development';
  } catch {
    // Raw browser ESM has no process global; bundlers replace the expression.
    return false;
  }
}

/**
 * Registers a custom element class under its static `is` or an explicit name.
 * Without either name, it returns the class without registering it.
 *
 * Registering the same class under the same name is a no-op. If another class
 * owns the name, the first definition stays and development builds warn.
 * The return value is still the attempted class; use `registry.get(name)` to
 * check which class owns a name.
 *
 * If the class already has another name in this registry, a subclass is
 * registered under the new name. Instances remain `instanceof` the input
 * class, and the subclass's own static `is` contains the new name.
 * Other registration errors propagate.
 *
 * @param clazz The class to register.
 * @param options The name and registry to use.
 * @returns The input class, including on collision, or the registered subclass
 * when the input class already has another name.
 */
export const defineCustomElement = <
  T extends CustomElementConstructor & { is?: string },
>(
  clazz: T,
  options: DefineCustomElementOptions = {}
): T => {
  const name = options.name ?? clazz.is;
  if (!name) {
    return clazz;
  }

  const registry = options.registry ?? customElements;
  const existing = registry.get(name);
  if (existing) {
    if (existing !== clazz && isDevelopment()) {
      globalThis.console?.warn(
        `[@carbon/ai-chat-components] <${name}> is already defined by a different ` +
          `class. This usually means more than one copy of ` +
          `@carbon/ai-chat-components is on the page; the first definition wins and ` +
          `components may mix versions. Deduplicate the dependency, or register ` +
          `into a scoped registry.`
      );
    }
    return clazz;
  }

  try {
    registry.define(name, clazz as unknown as CustomElementConstructor);
  } catch (error) {
    if (
      error == null ||
      (error as { name?: string }).name !== 'NotSupportedError'
    ) {
      throw error;
    }

    // A registry accepts each constructor only once, so aliases need a subclass.
    const ScopedElement = class extends (clazz as unknown as CustomElementConstructor) {};
    Object.defineProperty(ScopedElement, 'is', { value: name });
    registry.define(name, ScopedElement);
    return ScopedElement as unknown as T;
  }

  return clazz;
};

export default defineCustomElement;
