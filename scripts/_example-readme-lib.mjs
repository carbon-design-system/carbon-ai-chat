/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { globby } from "globby";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const REPO_ROOT = path.resolve(__dirname, "..");

export const REQUIRED_SECTIONS = [
  "What this example shows",
  "When to use this pattern",
  "APIs and props demonstrated",
];

export const AGGREGATOR_INDEX_START = "<!-- verify:examples-index:start -->";
export const AGGREGATOR_INDEX_END = "<!-- verify:examples-index:end -->";

const TREES = ["react", "web-components"];

/**
 * Walk both example trees and return descriptors for every example that has a
 * README and a package.json. Skips dist-only stubs.
 */
export async function discoverExamples(treeFilter) {
  const trees = treeFilter
    ? TREES.filter((t) => t === treeFilter)
    : TREES.slice();
  const out = [];
  for (const tree of trees) {
    const treeRoot = path.join(REPO_ROOT, "examples", tree);
    const dirs = await globby(["*/README.md"], {
      cwd: treeRoot,
      onlyFiles: true,
    });
    for (const rel of dirs) {
      const dir = path.dirname(rel);
      const readmePath = path.join(treeRoot, dir, "README.md");
      const packageJsonPath = path.join(treeRoot, dir, "package.json");
      let pkg;
      try {
        pkg = JSON.parse(await readFile(packageJsonPath, "utf8"));
      } catch {
        // No package.json — not a real example, skip.
        continue;
      }
      out.push({
        tree,
        dir,
        relativePath: path.posix.join("examples", tree, dir),
        readmePath,
        packageJsonPath,
        packageName: pkg.name,
        scripts: pkg.scripts ?? {},
      });
    }
  }
  return out;
}

/**
 * Parse the per-example README into `{ title, summary, sections, raw }`.
 * Hand-rolled splitter — we only need the H1 + the three required H2s.
 */
export function parseExampleReadme(raw) {
  const lines = raw.split("\n");
  let title = null;
  let summary = null;
  const sections = new Map();

  let cursor = 0;
  while (cursor < lines.length && title === null) {
    const line = lines[cursor];
    if (line.startsWith("# ")) {
      title = line.slice(2).trim();
    }
    cursor++;
  }

  // First non-blank paragraph after the H1 is the summary.
  while (cursor < lines.length && lines[cursor].trim() === "") cursor++;
  const summaryLines = [];
  while (
    cursor < lines.length &&
    lines[cursor].trim() !== "" &&
    !lines[cursor].startsWith("#")
  ) {
    summaryLines.push(lines[cursor].trim());
    cursor++;
  }
  summary = summaryLines.join(" ").trim() || null;

  // Walk H2 sections.
  let currentName = null;
  let currentBody = [];
  for (; cursor < lines.length; cursor++) {
    const line = lines[cursor];
    if (line.startsWith("## ")) {
      if (currentName !== null) {
        sections.set(currentName, joinAndTrim(currentBody));
      }
      currentName = line.slice(3).trim();
      currentBody = [];
    } else if (line.startsWith("# ")) {
      // hit another H1 — stop
      if (currentName !== null) {
        sections.set(currentName, joinAndTrim(currentBody));
      }
      currentName = null;
      currentBody = [];
    } else if (currentName !== null) {
      currentBody.push(line);
    }
  }
  if (currentName !== null) {
    sections.set(currentName, joinAndTrim(currentBody));
  }

  return { title, summary, sections, raw };
}

function joinAndTrim(lines) {
  // strip leading and trailing blank lines
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim() === "") start++;
  while (end > start && lines[end - 1].trim() === "") end--;
  return lines.slice(start, end).join("\n");
}

/**
 * Returns a list of contract-violation messages for one parsed README.
 * Empty list = clean.
 */
export function validateExampleReadmeShape(parsed, descriptor) {
  const errors = [];
  if (!parsed.title) {
    errors.push(`${descriptor.relativePath}/README.md: missing top-level "# Title" heading.`);
  }
  if (!parsed.summary) {
    errors.push(`${descriptor.relativePath}/README.md: missing summary paragraph after the title.`);
  }
  for (const heading of REQUIRED_SECTIONS) {
    if (!parsed.sections.has(heading)) {
      errors.push(
        `${descriptor.relativePath}/README.md: missing required section "## ${heading}".`,
      );
      continue;
    }
    const body = parsed.sections.get(heading).trim();
    if (!body) {
      errors.push(
        `${descriptor.relativePath}/README.md: section "## ${heading}" is empty.`,
      );
    }
    if (heading === "APIs and props demonstrated" && !body.includes("|")) {
      errors.push(
        `${descriptor.relativePath}/README.md: section "## APIs and props demonstrated" must contain a markdown table (no "|" found).`,
      );
    }
  }
  return errors;
}

