/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  LIGHT_DOM_PORTAL_EVENT,
  type LightDomPortalEventDetail,
} from '@carbon/ai-chat-components/es/components/prompt-line/src/tiptap/render-in-light-dom.js';
import type { ReactNode } from 'react';

/** One editor token or node view rendered through `renderInLightDom`. */
interface LightDomEntry {
  key: string;
  /** The `<slot>` in the editor's shadow-side container. */
  slotElement: HTMLSlotElement;
  /** The page light-DOM element the slot projects. */
  hostElement: HTMLElement;
  /** The caller's React node, which a portal renders into the host. */
  reactNode: ReactNode | null;
}

let lightDomSlotCounter = 0;

/**
 * Places editor content in the page's light DOM for one chat element. It
 * answers the editor's portal requests, and drops entries whose `<slot>` left
 * the editor. `ExtensionHosts` connects it and publishes its entries.
 */
class LightDomHosts {
  entries: readonly LightDomEntry[] = [];
  private connected = false;
  private observer: MutationObserver | null = null;

  constructor(
    private readonly chatWrapper: HTMLElement | undefined,
    private readonly onChange: () => void
  ) {}

  /**
   * Listens for portal requests, drops entries that left the editor while
   * disconnected, and attaches the rest. Repeat-safe.
   */
  connect(): void {
    if (this.connected) {
      return;
    }
    this.connected = true;
    this.chatWrapper?.addEventListener(LIGHT_DOM_PORTAL_EVENT, this.onPortal);
    this.prune();
    this.entries.forEach((entry) =>
      this.chatWrapper?.appendChild(entry.hostElement)
    );
    this.syncObserver();
  }

  /** Stops listening and detaches every host. Entries stay. Repeat-safe. */
  disconnect(): void {
    if (!this.connected) {
      return;
    }
    this.connected = false;
    this.chatWrapper?.removeEventListener(
      LIGHT_DOM_PORTAL_EVENT,
      this.onPortal
    );
    this.syncObserver();
    this.entries.forEach((entry) => this.detach(entry.hostElement));
  }

  /**
   * Answers the editor's request to place content in the page's light DOM: a
   * `<slot>` goes into the editor's container, and a host with the matching
   * slot name goes into the chat element.
   */
  private onPortal = (event: Event) => {
    const { container, fallback, reactNode, htmlElement, hostTag } = (
      event as CustomEvent<LightDomPortalEventDetail>
    ).detail;
    const key = `cds-aichat-light-dom-${++lightDomSlotCounter}`;

    // The fallback shows until the portal commits.
    const slotElement = document.createElement('slot');
    slotElement.setAttribute('name', key);
    if (fallback) {
      slotElement.appendChild(fallback);
    }
    container.textContent = '';
    container.appendChild(slotElement);

    const hostElement = document.createElement(hostTag ?? 'span');
    hostElement.setAttribute('slot', key);
    this.chatWrapper.appendChild(hostElement);
    if (htmlElement) {
      hostElement.appendChild(htmlElement);
    }

    this.entries = [
      ...this.entries,
      {
        key,
        slotElement,
        hostElement,
        reactNode: htmlElement ? null : (reactNode ?? null),
      },
    ];
    this.syncObserver();
    this.onChange();
  };

  /** Drops entries whose `<slot>` left the editor, as when a token is deleted. */
  private prune = () => {
    const live = this.entries.filter((entry) => entry.slotElement.isConnected);
    if (live.length === this.entries.length) {
      return;
    }
    this.entries
      .filter((entry) => !entry.slotElement.isConnected)
      .forEach((entry) => this.detach(entry.hostElement));
    this.entries = live;
    this.syncObserver();
    this.onChange();
  };

  /** Watches the chat's shadow root only while connected with entries. */
  private syncObserver(): void {
    const shadowRoot = this.chatWrapper?.shadowRoot;
    const shouldObserve =
      this.connected && this.entries.length > 0 && Boolean(shadowRoot);
    if (shouldObserve && !this.observer) {
      this.observer = new MutationObserver(this.prune);
      this.observer.observe(shadowRoot, { childList: true, subtree: true });
    } else if (!shouldObserve && this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  private detach(element: HTMLElement): void {
    if (this.chatWrapper && element.parentNode === this.chatWrapper) {
      element.remove();
    }
  }
}

export { LightDomHosts };
export type { LightDomEntry };
