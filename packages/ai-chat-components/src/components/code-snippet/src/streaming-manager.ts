/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { extractSlotContent, extractTextContent } from "./dom-utils.js";

interface StreamingManagerConfig {
  getSlot(): HTMLSlotElement | null | undefined;
  getHost(): Element;
  onContentUpdate(content: string): void;
}

export class StreamingManager {
  private observer: MutationObserver | null = null;
  private pendingFrame: number | null = null;
  private hasExtractedInitial = false;
  private cachedContent = "";

  constructor(private readonly config: StreamingManagerConfig) {}

  reset(initialContent?: string) {
    this.hasExtractedInitial = false;
    if (typeof initialContent === "string") {
      this.cachedContent = initialContent;
    }
  }

  connect() {
    if (!this.observer) {
      this.observer = new MutationObserver(() => {
        this.handleMutations();
      });
    }
    this.observeAssignedNodes();
  }

  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.pendingFrame !== null) {
      cancelAnimationFrame(this.pendingFrame);
      this.pendingFrame = null;
    }
  }

  dispose() {
    this.disconnect();
    this.observer = null;
  }

  ensureInitialContent() {
    if (this.hasExtractedInitial) {
      return;
    }
    this.extractContent();
    this.hasExtractedInitial = true;
  }

  handleSlotChange() {
    this.observeAssignedNodes();
    this.extractContent();
  }

  syncSlotObservers() {
    this.observeAssignedNodes();
  }

  private observeAssignedNodes() {
    if (!this.observer) {
      return;
    }

    const slot = this.config.getSlot();
    if (!slot) {
      return;
    }

    this.observer.disconnect();

    const assignedNodes = slot.assignedNodes({ flatten: true });
    if (!assignedNodes.length) {
      return;
    }

    for (const node of assignedNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        this.observer.observe(node, {
          characterData: true,
        });
      } else {
        this.observer.observe(node, {
          characterData: true,
          subtree: true,
          childList: true,
        });
      }
    }
  }

  private handleMutations() {
    if (this.pendingFrame !== null) {
      return;
    }

    this.pendingFrame = requestAnimationFrame(() => {
      this.pendingFrame = null;
      this.extractContent();
    });
  }

  private extractContent() {
    const slot = this.config.getSlot();
    const host = this.config.getHost();

    const rawContent = slot
      ? extractSlotContent(slot)
      : extractTextContent(host);
    const normalized = rawContent.replace(/\r\n/g, "\n").trim();

    if (normalized === this.cachedContent) {
      return;
    }

    this.cachedContent = normalized;
    this.config.onContentUpdate(normalized);
  }
}
