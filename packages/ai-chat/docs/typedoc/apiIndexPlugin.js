/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Emits a committed, machine-readable API symbol index from the same TypeDoc
 * data that renders the docs site, so the Carbon MCP ingestion can resolve doc
 * `{@link}` references and embed the API reference. See [docs/api/README.md](../api/README.md)
 * for the contract.
 *
 * Hooks `Renderer.EVENT_END` because the router — and thus resolved URLs — is
 * only live between render start and end in TypeDoc 0.28; the handler must stay
 * synchronous (an `await` before reading URLs would let TypeDoc null the
 * router). Output lands under `docs/api/` (committed), not `dist/` (gitignored).
 *
 * @type {import("typedoc").PluginHost}
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Renderer } from "typedoc";

import { extractRecords } from "./apiIndexCore.js";
import { serializeJsonIndex } from "./apiIndexJson.js";
import { serializeMarkdown } from "./apiIndexMarkdown.js";

const GENERATOR = "@carbon/ai-chat typedoc apiIndexPlugin";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(HERE, "../api");

/**
 * The version this index describes, read from `packages/ai-chat/package.json`.
 * The release workflow runs `npm run docs:api` after `lerna publish` has
 * already bumped and committed that version, so this resolves to the exact
 * tag just published — RC (`1.17.0-rc.0`) or full release alike — not just
 * the latest full release.
 */
function releasedVersion() {
  const pkg = JSON.parse(
    readFileSync(resolve(HERE, "../../package.json"), "utf8"),
  );
  return pkg.version;
}

/**
 * The docs site serves every published version at `version/v<version>/docs/`,
 * a pinned path that keeps working after later releases ship — unlike
 * `tag/latest`, which always points at the newest full release and would
 * make committed links go stale within a couple of weeks.
 */
function baseUrlFor(version) {
  return `https://chat.carbondesignsystem.com/version/v${version}/docs/`;
}

export function load(app) {
  app.renderer.on(Renderer.EVENT_END, (event) => {
    // The committed index is regenerated only when cutting an RC or full
    // release (see release-base.yml) — and on demand via `npm run docs:api`,
    // which sets this flag. Normal builds and the `aiChat:start` watch must not
    // churn it, so skip writing unless explicitly requested.
    if (!process.env.WRITE_API_INDEX) {
      return;
    }

    const router = app.renderer.router;
    if (!router) {
      app.logger.warn(
        "apiIndexPlugin: renderer.router unavailable at EVENT_END; skipping API index.",
      );
      return;
    }

    const version = releasedVersion();
    const meta = {
      version: `v${version}`,
      baseUrl: baseUrlFor(version),
      generator: GENERATOR,
    };

    const records = extractRecords(event.project, router);
    const markdown = serializeMarkdown(records, meta);

    // Rewrite markdown/ from scratch so deleted symbols don't leave stale files.
    const markdownDir = join(OUT_DIR, "markdown");
    rmSync(markdownDir, { recursive: true, force: true });
    mkdirSync(markdownDir, { recursive: true });

    writeFileSync(
      join(OUT_DIR, "symbol-index.json"),
      serializeJsonIndex(records, meta),
    );
    for (const [relativePath, content] of Object.entries(markdown)) {
      writeFileSync(join(OUT_DIR, relativePath), content);
    }

    app.logger.info(
      `apiIndexPlugin: wrote ${records.length} symbol records and ${
        Object.keys(markdown).length
      } markdown pages to docs/api/.`,
    );
  });
}
