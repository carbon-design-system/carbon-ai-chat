/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * In this file we manage our dynamic imports for the entry of Carbon AI chat. See https://webpack.js.org/guides/code-splitting/#dynamic-imports.
 *
 * Dynamic imports are defined in a map to ensure they are statically analyzable by bundlers like webpack.
 * This guarantees that the target components get built and are available when dynamic imports are resolved.
 */

import React, { type ComponentType, type LazyExoticComponent } from "react";
import { CreateHumanAgentServiceFunction } from "../shared/services/haa/HumanAgentService";

async function loadHAA(): Promise<CreateHumanAgentServiceFunction> {
  const { createService } = await DYNAMIC_IMPORTS.HumanAgentService();
  return createService;
}

type PreloadableComponent<T extends ComponentType<any>> =
  LazyExoticComponent<T> & {
    /** Manually kick off loading of the chunk */
    preload: () => Promise<{ default: T }>;
  };

/**
 * Wrap React.lazy to give you a `.preload()` method
 * that returns the same promise React.lazy will use.
 */
function lazyWithPreload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): PreloadableComponent<T> {
  // Create the lazy component…
  const Component = React.lazy(factory) as PreloadableComponent<T>;
  // …then attach the preload method
  Component.preload = factory;
  return Component;
}

/**
 * Map of all dynamic imports used by the application.
 *
 * By defining imports in this centralized map, we ensure they are statically analyzable
 * by bundlers and will be included in builds even with preserveModules: true.
 *
 * When adding new dynamic imports, add them to this map first, then create the corresponding
 * lazy function below.
 */
const DYNAMIC_IMPORTS = {
  Chat: () => import("../shared/components/Chat"),
  CatastrophicError: () => import("../shared/components/CatastrophicError"),
  Disclaimer: () => import("../shared/components/Disclaimer"),
  HomeScreenContainer: () =>
    import("../shared/components/homeScreen/HomeScreenContainer"),
  IFramePanel: () =>
    import("../shared/components/responseTypes/iframe/IFramePanel"),
  ViewSourcePanel: () =>
    import("../shared/components/responseTypes/util/citations/ViewSourcePanel"),
  BodyAndFooterPanelComponent: () =>
    import("../shared/components/panels/BodyAndFooterPanelComponent"),
  TourContainer: () => import("../shared/components/tour/TourContainer"),
  Carousel: () =>
    import("../shared/components/responseTypes/carousel/Carousel"),
  // Special handling for react-player due to CJS/ESM confusion
  MediaPlayer: () =>
    import("react-player/lazy/index.js").then((mod: any) => {
      // react-player 2.x is old and is confused in their cjs vs mjs usage.
      // mod might be:
      // { default: Component }
      // { default: { default: Component } }
      // plain Component
      let exported = mod.default ?? mod;
      if (exported && typeof exported === "object" && "default" in exported) {
        exported = exported.default;
      }
      return { default: exported };
    }),
  // Container components
  AppContainer: () => import("../react/components/AppContainer"),
  // Service imports (non-React components)
  HumanAgentService: () =>
    import("../shared/services/haa/HumanAgentServiceImpl"),
};

function lazyChat() {
  return lazyWithPreload(DYNAMIC_IMPORTS.Chat);
}

function lazyCatastrophicError() {
  return lazyWithPreload(DYNAMIC_IMPORTS.CatastrophicError);
}

function lazyDisclaimer() {
  return lazyWithPreload(DYNAMIC_IMPORTS.Disclaimer);
}

function lazyHomeScreenContainer() {
  return lazyWithPreload(DYNAMIC_IMPORTS.HomeScreenContainer);
}

function lazyIFramePanel() {
  return lazyWithPreload(DYNAMIC_IMPORTS.IFramePanel);
}

function lazyViewSourcePanel() {
  return lazyWithPreload(DYNAMIC_IMPORTS.ViewSourcePanel);
}

function lazyBodyAndFooterPanelComponent() {
  return lazyWithPreload(DYNAMIC_IMPORTS.BodyAndFooterPanelComponent);
}

function lazyTourComponent() {
  return React.lazy(DYNAMIC_IMPORTS.TourContainer);
}

function lazyMediaPlayer(): LazyExoticComponent<ComponentType<any>> {
  return React.lazy(DYNAMIC_IMPORTS.MediaPlayer);
}

function lazyCarousel() {
  return React.lazy(DYNAMIC_IMPORTS.Carousel);
}

export {
  lazyChat,
  lazyHomeScreenContainer,
  lazyDisclaimer,
  lazyCatastrophicError,
  lazyTourComponent,
  lazyCarousel,
  lazyMediaPlayer,
  lazyIFramePanel,
  lazyViewSourcePanel,
  lazyBodyAndFooterPanelComponent,
  loadHAA,
  DYNAMIC_IMPORTS,
};
