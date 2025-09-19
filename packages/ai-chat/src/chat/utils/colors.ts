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

import { consoleError } from "./miscUtils";

/**
 * Converts the given color string into an array with the red, green and blue components
 * separated. Supports hex codes, rgb(), rgba(), hsl(), and hsla() formats.
 */
function colorToRGB(color: string): [number, number, number] {
  const trimmedColor = color.trim().toLowerCase();

  // Handle hex colors
  if (trimmedColor.startsWith("#")) {
    return hexCodeToRGB(trimmedColor);
  }

  // Handle rgb/rgba colors
  const rgbMatch = trimmedColor.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+)?\s*\)/,
  );
  if (rgbMatch) {
    return [
      parseInt(rgbMatch[1], 10),
      parseInt(rgbMatch[2], 10),
      parseInt(rgbMatch[3], 10),
    ];
  }

  // Handle hsl/hsla colors - convert to RGB
  const hslMatch = trimmedColor.match(
    /hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(?:,\s*[\d.]+)?\s*\)/,
  );
  if (hslMatch) {
    const h = parseInt(hslMatch[1], 10) / 360;
    const s = parseInt(hslMatch[2], 10) / 100;
    const l = parseInt(hslMatch[3], 10) / 100;
    return hslToRgb(h, s, l);
  }

  consoleError(`Unsupported color format: "${color}"`);
  return [0, 0, 0];
}

/**
 * Converts the given hexadecimal formatted color string into an array with the red, blue and green components
 * separated. This function requires the string to be either a 3 or 6 digit hexadecimal code with a leading hash
 * mark. It does not validate that the string is in the proper format.
 */
function hexCodeToRGB(color: string): [number, number, number] {
  // Validate hex color format
  if (!color.startsWith("#") || !/^#[0-9a-fA-F]+$/.test(color)) {
    consoleError(`Unsupported color code: "${color}"`);
    return [0, 0, 0];
  }

  if (color.length === 7) {
    const red = color.substring(1, 3);
    const green = color.substring(3, 5);
    const blue = color.substring(5, 7);
    return [parseInt(red, 16), parseInt(green, 16), parseInt(blue, 16)];
  }
  if (color.length === 4) {
    const red = color.substring(1, 2);
    const green = color.substring(2, 3);
    const blue = color.substring(3, 4);
    return [
      parseInt(red + red, 16),
      parseInt(green + green, 16),
      parseInt(blue + blue, 16),
    ];
  }
  consoleError(`Unsupported color code: "${color}"`);
  return [0, 0, 0];
}

/**
 * Converts HSL to RGB values.
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) {
        t += 1;
      }
      if (t > 1) {
        t -= 1;
      }
      if (t < 1 / 6) {
        return p + (q - p) * 6 * t;
      }
      if (t < 1 / 2) {
        return q;
      }
      if (t < 2 / 3) {
        return p + (q - p) * (2 / 3 - t) * 6;
      }
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Calculates the relative luminance of the given color (provided as separate RGB values).
 *
 * @see https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
function calculateRelativeLuminance([r8, g8, b8]: [
  number,
  number,
  number,
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
 * Adjust a given color's lightness by a specified number of percentage points.
 */
async function adjustLightness(token: string, shift: number) {
  const colorModule = await import("color");
  const Color = "default" in colorModule ? colorModule.default : colorModule;
  const original = Color(token).hsl().object();

  return Color({ ...original, l: original.l + shift })
    .round()
    .hex()
    .toLowerCase();
}

/**
 * Checks if a color (from a CSS variable or hex string) is lighter than the specified threshold.
 * Returns true if the color has lightness greater than the threshold percentage.
 */
function isColorLighterThan(color: string, thresholdPercent = 50): boolean {
  try {
    let colorValue = color.trim();

    // If it's a CSS variable, try to get the computed value
    if (colorValue.startsWith("var(")) {
      const computedStyle = getComputedStyle(document.documentElement);
      const variableName = colorValue.match(/var\(([^)]+)\)/)?.[1];
      if (variableName) {
        colorValue = computedStyle.getPropertyValue(variableName).trim();
      }
    }

    // If we still don't have a valid color, return false
    if (
      !colorValue ||
      colorValue === "" ||
      colorValue === "var(--cds-aichat-shell-background)"
    ) {
      return false;
    }

    // Convert to RGB and calculate relative luminance
    const rgb = colorToRGB(colorValue);
    const luminance = calculateRelativeLuminance(rgb);

    // Convert luminance to lightness percentage (approximate)
    // Lightness in HSL is roughly related to luminance but not exactly the same
    // This is a simplified approximation
    const lightnessPercent = Math.sqrt(luminance) * 100;

    return lightnessPercent > thresholdPercent;
  } catch (error) {
    consoleError(`Error checking color lightness for "${color}": ${error}`);
    return false;
  }
}

/**
 * Gets the computed value of a CSS custom property (CSS variable).
 */
function getCSSVariableValue(variableName: string): string | null {
  try {
    const computedStyle = getComputedStyle(document.documentElement);
    const value = computedStyle.getPropertyValue(variableName).trim();
    return value || null;
  } catch (error) {
    consoleError(`Error getting CSS variable "${variableName}": ${error}`);
    return null;
  }
}

export { adjustLightness, isColorLighterThan, getCSSVariableValue };
