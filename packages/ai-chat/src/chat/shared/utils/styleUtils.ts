/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This file contains utility functions to process CSS for Carbon AI Chat. It deals with things like transforming Object Maps
 * of CSS variables into CSS and properly injecting default Carbon colors into CSS variables.
 */

import { blue60, gray10, gray80, gray100, white } from "@carbon/colors";

import { ThemeState } from "../../../types/state/AppState";
import ObjectMap from "../../../types/utilities/ObjectMap";
import {
  adjustLightness,
  calculateContrast,
  hexCodeToRGB,
  MIN_CONTRAST,
  whiteOrBlackText,
} from "./colors";
import { WA_CONSOLE_PREFIX } from "./constants";
import {
  ThemeType,
  CarbonTheme,
  WhiteLabelTheme,
} from "../../../types/config/PublicConfig";
import { CarbonThemeClassNames } from "../../../types/utilities/carbonTypes";

// The prefix that is added to each CSS variable in the application.
const CSS_VAR_PREFIX = "--cds-";
const CSS_CHAT_PREFIX = "chat-";

// Regex to determine a 3 or 6 digit hexadecimal color
const HEXADECIMAL_REGEX = /#([a-f0-9]{3}){1,2}\b/i;

// Some carbon colors need to be overridden in order to support our theming options. Map the overrides for the light
// themes here.
const INTERNAL_OVERRIDES_LIGHT_THEME_MAP = {
  // In light themes make the quick action chat buttons black since the default link blue may not match the users theme.
  "$chat-button": "#000000",
  "$chat-button-text-hover": "#525252",
};

// Some carbon colors need to be overridden in order to support our theming options. Map the overrides for the dark
// themes here.
const INTERNAL_OVERRIDES_DARK_THEME_MAP = {
  // In dark themes make the quick action chat buttons white since the default light link blue may not match the users
  // theme.
  "$chat-button": "#ffffff",
  "$chat-button-text-hover": "#f4f4f4",
};

/**
 * Converts the given map of CSS variable into a string that is formatted for inserting into a style tag.
 */
function convertCSSVariablesToString(cssVariables: ObjectMap<string>): string {
  // First convert the variables to a CSS string.
  const pieces = Object.keys(cssVariables).map((key) => {
    const value = cssVariables[key];
    if (value === undefined) {
      return "";
    }

    const fullName = key.startsWith("$")
      ? `${CSS_VAR_PREFIX}${key.replace(/^\$/, "")}`
      : `${CSS_VAR_PREFIX}${CSS_CHAT_PREFIX}${key}`;
    return `${fullName}:${value};`;
  });

  let cssVariablesString = "";
  const allValues = pieces.join("");
  const prefix = "";
  if (allValues.length > 0) {
    // Including a namespace in the styles allows us to support multiple widgets on the same page without their styles
    // conflicting.
    const rule = `${prefix}.WACContainer .cds--white, ${prefix}.WACContainer .cds--g10, ${prefix}.WACContainer .cds--g90, ${prefix}.WACContainer .cds--g100`;
    cssVariablesString = `${rule}${`, :host`}{${allValues}}`;
  }

  return cssVariablesString;
}

/**
 * This will generate a set of CSS variables that will overwrite the default values based on the customizations that
 * are specified in the given remote config.
 *
 * @param whiteLabelVariables The set of customized styles.
 * @param carbonTheme The Carbon theme that is being used.
 */
