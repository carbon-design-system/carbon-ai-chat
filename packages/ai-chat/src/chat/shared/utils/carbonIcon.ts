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

type CarbonIconProps = React.SVGProps<SVGSVGElement> & {
  slot?: string; // Only add this line
};

/**
 * Creates a React component from a Carbon icon object.
 *
 * @example
 * import Launch16 from '@carbon/icons/es/launch/16';
 * const Icon = carbonIconToReact(Launch16);
 * <Icon aria-label="Launch" className="icon" />
 */

export function carbonIconToReact(
  icon: CarbonIcon
): FunctionComponent<CarbonIconProps> {
  return function IconComponent(props = {}) {
    return createElement(
      "svg",
      {
        ...icon.attrs,
        width: icon.attrs.width || 16,
        height: icon.attrs.height || 16,
        fill: icon.attrs.fill || "currentColor",
        ...props,
      },
      icon.content.map((child, i) =>
        createElement(child.elem, {
          key: i,
          ...child.attrs,
        })
      )
    );
  };
}
