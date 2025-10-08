/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Carbon AI Chat TypeDoc Theme
 *
 * This theme extends TypeDoc's default theme to integrate Carbon Design System
 * UI Shell components while preserving existing functionality.
 */

import { DefaultTheme } from "typedoc";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { defaultLayout } from "./layouts/default.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Extends TypeDoc's DefaultTheme so we can reuse its render context
 * while serving templates and assets from the local Carbon theme directory.
 */
export class CarbonTheme extends DefaultTheme {
  get themePath() {
    return join(__dirname);
  }

  getRenderContext(pageEvent) {
    const context = super.getRenderContext(pageEvent);
    context.defaultLayout = defaultLayout.bind(undefined, context);
    return context;
  }
}

export { CarbonTheme as Theme };