async function remoteStylesToCSSVars(
  whiteLabelVariables: WhiteLabelTheme,
  carbonTheme: CarbonTheme,
): Promise<ObjectMap<string>> {
  const cssOverrides: ObjectMap<string> = {};

  const primaryColor = whiteLabelVariables["BASE-primary-color"];
  const secondaryColor = whiteLabelVariables["BASE-secondary-color"];
  const accentColor = whiteLabelVariables["BASE-accent-color"];

  if (primaryColor) {
    cssOverrides["PRIMARY-color"] = primaryColor;
    cssOverrides["PRIMARY-color-text"] = whiteOrBlackText(primaryColor);
    cssOverrides["PRIMARY-color-hover"] = await adjustLightness(
      primaryColor,
      -8,
    );
    cssOverrides["PRIMARY-color-active"] = await adjustLightness(
      primaryColor,
      -10,
    );

    // We need to calculate the focus color for the buttons in the header. The focus color for the white and g10
    // themes is the same as the accent color. For g90 and g100, the focus color is white.
    const useAccentColor = accentColor || blue60;
    const tryFocusColor =
      carbonTheme === CarbonTheme.G90 || carbonTheme === CarbonTheme.G100
        ? white
        : useAccentColor;

    let useFocusColor;
    if (calculateContrast(primaryColor, tryFocusColor) >= MIN_CONTRAST) {
      // The default color works fine.
      useFocusColor = tryFocusColor;
    } else if (
      tryFocusColor !== useAccentColor &&
      calculateContrast(primaryColor, useAccentColor) >= MIN_CONTRAST
    ) {
      // The default doesn't work so let's try the accent.
      useFocusColor = useAccentColor;
    } else if (
      tryFocusColor !== white &&
      calculateContrast(primaryColor, white) >= MIN_CONTRAST
    ) {
      // The accent doesn't work, so let's try white.
      useFocusColor = white;
    } else {
      // If white doesn't work, then gray100 will.
      useFocusColor = gray100;
    }

    if (useFocusColor !== tryFocusColor) {
      cssOverrides["PRIMARY-color-focus"] = useFocusColor;
    }
  }

  if (secondaryColor) {
    cssOverrides["SECONDARY-color"] = secondaryColor;
    cssOverrides["SECONDARY-color-text"] = whiteOrBlackText(secondaryColor);
  } else if (
    carbonTheme === CarbonTheme.G90 ||
    carbonTheme === CarbonTheme.G100
  ) {
    // We don't like the default Carbon color for the sent text bubble in the g90 and g100 color themes.
    cssOverrides["SECONDARY-color"] = `var(${CSS_VAR_PREFIX}layer-02)`;
    cssOverrides["SECONDARY-color-text"] =
      `var(${CSS_VAR_PREFIX}text-primary);`;
  }

  if (accentColor) {
    const colorMap = ACCENT_COLOR_MAPS[carbonTheme];

    // The custom color basically corresponds to Blue 60 are we will replace all the occurrences of Blue 60 with
    // that custom color. For the other shades of blue, we will calculate a relative color from the custom color and
    // replace those colors with this calculated color.
    const accentBlue20 = await adjustLightness(accentColor, 40);
    const accentBlue60Hover = await adjustLightness(accentColor, -8);
    const accentBlue80 = await adjustLightness(accentColor, -20);

    fillValues(cssOverrides, colorMap.blue20, accentBlue20);
    fillValues(cssOverrides, colorMap.blue60, accentColor);
    fillValues(cssOverrides, colorMap.blue60Hover, accentBlue60Hover);
    fillValues(cssOverrides, colorMap.blue80, accentBlue80);

    // Update the launcher variables with the appropriate accent colors for the button states.
    cssOverrides["LAUNCHER-color-background"] = accentColor;
    cssOverrides["LAUNCHER-color-background-hover"] = accentBlue60Hover;
    cssOverrides["LAUNCHER-color-background-active"] = accentBlue80;
    cssOverrides["LAUNCHER-EXPANDED-MESSAGE-color-background"] = accentColor;
    cssOverrides["LAUNCHER-EXPANDED-MESSAGE-color-hover"] = accentBlue60Hover;
    cssOverrides["LAUNCHER-EXPANDED-MESSAGE-color-active"] = accentBlue80;

    cssOverrides["ACCENT-color"] = accentColor;
    const accentColorRGB = hexCodeToRGB(accentColor);
    cssOverrides["ACCENT-color-r"] = accentColorRGB[0].toString();
    cssOverrides["ACCENT-color-g"] = accentColorRGB[1].toString();
    cssOverrides["ACCENT-color-b"] = accentColorRGB[2].toString();

    // The ghost button text color defaults to $link-01 but since we've decided to not override $link-01, we need to
    // change the color of the ghost button separately.
    cssOverrides["ACCENT-color-ghost-text"] = accentColor;

    // Now figure out what font color would go with a background color that's "Blue 60".
    const accentColorBW = whiteOrBlackText(accentColor);
    cssOverrides["ACCENT-color-text"] = accentColorBW;
    cssOverrides["ACCENT-color-background-hover"] = accentBlue60Hover;
    cssOverrides["ACCENT-color-background-active"] = accentBlue80;

    // Update the launcher variables with the appropriate BW colors.
    cssOverrides["LAUNCHER-color-focus-border"] = accentColorBW;
    cssOverrides["LAUNCHER-color-avatar"] = accentColorBW;
    cssOverrides["LAUNCHER-EXPANDED-MESSAGE-color-text"] = accentColorBW;
    cssOverrides["LAUNCHER-EXPANDED-MESSAGE-color-focus-border"] =
      accentColorBW;
    cssOverrides["LAUNCHER-MOBILE-color-text"] = accentColorBW;

    // This color is either black or white and is based on the contrast difference with the accent color. Its primary use
    // is the color of button on top of the accent color.
    cssOverrides["ACCENT-color-bw"] = accentColorBW;

    // When ACCENT-color-bw is used as a button color we need a hover and active color.
    cssOverrides["ACCENT-color-bw-hover"] = await adjustLightness(
      accentColorBW,
      -8,
    );

    // The active color is a little darker than the hover color.
    cssOverrides["ACCENT-color-bw-active"] = await adjustLightness(
      accentColorBW,
      -10,
    );

    // Also need an inverse of ACCENT-color-bw so that we can have accessible text within our bw buttons.
    cssOverrides["ACCENT-color-bw-inverse"] =
      accentColorBW === gray100 ? white : gray100;

    // Need a slightly more gray version of the bw accent color.
    cssOverrides["ACCENT-color-bw-gray"] =
      accentColorBW === gray100 ? gray80 : gray10;

    // A slightly darker or lighter accent color (darker if the accent color was already dark, lighter if it was already
    // light). Used for the launcher experiments where we only have one accent color but really need two.
    cssOverrides["ACCENT-color-pastel"] =
      accentColorBW === gray100
        ? await adjustLightness(accentColor, 20)
        : await adjustLightness(accentColor, -15);
  }

  return cssOverrides;
}

