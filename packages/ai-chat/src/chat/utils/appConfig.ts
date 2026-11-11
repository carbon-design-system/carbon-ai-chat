/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Builds the prebuilt chat's whole `AppConfig` from its `PublicConfig`: the
 * config itself, plus the values derived from it. The shell builds it and hands
 * it to the conversation, which reads only its `ConversationAppConfig` fields.
 */

import mergeWith from 'lodash-es/mergeWith.js';
import { AppConfig } from '../../types/state/AppConfig';
import { ThemeState } from '../../types/state/ThemeState';
import { IS_PHONE } from '../../shared/utils/browserUtils';
import { CornersType } from '../../shared/utils/constants';
import { deepFreeze } from '../../shared/utils/lang/objectUtils';
import {
  PerCornerConfig,
  ResolvedCornerConfig,
} from '../../types/config/CornersType';
import { PublicConfig } from '../../types/config/PublicConfig';
import {
  HeaderConfig,
  MinimizeButtonIconType,
} from '../../types/config/HeaderConfig';
import {
  LauncherConfig,
  TIME_TO_ENTRANCE_ANIMATION_START,
} from '../../types/config/LauncherConfig';
import { LayoutConfig } from '../../types/config/LayoutConfig';
import { ChatShortcutConfig } from '../../types/config/ShortcutConfig';
import { validateCustomProperties } from './styleUtils';
import { DEFAULT_THEME_STATE } from '../../shared/store/reducerUtils';

const DEFAULT_HEADER: HeaderConfig = {
  isOn: true,
  minimizeButtonIconType: MinimizeButtonIconType.MINIMIZE,
  showAiLabel: true,
  hasContentMaxWidth: false,
};

deepFreeze(DEFAULT_HEADER);

const DEFAULT_LAUNCHER: LauncherConfig = {
  isOn: true,
  mobile: {
    isOn: false,
    title: '',
    timeToExpand: TIME_TO_ENTRANCE_ANIMATION_START,
  },
  desktop: {
    isOn: false,
    title: '',
    timeToExpand: TIME_TO_ENTRANCE_ANIMATION_START,
  },
};
deepFreeze(DEFAULT_LAUNCHER);

/**
 * Defaults for the message focus toggle shortcut, merged field by field with whatever the
 * host passes on {@link KeyboardShortcuts.messageFocusToggle}, so a host that sets only
 * `key` still gets the default `modifiers` and `isOn`.
 *
 * F6 is a standard accessibility shortcut used in Windows and many applications for cycling
 * between major regions and panels. It doesn't produce special characters and is widely
 * recognized for navigation purposes.
 *
 * The shortcut is off by default; a host opts in with `isOn: true`.
 */
const DEFAULT_MESSAGE_FOCUS_TOGGLE_SHORTCUT: ChatShortcutConfig = {
  key: 'F6',
  modifiers: {},
  isOn: false,
};
deepFreeze(DEFAULT_MESSAGE_FOCUS_TOGGLE_SHORTCUT);

const DEFAULT_LAYOUT_STATE: LayoutConfig = {
  showFrame: true,
  hasContentMaxWidth: true,
};
deepFreeze(DEFAULT_LAYOUT_STATE);

/**
 * Deep merge helper that:
 *  - ignores `undefined` in sources (keeps existing/default),
 *  - replaces arrays wholesale (no index-wise merge),
 *  - otherwise behaves like lodash merge.
 */
function mergeDefaultsDeep<T>(target: Partial<T>, ...sources: Partial<T>[]): T {
  return mergeWith(
    target as any,
    ...(sources as unknown as any[]),
    (objValue: unknown, srcValue: unknown) => {
      if (srcValue === undefined) {
        return objValue;
      }
      if (Array.isArray(objValue) && Array.isArray(srcValue)) {
        // Replace arrays instead of merging by index
        return srcValue.slice();
      }
      // Let mergeWith handle objects/primitives normally
      return undefined;
    }
  ) as T;
}

/**
 * Creates a complete AppConfig with derived values computed from the public config.
 */
