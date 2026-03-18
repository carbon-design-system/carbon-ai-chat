/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * React 19 + @lit/react stop reliably flushing props to custom elements in DOM shims (happy-dom/jsdom)
 * because they lack property reflection and upgrade timing. Browsers are fine, but tests only pass string
 * attributes so Lit never sees updated properties. This bridge mirrors every non-reserved prop onto the
 * custom element instance so Lit receives the real values and behaves the same in shims and browsers until
 * upstream fixes land.
 *
 * Set `AICHAT_DISABLE_WEB_COMPONENT_BRIDGE=true` to make this a no-op (handy for verifying whether the
 * workaround is still required).
 */

import React from "react";

// React-managed props that should never be forwarded to the host element.
const REACT_RESERVED_PROPS = new Set([
  "children",
  "className",
  "style",
  "slot",
  "key",
  "ref",
  "suppressContentEditableWarning",
  "suppressHydrationWarning",
  "dangerouslySetInnerHTML",
]);

// Merge forwardedRef with our internal host ref so both the wrapper and callers observe the same element.
function mergeRefs<T>(
  ...refs: Array<React.Ref<T> | undefined | null>
): React.RefCallback<T> {
  return (value: T | null) => {
    // Propagate the element to every provided ref.
    for (const ref of refs) {
      if (!ref) {
        continue;
      }
      // Support both callback refs and mutable ref objects.
      if (typeof ref === "function") {
        ref(value);
      } else {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    }
  };
}

// Set shouldEnableBridge to false to check if we actually need this.
const shouldEnableBridge = true;

/**
 * Wrap a Lit `createComponent` result so that every prop is mirrored onto the underlying custom element as a property.
 */
export function withWebComponentBridge<
  P extends Record<string, unknown>,
  E extends Element = HTMLElement,
>(
  Component: React.ForwardRefExoticComponent<
    React.PropsWithoutRef<P> & React.RefAttributes<E>
  >,
) {
  // Set shouldEnableBridge to false to check if we actually need this.
  if (!shouldEnableBridge) {
    return Component;
  }

  const Bridged = React.forwardRef<E, P>((props, forwardedRef) => {
    const hostRef = React.useRef<E | null>(null);
    const mergedRef = React.useMemo(
      () => mergeRefs(hostRef, forwardedRef),
      [forwardedRef],
    );

    React.useLayoutEffect(() => {
      const element = hostRef.current;
      if (!element) {
        return;
      }

      Object.entries(props).forEach(([key, value]) => {
        if (REACT_RESERVED_PROPS.has(key)) {
          return;
        }

        const isEventProp =
          key.startsWith("on") &&
          key.length > 2 &&
          key[2] === key[2].toUpperCase();

        if (isEventProp) {
          // @lit/react already wires events when the prop follows the onEvent
          // convention. Avoid double-binding here.
          return;
        }

        try {
          // Prefer property assignment so Lit receives non-string values.
          if ((element as any)[key] !== value) {
            (element as any)[key] = value;
          }
        } catch {
          // Fallback to attribute updates when property writes fail (readonly or unsupported props).
          if (value === null || value === undefined || value === false) {
            element.removeAttribute(key);
          } else if (value === true) {
            element.setAttribute(key, "");
          } else {
            element.setAttribute(key, String(value));
          }
        }
      });
    }, [props]);

    // Filter out any props that might cause issues with rendering
    // Ensure the component never returns undefined by wrapping in a fragment
    const result = <Component {...props} ref={mergedRef} />;
    return result ?? null;
  });

  Bridged.displayName =
    Component.displayName ||
    Component.name ||
    "CarbonAIChatWebComponentWrapper";

  return Bridged;
}
