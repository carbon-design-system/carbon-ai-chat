/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

type CodeMirrorRuntimeModule = typeof import("./codemirror-runtime.js");

let runtimePromise: Promise<CodeMirrorRuntimeModule> | null = null;

/**
 * Lazily loads the CodeMirror runtime so that heavy editor dependencies are only
 * pulled into the bundle when the code-snippet component is actually rendered.
 */
export function loadCodeMirrorRuntime(): Promise<CodeMirrorRuntimeModule> {
  if (!runtimePromise) {
    runtimePromise = import("./codemirror-runtime.js");
  }
  return runtimePromise;
}

/**
 * Public helper so tests or higher-level packages can preload the heavy
 * CodeMirror dependencies ahead of time (e.g., in Jest setup files).
 */
export function loadCodeSnippetDeps(): Promise<CodeMirrorRuntimeModule> {
  return loadCodeMirrorRuntime();
}

export type { CodeMirrorRuntimeModule };
