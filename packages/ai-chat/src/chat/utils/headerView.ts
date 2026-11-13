/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import CloseLarge16 from '@carbon/icons/es/close--large/16.js';
import Restart16 from '@carbon/icons/es/restart/16.js';
import RightPanelOpen16 from '@carbon/icons/es/right-panel--open/16.js';
import RightPanelClose16 from '@carbon/icons/es/right-panel--close/16.js';
import BottomPanelClose16 from '@carbon/icons/es/bottom-panel--close/16.js';
import BottomPanelOpen16 from '@carbon/icons/es/bottom-panel--open/16.js';
import SubtractLarge16 from '@carbon/icons/es/subtract--large/16.js';
import { BUTTON_SIZE } from '@carbon/web-components/es/components/button/defs.js';
import type { ToolbarAction } from '@carbon/ai-chat-components/es/react/toolbar.js';
import {
  MinimizeButtonIconType,
  type HeaderConfig,
} from '../../types/config/HeaderConfig';
import {
  BusEventType,
  HeaderMenuClickType,
  type BusEventHeaderMenuClick,
} from '../../types/events/eventBusTypes';
import { PageObjectId } from '../../testing/PageObjectId';

interface HeaderProps {
  onClose: () => void;
  onRestart?: () => void;
  onToggleHomeScreen: () => void;
  isHomeScreenActive?: boolean;
  headerConfigOverride?: Partial<HeaderConfig>;
}

function mergeHeaderConfig(
  derived: HeaderConfig,
  override?: Partial<HeaderConfig>
): HeaderConfig {
  if (!override) {
    return derived;
  }
  const definedOverrides = Object.fromEntries(
    Object.entries(override).filter(([, value]) => value !== undefined)
  );
  return { ...derived, ...definedOverrides };
}

function deriveHeaderActions({
  headerConfig,
  isOpen,
  isRestarting,
  onClose,
  onRestart,
  closeButtonLabel,
  restartButtonLabel,
}: {
  headerConfig: HeaderConfig;
  isOpen: boolean;
  isRestarting: boolean;
  onClose: HeaderProps['onClose'];
  onRestart?: HeaderProps['onRestart'];
  closeButtonLabel: string;
  restartButtonLabel: string;
}): ToolbarAction[] {
  const actions = [...(headerConfig?.actions || [])];
  if (headerConfig?.showRestartButton) {
    actions.push({
      text: restartButtonLabel ?? '',
      icon: Restart16,
      onClick: onRestart ?? (() => {}),
      disabled: isRestarting,
      size: BUTTON_SIZE.MEDIUM,
      fixed: true,
    });
  }
  if (!headerConfig?.hideMinimizeButton) {
    let icon = SubtractLarge16;
    switch (headerConfig?.minimizeButtonIconType) {
      case MinimizeButtonIconType.CLOSE:
        icon = CloseLarge16;
        break;
      case MinimizeButtonIconType.SIDE_PANEL_LEFT:
        icon = isOpen ? RightPanelOpen16 : RightPanelClose16;
        break;
      case MinimizeButtonIconType.SIDE_PANEL_RIGHT:
        icon = isOpen ? RightPanelClose16 : RightPanelOpen16;
        break;
      case MinimizeButtonIconType.SIDE_PANEL_DOWN:
        icon = isOpen ? BottomPanelClose16 : BottomPanelOpen16;
        break;
    }
    actions.push({
      text: closeButtonLabel ?? '',
      icon,
      onClick: onClose,
      size: BUTTON_SIZE.MEDIUM,
      fixed: true,
      testId: PageObjectId.CLOSE_CHAT,
    });
  }
  return actions;
}

function deriveHeaderNavigation({
  headerConfig,
  homeScreenIsOn,
  isConnectingOrConnected,
  isHomeScreenActive,
  onToggleHomeScreen,
  backButtonLabel,
  homeScreenMenuLabel,
  fireHeaderMenuClick,
}: {
  headerConfig: HeaderConfig;
  homeScreenIsOn: boolean;
  isConnectingOrConnected: boolean;
  isHomeScreenActive?: boolean;
  onToggleHomeScreen: HeaderProps['onToggleHomeScreen'];
  backButtonLabel: string;
  homeScreenMenuLabel: string;
  fireHeaderMenuClick: (event: BusEventHeaderMenuClick) => void;
}) {
  const allowHomeScreen =
    homeScreenIsOn && !isConnectingOrConnected && !isHomeScreenActive;
  const menuOptions = headerConfig?.menuOptions;
  const texts = menuOptions?.map((option) => option.text);
  if (texts && allowHomeScreen) {
    texts.unshift(homeScreenMenuLabel);
  }
  const overflowItems = texts?.map((text, index) => {
    const option =
      allowHomeScreen && index === 0
        ? undefined
        : menuOptions[allowHomeScreen ? index - 1 : index];
    return {
      text,
      onClick: option?.href
        ? undefined
        : () => {
            fireHeaderMenuClick({
              type: BusEventType.HEADER_MENU_CLICK,
              clickType: HeaderMenuClickType.OVERFLOW_MENU_ITEM,
              menuItemIndex: index,
              menuItemText: texts[index],
            });
            if (index === 0 && allowHomeScreen) {
              onToggleHomeScreen?.();
            } else {
              const handler =
                menuOptions?.[allowHomeScreen ? index - 1 : index]?.handler;
              handler?.();
            }
          },
      href: option?.href,
      target: option?.target,
      disabled: option?.disabled,
      testId: option?.testId,
    };
  });
  const navigationType = overflowItems
    ? ('overflow' as const)
    : allowHomeScreen && onToggleHomeScreen
      ? ('back' as const)
      : ('none' as const);
  return {
    navigationType,
    backOnClick: () => {
      fireHeaderMenuClick({
        type: BusEventType.HEADER_MENU_CLICK,
        clickType: HeaderMenuClickType.HOMESCREEN_BUTTON,
        menuItemText: backButtonLabel,
      });
      onToggleHomeScreen?.();
    },
    overflowOnClick: () => {
      fireHeaderMenuClick({
        type: BusEventType.HEADER_MENU_CLICK,
        clickType: HeaderMenuClickType.OVERFLOW_MENU_OPENED,
      });
    },
    overflowItems,
  };
}

export { mergeHeaderConfig, deriveHeaderActions, deriveHeaderNavigation };