/**
 * This structure maintains a map for each of the named colors in Carbon that are a shade of blue. When the tooling
 * specifies a custom accent color, we will replace all occurrences of Blue 60 in each of the Carbon color themes
 * with that accent color as well as appropriate adjustments of the accent color for each of the shades of blue.
 *
 * Note: to preserve the color of links as their default Carbon colors, $link-01 and $inverse-link are excluded from
 * these maps.
 */

const ACCENT_COLOR_MAPS: Record<CarbonTheme, { [key: string]: string[] }> = {
  white: {
    blue20: ["$highlight"],
    blue60: [
      "$background-brand",
      "$interactive",
      "$border-interactive",
      "$button-primary",
      "$button-tertiary",
      "$icon-interactive",
      "$focus",
    ],
    blue60Hover: ["$button-primary-hover", "$button-tertiary-hover"],
    blue80: ["$button-primary-active", "$button-tertiary-active"],
  },
  g10: {
    blue20: ["$highlight"],
    blue60: [
      "$background-brand",
      "$interactive",
      "$border-interactive",
      "$button-primary",
      "$button-tertiary",
      "$icon-interactive",
      "$focus",
    ],
    blue60Hover: ["$button-primary-hover", "$button-tertiary-hover"],
    blue80: ["$button-primary-active", "$button-tertiary-active"],
  },
  g90: {
    blue20: [],
    blue60: [
      "$background-brand",
      "$interactive",
      "$border-interactive",
      "$button-primary",
      "$button-tertiary",
      "$focus-inverse",
    ],
    blue60Hover: ["$button-primary-hover", "$button-tertiary-hover"],
    blue80: ["$button-primary-active", "$highlight", "$button-tertiary-active"],
  },
  g100: {
    blue20: [],
    blue60: [
      "$background-brand",
      "$interactive",
      "$border-interactive",
      "$button-primary",
      "$button-tertiary",
      "$focus-inverse",
    ],
    blue60Hover: ["$button-primary-hover", "$button-tertiary-hover"],
    blue80: ["$button-primary-active", "$highlight", "$button-tertiary-active"],
  },
};

