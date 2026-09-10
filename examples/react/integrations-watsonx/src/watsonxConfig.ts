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
 * `import.meta.env` (inlined by Vite at build time) and surfacing actionable
 * errors when required values are missing.
 *
 * APIs exercised:
 *   - `getWatsonxConfig` (returns a typed `WatsonxConfig`)
 *   - `WatsonxConfig`
 *
 * Start reading at: `getWatsonxConfig()`.
 */

import { WatsonxConfig } from './types';

export function getWatsonxConfig(): WatsonxConfig {
  // Vite inlines these `import.meta.env.*` references at build time — there is
  // no Node runtime in the browser to read them dynamically. The WATSONX_
  // prefix is allow-listed via `envPrefix` in vite.config.ts.
  const apiKey = import.meta.env.WATSONX_API_KEY;
  const projectId = import.meta.env.WATSONX_PROJECT_ID;
  const url = import.meta.env.WATSONX_URL;
  const modelId =
    import.meta.env.WATSONX_MODEL_ID || 'ibm/granite-3-8b-instruct';

  if (!apiKey) {
    throw new Error('WATSONX_API_KEY environment variable is required');
  }
  if (!projectId) {
    throw new Error('WATSONX_PROJECT_ID environment variable is required');
  }
  if (!url) {
    throw new Error('WATSONX_URL environment variable is required');
  }

  return {
    apiKey,
    projectId,
    url,
    modelId,
  };
}
