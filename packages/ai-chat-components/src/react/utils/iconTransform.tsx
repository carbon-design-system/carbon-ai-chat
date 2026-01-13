/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Icon Transformation Utility
 *
 * This module provides utilities to transform React icon components from @carbon/icons-react
 * into the CarbonIcon descriptor format used by @carbon/icons. This enables React developers
 * to use their familiar React icon components while maintaining compatibility with web components
 * that expect the plain JavaScript CarbonIcon format.
 *
 * Key features:
 * - Automatic transformation of React icon components to CarbonIcon descriptors
 * - No-op pass-through for CarbonIcon objects (already in correct format)
 * - Global caching to prevent redundant transformations
 * - Type guards for runtime icon format detection
 * - Support for forwardRef and memo-wrapped components
 *
 * Usage:
 * ```tsx
 * import { Add } from '@carbon/icons-react';
 * import { transformReactIconToCarbonIcon } from './iconTransform';
 *
 * const carbonIcon = transformReactIconToCarbonIcon(Add);
 * // carbonIcon is now in CarbonIcon format, ready for web components
 * ```
 */

import React from "react";
import { CarbonIcon } from "@carbon/web-components/es/globals/internal/icon-loader-utils";

// Global cache for transformed icons using WeakMap to key by component reference
const iconCache = new WeakMap<
  React.ComponentType<any>,
  Map<number, CarbonIcon>
>();

/**
 * Type guard to detect if icon is already a CarbonIcon descriptor.
 * If true, the icon should be passed through unchanged (no-op).
 */
export function isCarbonIcon(icon: any): icon is CarbonIcon {
  return Boolean(
    icon &&
    typeof icon === "object" &&
    "elem" in icon &&
    "attrs" in icon &&
    "content" in icon &&
    icon.elem === "svg",
  );
}

/**
 * Transforms a React icon component to CarbonIcon format.
 * Returns the icon unchanged if it's already a CarbonIcon (no-op).
 * Caches results to avoid repeated transformations.
 */
export function transformReactIconToCarbonIcon(
  icon: CarbonIcon | React.ComponentType<any>,
  size = 16,
): CarbonIcon {
  // No-op: If already a CarbonIcon, return unchanged
  if (isCarbonIcon(icon)) {
    return icon;
  }

  const ReactIcon = icon as React.ComponentType<any>;

  // Get or create size map for this component
  let sizeMap = iconCache.get(ReactIcon);
  if (!sizeMap) {
    sizeMap = new Map<number, CarbonIcon>();
    iconCache.set(ReactIcon, sizeMap);
  }

  // Return cached result if available for this size
  const cached = sizeMap.get(size);
  if (cached) {
    return cached;
  }

  try {
    // Call the React component to get the React element
    const element = React.createElement(ReactIcon, { size });

    // Extract CarbonIcon descriptor from React element
    const descriptor = extractCarbonIconFromReactElement(element, size);

    // Validate descriptor
    if (!isValidCarbonIcon(descriptor)) {
      throw new Error("Generated descriptor is invalid");
    }

    // Cache and return
    sizeMap.set(size, descriptor);
    return descriptor;
  } catch (error) {
    const iconName = ReactIcon.displayName || ReactIcon.name || "Unknown";
    throw new Error(
      `Failed to transform React icon "${iconName}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Extracts CarbonIcon descriptor from a React element tree
 */
function extractCarbonIconFromReactElement(
  element: React.ReactElement,
  size: number,
): CarbonIcon {
  // The element should be an SVG or Icon component
  // Navigate through forwardRef and other wrappers if needed
  let currentElement = element;

  // Handle forwardRef wrapper
  if (
    typeof currentElement.type === "object" &&
    "render" in currentElement.type
  ) {
    // This is a forwardRef, call the render function
    const renderFn = (currentElement.type as any).render;
    currentElement = renderFn(currentElement.props, null);
  }

  // Now we should have the actual Icon element
  const props = currentElement.props as any;

  if (!props) {
    throw new Error("Unable to extract props from React element");
  }

  // Extract SVG attributes from props
  const attrs: Record<string, string | number> = {
    xmlns: props.xmlns || "http://www.w3.org/2000/svg",
    viewBox: props.viewBox || "0 0 32 32",
    fill: props.fill || "currentColor",
    width: size,
    height: size,
  };

  // Extract children (paths, circles, etc.)
  const content: any[] = [];
  const children = React.Children.toArray(props.children);

  children.forEach((child) => {
    if (React.isValidElement(child)) {
      const childElement = child as React.ReactElement;
      const contentItem: any = {
        elem:
          typeof childElement.type === "string" ? childElement.type : "path",
        attrs: {},
      };

      // Copy all props as attributes
      if (childElement.props) {
        Object.entries(childElement.props).forEach(([key, value]) => {
          // Skip children and other React-specific props
          if (key !== "children" && value !== undefined && value !== null) {
            contentItem.attrs[key] = value;
          }
        });
      }

      content.push(contentItem);
    }
  });

  return {
    elem: "svg",
    attrs,
    content,
    name: extractIconName(props),
    size,
  };
}

/**
 * Validates that a descriptor has all required CarbonIcon fields
 */
function isValidCarbonIcon(descriptor: any): descriptor is CarbonIcon {
  return (
    descriptor &&
    descriptor.elem === "svg" &&
    descriptor.attrs &&
    typeof descriptor.attrs === "object" &&
    Array.isArray(descriptor.content) &&
    descriptor.content.length > 0 &&
    typeof descriptor.name === "string" &&
    typeof descriptor.size === "number"
  );
}

/**
 * Attempts to extract icon name from props
 */
function extractIconName(props: any): string {
  // Try various properties that might contain the icon name
  return props["data-icon-name"] || props["aria-label"] || props.name || "icon";
}

// Made with Bob
