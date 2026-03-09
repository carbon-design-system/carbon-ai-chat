/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { WidthState, BodyState } from "./types.js";

/**
 * Manages all resize observation logic for the chat shell.
 * Handles header height, input/messages width, and main content body width observations.
 */
export class ResizeObserverManager {
  private headerResizeObserver?: ResizeObserver;
  private inputAndMessagesResizeObserver?: ResizeObserver;
  private mainContentBodyResizeObserver?: ResizeObserver;
  private cssPropertyObserver?: MutationObserver;
  private lastKnownMessagesMaxWidth?: number;

  constructor(
    private readonly shellRoot: ShadowRoot,
    private readonly hostElement: HTMLElement,
  ) {}

  /**
   * Clean up all observers
   */
  disconnect(): void {
    this.headerResizeObserver?.disconnect();
    this.inputAndMessagesResizeObserver?.disconnect();
    this.mainContentBodyResizeObserver?.disconnect();
    this.cssPropertyObserver?.disconnect();
  }

  /**
   * Observe header height changes
   */
  observeHeaderHeight(onHeightChange: (height: number) => void): void {
    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const headerWrapper =
      this.shellRoot.querySelector<HTMLElement>(".header-wrapper");

    if (!headerWrapper) {
      return;
    }

    const updateHeight = (height: number) => {
      onHeightChange(height);
    };

    const measure = () => {
      const rect = headerWrapper.getBoundingClientRect();
      updateHeight(rect.height);
    };

    this.headerResizeObserver = new ResizeObserver((entries) => {
      // Use requestAnimationFrame to avoid ResizeObserver loop errors
      requestAnimationFrame(() => {
        for (const entry of entries) {
          if (entry.target !== headerWrapper) {
            continue;
          }
          const borderBoxSize = Array.isArray(entry.borderBoxSize)
            ? entry.borderBoxSize[0]
            : entry.borderBoxSize;
          if (borderBoxSize?.blockSize) {
            updateHeight(borderBoxSize.blockSize);
          } else {
            updateHeight(entry.contentRect.height);
          }
        }
      });
    });

    this.headerResizeObserver.observe(headerWrapper);
    measure();
  }

  /**
   * Observe input and messages width to determine if at max width
   */
  observeInputAndMessagesWidth(
    onWidthChange: (state: WidthState) => void,
    onInitialMeasurement?: () => void,
  ): void {
    if (typeof ResizeObserver === "undefined") {
      onInitialMeasurement?.();
      return;
    }

    const messagesMaxWidth = this.getMessagesMaxWidth();

    const updateAtMaxWidth = (hostWidth: number) => {
      // When host is less than max-width, input-and-messages is "at max width" (filling container)
      const isAtMaxWidth = hostWidth < messagesMaxWidth;
      onWidthChange({ isAtMaxWidth, currentWidth: hostWidth });
    };

    const measure = () => {
      const rect = this.hostElement.getBoundingClientRect();
      updateAtMaxWidth(rect.width);
      // Call the initial measurement callback after first measurement
      onInitialMeasurement?.();
    };

    this.inputAndMessagesResizeObserver = new ResizeObserver((entries) => {
      // Use requestAnimationFrame to avoid ResizeObserver loop errors
      requestAnimationFrame(() => {
        for (const entry of entries) {
          if (entry.target !== this.hostElement) {
            continue;
          }
          const borderBoxSize = Array.isArray(entry.borderBoxSize)
            ? entry.borderBoxSize[0]
            : entry.borderBoxSize;
          if (borderBoxSize?.inlineSize) {
            updateAtMaxWidth(borderBoxSize.inlineSize);
          } else {
            updateAtMaxWidth(entry.contentRect.width);
          }
        }
      });
    });

    this.inputAndMessagesResizeObserver.observe(this.hostElement);
    measure();
  }

  /**
   * Observe main content body width to determine history visibility
   */
  observeMainContentBodyWidth(
    showHistory: boolean,
    onVisibilityChange: (state: BodyState) => void,
    onInitialMeasurement?: () => void,
  ): void {
    if (typeof ResizeObserver === "undefined" || !showHistory) {
      onInitialMeasurement?.();
      return;
    }

    const mainContentBody =
      this.shellRoot.querySelector<HTMLElement>(".main-content-body");

    if (!mainContentBody) {
      onInitialMeasurement?.();
      return;
    }

    const updateHistoryVisibility = (width: number) => {
      const messagesMinWidth = this.getCssLengthFromProperty(
        "--cds-aichat-messages-min-width",
        320,
      );
      const historyWidth = this.getCssLengthFromProperty(
        "--cds-aichat-history-width",
        320,
      );

      const requiredWidth = messagesMinWidth + historyWidth;
      const shouldRenderHistory = width >= requiredWidth;

      onVisibilityChange({ shouldRenderHistory, width });
    };

    this.mainContentBodyResizeObserver = new ResizeObserver((entries) => {
      // Use requestAnimationFrame to avoid ResizeObserver loop errors
      requestAnimationFrame(() => {
        for (const entry of entries) {
          if (entry.target !== mainContentBody) {
            continue;
          }
          const borderBoxSize = Array.isArray(entry.borderBoxSize)
            ? entry.borderBoxSize[0]
            : entry.borderBoxSize;
          if (borderBoxSize?.inlineSize) {
            updateHistoryVisibility(borderBoxSize.inlineSize);
          } else {
            updateHistoryVisibility(entry.contentRect.width);
          }
        }
      });
    });

    this.mainContentBodyResizeObserver.observe(mainContentBody);

    // Initial measurement
    const rect = mainContentBody.getBoundingClientRect();
    updateHistoryVisibility(rect.width);
  }

  /**
   * Get CSS length value from a custom property
   */
  getCssLengthFromProperty(property: string, fallback: number): number {
    if (!this.hostElement) {
      return fallback;
    }

    const value = getComputedStyle(this.hostElement)
      .getPropertyValue(property)
      .trim();

    if (!value) {
      return fallback;
    }

    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  }

  /**
   * Get the messages max width from CSS
   */
  getMessagesMaxWidth(): number {
    const value = this.getCssLengthFromProperty(
      "--cds-aichat-messages-max-width",
      1056,
    );

    // Cache the value for performance
    const parsed = parseFloat(String(value));
    this.lastKnownMessagesMaxWidth = isNaN(parsed) ? 1056 : parsed;
    return this.lastKnownMessagesMaxWidth;
  }

  /**
   * Check if messages max width has changed
   */
  checkMessagesMaxWidthChange(): boolean {
    const currentMaxWidth = this.getMessagesMaxWidth();
    const hasChanged =
      this.lastKnownMessagesMaxWidth !== undefined &&
      currentMaxWidth !== this.lastKnownMessagesMaxWidth;

    if (hasChanged) {
      this.lastKnownMessagesMaxWidth = currentMaxWidth;
    }

    return hasChanged;
  }

  /**
   * Observe CSS custom properties for changes
   */
  observeCssProperties(onPropertyChange: () => void): void {
    if (typeof MutationObserver === "undefined") {
      return;
    }

    this.cssPropertyObserver = new MutationObserver(() => {
      if (this.checkMessagesMaxWidthChange()) {
        onPropertyChange();
      }
    });

    this.cssPropertyObserver.observe(this.hostElement, {
      attributes: true,
      attributeFilter: ["style"],
    });
  }
}

// Made with Bob
