/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  loadAllLazyDeps as loadComponentLazyDeps,
  loadCodeSnippetDeps,
  loadTableDeps,
} from "@carbon/ai-chat-components/es/testing/load-all-lazy-deps.js";
import { normalizeModuleInterop } from "../chat/utils/moduleInterop";
import { localeLoaders } from "../chat/utils/languages";
export { PageObjectId, TestId } from "./PageObjectId";

async function preloadSwiper() {
  await Promise.all([import("swiper/react"), import("swiper/modules")]);
}

async function preloadReactPlayer() {
  const mod = await import("react-player/lazy/index.js");
  normalizeModuleInterop(mod);
}

async function preloadColor() {
  const mod = await import("color");
  normalizeModuleInterop(mod);
}

async function preloadDayjsLocales() {
  await Promise.all(Object.values(localeLoaders).map((loader) => loader()));
}

/**
 * Eagerly loads every lazily imported dependency across both
 * `@carbon/ai-chat-components` and `@carbon/ai-chat` so tests can preload
 * everything they need (Jest, Vitest, server rendering, etc.).
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

export {
  loadComponentLazyDeps,
  loadCodeSnippetDeps,
  loadTableDeps,
  preloadSwiper,
  preloadReactPlayer,
  preloadColor,
  preloadDayjsLocales,
};
