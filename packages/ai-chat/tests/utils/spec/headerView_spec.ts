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
} from '../../../src/types/config/HeaderConfig';
import {
  BusEventType,
  HeaderMenuClickType,
} from '../../../src/types/events/eventBusTypes';
import { PageObjectId } from '../../../src/testing/PageObjectId';
import {
  deriveHeaderActions,
  deriveHeaderNavigation,
  mergeHeaderConfig,
} from '../../../src/chat/utils/headerView';

function actionInputs(headerConfig: HeaderConfig = {}) {
  return {
    headerConfig,
    isOpen: true,
    isRestarting: false,
    onClose: jest.fn(),
    onRestart: jest.fn(),
    closeButtonLabel: 'Minimize',
    restartButtonLabel: 'Restart',
  };
}

function navigationInputs(headerConfig: HeaderConfig = {}) {
  return {
    headerConfig,
    homeScreenIsOn: true,
    isConnectingOrConnected: false,
    isHomeScreenActive: false,
    onToggleHomeScreen: jest.fn(),
    backButtonLabel: 'Return home',
    homeScreenMenuLabel: 'Home screen',
    fireHeaderMenuClick: jest.fn(),
  };
}

describe('mergeHeaderConfig', () => {
  it('retains derived identity without overrides and ignores only undefined overrides', () => {
    const menuOptions = [{ text: 'Derived menu' }];
    const derived: HeaderConfig = {
      title: 'Derived title',
      name: 'Derived name',
      showRestartButton: true,
      menuOptions,
    };
    expect(mergeHeaderConfig(derived)).toBe(derived);
    const merged = mergeHeaderConfig(derived, {
      title: undefined,
      name: '',
      showRestartButton: false,
      menuOptions: null,
    });
    expect(merged).toEqual({
      title: 'Derived title',
      name: '',
      showRestartButton: false,
      menuOptions: null,
    });
    expect(derived.menuOptions).toBe(menuOptions);
    expect(derived.name).toBe('Derived name');
  });
});

describe('deriveHeaderActions', () => {
  it('retains custom action and icon identities before fixed restart and minimize actions', () => {
    const icons = [
      CloseLarge16,
      (): null => null,
      { $$typeof: Symbol.for('react.forward_ref'), render: (): null => null },
      { $$typeof: Symbol.for('react.memo'), type: (): null => null },
    ] as ToolbarAction['icon'][];
    const custom = icons.map((icon, index) => ({
      text: `Custom ${index}`,
      icon,
      onClick: jest.fn(),
      href: '/custom',
      target: '_blank',
      disabled: true,
      fixed: false,
      isSelected: false,
      danger: true,
      divider: true,
      testId: `custom-${index}`,
    }));
    const inputs = actionInputs({ actions: custom, showRestartButton: true });
    const result = deriveHeaderActions(inputs);
    custom.forEach((action, index) => {
      expect(result[index]).toBe(action);
      expect(result[index].icon).toBe(icons[index]);
    });
    expect(result.slice(custom.length)).toEqual([
      {
        text: 'Restart',
        icon: Restart16,
        onClick: inputs.onRestart,
        disabled: false,
        size: BUTTON_SIZE.MEDIUM,
        fixed: true,
      },
      {
        text: 'Minimize',
        icon: SubtractLarge16,
        onClick: inputs.onClose,
        size: BUTTON_SIZE.MEDIUM,
        fixed: true,
        testId: PageObjectId.CLOSE_CHAT,
      },
    ]);
    expect(custom).toHaveLength(4);
    result[4].onClick();
    result[5].onClick();
    expect(inputs.onRestart.mock.calls).toEqual([[]]);
    expect(inputs.onClose.mock.calls).toEqual([[]]);
  });

  it.each([false, true])(
    'sets the restart disabled state to %s',
    (isRestarting) => {
      const result = deriveHeaderActions({
        ...actionInputs({ showRestartButton: true, hideMinimizeButton: true }),
        isRestarting,
        onRestart: undefined,
        restartButtonLabel: undefined,
      });
      expect(result).toHaveLength(1);
      expect(result[0].disabled).toBe(isRestarting);
      expect(result[0].text).toBe('');
      expect(() => result[0].onClick()).not.toThrow();
    }
  );

  it.each([
    [MinimizeButtonIconType.CLOSE, CloseLarge16, CloseLarge16],
    [MinimizeButtonIconType.MINIMIZE, SubtractLarge16, SubtractLarge16],
    [
      MinimizeButtonIconType.SIDE_PANEL_LEFT,
      RightPanelClose16,
      RightPanelOpen16,
    ],
    [
      MinimizeButtonIconType.SIDE_PANEL_RIGHT,
      RightPanelOpen16,
      RightPanelClose16,
    ],
    [
      MinimizeButtonIconType.SIDE_PANEL_DOWN,
      BottomPanelOpen16,
      BottomPanelClose16,
    ],
    [undefined, SubtractLarge16, SubtractLarge16],
    ['unknown' as MinimizeButtonIconType, SubtractLarge16, SubtractLarge16],
  ])(
    'selects the %s minimize icon for both window states',
    (type, closed, open) => {
      for (const isOpen of [false, true]) {
        const result = deriveHeaderActions({
          ...actionInputs({
            minimizeButtonIconType: type as MinimizeButtonIconType,
          }),
          isOpen,
          closeButtonLabel: undefined,
        });
        expect(result).toHaveLength(1);
        expect(result[0].icon).toBe(isOpen ? open : closed);
        expect(result[0].text).toBe('');
      }
    }
  );

  it('removes only the built-in controls when both are disabled', () => {
    const custom = { text: 'Custom', icon: CloseLarge16, fixed: true };
    expect(
      deriveHeaderActions(
        actionInputs({ actions: [custom], hideMinimizeButton: true })
      )
    ).toEqual([custom]);
  });
});

