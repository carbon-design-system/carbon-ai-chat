/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Lazy loader for `buildCarbonExtensions`. The curated Tiptap extension builder
 * pulls `@tiptap/*` (every carbon factory imports it), so it must stay out of
 * the default render path — only chats that use the rich editor download it.
 * Mirrors the prompt-line runtime loader: a memoized dynamic `import()` plus a
 * synchronous cache so `useInputExtensions` can build extensions on first
 * render once warmed (the chat boot warms it alongside the rich runtime).
 */

type BuildExtensionsModule =
  typeof import("@carbon/ai-chat-components/es/components/input/src/tiptap/build-extensions.js");

type BuildCarbonExtensions = BuildExtensionsModule["buildCarbonExtensions"];

let modulePromise: Promise<BuildExtensionsModule | null> | null = null;
let loaded: BuildExtensionsModule | null = null;

/** Load (once) the curated-extension builder chunk. `null` outside a browser. */
export function loadBuildCarbonExtensions(): Promise<BuildExtensionsModule | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }
  if (!modulePromise) {
    modulePromise =
      import("@carbon/ai-chat-components/es/components/input/src/tiptap/build-extensions.js").then(
        (module) => {
          loaded = module;
          return module;
        },
      );
  }
  return modulePromise;
}

/** The builder if already loaded, else `null` (synchronous, for first render). */
export function getBuildCarbonExtensionsIfLoaded(): BuildCarbonExtensions | null {
  return loaded?.buildCarbonExtensions ?? null;
}

/** Warm the builder chunk ahead of render (called from the chat boot). */
export function preloadBuildCarbonExtensions(): Promise<unknown> {
  return loadBuildCarbonExtensions();
}
