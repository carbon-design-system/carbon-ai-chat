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

import { ThemeState } from "../../types/state/AppState";
import ObjectMap from "../../types/utilities/ObjectMap";
import { adjustLightness } from "./colors";
import { WA_CONSOLE_PREFIX } from "./constants";
import { CarbonTheme } from "../../types/config/PublicConfig";
import { WhiteLabelTheme } from "../../types/config/WhiteLabelTheme";

enum CarbonThemeClassNames {
  WHITE = "cds--white",
  G10 = "cds--g10",
  G90 = "cds--g90",
  G100 = "cds--g100",
}

// The prefix that is added to each CSS variable in the application.
const CSS_VAR_PREFIX = "--cds-";
const CSS_CHAT_PREFIX = "aichat-";

// Regex to determine a 3 or 6 digit hexadecimal color
const HEXADECIMAL_REGEX = /#([a-f0-9]{3}){1,2}\b/i;

/**
 * Converts the given map of CSS variable into a string that is formatted for inserting into a style tag.
 */
function convertCSSVariablesToString(
  customProperties: ObjectMap<string>,
): string {
  // Handle case where customProperties is undefined or null
  if (!customProperties) {
    return "";
  }

  // First convert the variables to a CSS string.
  const pieces = Object.keys(customProperties).map((key) => {
    const value = customProperties[key];
    if (value === undefined) {
      return "";
    }

    const fullName = key.startsWith("$")
      ? `${CSS_VAR_PREFIX}${key.replace(/^\$/, "")}`
      : `${CSS_VAR_PREFIX}${CSS_CHAT_PREFIX}${key}`;
    return `${fullName}:${value};`;
  });

  let customPropertiesString = "";
  const allValues = pieces.join("");
  const prefix = "";
  if (allValues.length > 0) {
    // Including a namespace in the styles allows us to support multiple widgets on the same page without their styles
    // conflicting.
    const rule = `${prefix} .cds-aichat--container--render.cds-aichat--container--render, ${prefix} .cds-aichat--container--render.cds--white, ${prefix} .cds-aichat--container--render.cds--g10, ${prefix} .cds-aichat--container--render.cds--g90, ${prefix} .cds-aichat--container--render.cds--g100`;
    customPropertiesString = `${rule}${`, :host`}{${allValues}}`;
  }

  return customPropertiesString;
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
  carbonTheme: CarbonTheme | null,
): Promise<ObjectMap<string>> {
  const cssOverrides: ObjectMap<string> = {};

  const themeColor = whiteLabelVariables.quickThemeHex;

  if (themeColor) {
    if (!carbonTheme) {
      // Inherit mode: do not override Carbon token colors
      return cssOverrides;
    }
    const colorMap = ACCENT_COLOR_MAPS[carbonTheme];

    // The custom color basically corresponds to Blue 60 are we will replace all the occurrences of Blue 60 with
    // that custom color. For the other shades of blue, we will calculate a relative color from the custom color and
    // replace those colors with this calculated color.
    const themeColorBlue20 = await adjustLightness(themeColor, 40);
    const themeColorBlue60Hover = await adjustLightness(themeColor, -8);
    const themeColorBlue80 = await adjustLightness(themeColor, -20);

    fillValues(cssOverrides, colorMap.blue20, themeColorBlue20);
    fillValues(cssOverrides, colorMap.blue60, themeColor);
    fillValues(cssOverrides, colorMap.blue60Hover, themeColorBlue60Hover);
    fillValues(cssOverrides, colorMap.blue80, themeColorBlue80);
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
  _aiEnabled: boolean,
): ObjectMap<string> {
  carbonTheme = carbonTheme || CarbonTheme.G10;
  publicVars = publicVars || {};

  const result = publicVars;

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

// Given a themeState determine which classNames should be used on the "cds-aichat--container--render" element.
function getThemeClassNames(themeState: ThemeState) {
  let themeClassnames: string;

  // If no explicit theme was provided, inherit from host and avoid applying Carbon theme classes
  switch (themeState?.originalCarbonTheme) {
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
    case null:
      // Inherit mode - don't apply theme classes, inherit from parent
      themeClassnames = "";
      // Apply dark theme class if derived theme is dark
      if (
        themeState?.derivedCarbonTheme === CarbonTheme.G90 ||
        themeState?.derivedCarbonTheme === CarbonTheme.G100
      ) {
        themeClassnames += "cds-aichat--dark";
      } else {
        themeClassnames += "cds-aichat--light";
      }
      break;
    default:
      themeClassnames = CarbonThemeClassNames.G10;
      break;
  }

  if (themeState?.aiEnabled) {
    themeClassnames += " cds-aichat--ai-theme";
  }

  return themeClassnames;
}

export { mergeCSSVariables, convertCSSVariablesToString, getThemeClassNames };
