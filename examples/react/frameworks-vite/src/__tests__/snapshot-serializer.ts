/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { SnapshotSerializer } from "vitest";

/**
 * Custom snapshot serializer for Vitest 4+ to handle dynamic content in shadow DOM.
 *
 * This serializer addresses two main issues that arose after upgrading from Vitest 1.6.0 to 4.0:
 *
 * 1. **Lit Comment Markers**: Lit elements include dynamic comment markers like `<!--?lit$571002414$-->`
 *    where the numeric ID changes on every test run, causing snapshot mismatches.
 *
 * 2. **SVG UUID-based IDs**: Carbon components generate SVG gradients with UUID-based IDs like
 *    `id="b2b30032-01c1-4f29-906c-51844309993e-1"` that are dynamically generated and change
 *    between test runs.
 *
 * The serializer normalizes these dynamic values to stable placeholders, ensuring snapshots
 * remain consistent across test runs while still capturing the structure of the rendered output.
 */

/**
 * Normalize dynamic content in a string.
 */
export function normalizeSnapshot(val: string): string {
  let normalized = val;

  // Normalize Lit comment markers with dynamic IDs
  // Before: <!--?lit$571002414$-->
  // After:  <!--?lit$NORMALIZED$-->
  normalized = normalized.replace(
    /<!--\?lit\$\d+\$-->/g,
    "<!--?lit$NORMALIZED$-->",
  );

  // Normalize UUID-based IDs in SVG elements (and their references)
  // These appear in gradients, clip paths, and other SVG definitions
  // Before: id="b2b30032-01c1-4f29-906c-51844309993e-1"
  // After:  id="UUID-NORMALIZED-1"
  //
  // We need to track UUID mappings to ensure references (url(#uuid)) match their definitions
  const uuidMap = new Map<string, string>();
  let uuidCounter = 0;

  // First pass: find all UUIDs and create stable mappings
  const uuidRegex =
    /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(-\d+)?/g;
  let match;
  while ((match = uuidRegex.exec(normalized)) !== null) {
    const baseUuid = match[1];
    if (!uuidMap.has(baseUuid)) {
      uuidCounter++;
      uuidMap.set(baseUuid, `UUID-${uuidCounter}`);
    }
  }

  // Second pass: replace all UUIDs with their stable mappings
  normalized = normalized.replace(
    /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(-\d+)?/g,
    (fullMatch, baseUuid, suffix) => {
      const stableId = uuidMap.get(baseUuid);
      return `${stableId}${suffix || ""}`;
    },
  );

  return normalized;
}

export const shadowDomSerializer: SnapshotSerializer = {
  serialize(val, _config, indentation, _depth, _refs, _printer) {
    // Get the default HTML serialization
    const htmlString =
      typeof val === "string"
        ? val
        : val && typeof val === "object" && "outerHTML" in val
          ? (val as Element).outerHTML
          : String(val);

    // Normalize dynamic content
    const normalized = normalizeSnapshot(htmlString);

    // Return the normalized string with proper indentation
    return normalized
      .split("\n")
      .map((line, i) => (i === 0 ? line : indentation + line))
      .join("\n");
  },
  test(val) {
    // Only apply to DOM elements
    return (
      val != null &&
      typeof val === "object" &&
      "nodeType" in val &&
      val.nodeType === 1
    );
  },
};
