/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { AppStore } from "../store/appStore";
import { CarbonTheme } from "../../types/config/PublicConfig";
import { AppState, ThemeState } from "../../types/state/AppState";
import { getCSSVariableValue, isColorLighterThan } from "../utils/colors";
import { consoleError } from "../utils/miscUtils";
import { UPDATE_THEME_STATE } from "../store/actions";

enum CARBON_BG_HEX {
  WHITE = "#ffffff",
  G10 = "#f4f4f4",
  G90 = "#282828",
  G100 = "#171717",
}

/**
 * Service that watches CSS variables and updates the theme accordingly when no explicit Carbon theme is injected (inherit mode).
 * Specifically monitors --cds-background and switches between themes based on detected values.
 */
class ThemeWatcherService {
  private store: AppStore<AppState>;
  private observer: MutationObserver | null = null;
  private pollInterval: number | null = null;
  private isWatching = false;
  private originalTheme: CarbonTheme | null = null;
  private lastBgColor: string | null = null;
  private parentElement: HTMLElement;

  constructor(store: AppStore<AppState>, element = document.documentElement) {
    this.store = store;
    this.parentElement = element;
  }

  /**
   * Starts watching for CSS variable changes when inheriting from host tokens.
   */
  public startWatching(): void {
    if (this.isWatching) {
      return;
    }

    const currentState = this.store.getState();
    if (
      currentState.config.derived.themeWithDefaults.originalCarbonTheme !== null
    ) {
      return;
    }

    this.isWatching = true;

    // Initial check AFTER setting originalCarbonTheme
    this.checkAndUpdateTheme();

    // Set up MutationObserver to watch for changes
    this.observer = new MutationObserver(() => {
      this.checkAndUpdateTheme();
    });

    // Watch for changes to the document's class and style attributes
    this.observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style", "class"],
      subtree: false,
      childList: false,
    });

    // Also watch for changes to style elements in the head
    const styleElements = document.querySelectorAll(
      'head style, head link[rel="stylesheet"]',
    );
    styleElements.forEach((element) => {
      this.observer?.observe(element, {
        attributes: true,
        childList: true,
        characterData: true,
      });
    });

    // Start polling as a fallback to catch changes we might miss
    this.startPolling();
  }

  /**
   * Starts polling the CSS variable as a fallback detection method.
   */
  private startPolling(): void {
    // Poll every 1 second when in inherit mode
    this.pollInterval = window.setInterval(() => {
      this.checkAndUpdateTheme();
    }, 1000);
  }

  /**
   * Stops polling the CSS variable.
   */
  private stopPolling(): void {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Stops watching for CSS variable changes.
   */
  public stopWatching(): void {
    if (!this.isWatching) {
      return;
    }

    this.isWatching = false;

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.stopPolling();

    this.lastBgColor = null;
  }

  /**
   * If no theme is provided and --cds-background isn't provided, try to climb the dom until you find something.
   */
  private getBackgroundColor(node: Element): string {
    let current: Element | ShadowRoot | null = node;

    while (current) {
      if (current instanceof ShadowRoot) {
        current = current.host;
        continue;
      }

      // Narrow current to Element before calling getComputedStyle
      if (current instanceof Element) {
        const color = getComputedStyle(current).backgroundColor;
        if (color && color !== "rgba(0, 0, 0, 0)" && color !== "transparent") {
          return color;
        }
        current = current.parentElement;
      } else {
        // should never happen, but break to satisfy TS
        break;
      }
    }

    return CARBON_BG_HEX.WHITE;
  }

  /**
   * Checks the current value of --cds-background and updates theme if needed.
   */
  private checkAndUpdateTheme(): void {
    try {
      const currentState = this.store.getState();
      const currentTheme =
        currentState.config.derived.themeWithDefaults.derivedCarbonTheme;

      // Only act if we're currently in inherit mode or derived from it
      if (
        this.originalTheme &&
        currentState.config.derived.themeWithDefaults.originalCarbonTheme
      ) {
        return;
      }

      const bgColor =
        getCSSVariableValue("--cds-background", this.parentElement) ||
        this.getBackgroundColor(this.parentElement);

      // Skip processing if the background color hasn't changed (optimization for polling)
      if (bgColor === this.lastBgColor) {
        return;
      }
      this.lastBgColor = bgColor;

      // First check for exact matches with Carbon theme background values
      let targetTheme: CarbonTheme;

      if (bgColor === CARBON_BG_HEX.WHITE) {
        targetTheme = CarbonTheme.WHITE;
      } else if (bgColor === CARBON_BG_HEX.G10) {
        targetTheme = CarbonTheme.G10;
      } else if (bgColor === CARBON_BG_HEX.G90) {
        targetTheme = CarbonTheme.G90;
      } else if (bgColor === CARBON_BG_HEX.G100) {
        targetTheme = CarbonTheme.G100;
      } else {
        // Fall back to existing lightness logic if no exact match
        const isLight = isColorLighterThan(bgColor, 50);
        targetTheme = isLight ? CarbonTheme.WHITE : CarbonTheme.G90;
      }

      // Only update if the theme actually needs to change
      if (currentTheme !== targetTheme) {
        this.updateTheme(targetTheme);
      }
    } catch (error) {
      consoleError(`ThemeWatcherService: Error checking theme: ${error}`);
    }
  }

  /**
   * Updates the theme in the Redux store.
   */
  private updateTheme(newTheme: CarbonTheme): void {
    const currentState = this.store.getState();
    const newThemeState: ThemeState = {
      ...currentState.config.derived.themeWithDefaults,
      derivedCarbonTheme: newTheme,
    };

    this.store.dispatch({
      type: UPDATE_THEME_STATE,
      themeState: newThemeState,
    });
  }

  /**
   * Should be called when the theme configuration changes to start/stop watching as needed.
   */
  public onThemeChange(newTheme: CarbonTheme | null): void {
    if (newTheme === null) {
      this.startWatching();
    } else {
      this.stopWatching();
    }
  }

  /**
   * Force a theme check immediately (useful for debugging)
   */
  public forceCheck(): void {
    this.checkAndUpdateTheme();
  }
}

export { ThemeWatcherService };
