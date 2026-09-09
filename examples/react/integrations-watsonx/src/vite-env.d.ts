/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/// <reference types="vite/client" />

// These are read from .env and allow-listed through `envPrefix` in
// vite.config.ts,  declare alongside Vite's built-in env keys.
interface ImportMetaEnv {
  readonly WATSONX_API_KEY?: string;
  readonly WATSONX_PROJECT_ID?: string;
  readonly WATSONX_URL?: string;
  readonly WATSONX_MODEL_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
