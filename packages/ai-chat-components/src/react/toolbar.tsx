/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent } from "@lit/react";
import React, { ComponentType } from "react";
import { CarbonIcon } from "@carbon/web-components/es/globals/internal/icon-loader-utils.js";

// Export the actual class for the component that will *directly* be wrapped with React.
import CDSAIChatToolbar, { Action } from "../components/toolbar/src/toolbar.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge.js";
import { transformReactIconToCarbonIcon } from "./utils/iconTransform.js";

/**
 * React-specific Action interface that accepts both CarbonIcon and React icon components.
 * This allows React developers to use @carbon/icons-react directly.
 */
export interface ToolbarAction extends Omit<Action, "icon"> {
  /**
   * Either an icon from `@carbon/icons` or from `@carbon/icons-react`.
   */
  icon: CarbonIcon | ComponentType<any>;
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
    }));
  }, [actions]);

  return <BaseToolbar ref={ref} actions={transformedActions} {...restProps} />;
});

Toolbar.displayName = "Toolbar";

export type { Action };

export default Toolbar;

// Made with Bob
