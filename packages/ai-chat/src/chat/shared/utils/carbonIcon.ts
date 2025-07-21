/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Converts a Carbon icon module to a React component
 */

import { createElement, FunctionComponent } from 'react';


/**
 * Props type for Carbon Icon React components
 * Extends standard SVG props with optional ARIA attributes
 */
type CarbonIconProps = React.SVGProps<SVGSVGElement> & {
  'aria-label'?: string;
  'aria-hidden'?: boolean | 'false' | 'true';
};

/**
 * Converts a Carbon SVG icon to a React component.
 * 
 * @param iconModule - Must be imported from '@carbon/icons' (e.g. '@carbon/icons/es/add/16')
 * @returns React component that renders the SVG icon
 */
export function carbonIconToReact(
  iconModule: { toString: () => string }
): FunctionComponent<CarbonIconProps> {
  const svgString = iconModule.toString();
  if (!svgString.trim().startsWith('<svg')) {
    throw new Error('Invalid SVG input: String does not start with <svg> tag');
  }
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
  const svg = doc.querySelector('svg')!;
  if (!svg) {
      throw new Error('No SVG element found in the input');
  }
  if (!svg.innerHTML || svg.innerHTML.trim().length === 0) {
      throw new Error('Empty SVG content');
  }
  const baseProps = Object.fromEntries(
    Array.from(svg.attributes).map(attr => [attr.name, attr.value])
  );
  return (props = {}) => {
    return createElement('svg', {
      ...baseProps,
      ...props,
      'aria-hidden': props['aria-label'] ? undefined : props['aria-hidden'] ?? true,
      dangerouslySetInnerHTML: { __html: svg.innerHTML }
    });
  };
}