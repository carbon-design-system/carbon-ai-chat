/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useMemo } from "react";

/**
 * Hook for generating CSS custom properties from any valid CSS properties object.
 * Converts camelCase React CSS properties to kebab-case CSS custom properties
 * that can be safely used across shadow DOM boundaries.
 *
 * @param styles - Object containing CSS properties with calculated values
 * @returns Object suitable for React's style prop containing CSS custom properties
 */
const useDynamicCSSProperties = (
  styles: Record<string, string | number | undefined>
) => {
  return useMemo(() => {
    const customProperties: Record<string, string | number> = {};

    Object.entries(styles).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Convert camelCase to kebab-case for CSS custom properties
        const kebabKey = key.replace(
          /[A-Z]/g,
          (letter) => `-${letter.toLowerCase()}`
        );
        customProperties[`--${kebabKey}`] = value;
      }
    });

    return customProperties as React.CSSProperties;
  }, [styles]);
};

export { useDynamicCSSProperties };
