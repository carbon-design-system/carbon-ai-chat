/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { Token } from "markdown-it";
import type {
  MarkdownItAttrsOptions,
  AttributePair,
  DetectingStrRule,
  DetectingRule,
  MatchedResult,
} from "./types.js";
import {
  escapeRegExp,
  get,
  last,
  isArrayOfObjects,
  isArrayOfFunctions,
} from "./utils.js";

/**
 * Parses attribute strings in the format {.class #id key=val} and returns an array of attribute key-value pairs.
 */
export function getAttrs(
  str: string,
  start: number,
  options: Required<MarkdownItAttrsOptions>,
): AttributePair[] {
  const allowedKeyChars = /[^\t\n\f />"'=]/;
  const pairSeparator = " ";
  const keySeparator = "=";
  const classChar = ".";
  const idChar = "#";

  const attrs: AttributePair[] = [];
  let key = "";
  let value = "";
  let parsingKey = true;
  let valueInsideQuotes = false;

  // Iterate through the string starting after the left delimiter
  for (
    let characterIndex = start + options.leftDelimiter.length;
    characterIndex < str.length;
    characterIndex++
  ) {
    // Check if we've reached the right delimiter (end of attributes)
    if (
      str.slice(
        characterIndex,
        characterIndex + options.rightDelimiter.length,
      ) === options.rightDelimiter
    ) {
      if (key !== "") {
        attrs.push([key, value]);
      }
      break;
    }
    const char_ = str.charAt(characterIndex);

    // Switch from parsing key to parsing value when we hit '='
    if (char_ === keySeparator && parsingKey) {
      parsingKey = false;
      continue;
    }

    // Handle class shorthand syntax: .classname or ..css-module
    if (char_ === classChar && key === "") {
      if (str.charAt(characterIndex + 1) === classChar) {
        key = "css-module";
        characterIndex += 1;
      } else {
        key = "class";
      }
      parsingKey = false;
      continue;
    }

    // Handle id shorthand syntax: #idname
    if (char_ === idChar && key === "") {
      key = "id";
      parsingKey = false;
      continue;
    }

    // Handle opening quote for attribute values
    if (char_ === '"' && value === "" && !valueInsideQuotes) {
      valueInsideQuotes = true;
      continue;
    }
    // Handle closing quote for attribute values
    if (char_ === '"' && valueInsideQuotes) {
      valueInsideQuotes = false;
      continue;
    }

    // Space separates attribute pairs (unless inside quotes)
    if (char_ === pairSeparator && !valueInsideQuotes) {
      if (key === "") {
        continue;
      }
      attrs.push([key, value]);
      key = "";
      value = "";
      parsingKey = true;
      continue;
    }

    // Skip invalid characters in key names
    if (parsingKey && char_.search(allowedKeyChars) === -1) {
      continue;
    }

    // Append character to either key or value
    if (parsingKey) {
      key += char_;
      continue;
    }
    value += char_;
  }

  // Filter attributes based on allowedAttributes option
  if (options.allowedAttributes && options.allowedAttributes.length) {
    return attrs.filter((attrPair) => {
      const attr = attrPair[0];
      return options.allowedAttributes.some((allowedAttribute) =>
        allowedAttribute instanceof RegExp
          ? allowedAttribute.test(attr)
          : attr === allowedAttribute,
      );
    });
  }
  return attrs;
}

/**
 * Applies an array of attribute pairs to a token, handling special cases for class and css-module attributes.
 */
export function addAttrs(attrs: AttributePair[], token: Token): Token {
  for (
    let attributeIndex = 0;
    attributeIndex < attrs.length;
    attributeIndex += 1
  ) {
    const key = attrs[attributeIndex][0];
    if (key === "class") {
      token.attrJoin("class", attrs[attributeIndex][1]);
    } else if (key === "css-module") {
      token.attrJoin("css-module", attrs[attributeIndex][1]);
    } else {
      token.attrPush(attrs[attributeIndex]);
    }
  }
  return token;
}

/**
 * Creates a function that tests whether a string contains attribute delimiters at a specified position (start, end, or only).
 */
export function hasDelimiters(
  where: "start" | "end" | "only",
  options: Required<MarkdownItAttrsOptions>,
): DetectingStrRule {
  if (!where) {
    throw new Error(
      'Parameter `where` not passed. Should be "start", "end" or "only".',
    );
  }

  return function (str: string): boolean {
    // Minimum length needed: { + at least one char + }
    const minCurlyLength =
      options.leftDelimiter.length + 1 + options.rightDelimiter.length;
    if (!str || typeof str !== "string" || str.length < minCurlyLength) {
      return false;
    }

    // Class/ID syntax requires an extra character (.class or #id)
    function validCurlyLength(curly: string): boolean {
      const isClass = curly.charAt(options.leftDelimiter.length) === ".";
      const isId = curly.charAt(options.leftDelimiter.length) === "#";
      return isClass || isId
        ? curly.length >= minCurlyLength + 1
        : curly.length >= minCurlyLength;
    }

    let start: number, end: number, slice: string, nextChar: string;
    const rightDelimiterMinimumShift =
      minCurlyLength - options.rightDelimiter.length;

    switch (where) {
      case "start":
        // Check if delimiters are at the start of the string
        slice = str.slice(0, options.leftDelimiter.length);
        start = slice === options.leftDelimiter ? 0 : -1;
        end =
          start === -1
            ? -1
            : str.indexOf(options.rightDelimiter, rightDelimiterMinimumShift);
        // Ensure the character after closing delimiter isn't part of the delimiter itself
        nextChar = str.charAt(end + options.rightDelimiter.length);
        if (nextChar && options.rightDelimiter.indexOf(nextChar) !== -1) {
          end = -1;
        }
        break;

      case "end":
        // Check if delimiters are at the end of the string
        start = str.lastIndexOf(options.leftDelimiter);
        end =
          start === -1
            ? -1
            : str.indexOf(
                options.rightDelimiter,
                start + rightDelimiterMinimumShift,
              );
        // Verify the closing delimiter is actually at the string's end
        end = end === str.length - options.rightDelimiter.length ? end : -1;
        break;

      case "only":
        // Check if the entire string is delimiters with content inside
        slice = str.slice(0, options.leftDelimiter.length);
        start = slice === options.leftDelimiter ? 0 : -1;
        slice = str.slice(str.length - options.rightDelimiter.length);
        end =
          slice === options.rightDelimiter
            ? str.length - options.rightDelimiter.length
            : -1;
        break;

      default:
        throw new Error(
          `Unexpected case ${where}, expected 'start', 'end' or 'only'`,
        );
    }

    // Valid if we found both delimiters and the content between them is valid
    return (
      start !== -1 &&
      end !== -1 &&
      validCurlyLength(
        str.substring(start, end + options.rightDelimiter.length),
      )
    );
  };
}

/**
 * Removes attribute delimiters and their contents from the end of a string.
 */
export function removeDelimiter(
  str: string,
  options: Required<MarkdownItAttrsOptions>,
): string {
  const start = escapeRegExp(options.leftDelimiter);
  const end = escapeRegExp(options.rightDelimiter);

  const curly = new RegExp(
    "[ \\n]?" + start + "[^" + start + end + "]+" + end + "$",
  );
  const pos = str.search(curly);

  return pos !== -1 ? str.slice(0, pos) : str;
}

/**
 * Finds the matching opening token for a given closing token by searching backwards through the token array.
 */
export function getMatchingOpeningToken(
  tokens: Token[],
  closingTokenIndex: number,
): Token | false {
  if (tokens[closingTokenIndex].type === "softbreak") {
    return false;
  }
  if (tokens[closingTokenIndex].nesting === 0) {
    return tokens[closingTokenIndex];
  }

  const targetLevel = tokens[closingTokenIndex].level;
  const expectedType = tokens[closingTokenIndex].type.replace(
    "_close",
    "_open",
  );

  for (let searchIndex = closingTokenIndex; searchIndex >= 0; searchIndex--) {
    if (
      tokens[searchIndex].type === expectedType &&
      tokens[searchIndex].level === targetLevel
    ) {
      return tokens[searchIndex];
    }
  }

  return false;
}

/**
 * Tests whether a token at a given index matches a detecting rule, recursively checking nested rules.
 */
export function test(
  tokens: Token[],
  baseIndex: number,
  rule: DetectingRule,
): MatchedResult {
  const result: MatchedResult = {
    match: false,
    j: null,
  };

  // Calculate the actual token index using shift (relative) or position (absolute)
  const targetIndex =
    rule.shift !== undefined ? baseIndex + rule.shift : rule.position;

  // Negative indices are invalid when using shift
  if (
    rule.shift !== undefined &&
    targetIndex !== undefined &&
    targetIndex < 0
  ) {
    return result;
  }

  // Get the token at the calculated index
  const token = get(tokens, targetIndex ?? 0);

  if (token === undefined) {
    return result;
  }

  // Test each property in the detecting rule
  for (const key of Object.keys(rule)) {
    // Skip internal position markers
    if (key === "shift" || key === "position") {
      continue;
    }

    // Token must have the property being tested
    if ((token as unknown as Record<string, unknown>)[key] === undefined) {
      return result;
    }

    // Special handling for children array matching
    if (key === "children" && isArrayOfObjects(rule.children)) {
      if (!token.children || token.children.length === 0) {
        return result;
      }
      let match: boolean;
      const childTests = rule.children;
      const children = token.children;

      // If all child tests use absolute positions, test those specific positions
      if (childTests.every((childRule) => childRule.position !== undefined)) {
        match = childTests.every(
          (childRule) =>
            test(children, childRule.position as number, childRule).match,
        );
        if (match) {
          // Calculate the actual index (handling negative positions)
          const childPosition = last(childTests).position as number;
          result.j =
            childPosition >= 0
              ? childPosition
              : children.length + childPosition;
        }
      } else {
        // Otherwise, scan through all children to find a matching sequence
        match = false;
        for (let childIndex = 0; childIndex < children.length; childIndex++) {
          match = childTests.every(
            (childRule) => test(children, childIndex, childRule).match,
          );
          if (match) {
            result.j = childIndex;
            break;
          }
        }
      }

      if (match === false) {
        return result;
      }

      continue;
    }

    // Get the values to compare
    const ruleValue = (rule as Record<string, unknown>)[key];
    const tokenValue = (token as unknown as Record<string, unknown>)[key];

    // Match based on the type of the test value
    switch (typeof ruleValue) {
      case "boolean":
      case "number":
      case "string":
        // Direct value comparison
        if (tokenValue !== ruleValue) {
          return result;
        }
        break;
      case "function":
        // Function predicate test
        if (!(ruleValue as (arg: unknown) => boolean)(tokenValue)) {
          return result;
        }
        break;
      case "object":
        // Array of function predicates (all must pass)
        if (isArrayOfFunctions(ruleValue)) {
          const allPass = ruleValue.every((predicate) => predicate(tokenValue));
          if (allPass === false) {
            return result;
          }
          break;
        }
        // For objects !== arrays of functions, throw error
        throw new Error(
          `Unknown type of pattern test (key: ${key}). Test should be of type boolean, number, string, function or array of functions.`,
        );
      default:
        throw new Error(
          `Unknown type of pattern test (key: ${key}). Test should be of type boolean, number, string, function or array of functions.`,
        );
    }
  }

  // All tests passed
  result.match = true;
  return result;
}
