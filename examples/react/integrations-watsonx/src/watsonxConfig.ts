/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * watsonx.ai environment-variable resolver for the watsonx example.
 *
 * Demonstrates: reading watsonx.ai credentials and the target model id from
 * `process.env` (injected by webpack's DefinePlugin) and surfacing actionable
 * errors when required values are missing.
 *
 * APIs exercised:
 *   - `getWatsonxConfig` (returns a typed `WatsonxConfig`)
 *   - `WatsonxConfig`
 *
 * Start reading at: `getWatsonxConfig()`.
 */

import { WatsonxConfig } from "./types";

export function getWatsonxConfig(): WatsonxConfig {
  // webpack's DefinePlugin inlines these `process.env.*` references at
  // build time — there is no Node runtime in the browser to read them
  // dynamically.
  const apiKey = process.env.WATSONX_API_KEY;
  const projectId = process.env.WATSONX_PROJECT_ID;
  const url = process.env.WATSONX_URL;
  const modelId = process.env.WATSONX_MODEL_ID || "ibm/granite-3-8b-instruct";

  if (!apiKey) {
    throw new Error("WATSONX_API_KEY environment variable is required");
  }
  if (!projectId) {
    throw new Error("WATSONX_PROJECT_ID environment variable is required");
  }
  if (!url) {
    throw new Error("WATSONX_URL environment variable is required");
  }

  return {
    apiKey,
    projectId,
    url,
    modelId,
  };
}
