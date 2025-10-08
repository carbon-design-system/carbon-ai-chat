/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Manages accordion state persistence across demo sessions.
 *
 * This manager handles the persistence of accordion open/closed states in the demo
 * sidebar using sessionStorage. It automatically restores previously opened accordions
 * when the demo is refreshed or revisited within the same browser session.
 */
export class AccordionStateManager {
  /** SessionStorage key used to persist accordion states */
  private static readonly STORAGE_KEY = "accordion-states";

  /**
   * Set up accordion state management with event listeners.
   *
   * This method initializes the accordion state system by restoring previously
   * saved states and adding event listeners to track future state changes.
   */
  setupAccordionStateManagement(shadowRoot: ShadowRoot): void {
    // Use a longer delay to ensure accordion is fully rendered
    setTimeout(() => {
      this.restoreAccordionStates(shadowRoot);
      this.addAccordionEventListeners(shadowRoot);
    }, 100);
  }

  /**
   * Restore accordion states from sessionStorage.
   *
   * Queries all accordion items and restores their open/closed state based on
   * previously saved preferences. Uses the accordion item title as the identifier.
   */
  private restoreAccordionStates(shadowRoot: ShadowRoot): void {
    const accordion = shadowRoot.querySelector("cds-accordion");
    if (!accordion) {
      return;
    }

    const accordionItems = accordion.querySelectorAll("cds-accordion-item");
    const storedStates = this.getStoredAccordionStates();

    accordionItems.forEach((item) => {
      const title = item.getAttribute("title") || "";
      const isOpen = storedStates[title];

      if (isOpen) {
        item.setAttribute("open", "");
        (item as any).expanded = true;
      }
    });
  }

  /**
   * Add event listeners to accordion items for state tracking.
   *
   * Attaches click handlers to accordion toggle buttons to automatically save
   * state changes to sessionStorage when users interact with accordions.
   */
  private addAccordionEventListeners(shadowRoot: ShadowRoot): void {
    const accordion = shadowRoot.querySelector("cds-accordion");
    if (!accordion) {
      return;
    }

    const accordionItems = accordion.querySelectorAll("cds-accordion-item");
    accordionItems.forEach((item) => {
      const toggleButton =
        item.shadowRoot?.querySelector("button") ||
        item.querySelector("button");

      if (toggleButton) {
        toggleButton.addEventListener("click", () => {
          const title = item.getAttribute("title") || "";

          // Wait for state change to complete before saving
          setTimeout(() => {
            const isOpen = item.hasAttribute("open");
            this.saveAccordionState(title, isOpen);
          }, 100);
        });
      }
    });
  }

  /**
   * Get stored accordion states from sessionStorage.
   *
   * Retrieves and parses the accordion state data from sessionStorage. Returns
   * an empty object if no data exists or if parsing fails.
   */
  private getStoredAccordionStates(): Record<string, boolean> {
    try {
      const stored = sessionStorage.getItem(AccordionStateManager.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  /**
   * Save accordion state to sessionStorage.
   *
   * Updates the stored accordion states with the new open/closed state for the
   * specified accordion item. Gracefully handles sessionStorage errors.
   */
  private saveAccordionState(title: string, isOpen: boolean): void {
    try {
      const currentStates = this.getStoredAccordionStates();
      currentStates[title] = isOpen;
      sessionStorage.setItem(
        AccordionStateManager.STORAGE_KEY,
        JSON.stringify(currentStates),
      );
    } catch {
      // Silently fail if sessionStorage is not available
    }
  }
}
