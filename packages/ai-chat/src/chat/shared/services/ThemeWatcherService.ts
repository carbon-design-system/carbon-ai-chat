/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { Store } from "redux";
import { CarbonTheme } from "../../../types/config/PublicConfig";
import { AppState, ThemeState } from "../../../types/state/AppState";
import { getCSSVariableValue, isColorLighterThan } from "../utils/colors";
import { consoleError } from "../utils/miscUtils";
import { UPDATE_THEME_STATE } from "../store/actions";
import { white, g10, g90, g100 } from "@carbon/themes";

/**
 * Service that watches CSS variables and updates the theme accordingly when CarbonTheme.INHERIT is used.
 * Specifically monitors --cds-background and switches between themes based on detected values.
 */
class ThemeWatcherService {
  private store: Store<AppState>;
  private observer: MutationObserver | null = null;
  private pollInterval: number | null = null;
  private isWatching = false;
  private originalTheme: CarbonTheme | null = null;
  private lastBgColor: string | null = null;

  constructor(store: Store<AppState>) {
    this.store = store;
  }

  /**
   * Starts watching for CSS variable changes when the theme is set to INHERIT.
   */
  public startWatching(): void {
    if (this.isWatching) {
      return;
    }

    const currentState = this.store.getState();
    if (currentState.theme.originalCarbonTheme !== CarbonTheme.INHERIT) {
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
    // Poll every 1 second when in INHERIT mode
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
   * Checks the current value of --cds-background and updates theme if needed.
   */
  private checkAndUpdateTheme(): void {
    try {
      const bgColor = getCSSVariableValue("--cds-background");
      if (!bgColor) {
        return;
      }

      // Skip processing if the background color hasn't changed (optimization for polling)
      if (bgColor === this.lastBgColor) {
        return;
      }
      this.lastBgColor = bgColor;

      const currentState = this.store.getState();
      const currentTheme = currentState.theme.derivedCarbonTheme;

      // Only act if we're currently in INHERIT mode or derived from it
      if (
        this.originalTheme !== CarbonTheme.INHERIT &&
        currentState.theme.originalCarbonTheme !== CarbonTheme.INHERIT
      ) {
        return;
      }

      // First check for exact matches with Carbon theme background values
      let targetTheme: CarbonTheme;
      if (bgColor === white.background) {
        targetTheme = CarbonTheme.WHITE;
      } else if (bgColor === g10.background) {
        targetTheme = CarbonTheme.G10;
      } else if (bgColor === g90.background) {
        targetTheme = CarbonTheme.G90;
      } else if (bgColor === g100.background) {
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
      ...currentState.theme,
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
  public onThemeChange(newTheme: CarbonTheme): void {
    if (newTheme === CarbonTheme.INHERIT) {
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
