#!/usr/bin/env node
/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

import {
  loadTree,
  readAggregator,
  renderAggregatorSections,
  spliceAggregator,
  sortExamples,
} from "./_example-readme-lib.mjs";

const TREES = ["react", "web-components"];

const { values } = parseArgs({
  options: {
    from: { type: "string", default: "examples" },
    tree: { type: "string" },
    "dry-run": { type: "boolean", default: false },
    yes: { type: "boolean", default: false },
  },
});

if (values.from !== "examples") {
  console.error(
    `repair-example-readmes: --from=${values.from} not implemented yet (only --from=examples is supported).`,
  );
  process.exit(2);
}

const trees = values.tree ? [values.tree] : TREES;

for (const tree of trees) {
  const loaded = sortExamples(await loadTree(tree));
  const { aggregatorPath, raw } = await readAggregator(tree);

  const rendered = renderAggregatorSections(loaded);
  const next = spliceAggregator(raw, rendered);

  if (next === raw) {
    console.log(`repair:example-readmes: ${tree} already in sync.`);
    continue;
  }

  if (values["dry-run"]) {
    console.log(
      `repair:example-readmes: ${aggregatorPath} would be rewritten (dry-run).`,
    );
    continue;
  }

  await writeFile(aggregatorPath, next, "utf8");
  console.log(`repair:example-readmes: regenerated ${aggregatorPath}`);
}
