/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Format C — serialize {@link ApiRecord} array to one markdown reference page
 * per top-level symbol (members rendered as `##` sections). Returns a map of
 * `markdown/<Symbol>.md` → content, ready for an ingestion pipeline to embed as
 * self-contained chunks. Output is deterministic: sections with no content are
 * omitted, every file ends in a single trailing newline.
 */

/**
 * @param {import("./apiIndexCore.js").ApiRecord[]} records Sorted by key.
 * @param {{ version: string, baseUrl: string, generator: string }} meta
 * @returns {Record<string, string>} Relative path → file content.
 */
export function serializeMarkdown(records, meta) {
  const byKey = new Map(records.map((r) => [r.key, r]));
  const files = {};
  for (const r of records) {
    if (r.parent === null) {
      files[`markdown/${r.name}.md`] = renderSymbol(r, byKey, meta);
    }
  }
  return files;
}

function fullUrl(meta, url) {
  return meta.baseUrl + url;
}

function badges(r) {
  const out = [];
  if (r.deprecated) {
    out.push(
      `**Deprecated.**${r.deprecatedMessage ? ` ${r.deprecatedMessage}` : ""}`,
    );
  }
  if (r.experimental) {
    out.push("**Experimental.**");
  }
  return out;
}

function renderExamples(examples, lines) {
  if (!examples.length) {
    return;
  }
  lines.push("## Examples", "");
  for (const example of examples) {
    if (example.includes("```")) {
      lines.push(example, "");
    } else {
      lines.push("```ts", example, "```", "");
    }
  }
}

function renderSymbol(r, byKey, meta) {
  const lines = [`# ${r.name}`, ""];

  const topBadges = badges(r);
  if (topBadges.length) {
    lines.push(topBadges.join(" "), "");
  }

  lines.push(
    `- Kind: ${r.kind}`,
    `- Category: ${r.category}`,
    `- Reference: ${fullUrl(meta, r.url)}`,
    "",
  );

  if (r.summary) {
    lines.push(r.summary, "");
  }
  if (r.description) {
    lines.push(r.description, "");
  }

  if (r.signature) {
    lines.push("## Signature", "", "```ts", r.signature, "```", "");
  }
  if (r.signatures.length > 1) {
    lines.push("## Overloads", "", "```ts", ...r.signatures, "```", "");
  }

  renderExamples(r.examples, lines);

  if (r.members.length) {
    lines.push("## Members", "");
    for (const key of r.members) {
      const m = byKey.get(key);
      if (!m) {
        continue;
      }
      lines.push(`### ${m.name}`, "");
      if (m.signature) {
        lines.push("`" + m.signature + "`", "");
      }
      const memberBadges = badges(m);
      if (memberBadges.length) {
        lines.push(memberBadges.join(" "), "");
      }
      if (m.summary) {
        lines.push(m.summary, "");
      }
      renderExamples(m.examples, lines);
      lines.push(`[Reference](${fullUrl(meta, m.url)})`, "");
    }
  }

  if (r.related.length) {
    lines.push("## Related", "");
    for (const key of r.related) {
      const top = key.split(".")[0];
      lines.push(`- [${key}](./${top}.md)`);
    }
    lines.push("");
  }

  return `${lines.join("\n").replace(/\n+$/, "")}\n`;
}
