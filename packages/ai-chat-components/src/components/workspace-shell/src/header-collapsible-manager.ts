/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

export interface CollapsibleState {
  shouldCollapse: boolean;
  availableBodyHeight: number;
  headerHeight: number;
}

/**
 * Manages automatic header collapsible behavior for the workspace shell.
 * Monitors slot heights and determines when the header should be collapsible
 * to ensure the body slot has adequate space.
 */
export class HeaderCollapsibleManager {
  private resizeObserver?: ResizeObserver;
  private onStateChangeCallback?: (state: CollapsibleState) => void;
  private isManagerControlled = false;
  private hadInitialAttribute = false;
  private calculationPending = false;
  private lastState?: CollapsibleState;
  private throttleTimeout?: number;
  private expandedHeaderHeight?: number;
  private slotChangeHandler?: () => void;

  constructor(
    private readonly shellRoot: ShadowRoot,
    private readonly hostElement: HTMLElement,
  ) {
    // Check if header already has collapsible attribute at initialization
    const headerSlot = this.shellRoot.querySelector<HTMLSlotElement>(
      'slot[name="header"]',
    );
    const headerElement = headerSlot?.assignedElements()[0] as HTMLElement;
    this.hadInitialAttribute =
      headerElement?.hasAttribute("collapsible") || false;
  }

  /**
   * Start observing slot heights and managing collapsible state
   */
  connect(onStateChange: (state: CollapsibleState) => void): void {
    this.onStateChangeCallback = onStateChange;
    this.setupResizeObserver();
    this.setupSlotChangeListener();
  }

  /**
   * Stop observing and clean up
   */
  disconnect(): void {
    this.resizeObserver?.disconnect();
    if (this.throttleTimeout) {
      clearTimeout(this.throttleTimeout);
    }
    this.removeSlotChangeListener();
    this.onStateChangeCallback = undefined;
    this.isManagerControlled = false;
    this.calculationPending = false;
    this.lastState = undefined;
    this.expandedHeaderHeight = undefined;
  }

  /**
   * Reset the stored expanded header height.
   * Call this when workspace content changes to recalculate with new header size.
   */
  reset(): void {
    this.expandedHeaderHeight = undefined;
    this.lastState = undefined;
    // Trigger a new calculation
    this.calculateCollapsibleState();
  }

  /**
   * Set up ResizeObserver to monitor all relevant elements
   */
  private setupResizeObserver(): void {
    if (typeof ResizeObserver === "undefined") {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      // Throttle calculations to max once per 150ms to prevent performance issues
      if (this.throttleTimeout) {
        return;
      }

      this.throttleTimeout = window.setTimeout(() => {
        this.throttleTimeout = undefined;
        if (!this.calculationPending) {
          this.calculationPending = true;
          requestAnimationFrame(() => {
            this.calculationPending = false;
            this.calculateCollapsibleState();
          });
        }
      }, 150);
    });

    // Only observe the host element - this is sufficient to detect size changes
    // Observing individual slots was causing performance issues
    this.resizeObserver.observe(this.hostElement);

