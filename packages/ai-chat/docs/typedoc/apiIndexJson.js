/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Format A — serialize {@link ApiRecord} array to the flat JSON lookup map.
 * `symbols` is keyed by the exact `{@link}` target so a consumer resolves a
 * reference with an O(1) lookup. Output is byte-stable: records arrive sorted
 * by key, fields are written in a fixed order, two-space indented, with a
 * trailing newline — so the CI `git diff --exit-code` is reliable.
 */

/**
 * @param {import("./apiIndexCore.js").ApiRecord[]} records Sorted by key.
 * @param {{ version: string, baseUrl: string, generator: string }} meta
 * @returns {string} JSON text (trailing newline included).
 */
export function serializeJsonIndex(records, meta) {
  const symbols = {};
  for (const r of records) {
    symbols[r.key] = {
      name: r.name,
      kind: r.kind,
      parent: r.parent,
      category: r.category,
      summary: r.summary,
      description: r.description,
      signature: r.signature,
      signatures: r.signatures,
      members: r.members,
      related: r.related,
      examples: r.examples,
      deprecated: r.deprecated,
      deprecatedMessage: r.deprecatedMessage,
      experimental: r.experimental,
      url: r.url,
      anchor: r.anchor,
    };
  }
  const doc = {
    version: meta.version,
    baseUrl: meta.baseUrl,
    generator: meta.generator,
    symbols,
  };
  return `${JSON.stringify(doc, null, 2)}\n`;
}
