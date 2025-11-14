/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * React 19 + @lit/react fail to mirror props onto custom-element instances
 * when running under happy-dom (or any DOM shim without native property
 * reflection). Production browsers still work, which is why the demo site
 * renders markdown just fine, but our Jest environment never sees the text.
 *
 * This helper wraps the generated React component and explicitly assigns
 * every non-reserved prop to the underlying DOM node. That ensures Lit
 * receives updated properties even when the platform doesn’t wire them.
 */

import React from "react";

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

function mergeRefs<T>(
  ...refs: Array<React.Ref<T> | undefined | null>
): React.RefCallback<T> {
  return (value: T | null) => {
    for (const ref of refs) {
      if (!ref) {
        continue;
      }
      if (typeof ref === "function") {
        ref(value);
      } else {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    }
  };
}

/**
 * Wrap a Lit `createComponent` result so that every prop is mirrored onto
 * the underlying custom element as a property. This is required for happy-dom
 * (and React 19) where the upstream @lit/react bridge fails to flush props.
 */
export function withWebComponentBridge<
  P extends Record<string, unknown>,
  E extends Element = HTMLElement,
>(
  Component: React.ForwardRefExoticComponent<
    React.PropsWithoutRef<P> & React.RefAttributes<E>
  >,
) {
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
          if ((element as any)[key] !== value) {
            (element as any)[key] = value;
          }
        } catch {
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

    return <Component {...props} ref={mergedRef} />;
  });

  Bridged.displayName =
    Component.displayName ||
    Component.name ||
    "CarbonAIChatWebComponentWrapper";

  return Bridged;
}