/**
 * Pick the most-useful start command for the aggregator table.
 */
export function deriveStartCommand(descriptor) {
  const { packageName, scripts } = descriptor;
  if (scripts.start) {
    return `\`npm run start --workspace=${packageName}\``;
  }
  if (scripts.dev) {
    return `\`npm run dev --workspace=${packageName}\``;
  }
  if (scripts.test) {
    return `\`npm run test --workspace=${packageName}\``;
  }
  return "n/a";
}

/**
 * Render a generated aggregator section block. Includes the markers and one
 * H3 section per example with title link, summary, start command, and the
 * verbatim "APIs and props demonstrated" table copied from the per-example
 * README. `examples` is in display order.
 */
export function renderAggregatorSections(examples) {
  const blocks = examples.map(({ descriptor, parsed }) =>
    buildAggregatorSection(descriptor, parsed),
  );
  return [
    AGGREGATOR_INDEX_START,
    "",
    blocks.join("\n\n"),
    "",
    AGGREGATOR_INDEX_END,
  ].join("\n");
}

/**
 * Build a single aggregator H3 section from a descriptor + parsed README.
 */
export function buildAggregatorSection(descriptor, parsed) {
  const heading = `### [${parsed.title}](./${descriptor.dir}/README.md)`;
  const summary = parsed.summary ?? "";
  const startCommand = `**Start command:** ${deriveStartCommand(descriptor)}`;
  const apisBody = parsed.sections.get("APIs and props demonstrated")?.trim();
  // GitHub requires a blank line after <summary> for the inner markdown table
  // to render instead of being treated as inline HTML.
  const apisBlock = apisBody
    ? `<details>\n<summary>APIs and props demonstrated</summary>\n\n${apisBody}\n\n</details>`
    : "_(APIs section missing — run `npm run verify:example-readmes`)_";
  return [heading, "", summary, "", startCommand, "", apisBlock].join("\n");
}

/**
 * Locate the aggregator markers in the file. Returns
 * { startIndex, endIndex, before, after } where `before`/`after` are the
 * surrounding text and the indices point at the marker lines themselves
 * (so callers can splice). If the markers are not found, returns `null`.
 */
export function locateAggregatorMarkers(raw) {
  const startMarkerIndex = raw.indexOf(AGGREGATOR_INDEX_START);
  const endMarkerIndex = raw.indexOf(AGGREGATOR_INDEX_END);
  if (startMarkerIndex === -1 || endMarkerIndex === -1) {
    return null;
  }
  if (endMarkerIndex < startMarkerIndex) {
    return null;
  }
  const before = raw.slice(0, startMarkerIndex);
  const after = raw.slice(endMarkerIndex + AGGREGATOR_INDEX_END.length);
  return { before, after };
}

/**
 * Splice a freshly-rendered section block into the aggregator file body.
 */
export function spliceAggregator(raw, renderedBlock) {
  const located = locateAggregatorMarkers(raw);
  if (!located) {
    throw new Error(
      "Aggregator README is missing the verify:examples-index markers.",
    );
  }
  return located.before + renderedBlock + located.after;
}

/**
 * Read + parse one example. Returns the descriptor with `parsed`/`raw` populated.
 */
export async function loadExample(descriptor) {
  const raw = await readFile(descriptor.readmePath, "utf8");
  const parsed = parseExampleReadme(raw);
  return { descriptor, parsed, raw };
}

/**
 * Read all examples for a tree and parse them.
 */
export async function loadTree(tree) {
  const descriptors = await discoverExamples(tree);
  const loaded = [];
  for (const d of descriptors) {
    loaded.push(await loadExample(d));
  }
  return loaded;
}

/**
 * Read a aggregator README file (./examples/<tree>/README.md).
 */
export async function readAggregator(tree) {
  const aggregatorPath = path.join(REPO_ROOT, "examples", tree, "README.md");
  const raw = await readFile(aggregatorPath, "utf8");
  return { aggregatorPath, raw };
}

/**
 * Sort entries alphabetically by directory slug, with one exception: `basic-*`
 * baselines always come first. Other slug prefixes (`custom-element-`,
 * `history-`, `input-`, etc.) cluster naturally under alphabetical order.
 */
export function sortExamples(entries) {
  return [...entries].sort((a, b) => {
    const aBasic = a.descriptor.dir.startsWith("basic-");
    const bBasic = b.descriptor.dir.startsWith("basic-");
    if (aBasic !== bBasic) return aBasic ? -1 : 1;
    return a.descriptor.dir.localeCompare(b.descriptor.dir);
  });
}
