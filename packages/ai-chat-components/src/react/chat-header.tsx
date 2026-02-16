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
import CdsAiChatChatHeader from "../components/chat-shell/src/chat-header.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge.js";
import { transformReactIconToCarbonIcon } from "./utils/iconTransform.js";
import type { ToolbarAction } from "./toolbar.js";

export interface ChatHeaderProps {
  /** Array of actions that can overflow into a menu when space is limited. */
  actions?: ToolbarAction[];

  /** Enable overflow behavior for actions. */
  overflow?: boolean;

  /** Optional header title text to display. */
  headerTitle?: string;

  /** Optional name text to display after the title. */
  headerName?: string;

  /** Type of navigation to display: 'back', 'overflow', or 'none'. */
  navigationType?: "back" | "overflow" | "none";

  /** Icon for the back button (CarbonIcon object). */
  navigationBackIcon?: any;

  /** Label/tooltip text for the back button. */
  navigationBackLabel?: string;

  /** Click handler for the back button. */
  navigationBackOnClick?: () => void;

  /** Array of overflow menu items with text and onClick handlers. */
  navigationOverflowItems?: Array<{
    text: string;
    onClick?: () => void;
    href?: string;
    target?: string;
    disabled?: boolean;
    testId?: string;
  }>;

  /** Label/tooltip text for the overflow menu button. */
  navigationOverflowLabel?: string;

  /** ARIA label for the overflow menu. */
  navigationOverflowAriaLabel?: string;

  /** Click handler for when the overflow menu button is clicked (menu opened). */
  navigationOverflowOnClick?: () => void;
}

/**
 * Extended interface that includes the imperative handle methods.
 * Use with React.useRef<ChatHeaderHandle>() to access focus management.
 *
 * @example
 * ```tsx
 * const headerRef = useRef<ChatHeaderHandle>(null);
 *
 * const handleFocusRequest = () => {
 *   const focused = headerRef.current?.requestFocus();
 *   if (!focused) {
 *     // Try focusing somewhere else, like the input field
 *     inputRef.current?.focus();
 *   }
 * };
 * ```
 */
export interface ChatHeaderHandle {
  /**
   * Requests focus on the best available focusable element within the component.
   * Returns true if focus was successfully set, false otherwise.
   *
   * Priority order:
   * 1. First enabled button in fixed-actions slot (usually close button)
   * 2. First enabled button in navigation slot (back button or overflow menu)
   * 3. First enabled action button from actions array
   * 4. Any other focusable element
   */
  requestFocus(): boolean;
}

// Base chat header component from @lit/react
const BaseChatHeader = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-chat-header",
    elementClass: CdsAiChatChatHeader,
    react: React,
  }),
);

/**
 * ChatHeader component with automatic icon transformation support.
 *
 * Accepts navigation icons as either CarbonIcon objects or React icon components from @carbon/icons-react.
 * React icons are automatically transformed to the CarbonIcon format expected by the web component.
 */
const ChatHeader = React.forwardRef<any, any>((props, ref) => {
  const { navigationBackIcon, navigationOverflowIcon, actions, ...restProps } =
    props;

  // Transform navigation icons if they're React components
  const transformedNavigationBackIcon = React.useMemo(() => {
    return navigationBackIcon
      ? transformReactIconToCarbonIcon(navigationBackIcon, 16)
      : undefined;
  }, [navigationBackIcon]);

  const transformedNavigationOverflowIcon = React.useMemo(() => {
    return navigationOverflowIcon
      ? transformReactIconToCarbonIcon(navigationOverflowIcon, 16)
      : undefined;
  }, [navigationOverflowIcon]);

  // Transform action icons if actions are provided
  const transformedActions = React.useMemo(() => {
    if (!actions) {
      return undefined;
    }

    return actions.map((action: ToolbarAction) => ({
      ...action,
      icon: transformReactIconToCarbonIcon(action.icon, 16),
    }));
  }, [actions]);

  return (
    <BaseChatHeader
      ref={ref}
      navigationBackIcon={transformedNavigationBackIcon}
      navigationOverflowIcon={transformedNavigationOverflowIcon}
      actions={transformedActions}
      {...restProps}
    />
  );
});

ChatHeader.displayName = "ChatHeader";

export default ChatHeader;

// Made with Bob
