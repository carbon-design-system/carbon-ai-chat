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
 */

import React, { type ComponentType, type LazyExoticComponent } from "react";
import { CreateHumanAgentServiceFunction } from "../shared/services/haa/HumanAgentService";

async function loadHAA(): Promise<CreateHumanAgentServiceFunction> {
  const { createService } = await import(
    "../shared/services/haa/HumanAgentServiceImpl"
  );
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

function lazyChat() {
  return lazyWithPreload(() => import("../shared/components/Chat"));
}

function lazyCatastrophicError() {
  return lazyWithPreload(() =>
    import("../shared/components/CatastrophicError").then((mod) => ({
      default: mod.CatastrophicError,
    }))
  );
}

function lazyDisclaimer() {
  return lazyWithPreload(() =>
    import("../shared/components/Disclaimer").then((mod) => ({
      default: mod.Disclaimer,
    }))
  );
}

function lazyHomeScreenContainer() {
  return lazyWithPreload(() =>
    import("../shared/components/homeScreen/HomeScreenContainer").then(
      (mod) => ({
        default: mod.HomeScreenContainer,
      })
    )
  );
}

function lazyIFramePanel() {
  return lazyWithPreload(() =>
    import("../shared/components/responseTypes/iframe/IFramePanel").then(
      (mod) => ({
        default: mod.IFramePanel,
      })
    )
  );
}

function lazyViewSourcePanel() {
  return lazyWithPreload(() =>
    import(
      "../shared/components/responseTypes/util/citations/ViewSourcePanel"
    ).then((mod) => ({
      default: mod.ViewSourcePanel,
    }))
  );
}

function lazyBodyAndFooterPanelComponent() {
  return lazyWithPreload(() =>
    import("../shared/components/panels/BodyAndFooterPanelComponent").then(
      (mod) => ({
        default: mod.BodyAndFooterPanelComponent,
      })
    )
  );
}

function lazyTourComponent() {
  return React.lazy(() => import("../shared/components/tour/TourContainer"));
}

function lazyMediaPlayer() {
  return React.lazy(
    () => import("../shared/components/responseTypes/util/ReactPlayer")
  );
}

function lazyCarousel() {
  return React.lazy(
    () => import("../shared/components/responseTypes/carousel/Carousel")
  );
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
};
