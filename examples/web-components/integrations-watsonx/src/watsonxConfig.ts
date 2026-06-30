/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * watsonx.ai configuration loader.
 *
 * Demonstrates: reading watsonx.ai credentials and the target model id from
 * Vite-injected `process.env.*` values and failing fast with descriptive
 * errors when required variables are missing.
 *
 * APIs exercised: `process.env` (Vite `define` replacement at build time).
 *
 * Start reading at: `getWatsonxConfig`.
 */

import { WatsonxConfig } from "./types";

export function getWatsonxConfig(): WatsonxConfig {
  // Vite replaces `process.env.*` at build time, so these reads work in the browser bundle.
  // Replace with a real production implementation.
  const apiKey = process.env.WATSONX_API_KEY;
  const projectId = process.env.WATSONX_PROJECT_ID;
  const url = process.env.WATSONX_URL;
  // Fall back to a sensible default model so the demo runs even when the env var is omitted.
  const modelId = process.env.WATSONX_MODEL_ID || "ibm/granite-3-8b-instruct";

  // Throw early so the chat surfaces a clear configuration error instead of an opaque network failure.
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
