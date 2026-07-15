/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Lazy loader for the prompt-line's Tiptap runtime. Mirrors
 * [../../code-snippet/src/codemirror/codemirror-loader.ts]: the dynamic
 * `import()` is the split point that keeps `@tiptap/*` out of the default
 * bundle, and the synchronous `getRichRuntimeIfLoaded()` lets the shell mount
 * the rich editor on first paint (no textarea→editor flash) once the chunk has
 * been warmed via {@link preloadPromptLineRich}.
 */

type RichRuntimeModule = typeof import("./prompt-line-rich-runtime.js");

let runtimePromise: Promise<RichRuntimeModule> | null = null;
let runtime: RichRuntimeModule | null = null;

/**
 * Load (once) the Tiptap runtime chunk. Resolves to `null` outside a browser
 * so server entries never pull Tiptap.
 */
export function loadRichRuntime(): Promise<RichRuntimeModule | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }
  if (!runtimePromise) {
    runtimePromise = import("./prompt-line-rich-runtime.js").then((module) => {
      runtime = module;
      return module;
    });
  }
  return runtimePromise;
}

/**
 * The runtime module if it has already loaded, else `null`. Synchronous so the
 * shell can decide to mount rich directly on first render.
 */
export function getRichRuntimeIfLoaded(): RichRuntimeModule | null {
  return runtime;
}

/**
 * Warm the Tiptap runtime chunk ahead of render. `@carbon/ai-chat` calls this
 * during boot when the configured editor mode resolves to rich, so the
 * prompt-line mounts in its final mode before the chat leaves hydration.
 */
export function preloadPromptLineRich(): Promise<unknown> {
  return loadRichRuntime();
}

export type { RichRuntimeModule };
