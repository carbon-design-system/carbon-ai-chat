/*
 *  Copyright IBM Corp. 2025, 2026
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

import { ThemeState } from '../../types/state/AppState';
import ObjectMap from '../../types/utilities/ObjectMap';
import { WA_CONSOLE_PREFIX } from './constants';
import { CarbonTheme } from '../../types/config/CarbonTheme';

enum CarbonThemeClassNames {
  WHITE = 'cds--white',
  G10 = 'cds--g10',
  G90 = 'cds--g90',
  G100 = 'cds--g100',
}

// The prefix that is added to each CSS variable in the application.
const CSS_VAR_PREFIX = '--cds-';
const CSS_CHAT_PREFIX = 'aichat-';

// Regex to determine a 3 or 6 digit hexadecimal color
const HEXADECIMAL_REGEX = /#([a-f0-9]{3}){1,2}\b/i;

/**
 * Converts the given map of CSS variable into a string that is formatted for inserting into a style tag.
 */
function convertCSSVariablesToString(
  customProperties: ObjectMap<string>
): string {
  // Handle case where customProperties is undefined or null
  if (!customProperties) {
    return '';
  }

  // First convert the variables to a CSS string.
  const pieces = Object.keys(customProperties).map((key) => {
    const value = customProperties[key];
    if (value === undefined) {
      return '';
    }

    const fullName = key.startsWith('$')
      ? `${CSS_VAR_PREFIX}${key.replace(/^\$/, '')}`
      : `${CSS_VAR_PREFIX}${CSS_CHAT_PREFIX}${key}`;
    return `${fullName}:${value};`;
  });

  let customPropertiesString = '';
  const allValues = pieces.join('');
  const prefix = '';
  if (allValues.length > 0) {
    // Including a namespace in the styles allows us to support multiple widgets on the same page without their styles
    // conflicting.
    const rule = `${prefix} .cds-aichat--container--render.cds-aichat--container--render, ${prefix} .cds-aichat--container--render.cds--white, ${prefix} .cds-aichat--container--render.cds--g10, ${prefix} .cds-aichat--container--render.cds--g90, ${prefix} .cds-aichat--container--render.cds--g100`;
    customPropertiesString = `${rule}${`, :host`}{${allValues}}`;
  }

  return customPropertiesString;
}

/**
 * Validates the CSS variables supplied through `layout.customProperties`, dropping any Carbon theme token
 * (a key starting with "$") whose value is not a hexadecimal color.
 *
 * The copy is load-bearing: the map arriving here belongs to the merged config, which `ChatAppEntry` also
 * keeps as its change-detection baseline. Pruning the rejected key from it would leave the baseline missing
 * a key every freshly merged config still carries, so a value-identical update would compare as changed and
 * dispatch a config replace on every host render.
 */
function validateCustomProperties(
  publicVars: ObjectMap<string>
): ObjectMap<string> {
  const result = { ...publicVars };

  Object.entries(result).forEach(([key, value]) => {
    // Variables starting with "$" are carbon theme tokens and should all be colors
    if (key.startsWith('$') && !value.match(HEXADECIMAL_REGEX)) {
      console.warn(
        `${WA_CONSOLE_PREFIX} Invalid value for "layout.customProperties" key "${key}": "${publicVars[key]}". Carbon theme tokens (keys starting with "$") must use hexadecimal color values.`
      );
      // Delete color values that are not in hexadecimal format to ensure we can use them in methods in ./colors.
      delete result[key];
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
      themeClassnames = '';
      // Apply dark theme class if derived theme is dark
      if (
        themeState?.derivedCarbonTheme === CarbonTheme.G90 ||
        themeState?.derivedCarbonTheme === CarbonTheme.G100
      ) {
        themeClassnames += 'cds-aichat--dark';
      } else {
        themeClassnames += 'cds-aichat--light';
      }
      break;
    default:
      themeClassnames = CarbonThemeClassNames.G10;
      break;
  }

  if (themeState?.aiEnabled) {
    themeClassnames += ' cds-aichat--ai-theme';
  }

  return themeClassnames;
}

export {
  validateCustomProperties,
  convertCSSVariablesToString,
  getThemeClassNames,
};