describe('deriveHeaderNavigation', () => {
  it.each([
    [true, false, false, true, 'back'],
    [false, false, false, true, 'none'],
    [true, true, false, true, 'none'],
    [true, false, true, true, 'none'],
    [true, false, false, false, 'none'],
  ] as const)(
    'derives navigation for home=%s agent=%s active=%s callback=%s',
    (
      homeScreenIsOn,
      isConnectingOrConnected,
      isHomeScreenActive,
      hasCallback,
      expected
    ) => {
      const inputs = navigationInputs();
      const result = deriveHeaderNavigation({
        ...inputs,
        homeScreenIsOn,
        isConnectingOrConnected,
        isHomeScreenActive,
        onToggleHomeScreen: hasCallback ? inputs.onToggleHomeScreen : undefined,
      });
      expect(result.navigationType).toBe(expected);
      expect(result.overflowItems).toBeUndefined();
    }
  );

  it('emits back and overflow-open events before the back callback without arguments', () => {
    const inputs = navigationInputs();
    const result = deriveHeaderNavigation(inputs);
    result.backOnClick();
    result.overflowOnClick();
    expect(inputs.fireHeaderMenuClick.mock.calls).toEqual([
      [
        {
          type: BusEventType.HEADER_MENU_CLICK,
          clickType: HeaderMenuClickType.HOMESCREEN_BUTTON,
          menuItemText: 'Return home',
        },
      ],
      [
        {
          type: BusEventType.HEADER_MENU_CLICK,
          clickType: HeaderMenuClickType.OVERFLOW_MENU_OPENED,
        },
      ],
    ]);
    expect(inputs.onToggleHomeScreen.mock.calls).toEqual([[]]);
    expect(inputs.fireHeaderMenuClick.mock.invocationCallOrder[0]).toBeLessThan(
      inputs.onToggleHomeScreen.mock.invocationCallOrder[0]
    );
  });

  it.each([false, true])(
    'keeps configured empty menus as overflow with home=%s',
    (homeScreenIsOn) => {
      const result = deriveHeaderNavigation({
        ...navigationInputs({ menuOptions: [] }),
        homeScreenIsOn,
      });
      expect(result.navigationType).toBe('overflow');
      expect(result.overflowItems.map(({ text }) => text)).toEqual(
        homeScreenIsOn ? ['Home screen'] : []
      );
    }
  );

  it.each([
    { homeScreenIsOn: false },
    { isConnectingOrConnected: true },
    { isHomeScreenActive: true },
  ])(
    'omits the inserted home item when navigation disallows it: %o',
    (state) => {
      const result = deriveHeaderNavigation({
        ...navigationInputs({ menuOptions: [{ text: 'Custom' }] }),
        ...state,
      });
      expect(result.navigationType).toBe('overflow');
      expect(result.overflowItems.map(({ text }) => text)).toEqual(['Custom']);
    }
  );

  it('retains the inserted home event without a home callback', () => {
    const inputs = navigationInputs({ menuOptions: [] });
    const result = deriveHeaderNavigation({
      ...inputs,
      onToggleHomeScreen: undefined,
    });
    result.overflowItems[0].onClick();
    expect(inputs.fireHeaderMenuClick).toHaveBeenCalledWith({
      type: BusEventType.HEADER_MENU_CLICK,
      clickType: HeaderMenuClickType.OVERFLOW_MENU_ITEM,
      menuItemIndex: 0,
      menuItemText: 'Home screen',
    });
  });

  it.each([false, true])(
    'keeps menu indices, links and callback order with home=%s',
    (homeScreenIsOn) => {
      const handler = jest.fn();
      const linkHandler = jest.fn();
      const emptyLinkHandler = jest.fn();
      const menuOptions = [
        { text: 'Action', handler, disabled: true, testId: 'action' },
        {
          text: 'Link',
          href: '/docs',
          target: '_blank',
          handler: linkHandler,
          testId: 'link',
        },
        { text: 'Empty link', href: '', handler: emptyLinkHandler },
        { text: 'No handler' },
      ];
      const inputs = { ...navigationInputs({ menuOptions }), homeScreenIsOn };
      const result = deriveHeaderNavigation(inputs);
      const offset = homeScreenIsOn ? 1 : 0;
      expect(result.navigationType).toBe('overflow');
      expect(result.overflowItems.map(({ text }) => text)).toEqual([
        ...(homeScreenIsOn ? ['Home screen'] : []),
        'Action',
        'Link',
        'Empty link',
        'No handler',
      ]);
      expect(menuOptions).toHaveLength(4);
      const items = result.overflowItems;
      if (homeScreenIsOn) {
        items[0].onClick();
        expect(inputs.onToggleHomeScreen.mock.calls).toEqual([[]]);
      }
      expect(items[offset].disabled).toBe(true);
      expect(items[offset].testId).toBe('action');
      items[offset].onClick();
      expect(handler.mock.calls).toEqual([[]]);
      const eventCallOrder =
        inputs.fireHeaderMenuClick.mock.invocationCallOrder;
      expect(eventCallOrder[eventCallOrder.length - 1]).toBeLessThan(
        handler.mock.invocationCallOrder[0]
      );
      expect(items[offset + 1]).toEqual({
        text: 'Link',
        href: '/docs',
        target: '_blank',
        disabled: undefined,
        testId: 'link',
        onClick: undefined,
      });
      expect(linkHandler).not.toHaveBeenCalled();
      items[offset + 2].onClick();
      items[offset + 3].onClick();
      expect(emptyLinkHandler.mock.calls).toEqual([[]]);
      expect(
        inputs.fireHeaderMenuClick.mock.calls.map(([event]) => event)
      ).toEqual([
        ...(homeScreenIsOn
          ? [
              {
                type: BusEventType.HEADER_MENU_CLICK,
                clickType: HeaderMenuClickType.OVERFLOW_MENU_ITEM,
                menuItemIndex: 0,
                menuItemText: 'Home screen',
              },
            ]
          : []),
        ...[0, 2, 3].map((index) => ({
          type: BusEventType.HEADER_MENU_CLICK,
          clickType: HeaderMenuClickType.OVERFLOW_MENU_ITEM,
          menuItemIndex: index + offset,
          menuItemText: menuOptions[index].text,
        })),
      ]);
    }
  );

  it('looks up the current custom handler after the menu-click event', () => {
    const oldHandler = jest.fn();
    const nextHandler = jest.fn();
    const menuOptions = [{ text: 'Action', handler: oldHandler }];
    const inputs = navigationInputs({ menuOptions });
    inputs.fireHeaderMenuClick.mockImplementation(() => {
      menuOptions[0] = { text: 'New action', handler: nextHandler };
    });
    deriveHeaderNavigation(inputs).overflowItems[1].onClick();
    expect(oldHandler).not.toHaveBeenCalled();
    expect(nextHandler.mock.calls).toEqual([[]]);
  });
});
