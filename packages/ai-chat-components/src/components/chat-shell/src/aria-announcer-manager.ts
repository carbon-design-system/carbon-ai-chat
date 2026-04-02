/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Manages ARIA live region announcements for screen readers.
 * Uses a dual-region pattern with a 250ms delay for NVDA compatibility.
 */
export class AriaAnnouncerManager {
  private ariaLiveRegion1?: HTMLDivElement;
  private ariaLiveRegion2?: HTMLDivElement;
  private useAriaLiveRegion1 = true;
  private pendingAnnouncements: string[] = [];
  private announcementTimeoutId: number | null = null;

  /**
   * Initialize the manager with references to the aria-live regions
   */
  connect(region1: HTMLDivElement, region2: HTMLDivElement): void {
    this.ariaLiveRegion1 = region1;
    this.ariaLiveRegion2 = region2;
  }

  /**
   * Clean up resources
   */
  disconnect(): void {
    this.clearPendingAnnouncements();
    this.ariaLiveRegion1 = undefined;
    this.ariaLiveRegion2 = undefined;
  }

  /**
   * Announces a message to screen readers via aria-live regions.
   * Uses a dual-region pattern and 250ms delay for NVDA compatibility.
   */
  announce(message: string): void {
    if (!message || typeof window === "undefined") {
      return;
    }

    // Queue the announcement
    this.pendingAnnouncements.push(message);

    // If timeout not already scheduled, schedule it
    if (this.announcementTimeoutId === null) {
      // 250ms delay for NVDA compatibility - prevents focus changes from interrupting announcements
      this.announcementTimeoutId = window.setTimeout(() => {
        this.doAnnouncements();
      }, 250);
    }
  }

  /**
   * Clear any pending announcements
   */
  private clearPendingAnnouncements(): void {
    if (this.announcementTimeoutId !== null && typeof window !== "undefined") {
      window.clearTimeout(this.announcementTimeoutId);
      this.announcementTimeoutId = null;
    }
    this.pendingAnnouncements = [];
  }

  /**
   * Performs the actual announcements by writing to aria-live regions
   */
  private doAnnouncements(): void {
    if (this.pendingAnnouncements.length === 0) {
      this.announcementTimeoutId = null;
      return;
    }

    // Join all pending announcements
    const message = this.pendingAnnouncements.join(" ");
    this.pendingAnnouncements = [];
    this.announcementTimeoutId = null;

    // Get the region to use for this announcement
    const useRegion = this.useAriaLiveRegion1
      ? this.ariaLiveRegion1
      : this.ariaLiveRegion2;

    // Get the region to clear
    const clearRegion = this.useAriaLiveRegion1
      ? this.ariaLiveRegion2
      : this.ariaLiveRegion1;

    // Write to the active region
    if (useRegion) {
      useRegion.textContent = message;
    }

    // Clear the previous region
    if (clearRegion) {
      clearRegion.textContent = "";
    }

    // Swap which region to use next time
    this.useAriaLiveRegion1 = !this.useAriaLiveRegion1;
  }
}

// Made with Bob
