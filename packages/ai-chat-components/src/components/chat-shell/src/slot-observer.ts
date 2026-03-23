/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { SlotConfig, SlotContentState } from "./types.js";

/**
 * Observes and tracks slot content changes in the chat shell.
 * Monitors specific slots for content and notifies when changes occur.
 */
export class SlotObserver {
  private state: SlotContentState = {
    hasHeaderContent: false,
    hasHeaderAfterContent: false,
    hasFooterContent: false,
    hasInputContent: false,
    hasInputAfterContent: false,
    hasInputBeforeContent: false,
  };

  private slots: HTMLSlotElement[] = [];
  private onChangeCallback?: () => void;

  constructor(
    private readonly shellRoot: ShadowRoot,
    private readonly observedSlots: readonly SlotConfig[],
  ) {}

  /**
   * Start observing slot content changes
   */
  connect(onChangeCallback: () => void): void {
    this.onChangeCallback = onChangeCallback;
    this.updateSlotStates();
    this.observeSlotChanges();
  }

  /**
   * Stop observing slot content changes
   */
  disconnect(): void {
    this.slots.forEach((slot) => {
      slot.removeEventListener("slotchange", this.handleSlotChange);
    });
    this.slots = [];
    this.onChangeCallback = undefined;
  }

  /**
   * Get current slot content state
   */
  getSlotContentState(): Readonly<SlotContentState> {
    return { ...this.state };
  }

  /**
   * Check if a specific slot has content
   */
  hasSlotContent(slotName: string): boolean {
    const slot = this.shellRoot.querySelector<HTMLSlotElement>(
      `slot[name="${slotName}"]`,
    );
    if (!slot) {
      return false;
    }

    return slot.assignedNodes({ flatten: true }).some((node) => {
      // Check for non-empty text nodes
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        return true;
      }

      // Check for element nodes
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        return this.hasElementContent(element);
      }

      return false;
    });
  }

  /**
   * Check if an element has meaningful content
   */
  private hasElementContent(element: Element): boolean {
    // Check if element has child nodes with meaningful content (light DOM)
    const hasChildContent = Array.from(element.childNodes).some((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        return child.textContent?.trim();
      }
      if (child.nodeType === Node.ELEMENT_NODE) {
        const childElement = child as Element;
        // Check slot elements recursively - they may have assigned content
        if (childElement.tagName.toLowerCase() === "slot") {
          const slotElement = childElement as HTMLSlotElement;
          const assignedNodes = slotElement.assignedNodes({ flatten: true });
          return assignedNodes.some((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              return node.textContent?.trim();
            }
            if (node.nodeType === Node.ELEMENT_NODE) {
              return this.hasElementContent(node as Element);
            }
            return false;
          });
        }
        return true;
      }
      return false;
    });

    if (hasChildContent) {
      return true;
    }

    // If no light DOM children, check if element has shadow root (Shadow DOM content)
    if ((element as any).shadowRoot) {
      return true;
    }

    // Check text content as fallback
    const textContent = element.textContent?.trim();
    return Boolean(textContent);
  }

  /**
   * Update the state for all observed slots
   */
  private updateSlotStates(): void {
    const previousStates = new Map(
      this.observedSlots.map(({ stateKey }) => [
        stateKey,
        this.state[stateKey],
      ]),
    );

    this.observedSlots.forEach(({ name, stateKey }) => {
      this.state[stateKey] = this.hasSlotContent(name);
    });

    const hasChanged = this.observedSlots.some(
      ({ stateKey }) => previousStates.get(stateKey) !== this.state[stateKey],
    );

    if (hasChanged && this.onChangeCallback) {
      this.onChangeCallback();
    }
  }

  /**
   * Set up slot change listeners
   */
  private observeSlotChanges(): void {
    this.slots = this.observedSlots
      .map(({ name }) =>
        this.shellRoot.querySelector<HTMLSlotElement>(`slot[name="${name}"]`),
      )
      .filter((slot): slot is HTMLSlotElement => slot !== null);

    this.slots.forEach((slot) => {
      slot.addEventListener("slotchange", this.handleSlotChange);
    });
  }

  /**
   * Handle slot change events
   */
  private handleSlotChange = (): void => {
    this.updateSlotStates();
  };
}

// Made with Bob
