/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { WatsonxConfig } from "./types";

export function getWatsonxConfig(): WatsonxConfig {
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
