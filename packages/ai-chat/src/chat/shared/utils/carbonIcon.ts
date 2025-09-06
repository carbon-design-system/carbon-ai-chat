/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Creates a React component from a Carbon icon object
 */

import { createElement, FunctionComponent } from "react";

type CarbonIcon = {
  elem: "svg";
  attrs: {
    viewBox: string;
    width?: number;
    height?: number;
    fill?: string;
    [key: string]: unknown;
  };
  content: Array<{
    elem: string;
    attrs?: Record<string, string | number>;
  }>;
};

export type CarbonIconProps = React.SVGProps<SVGSVGElement> & {
  slot?: string;
  [key: string]: unknown;
};

function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function transformProps(
  props: Record<string, unknown>,
): Record<string, unknown> {
  const transformed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    // Keep aria-* and data-* attributes in kebab-case as React expects them
    if (key.startsWith("aria-") || key.startsWith("data-")) {
      transformed[key] = value;
    } else {
      const camelKey = kebabToCamel(key);
      transformed[camelKey] = value;
    }
  }
  return transformed;
}

/**
 * Creates a React component from a Carbon icon object.
 *
 * @example
 * import Launch16 from '@carbon/icons/es/launch/16';
 * const Icon = carbonIconToReact(Launch16);
 * <Icon aria-label="Launch" className="icon" strokeWidth={2} />
 */

export function carbonIconToReact(
  icon: CarbonIcon,
): FunctionComponent<CarbonIconProps> {
  return function IconComponent(props = {}) {
    const transformedProps = transformProps(props as Record<string, unknown>);

    return createElement(
      "svg",
      {
        ...icon.attrs,
        width: icon.attrs.width || 16,
        height: icon.attrs.height || 16,
        fill: icon.attrs.fill || "currentColor",
        ...transformedProps,
      },
      icon.content.map((child, i) =>
        createElement(child.elem, {
          key: i,
          ...transformProps(child.attrs || {}),
        }),
      ),
    );
  };
}
