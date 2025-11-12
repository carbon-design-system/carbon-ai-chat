/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
// Reuse the component-level preload helper so CodeMirror/DataTable deps stay in sync.
import { loadAllLazyDeps as loadComponentLazyDeps } from "@carbon/ai-chat-components/es/testing/load-all-lazy-deps.js";
export {
  loadCodeSnippetDeps,
  loadTableDeps,
} from "@carbon/ai-chat-components/es/testing/load-all-lazy-deps.js";
import { normalizeModuleInterop } from "../chat/utils/moduleInterop.js";
import { localeLoaders } from "../chat/utils/languages.js";

// Prefer native dynamic `import()` so the same code path works for ESM-only bundles
// (Swiper, react-player) and CommonJS-friendly modules (color). Node's dynamic
// import returns a namespace object for CommonJS modules, which we normalize below.
async function requireOrImport<TModule>(
  specifier: string,
  dynamicImport: () => Promise<TModule>,
): Promise<TModule> {
  return dynamicImport();
}

async function preloadSwiper() {
  await Promise.all([
    requireOrImport("swiper/react", () => import("swiper/react")),
    requireOrImport("swiper/modules", () => import("swiper/modules")),
  ]);
}

async function preloadReactPlayer() {
  const reactPlayerModule = await requireOrImport(
    "react-player/lazy/index.js",
    () => import("react-player/lazy/index.js"),
  );
  normalizeModuleInterop(reactPlayerModule);
}

async function preloadColor() {
  const colorModule = await requireOrImport("color", () => import("color"));
  normalizeModuleInterop(colorModule);
}

async function preloadDayjsLocales() {
  await Promise.all(Object.values(localeLoaders).map((loader) => loader()));
}

/**
 * Eagerly loads every lazily imported dependency across both
 * `@carbon/ai-chat-components` and `@carbon/ai-chat` so tests can preload
 * everything they need (Jest, Vitest, server rendering, etc.). Only available
 * from `@carbon/ai-chat/server`.
 *
 * @category Testing
 */
export async function loadAllLazyDeps(): Promise<void> {
  await Promise.all([
    loadComponentLazyDeps(),
    preloadSwiper(),
    preloadReactPlayer(),
    preloadColor(),
    preloadDayjsLocales(),
  ]);
}