/**
 * Sets the given value for each property of the given set of names in the given map.
 *
 * @param styles The set of styles that need to be replaced.
 * @param propertyNames The names of the styles to replace.
 * @param value The value to replace each of the styles with.
 */
function fillValues(
  styles: ObjectMap<string>,
  propertyNames: string[],
  value: string,
) {
  propertyNames.forEach((propertyName) => {
    styles[propertyName] = value;
  });
}

/**
 * This function will merge the CSS variables from the public and remote configurations. Any variables in the public
 * configuration will override values in the remote configuration. Any values in the remote configuration that are
 * the empty string will be ignored.
 */
function mergeCSSVariables(
  publicVars: ObjectMap<string>,
  whiteLabelVariables: WhiteLabelTheme,
  carbonTheme: CarbonTheme,
  theme: ThemeType | undefined,
): ObjectMap<string> {
  carbonTheme = carbonTheme || CarbonTheme.G10;
  publicVars = publicVars || {};

  const internalOverrides = createInternalCSSOverridesMap(carbonTheme, theme);
  const result = { ...internalOverrides, ...publicVars };

  Object.entries(result).forEach(([key, value]) => {
    // Variables starting with "$" are carbon theme tokens and should all be colors
    if (key.startsWith("$") && !value.match(HEXADECIMAL_REGEX)) {
      console.warn(
        `${WA_CONSOLE_PREFIX} You tried to call "updateCSSVariables" with an invalid value for "${key}": "${publicVars[key]}". You must use hexadecimal values for colors.`,
      );
      // Delete color values that are not in hexadecimal format to ensure we can use them in methods in ./colors.
      delete result[key];
    }
  });

  const remoteVars = remoteStylesToCSSVars(
    whiteLabelVariables || {},
    carbonTheme,
  );

  Object.entries(remoteVars).forEach(([key, value]) => {
    if (value !== "" && publicVars[key] === undefined) {
      result[key] = value;
    }
  });

  return result;
}

/**
 * This function replaces the default carbon colors for some specific scss variables. After this function is called the
 * public and remote values in mergeCSSVariables can override whatever is set here.
 */
function createInternalCSSOverridesMap(
  carbonTheme: CarbonTheme,
  theme: ThemeType | undefined,
): ObjectMap<string> {
  let internalOverridesMap = {};
  if (theme !== ThemeType.CARBON_AI) {
    // Some carbon colors need to be overridden in order to support our theming options (when the user isn't using the
    // AI theme). For now these overrides only apply to the quick action chat buttons since their carbon default, link
    // blue, may not match the users theme. But this could be extended to other overrides in the future.
    if ([CarbonTheme.G10, CarbonTheme.WHITE].includes(carbonTheme)) {
      // In light themes make the quick action chat buttons black.
      internalOverridesMap = {
        ...internalOverridesMap,
        ...INTERNAL_OVERRIDES_LIGHT_THEME_MAP,
      };
    } else if ([CarbonTheme.G90, CarbonTheme.G100].includes(carbonTheme)) {
      // In dark themes make the quick action chat buttons white.
      internalOverridesMap = {
        ...internalOverridesMap,
        ...INTERNAL_OVERRIDES_DARK_THEME_MAP,
      };
    }
  }
  return internalOverridesMap;
}

// Given a themeState determine which classNames should be used on the "WACContainer--render" element.
function getThemeClassNames(themeState: ThemeState) {
  let themeClassnames: string;
  switch (themeState?.carbonTheme) {
    case CarbonTheme.WHITE:
      themeClassnames = CarbonThemeClassNames.WHITE;
      break;
    case CarbonTheme.G10:
      themeClassnames = CarbonThemeClassNames.G10;
      break;
    case CarbonTheme.G90:
      themeClassnames = CarbonThemeClassNames.G90;
      break;
    case CarbonTheme.G100:
      themeClassnames = CarbonThemeClassNames.G100;
      break;
    default:
      themeClassnames = CarbonThemeClassNames.G10;
      break;
  }

  if (themeState?.theme === ThemeType.CARBON_AI) {
    themeClassnames += " WAC--aiTheme";
  }

  return themeClassnames;
}

export { mergeCSSVariables, convertCSSVariablesToString, getThemeClassNames };
