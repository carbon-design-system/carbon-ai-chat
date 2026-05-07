/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * watsonx.ai request/response type contracts.
 *
 * Demonstrates: shape of the credentials object consumed by `getWatsonxConfig`
 * plus the watsonx.ai text-generation request and streaming response payloads
 * proxied through the local Express server.
 *
 * APIs exercised: none (declaration-only file).
 *
 * Start reading at: `WatsonxConfig`, then the request and response shapes.
 */

export interface WatsonxConfig {
  apiKey: string;
  projectId: string;
  url: string;
  modelId: string;
}

export interface WatsonxGenerationRequest {
  input: string;
  model_id: string;
  project_id: string;
  parameters?: {
    decoding_method?: string;
    temperature?: number;
    top_k?: number;
    top_p?: number;
    max_new_tokens?: number;
    min_new_tokens?: number;
    repetition_penalty?: number;
    stop_sequences?: string[];
  };
}

export interface WatsonxGenerationResponse {
  results: Array<{
    generated_text: string;
    generated_token_count: number;
    input_token_count: number;
    stop_reason: string;
  }>;
}
