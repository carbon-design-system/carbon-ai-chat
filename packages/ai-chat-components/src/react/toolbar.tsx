/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent } from "@lit/react";
import React from "react";
import { CarbonIcon } from "@carbon/web-components/es/globals/internal/icon-loader-utils.js";

// Export the actual class for the component that will *directly* be wrapped with React.
import CDSAIChatToolbar from "../components/toolbar/src/toolbar.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge.js";
import { transformReactIconToCarbonIcon } from "./utils/iconTransform.js";

// Re-export the Action interface from the web component
export type { Action } from "../components/toolbar/src/toolbar.js";

/**
 * Toolbar action interface that accepts both CarbonIcon and React icon components.
 * This allows developers to use either:
 * - @carbon/icons-react (React components)
 * - @carbon/web-components icons (CarbonIcon objects)
 *
 * Works with both React and web component implementations.
 */
export interface ToolbarAction {
  text: string;
  icon: CarbonIcon | React.ComponentType<any>;
  size?: string;
  fixed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  /**
   * Optional data-testid attribute for testing purposes.
   * This allows tests to reliably find and interact with specific action buttons.
   */
  testId?: string;
}

// Base toolbar component from @lit/react
const BaseToolbar = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-toolbar",
    elementClass: CDSAIChatToolbar,
    react: React,
  }),
);

/**
 * Toolbar component with automatic icon transformation support.
 *
 * Accepts actions with either CarbonIcon objects or React icon components from @carbon/icons-react.
 * React icons are automatically transformed to the CarbonIcon format expected by the web component.
 *
 * @example
 * ```tsx
 * import { Add, Edit } from '@carbon/icons-react';
 * import Toolbar from '@carbon/ai-chat-components/react/toolbar';
 *
 * const actions = [
 *   { text: 'Add', icon: Add, onClick: () => console.log('Add') },
 *   { text: 'Edit', icon: Edit, onClick: () => console.log('Edit') }
 * ];
 *
 * <Toolbar actions={actions} overflow />
 * ```
 */
/**
 * Converts size string to numeric pixel value
 */
function getSizeInPixels(size?: string): number {
  if (!size) {
    return 16;
  }

  // If it's already a number string, parse it
  const parsed = parseInt(size, 10);
  if (!isNaN(parsed)) {
    return parsed;
  }

  // Map size names to pixel values (Carbon Design System standard sizes)
  const sizeMap: Record<string, number> = {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
  };

  return sizeMap[size.toLowerCase()] || 16;
}

const Toolbar = React.forwardRef<any, any>((props, ref) => {
  const { actions, ...restProps } = props;

  // Transform React icons to CarbonIcon format
  const transformedActions = React.useMemo(() => {
    if (!actions) {
      return [];
    }

    return actions.map((action: ToolbarAction) => ({
      ...action,
      icon: transformReactIconToCarbonIcon(
        action.icon,
        getSizeInPixels(action.size),
      ),
      // Preserve testId if provided
      testId: action.testId,
    }));
  }, [actions]);

  return <BaseToolbar ref={ref} actions={transformedActions} {...restProps} />;
});

Toolbar.displayName = "Toolbar";

export default Toolbar;

// Made with Bob
