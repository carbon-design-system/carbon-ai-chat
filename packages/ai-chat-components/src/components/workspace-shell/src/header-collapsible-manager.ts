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
  private mutationObserver?: MutationObserver;
  private onStateChangeCallback?: (state: CollapsibleState) => void;
  private isManagerControlled = false;
  private hadInitialAttribute = false;

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
  }

  /**
   * Stop observing and clean up
   */
  disconnect(): void {
    this.resizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
    this.onStateChangeCallback = undefined;
    this.isManagerControlled = false;
  }

  /**
   * Set up ResizeObserver to monitor all relevant elements
   */
  private setupResizeObserver(): void {
    if (typeof ResizeObserver === "undefined") {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      // Use requestAnimationFrame to avoid ResizeObserver loop errors
      requestAnimationFrame(() => {
        this.calculateCollapsibleState();
      });
    });

    // Observe the host element for total height
    this.resizeObserver.observe(this.hostElement);

    // Observe each slot's assigned elements
    const slots = ["toolbar", "notification", "header", "footer"];
    slots.forEach((slotName) => {
      const slot = this.shellRoot.querySelector<HTMLSlotElement>(
        `slot[name="${slotName}"]`,
      );
      if (slot) {
        const assignedElements = slot.assignedElements();
        assignedElements.forEach((el) => {
          this.resizeObserver?.observe(el as Element);
          // Also observe mutations within each slotted element
          this.observeMutations(el as HTMLElement);
        });
      }
    });

    // Initial calculation
    this.calculateCollapsibleState();
  }

  /**
   * Set up MutationObserver to watch for content changes within slotted elements
   */
  private observeMutations(element: HTMLElement): void {
    if (typeof MutationObserver === "undefined") {
      return;
    }

    if (!this.mutationObserver) {
      this.mutationObserver = new MutationObserver(() => {
        // Use requestAnimationFrame to batch multiple mutations
        requestAnimationFrame(() => {
          this.calculateCollapsibleState();
        });
      });
    }

    // Observe changes to the element's subtree (children, attributes, text)
    this.mutationObserver.observe(element, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
  }

  /**
   * Calculate if header should be collapsible based on available space
   */
  private calculateCollapsibleState(): void {
    const totalHeight = this.hostElement.offsetHeight;

    // Get individual slot heights
    const toolbarHeight = this.getSlotHeight("toolbar");
    const notificationHeight = this.getSlotHeight("notification");
    const headerHeight = this.getSlotHeight("header");
    const footerHeight = this.getSlotHeight("footer");

    // Calculate available body height
    const availableBodyHeight =
      totalHeight -
      toolbarHeight -
      notificationHeight -
      headerHeight -
      footerHeight;

    // Determine if header should be collapsible
    // Rule: If body would be smaller than header, collapse the header
    const shouldCollapse = availableBodyHeight < headerHeight;

    // Notify callback
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback({
        shouldCollapse,
        availableBodyHeight,
        headerHeight,
      });
    }
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
      if (shouldCollapse) {
        headerElement.setAttribute("collapsible", "");
        this.isManagerControlled = true;
      } else {
        headerElement.removeAttribute("collapsible");
        this.isManagerControlled = false;
      }
    }
  }
}

// Made with Bob
