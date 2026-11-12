/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent } from '@lit/react';
import React from 'react';
import { CdsAiChatChatHeader } from '../components/aichat-shell/index.js';
import { transformReactIconToCarbonIcon } from '../globals/utils/iconTransform.js';
import type { ToolbarAction } from './toolbar.js';

export interface ChatHeaderProps extends Omit<
  React.ComponentPropsWithoutRef<typeof BaseChatHeader>,
  'actions' | 'navigationBackIcon' | 'navigationOverflowIcon'
> {
  /** Actions may use Carbon icons or React icon components. */
  actions?: ToolbarAction[];
  /** Back icon, converted to the element's Carbon icon format. */
  navigationBackIcon?: ToolbarAction['icon'];
  /** Overflow icon, converted to the element's Carbon icon format. */
  navigationOverflowIcon?: ToolbarAction['icon'];
}

/** The concrete header element, including requestFocus(). */
export type ChatHeaderHandle = CdsAiChatChatHeader;

// Base chat header component from @lit/react
const BaseChatHeader = createComponent({
  tagName: CdsAiChatChatHeader.is,
  elementClass: CdsAiChatChatHeader,
  react: React,
});

/**
 * ChatHeader component with automatic icon transformation support.
 *
 * Accepts navigation icons as either CarbonIcon objects or React icon components from @carbon/icons-react.
 * React icons are automatically transformed to the CarbonIcon format expected by the web component.
 */
const ChatHeader = React.forwardRef<CdsAiChatChatHeader, ChatHeaderProps>(
  (props, ref) => {
    const {
      navigationBackIcon,
      navigationOverflowIcon,
      actions,
      ...restProps
    } = props;

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
        return [];
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
  }
);

ChatHeader.displayName = 'ChatHeader';

export default ChatHeader;
