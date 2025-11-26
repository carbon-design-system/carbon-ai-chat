/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Testing entry-point used by `@carbon/ai-chat/server` consumers to preload
 * every lazy dependency (components + chat package) before running Jest/Vitest
 * or server-rendered scenarios. Having a single central helper keeps component
 * loaders in sync and prevents duplicate preload logic from drifting.
 */

// Reuse the component-level preload helper so CodeMirror/DataTable deps stay in sync.
import { loadAllLazyDeps as loadComponentLazyDeps } from "@carbon/ai-chat-components/es/testing/load-all-lazy-deps.js";
import { normalizeModuleInterop } from "../chat/utils/moduleInterop.js";
import { localeLoaders } from "../chat/utils/languageUtils.js";

async function preloadSwiper() {
  await Promise.all([import("swiper/react"), import("swiper/modules")]);
}

async function preloadReactPlayer() {
  // Node's dynamic import returns a namespace object for CommonJS modules; normalize it.
  const reactPlayerModule = await import("react-player/lazy/index.js");
  normalizeModuleInterop(reactPlayerModule);
}

async function preloadColor() {
  const colorModule = await import("color");
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
async function loadAllLazyDeps(): Promise<void> {
  await Promise.all([
    loadComponentLazyDeps(),
    preloadSwiper(),
    preloadReactPlayer(),
    preloadColor(),
    preloadDayjsLocales(),
  ]);
}

export { loadAllLazyDeps };