function createAppConfig(publicConfig: PublicConfig): AppConfig {
  // Create the theme state with defaults applied and corners computed
  const themeWithDefaults: ThemeState = {
    originalCarbonTheme:
      publicConfig.injectCarbonTheme ?? DEFAULT_THEME_STATE.originalCarbonTheme,
    derivedCarbonTheme:
      publicConfig.injectCarbonTheme ?? DEFAULT_THEME_STATE.derivedCarbonTheme,
    aiEnabled: publicConfig.aiEnabled ?? DEFAULT_THEME_STATE.aiEnabled,
    corners: getThemeCornersType(publicConfig),
  };

  // Compute CSS variable overrides from theme configuration
  const cssVariableOverrides = validateCustomProperties(
    publicConfig.layout?.customProperties || {}
  );

  // Build derived config using deep merge that skips undefined
  const derived = mergeDefaultsDeep(
    {},
    {
      header: DEFAULT_HEADER,
      layout: DEFAULT_LAYOUT_STATE,
      launcher: DEFAULT_LAUNCHER,
      // `mergeDefaultsDeep` skips undefined sources, so an explicit `isOn: false` survives.
      keyboardShortcuts: {
        messageFocusToggle: DEFAULT_MESSAGE_FOCUS_TOGGLE_SHORTCUT,
      },
    },
    {
      header: publicConfig.header,
      layout: publicConfig.layout,
      launcher: publicConfig.launcher,
      keyboardShortcuts: publicConfig.keyboardShortcuts,
    }
  );

  return {
    public: publicConfig,
    derived: {
      cssVariableOverrides,
      themeWithDefaults,
      header: derived.header,
      layout: derived.layout,
      launcher: derived.launcher,
      // The defaults above always supply `messageFocusToggle` and its `isOn`; the merge
      // helper's return type can't express that.
      keyboardShortcuts:
        derived.keyboardShortcuts as AppConfig['derived']['keyboardShortcuts'],
    },
  };
}

/**
 * Checks if a corners configuration is a PerCornerConfig object.
 */
function isPerCornerConfig(
  corners: CornersType | PerCornerConfig | undefined
): corners is PerCornerConfig {
  return (
    typeof corners === 'object' &&
    corners !== null &&
    (corners.startStart !== undefined ||
      corners.startEnd !== undefined ||
      corners.endStart !== undefined ||
      corners.endEnd !== undefined)
  );
}

/**
 * Normalizes a corners configuration to a resolved per-corner configuration.
 * Handles both simple CornersType values and PerCornerConfig objects.
 */
function normalizeCorners(
  corners: CornersType | PerCornerConfig | undefined,
  defaultValue: CornersType
): ResolvedCornerConfig {
  if (isPerCornerConfig(corners)) {
    // Per-corner config: use provided values or fall back to default
    return {
      startStart: corners.startStart ?? defaultValue,
      startEnd: corners.startEnd ?? defaultValue,
      endStart: corners.endStart ?? defaultValue,
      endEnd: corners.endEnd ?? defaultValue,
    };
  }

  // Simple config: apply the same value to all corners
  const cornerValue = corners ?? defaultValue;
  return {
    startStart: cornerValue,
    startEnd: cornerValue,
    endStart: cornerValue,
    endEnd: cornerValue,
  };
}

/**
 * Returns the resolved corner configuration for the Carbon AI Chat widget.
 */
function getThemeCornersType(publicConfig: PublicConfig): ResolvedCornerConfig {
  const layoutState = getLayoutState(publicConfig);

  // If frame is disabled or on phone, force all corners to square
  if (layoutState.showFrame === false || IS_PHONE) {
    return {
      startStart: CornersType.SQUARE,
      startEnd: CornersType.SQUARE,
      endStart: CornersType.SQUARE,
      endEnd: CornersType.SQUARE,
    };
  }

  // If corners is explicitly set to SQUARE (simple config), force all to square
  if (publicConfig.layout?.corners === CornersType.SQUARE) {
    return {
      startStart: CornersType.SQUARE,
      startEnd: CornersType.SQUARE,
      endStart: CornersType.SQUARE,
      endEnd: CornersType.SQUARE,
    };
  }

  // Otherwise, normalize the corners configuration
  return normalizeCorners(
    publicConfig.layout?.corners,
    DEFAULT_THEME_STATE.corners.startStart // Use default from one corner
  );
}

function getLayoutState(publicConfig: PublicConfig): LayoutConfig {
  // Use the same deep merge semantics for layout specifically
  return mergeDefaultsDeep<LayoutConfig>(
    {},
    DEFAULT_LAYOUT_STATE,
    publicConfig.layout ?? {}
  );
}

export { createAppConfig, DEFAULT_MESSAGE_FOCUS_TOGGLE_SHORTCUT };
