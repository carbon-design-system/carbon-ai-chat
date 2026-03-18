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
 * The bridge automatically detects test environments (happy-dom/jsdom) and only activates there.
 * Set `AICHAT_DISABLE_WEB_COMPONENT_BRIDGE=true` to force disable (handy for verifying whether the
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

/**
 * Detects if we're running in a DOM shim (happy-dom/jsdom) vs a real browser.
 * The bridge is only needed in DOM shims where Web Components don't work properly.
 */
function isInTestEnvironment(): boolean {
  // Explicit override to disable
  if (
    typeof process !== "undefined" &&
    process.env?.AICHAT_DISABLE_WEB_COMPONENT_BRIDGE === "true"
  ) {
    return false;
  }

  // Check for happy-dom (most reliable for happy-dom detection)
  if (typeof window !== "undefined" && (window as any).happyDOM) {
    return true;
  }

  // Check for jsdom via navigator.userAgent
  if (
    typeof navigator !== "undefined" &&
    navigator.userAgent?.includes("jsdom")
  ) {
    return true;
  }

  // Check for Jest environment variable
  if (
    typeof process !== "undefined" &&
    process.env?.JEST_WORKER_ID !== undefined
  ) {
    return true;
  }

  // Check if we're in Node.js with test environment
  if (
    typeof process !== "undefined" &&
    process.versions?.node &&
    process.env?.NODE_ENV === "test"
  ) {
    return true;
  }

  // Fallback: check if we're in a Node.js environment at all
  // (real browsers don't have process.versions)
  if (typeof process !== "undefined" && process.versions?.node) {
    return true;
  }

  return false;
}

const shouldEnableBridge = isInTestEnvironment();

/**
 * Wrap a Lit `createComponent` result so that every prop is mirrored onto the underlying custom element as a property.
 * This wrapper uses a generic type that preserves component compatibility across React 17-19.
 * The return type is intentionally loose to avoid breaking existing code that relies on flexible prop types.
 */
export function withWebComponentBridge<C extends React.ComponentType<any>>(
  Component: C,
): React.ComponentType<any> {
  // Early return if bridge is disabled (production browsers)
  if (!shouldEnableBridge) {
    return Component;
  }

  // eslint-disable-next-line react/display-name
  const Bridged = React.forwardRef((props: any, forwardedRef: any) => {
    const hostRef = React.useRef<Element | null>(null);
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
  }) as unknown as React.ComponentType<any>;

  Bridged.displayName =
    (Component as any).displayName ||
    (Component as any).name ||
    "CarbonAIChatWebComponentWrapper";

  return Bridged;
}
