/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { CarbonTheme } from "./theme/index.js";
import { ParameterType } from "typedoc";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { promises as fs } from "fs";

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

  app.options.addDeclaration({
    name: "versionsFile",
    help: "Path to a versions.js file to copy to the docs output root. Resolved relative to typedoc.json. Omit to skip.",
    type: ParameterType.Path,
  });

  const themeDir = dirname(fileURLToPath(import.meta.url));
  const assetDir = join(themeDir, "theme", "assets");

  app.renderer.on("beginRender", async (event) => {
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
