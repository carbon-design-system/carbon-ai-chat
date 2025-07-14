/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * A set of utilities for manipulating colors.
 */

import { gray100, white } from "@carbon/colors";
import Color from "color";

import { consoleError } from "./miscUtils";

// The minimum allowed contrast for accessibility rules.
const MIN_CONTRAST = 4.5;

/**
 * Converts the given hexadecimal formatted color string into an array with the red, blue and green components
 * separated. This function requires the string to be either a 3 or 6 digit hexadecimal code with a leading hash
 * mark. It does not validate that the string is in the proper format.
 */
function hexCodeToRGB(color: string): [number, number, number] {
  if (color.length === 7) {
    const red = color.substring(1, 3);
    const blue = color.substring(3, 5);
    const green = color.substring(5, 7);
    return [parseInt(red, 16), parseInt(blue, 16), parseInt(green, 16)];
  }
  if (color.length === 4) {
    const red = color.substring(1, 2);
    const blue = color.substring(2, 3);
    const green = color.substring(3, 4);
    return [
      parseInt(red + red, 16),
      parseInt(blue + blue, 16),
      parseInt(green + green, 16),
    ];
  }
  consoleError(`Unsupported color code: "${color}"`);
  return [0, 0, 0];
}

/**
 * Calculates the contrast ratio between the two colors. Contrast values can range from 1 to 21. A value of 4.5 is
 * considered the minimum between a foreground and background color to meet accessibility guidelines.
 *
 * @see https://www.w3.org/TR/WCAG20/#contrast-ratiodef
 */
function calculateContrast(color1: string, color2: string) {
  const rgb1 = hexCodeToRGB(color1);
  const rgb2 = hexCodeToRGB(color2);

  const luminance1 = calculateRelativeLuminance(rgb1);
  const luminance2 = calculateRelativeLuminance(rgb2);

  let contrast;
  if (luminance1 > luminance2) {
    contrast = (luminance1 + 0.05) / (luminance2 + 0.05);
  } else {
    contrast = (luminance2 + 0.05) / (luminance1 + 0.05);
  }

  return contrast;
}

/**
 * Calculates the relative luminance of the given color (provided as separate RGB values).
 *
 * @see https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
function calculateRelativeLuminance([r8, g8, b8]: [
  number,
  number,
  number
]): number {
  const rRGB = r8 / 255;
  const gRGB = g8 / 255;
  const bRGB = b8 / 255;

  const R = rRGB <= 0.03928 ? rRGB / 12.92 : ((rRGB + 0.055) / 1.055) ** 2.4;
  const G = gRGB <= 0.03928 ? gRGB / 12.92 : ((gRGB + 0.055) / 1.055) ** 2.4;
  const B = bRGB <= 0.03928 ? bRGB / 12.92 : ((bRGB + 0.055) / 1.055) ** 2.4;

  const luminance = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  return luminance;
}

/**
 * Returns either a white or a black color to use as the text color on a background of the given background color.
 * This will ensure that the text color chosen is of sufficient contrast.
 */
function whiteOrBlackText(background: string): string {
  return calculateContrast(gray100, background) >= MIN_CONTRAST
    ? gray100
    : white;
}

/**
 * Adjust a given color's lightness by a specified number of percentage points.
 */
function adjustLightness(token: string, shift: number) {
  const original = Color(token).hsl().object();

  return Color({ ...original, l: original.l + shift })
    .round()
    .hex()
    .toLowerCase();
}

export {
  MIN_CONTRAST,
  adjustLightness,
  whiteOrBlackText,
  hexCodeToRGB,
  calculateContrast,
};
