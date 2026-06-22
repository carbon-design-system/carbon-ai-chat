/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { CarbonTheme } from "./theme/index.js";
import { applyCarbonRules } from "./theme/markdownItCarbon.js";
import { Converter, ParameterType } from "typedoc";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { promises as fs, cpSync } from "fs";

const require = createRequire(import.meta.url);

const CARBON_ASSETS = [
  "carbonSearch.js",
  "carbonSearchModal.js",
  "redirectToOverview.js",
  "carbonTheme.css",
  "cookiePreferences.js",
  "versionDropdown.js",
  "experimentalToPreview.js",
];

export function load(app) {
  app.renderer.defineTheme("carbon", CarbonTheme);

  // Render Markdown tables, fenced code, and lists as Carbon web components. The
  // loader runs against TypeDoc's single shared markdown-it instance, so it covers
  // both project documents and Markdown inside TSDoc comments. Set on Converter
  // begin (not in load): bootstrap calls options.reset() after plugins load, which
  // would otherwise discard the value. EVENT_BEGIN re-fires on watch rebuilds too.
  app.converter.on(Converter.EVENT_BEGIN, () => {
    app.options.setValue("markdownItLoader", (parser) =>
      applyCarbonRules(parser),
    );
  });

  app.options.addDeclaration({
    name: "versionsFile",
    help: "Path to a versions.js file to copy to the docs output root. Resolved relative to typedoc.json. Omit to skip.",
    type: ParameterType.Path,
  });

  const themeDir = dirname(fileURLToPath(import.meta.url));
  const assetDir = join(themeDir, "theme", "assets");

  app.renderer.on("beginRender", async (event) => {
    // Vendor the self-contained @carbon/ai-chat-components bundle that provides
    // cds-aichat-code-snippet (plus its lazily-imported CodeMirror runtime and
    // per-language chunks). It must be served same-origin: the published copy on
    // chat.carbondesignsystem.com sends no CORS headers (module scripts are fetched
    // in CORS mode), and CDN re-bundlers such as jsDelivr's /+esm load
    // @codemirror/state more than once, which breaks the editor with "Unrecognized
    // extension value". Copying the project's own single-graph rollup output keeps
    // @codemirror/state a singleton and avoids CORS entirely.
    //
    // This is done synchronously, before the first await: TypeDoc fires beginRender
    // synchronously (RendererEvent.BEGIN is not awaited), so async work scheduled
    // after an await races page writes and process exit. A recursive 160+ file copy
    // loses that race; cpSync completes within the trigger.
    try {
      const aiChatComponentsDist = join(
        dirname(require.resolve("@carbon/ai-chat-components/package.json")),
        "dist",
      );
      const aiChatComponentsTarget = join(
        event.outputDirectory,
        "assets",
        "ai-chat-components",
      );
      cpSync(aiChatComponentsDist, aiChatComponentsTarget, { recursive: true });
    } catch (error) {
      app.logger.warn(
        `Failed to copy ai-chat-components bundle: ${error.message}`,
      );
    }

    await Promise.all(
      CARBON_ASSETS.map(async (assetName) => {
        const source = join(assetDir, assetName);
        const target = join(event.outputDirectory, "assets", assetName);

        try {
          await fs.mkdir(dirname(target), { recursive: true });
          await fs.copyFile(source, target);
        } catch (error) {
          app.logger.warn(
            `Failed to copy Carbon theme asset ${assetName}: ${error.message}`,
          );
        }
      }),
    );

    const carbonStylesSource =
      require.resolve("@carbon/styles/css/styles.min.css");
    const carbonStylesTarget = join(
      event.outputDirectory,
      "assets",
      "carbon-styles.min.css",
    );

    try {
      await fs.mkdir(dirname(carbonStylesTarget), { recursive: true });
      await fs.copyFile(carbonStylesSource, carbonStylesTarget);
    } catch (error) {
      app.logger.warn(`Failed to copy Carbon styles: ${error.message}`);
    }

    const versionsFile = app.options.getValue("versionsFile");
    if (versionsFile) {
      const versionsTarget = join(event.outputDirectory, "versions.js");
      try {
        await fs.copyFile(versionsFile, versionsTarget);
      } catch (error) {
        app.logger.warn(`Failed to copy versions.js: ${error.message}`);
      }
    }
  });
}

export default load;
