/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  mountAriaAnnouncer,
  type AriaAnnouncerHandle,
} from '@carbon/ai-chat-components/es/globals/utils/aria-announcer-manager.js';
import type { AnnounceMessage } from '../../types/state/AnnounceMessage';
import type { IntlShape } from '../utils/i18n';
import { nodeToText } from '../utils/domUtils';

type AriaAnnouncerFunctionType = (
  value: Node | AnnounceMessage | string
) => void;

interface AnnouncementStore {
  getState(): { announceMessage?: AnnounceMessage };
  subscribe(listener: () => void): () => void;
}

async function waitForMarkdownElements(node: Node): Promise<void> {
  if (!(node instanceof Element)) {
    return;
  }
  const markdownElements = Array.from(
    node.querySelectorAll<Element & { updateComplete?: Promise<boolean> }>(
      'cds-aichat-markdown'
    )
  );
  if (node.tagName.toLowerCase() === 'cds-aichat-markdown') {
    markdownElements.unshift(node);
  }
  await Promise.all(markdownElements.map((element) => element.updateComplete));
}

class AriaAnnouncer {
  private handle: AriaAnnouncerHandle | null = null;
  private unsubscribe: (() => void) | null = null;
  private pendingValues: (Node | string)[] = [];
  private pendingAssertiveValues: string[] = [];
  private previousAnnounceMessage: AnnounceMessage | undefined;
  private generation = 0;
  private formatMessage: IntlShape['formatMessage'];

  constructor(
    private readonly store: AnnouncementStore,
    formatMessage: IntlShape['formatMessage']
  ) {
    this.formatMessage = formatMessage;
  }

  setFormatter(formatMessage: IntlShape['formatMessage']): void {
    this.formatMessage = formatMessage;
  }

  connect(container: HTMLElement): void {
    if (this.handle) {
      return;
    }
    // Three polite regions avoid repeated region contents in Firefox + JAWS.
    this.handle = mountAriaAnnouncer(container, {
      politeCount: 3,
      assertiveCount: 2,
    });
    this.unsubscribe = this.store.subscribe(() => {
      const message = this.store.getState().announceMessage;
      if (message !== this.previousAnnounceMessage) {
        this.announce(message);
        this.previousAnnounceMessage = message;
      }
    });
  }

  disconnect(): void {
    this.generation += 1;
    this.pendingValues = [];
    this.pendingAssertiveValues = [];
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.handle?.disconnect();
    this.handle = null;
  }

  announce: AriaAnnouncerFunctionType = (value) => {
    if (!value) {
      return;
    }
    if (typeof value === 'string' || 'nodeType' in value) {
      this.queueValue(value, false);
      return;
    }
    const text = value.messageID
      ? this.formatMessage({ id: value.messageID }, value.messageValues)
      : value.messageText;
    this.queueValue(text, Boolean(value.assertive));
  };

  private queueValue(value: Node | string, assertive: boolean): void {
    const generation = this.generation;
    if (assertive) {
      this.pendingAssertiveValues.push(value as string);
      if (this.pendingAssertiveValues.length === 1) {
        void Promise.resolve().then(() => this.flushAssertive(generation));
      }
      return;
    }
    this.pendingValues.push(value);
    if (this.pendingValues.length === 1) {
      // Legacy callers populate Lit descendants later in this synchronous turn.
      void Promise.resolve().then(() => this.flushPolite(generation));
    }
  }

  private flushAssertive(generation: number): void {
    if (generation !== this.generation) {
      return;
    }
    const queue = this.pendingAssertiveValues;
    this.pendingAssertiveValues = [];
    const text = queue.filter(Boolean).join(' ');
    if (text) {
      this.handle?.announce(text, 'assertive');
    }
  }

  private async flushPolite(generation: number): Promise<void> {
    if (generation !== this.generation) {
      return;
    }
    const queue = this.pendingValues;
    this.pendingValues = [];
    // Markdown throttles rendering, so a microtask alone cannot expose its text.
    await Promise.all(
      queue.map((entry) =>
        typeof entry === 'string' ? undefined : waitForMarkdownElements(entry)
      )
    );
    if (generation !== this.generation) {
      return;
    }
    const parts: string[] = [];
    queue.forEach((entry) => {
      if (typeof entry === 'string') {
        parts.push(entry);
      } else {
        nodeToText(entry, parts);
      }
    });
    const text = parts.join(' ');
    if (text) {
      this.handle?.announce(text, 'polite');
    }
  }
}

export { AriaAnnouncer };
export type { AriaAnnouncerFunctionType };