    // Initial calculation
    this.calculateCollapsibleState();
  }

  /**
   * Set up listener for slot content changes to reset when header content changes
   */
  private setupSlotChangeListener(): void {
    const headerSlot = this.shellRoot.querySelector<HTMLSlotElement>(
      'slot[name="header"]',
    );

    if (headerSlot) {
      this.slotChangeHandler = () => {
        // Reset expanded height when slot content changes
        this.reset();
      };
      headerSlot.addEventListener("slotchange", this.slotChangeHandler);
    }
  }

  /**
   * Remove slot change listener
   */
  private removeSlotChangeListener(): void {
    if (this.slotChangeHandler) {
      const headerSlot = this.shellRoot.querySelector<HTMLSlotElement>(
        'slot[name="header"]',
      );
      if (headerSlot) {
        headerSlot.removeEventListener("slotchange", this.slotChangeHandler);
      }
      this.slotChangeHandler = undefined;
    }
  }

  /**
   * Calculate if header should be collapsible based on available space
   */
  private calculateCollapsibleState(): void {
    const totalHeight = this.hostElement.offsetHeight;

    // Get individual slot heights
    const toolbarHeight = this.getSlotHeight("toolbar");
    const notificationHeight = this.getSlotHeight("notification");
    const currentHeaderHeight = this.getSlotHeight("header");
    const footerHeight = this.getSlotHeight("footer");

    // Store the expanded header height ONCE when we first see it expanded
    // Never update it after that to avoid flip-flopping
    const headerElement = this.getHeaderElement();
    const isCurrentlyCollapsed = headerElement?.hasAttribute("collapsible");

    // Only store expanded height if we don't have one yet AND header is not collapsed
    if (
      !this.expandedHeaderHeight &&
      !isCurrentlyCollapsed &&
      currentHeaderHeight > 0
    ) {
      // First time seeing the expanded header, store this as the permanent reference
      this.expandedHeaderHeight = currentHeaderHeight;
    }

    // Use the expanded height for calculations to avoid flip-flopping
    // If we don't have expanded height yet, use current (only happens on very first render)
    const headerHeight = this.expandedHeaderHeight || currentHeaderHeight;

    // Calculate available body height using the EXPANDED header height
    const availableBodyHeight =
      totalHeight -
      toolbarHeight -
      notificationHeight -
      headerHeight -
      footerHeight;

    // Determine if header should be collapsible
    // Rule: If body would be smaller than expanded header, collapse the header
    const shouldCollapse = availableBodyHeight < headerHeight;

    // Only notify if state actually changed to prevent unnecessary updates
    if (
      !this.lastState ||
      this.lastState.shouldCollapse !== shouldCollapse ||
      this.lastState.availableBodyHeight !== availableBodyHeight ||
      this.lastState.headerHeight !== headerHeight
    ) {
      this.lastState = {
        shouldCollapse,
        availableBodyHeight,
        headerHeight,
      };

      // Notify callback
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(this.lastState);
      }
    }
  }

  /**
   * Get the header element
   */
  private getHeaderElement(): HTMLElement | null {
    const headerSlot = this.shellRoot.querySelector<HTMLSlotElement>(
      'slot[name="header"]',
    );
    return (headerSlot?.assignedElements()[0] as HTMLElement) || null;
  }

  /**
   * Get the total height of elements assigned to a slot
   */
  private getSlotHeight(slotName: string): number {
    const slot = this.shellRoot.querySelector<HTMLSlotElement>(
      `slot[name="${slotName}"]`,
    );
    const elements = slot?.assignedElements() || [];
    return elements.reduce(
      (sum, el) => sum + (el as HTMLElement).offsetHeight,
      0,
    );
  }

  /**
   * Check if a header element has a manually set collapsible attribute
   */
  hasManualOverride(): boolean {
    // If attribute existed at initialization, it's a manual override
    if (this.hadInitialAttribute) {
      return true;
    }

    const headerSlot = this.shellRoot.querySelector<HTMLSlotElement>(
      'slot[name="header"]',
    );
    const headerElement = headerSlot?.assignedElements()[0] as HTMLElement;

    if (!headerElement?.hasAttribute("collapsible")) {
      return false;
    }

    // If manager set it, it's not a manual override
    return !this.isManagerControlled;
  }

  /**
   * Update the header's collapsible attribute
   */
  updateHeaderCollapsible(shouldCollapse: boolean): void {
    const headerSlot = this.shellRoot.querySelector<HTMLSlotElement>(
      'slot[name="header"]',
    );
    const headerElement = headerSlot?.assignedElements()[0] as HTMLElement;

    if (headerElement && !this.hasManualOverride()) {
      const currentlyHasAttr = headerElement.hasAttribute("collapsible");

      if (shouldCollapse && !currentlyHasAttr) {
        headerElement.setAttribute("collapsible", "");
        this.isManagerControlled = true;
      } else if (!shouldCollapse && currentlyHasAttr) {
        headerElement.removeAttribute("collapsible");
        this.isManagerControlled = false;
      }
    }
  }
}

// Made with Bob
