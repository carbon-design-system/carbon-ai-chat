/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Manages ARIA live region announcements for screen readers.
 *
 * Rotates writes across N visually-hidden live regions. Rotation forces
 * assistive tech to re-announce identical messages and lets us clear
 * previous content without racing the announcement.
 *
 * `chat-shell` connects two regions; the React announcer in `@carbon/ai-chat`
 * connects three (the extra region helps NVDA + JAWS reliably pick up
 * back-to-back identical messages).
 *
 * Both consumers share this implementation so a fix to the screen-reader
 * workarounds (250 ms NVDA delay, dual-clear pattern) propagates to both.
 */
export class AriaAnnouncerManager {
  private regions: HTMLDivElement[] = [];
  private currentIndex = 0;
  private pendingAnnouncements: string[] = [];
  private announcementTimeoutId: number | null = null;

  /**
   * Initialize the manager with the live-region elements it should rotate
   * through. Must contain at least one element; two or three is typical.
   */
  connect(regions: HTMLDivElement[]): void {
    this.regions = regions.slice();
    this.currentIndex = 0;
  }

  /**
   * Cancel any pending announcement and detach from the regions.
   */
  disconnect(): void {
    this.clearPendingAnnouncements();
    this.regions = [];
  }

  /**
   * Queue a message to be announced on the next tick. Multiple calls in the
   * same tick are coalesced into a single announcement.
   */
  announce(message: string): void {
    if (!message || typeof window === "undefined") {
      return;
    }

    this.pendingAnnouncements.push(message);

    if (this.announcementTimeoutId === null) {
      // 250 ms delay works around an NVDA bug: a focus change at the same
      // time as a live-region update can drop the announcement entirely.
      // Smaller numbers were less reliable in testing.
      this.announcementTimeoutId = window.setTimeout(() => {
        this.doAnnouncements();
      }, 250);
    }
  }

  private clearPendingAnnouncements(): void {
    if (this.announcementTimeoutId !== null && typeof window !== "undefined") {
      window.clearTimeout(this.announcementTimeoutId);
      this.announcementTimeoutId = null;
    }
    this.pendingAnnouncements = [];
  }

  private doAnnouncements(): void {
    this.announcementTimeoutId = null;

    if (this.pendingAnnouncements.length === 0 || this.regions.length === 0) {
      this.pendingAnnouncements = [];
      return;
    }

    const message = this.pendingAnnouncements.join(" ");
    this.pendingAnnouncements = [];

    const writeRegion = this.regions[this.currentIndex];
    if (writeRegion) {
      writeRegion.textContent = message;
    }

    // Clear every other region so the active one stands out as the change.
    this.regions.forEach((region, index) => {
      if (index !== this.currentIndex && region) {
        region.textContent = "";
      }
    });

    this.currentIndex = (this.currentIndex + 1) % this.regions.length;
  }
}
