/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * This is here because @carbon/web-components neglects to include es/globals/* in its exports field.
 */

import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as pathResolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const actualPath = pathResolve(
  here,
  "../../node_modules/@carbon/web-components/es/globals/internal/icon-loader.js",
);
const actualUrl = pathToFileURL(actualPath).href;

export async function resolve(specifier, context, defaultResolve) {
  if (
    specifier === "@carbon/web-components/es/globals/internal/icon-loader.js"
  ) {
    // We handled it; stop the chain.
    return { url: actualUrl, shortCircuit: true };
  }
  return defaultResolve(specifier, context);
}
