/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { jsx } from 'react/jsx-runtime';
import React from 'react';

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
function mergeRefs(...refs) {
    return (value) => {
        // Propagate the element to every provided ref.
        for (const ref of refs) {
            if (!ref) {
                continue;
            }
            // Support both callback refs and mutable ref objects.
            if (typeof ref === "function") {
                ref(value);
            }
            else {
                ref.current = value;
            }
        }
    };
}
/**
 * Wrap a Lit `createComponent` result so that every prop is mirrored onto the underlying custom element as a property.
 */
function withWebComponentBridge(Component) {
    const Bridged = React.forwardRef((props, forwardedRef) => {
        const hostRef = React.useRef(null);
        const mergedRef = React.useMemo(() => mergeRefs(hostRef, forwardedRef), [forwardedRef]);
        React.useLayoutEffect(() => {
            const element = hostRef.current;
            if (!element) {
                return;
            }
            Object.entries(props).forEach(([key, value]) => {
                if (REACT_RESERVED_PROPS.has(key)) {
                    return;
                }
                const isEventProp = key.startsWith("on") &&
                    key.length > 2 &&
                    key[2] === key[2].toUpperCase();
                if (isEventProp) {
                    // @lit/react already wires events when the prop follows the onEvent
                    // convention. Avoid double-binding here.
                    return;
                }
                try {
                    // Prefer property assignment so Lit receives non-string values.
                    if (element[key] !== value) {
                        element[key] = value;
                    }
                }
                catch {
                    // Fallback to attribute updates when property writes fail (readonly or unsupported props).
                    if (value === null || value === undefined || value === false) {
                        element.removeAttribute(key);
                    }
                    else if (value === true) {
                        element.setAttribute(key, "");
                    }
                    else {
                        element.setAttribute(key, String(value));
                    }
                }
            });
        }, [props]);
        return jsx(Component, { ...props, ref: mergedRef });
    });
    Bridged.displayName =
        Component.displayName ||
            Component.name ||
            "CarbonAIChatWebComponentWrapper";
    return Bridged;
}

export { withWebComponentBridge };
//# sourceMappingURL=withWebComponentBridge.js.map
