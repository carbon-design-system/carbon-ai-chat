/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Politeness of a live-region announcement.
 *
 * - `polite` — status/content updates the user benefits from but shouldn't have
 *   interrupted. The default.
 * - `assertive` — errors that block the user's progress; interrupts whatever the
 *   screen reader is currently reading. Use sparingly.
 */
type AnnouncerPoliteness = "polite" | "assertive";

/**
 * One live-region channel: the regions it rotates through plus the pending-queue
 * and timer state used to coalesce same-tick announcements.
 */
interface AnnouncerChannel {
  regions: HTMLDivElement[];
  currentIndex: number;
  pendingAnnouncements: string[];
  announcementTimeoutId: number | null;
}

function createChannel(): AnnouncerChannel {
  return {
    regions: [],
    currentIndex: 0,
    pendingAnnouncements: [],
    announcementTimeoutId: null,
  };
}

/**
 * Manages ARIA live region announcements for screen readers.
 *
 * Rotates writes across N visually-hidden live regions. Rotation forces
 * assistive tech to re-announce identical messages and lets us clear
 * previous content without racing the announcement.
 *
 * Two independent channels are maintained — `polite` and `assertive` — each with
 * its own regions, rotation, and coalescing queue, so an assertive (blocking)
 * message never coalesces with a polite one. Assertive is opt-in: pass assertive
 * regions to {@link connect} and a politeness to {@link announce}. The politeness
 * of the rendered region (its `aria-live` value) is owned by the consumer's
 * markup; the channel only routes text to the right set of regions.
 *
 * `chat-shell` connects two polite regions; the React announcer in
 * `@carbon/ai-chat` connects three polite regions (the extra region helps NVDA +
 * JAWS reliably pick up back-to-back identical messages) plus assertive regions.
 *
 * Both consumers share this implementation so a fix to the screen-reader
 * workarounds (250 ms NVDA delay, dual-clear pattern) propagates to both.
 */
export class AriaAnnouncerManager {
  private polite = createChannel();
  private assertive = createChannel();

  /**
   * Initialize the manager with the live-region elements it should rotate
   * through. `politeRegions` must contain at least one element; two or three is
   * typical. `assertiveRegions` is optional — omit it for polite-only consumers.
   */
  connect(
    politeRegions: HTMLDivElement[],
    assertiveRegions: HTMLDivElement[] = [],
  ): void {
    this.polite.regions = politeRegions.slice();
    this.polite.currentIndex = 0;
    this.assertive.regions = assertiveRegions.slice();
    this.assertive.currentIndex = 0;
  }

  /**
   * Cancel any pending announcements and detach from the regions.
   */
  disconnect(): void {
    this.clearChannel(this.polite);
    this.clearChannel(this.assertive);
    this.polite.regions = [];
    this.assertive.regions = [];
  }

  /**
   * Queue a message to be announced on the next tick. Multiple calls in the
   * same tick (and politeness) are coalesced into a single announcement.
   * Defaults to polite; falls back to polite if assertive is requested but no
   * assertive regions are connected.
   */
  announce(message: string, politeness: AnnouncerPoliteness = "polite"): void {
    if (!message || typeof window === "undefined") {
      return;
    }

    const channel =
      politeness === "assertive" && this.assertive.regions.length > 0
        ? this.assertive
        : this.polite;

    channel.pendingAnnouncements.push(message);

    if (channel.announcementTimeoutId === null) {
      // 250 ms delay works around an NVDA bug: a focus change at the same
      // time as a live-region update can drop the announcement entirely.
      // Smaller numbers were less reliable in testing.
      channel.announcementTimeoutId = window.setTimeout(() => {
        this.doAnnouncements(channel);
      }, 250);
    }
  }

  private clearChannel(channel: AnnouncerChannel): void {
    if (
      channel.announcementTimeoutId !== null &&
      typeof window !== "undefined"
    ) {
      window.clearTimeout(channel.announcementTimeoutId);
      channel.announcementTimeoutId = null;
    }
    channel.pendingAnnouncements = [];
  }

  private doAnnouncements(channel: AnnouncerChannel): void {
    channel.announcementTimeoutId = null;

    if (
      channel.pendingAnnouncements.length === 0 ||
      channel.regions.length === 0
    ) {
      channel.pendingAnnouncements = [];
      return;
    }

    const message = channel.pendingAnnouncements.join(" ");
    channel.pendingAnnouncements = [];

    const writeRegion = channel.regions[channel.currentIndex];
    if (writeRegion) {
      writeRegion.textContent = message;
    }

    // Clear every other region so the active one stands out as the change.
    channel.regions.forEach((region, index) => {
      if (index !== channel.currentIndex && region) {
        region.textContent = "";
      }
    });

    channel.currentIndex = (channel.currentIndex + 1) % channel.regions.length;
  }
}
