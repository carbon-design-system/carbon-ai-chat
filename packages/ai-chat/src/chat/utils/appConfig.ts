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

import isEqual from 'lodash-es/isEqual.js';
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
import { validateCustomProperties } from '../../shared/utils/styleUtils';
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
 * Shallow-reconciles `next` against `prev` one level deep: any own key whose
 * value is deep-equal to the previous value reuses the previous reference. If
 * every key ends up reused and the key set is unchanged, the previous object is
 * returned wholesale so its reference survives too.
 *
 * Functions are compared by reference (lodash `isEqual` semantics), so a field
 * carrying a changed callback is treated as changed.
 *
 * Comparison is by value, not identity: two distinct but deep-equal instances
 * (a `Date`, `Map`, `Set`, or class instance with equal contents) are treated as
 * unchanged and the previous reference is reused. That is fine for the current
 * config shape (plain data + functions); if a field is ever added whose identity
 * matters beyond its value, it must not rely on this for change detection.
 *
 * Workload: called only on a runtime config replace (rare), with `prev`/`next`
 * being the `public` and `derived` slots of `AppConfig` — tens of keys at the
 * top level. The per-key `isEqual` deep walk is acceptable at that scale; if a
 * field is ever added whose sub-tree is large (e.g. a big lookup table), revisit.
 */
function reconcileObjectReferences<T extends object>(prev: T, next: T): T {
  if (!prev || prev === next) {
    return next;
  }

  const nextKeys = Object.keys(next);
  const prevKeys = Object.keys(prev);
  let allReused = nextKeys.length === prevKeys.length;

  const result: Record<string, unknown> = {};
  for (const key of nextKeys) {
    const nextValue = (next as Record<string, unknown>)[key];
    const prevValue = (prev as Record<string, unknown>)[key];
    if (
      Object.prototype.hasOwnProperty.call(prev, key) &&
      isEqual(prevValue, nextValue)
    ) {
      result[key] = prevValue;
    } else {
      result[key] = nextValue;
      allReused = false;
    }
  }

  return allReused ? prev : (result as T);
}

/**
 * Preserves object references for the parts of `next` that are value-equal to
 * `prev`, so a config change that only touches one field (e.g. toggling
 * `input.isDisabled`) does not hand every `config.public.*` / `config.derived.*`
 * sub-object — nor the `public` / `derived` / top-level `config` objects
 * themselves — a fresh reference. Selectors that read an unchanged sub-object
 * then keep their identity and skip re-rendering.
 *
 * `createAppConfig` always rebuilds the whole tree, so call this on its output
 * (against the previously stored `AppConfig`) before dispatching the replace.
 * At boot there is no previous config; pass `null` and `next` is returned as-is.
 *
 * Reconciliation is one level deep, with `public.input` the single deliberate
 * exception — see the comment at that call. Everything else stays all-or-nothing
 * per top-level key.
 */
function reconcileAppConfigReferences(
  prev: AppConfig | null | undefined,
  next: AppConfig
): AppConfig {
  if (!prev) {
    return next;
  }

  const publicConfig = reconcileObjectReferences(prev.public, next.public);
  const derived = reconcileObjectReferences(prev.derived, next.derived);

  // `input` is the one key reconciled a second level down. It is the only slot
  // whose siblings are consumed as memo dependencies, so an unrelated change
  // inside it (an action's `disabled` flag flipping as the user types) would
  // otherwise hand `input.starters` / `input.mention` / `input.tiptap` fresh
  // references and rebuild the prompt-line's extensions for nothing.
  if (
    prev.public.input &&
    publicConfig.input &&
    publicConfig.input !== prev.public.input
  ) {
    publicConfig.input = reconcileObjectReferences(
      prev.public.input,
      publicConfig.input
    );
  }

  if (publicConfig === prev.public && derived === prev.derived) {
    return prev;
  }

  return { public: publicConfig, derived };
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

export {
  createAppConfig,
  reconcileAppConfigReferences,
  DEFAULT_MESSAGE_FOCUS_TOGGLE_SHORTCUT,
};
