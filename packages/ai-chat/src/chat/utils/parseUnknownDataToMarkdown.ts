/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Attempts to parse the given value into a markdown string. If the value is an object or a JSON string,
 * it is pretty printed as a code block. Otherwise, string content is returned as-is and other primitives are
 * converted to strings.
 *
 * @param data The value to normalize.
 * @returns Markdown formatted string or `undefined` if the value cannot be represented.
 */
function parseUnknownDataToMarkdown(data: unknown): string | undefined {
  if (!data) {
    return undefined;
  }

  try {
    if (typeof data === "object") {
      return `\`\`\`\n${JSON.stringify(data, null, 2)}\n\`\`\`\n`;
    }

    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        return `\`\`\`\n${JSON.stringify(parsed, null, 2)}\n\`\`\`\n`;
      } catch (_error) {
        return data;
      }
    }

    return String(data);
  } catch (error) {
    console.error("Cannot parse step content", error);
    return undefined;
  }
}

export { parseUnknownDataToMarkdown };
