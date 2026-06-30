#!/usr/bin/env node
/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { parseArgs } from "node:util";

import {
  loadTree,
  readAggregator,
  validateExampleReadmeShape,
  renderAggregatorSections,
  locateAggregatorMarkers,
  sortExamples,
  AGGREGATOR_INDEX_START,
  AGGREGATOR_INDEX_END,
} from "./_example-readme-lib.mjs";

const TREES = ["react", "web-components"];

const { values } = parseArgs({
  options: {
    tree: { type: "string" },
    "examples-only": { type: "boolean", default: false },
    "aggregator-only": { type: "boolean", default: false },
  },
});

const trees = values.tree ? [values.tree] : TREES;

const errors = [];

for (const tree of trees) {
  const loaded = sortExamples(await loadTree(tree));

  if (!values["aggregator-only"]) {
    for (const entry of loaded) {
      const sectionErrors = validateExampleReadmeShape(
        entry.parsed,
        entry.descriptor,
      );
      errors.push(...sectionErrors);
    }
  }

  if (!values["examples-only"]) {
    const { aggregatorPath, raw } = await readAggregator(tree);
    const located = locateAggregatorMarkers(raw);
    if (!located) {
      errors.push(
        `${aggregatorPath}: missing aggregator markers ${AGGREGATOR_INDEX_START} ... ${AGGREGATOR_INDEX_END}`,
      );
      continue;
    }

    const expected = renderAggregatorSections(loaded);
    const actualBlock = raw.slice(
      raw.indexOf(AGGREGATOR_INDEX_START),
      raw.indexOf(AGGREGATOR_INDEX_END) + AGGREGATOR_INDEX_END.length,
    );
    if (normalizeBlock(actualBlock) !== normalizeBlock(expected)) {
      errors.push(
        `${aggregatorPath}: aggregator section list is out of sync with per-example READMEs.\n` +
          `Run \`npm run repair:example-readmes -- --from=examples\` to regenerate it.`,
      );
    }
  }
}

/**
 * Compare aggregator block contents structurally rather than byte-for-byte so
 * that downstream prettier formatting (column-width padding on tables,
 * paragraph rewraps) does not trip the verifier.
 */
function normalizeBlock(block) {
  return block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line) => {
      if (!line.startsWith("|")) {
        // Collapse internal whitespace runs in prose lines so prettier's
        // line-wrap doesn't matter once lines are joined.
        return line.replace(/\s+/g, " ");
      }
      // Collapse the row to a canonical shape: every cell trimmed, separator
      // rows reduced to a single dash per cell so prettier's column-width
      // padding (which inserts both spaces and dashes) doesn't trip us.
      return line
        .split("|")
        .map((cell) => {
          const trimmed = cell.trim();
          if (/^-+:?$/.test(trimmed) || /^:?-+:?$/.test(trimmed)) {
            return "-";
          }
          return trimmed.replace(/\s+/g, " ");
        })
        .join("|");
    })
    .join("\n");
}

if (errors.length > 0) {
  console.error("verify:example-readmes failed:\n");
  for (const e of errors) {
    console.error(`  - ${e}`);
  }
  process.exit(1);
}

console.log(
  `verify:example-readmes: ${trees.join(", ")} OK (${TREES.length} tree(s) checked).`,
);
