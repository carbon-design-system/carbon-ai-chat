/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { AriaAnnouncer } from './ariaAnnouncer';
import { subscribeToIntl } from '../utils/intlUtils';
import type { ServiceManager } from './ServiceManager';
import type { IntlShape } from '../utils/i18n';
import type { Dimension } from '../../types/utilities/Dimension';
import type { EndHumanAgentChatPanelProps } from '../components/panels/EndHumanAgentChatPanel';

/** A response card's own confirmation, shown in the end-chat panel. */
type HumanAgentConfirmation = Omit<EndHumanAgentChatPanelProps, 'open'>;

interface ChatViewStateSnapshot {
  readonly serviceManager: ServiceManager;
  readonly intl: IntlShape;
  readonly windowSize: Dimension;
  /** True while the header's end-chat prompt is open. */
  readonly endChatConfirmationOpen: boolean;
  /** A card's confirmation, which wins over the end-chat prompt's text. */
  readonly humanAgentConfirmation: HumanAgentConfirmation | null;
}

/**
 * The per-chat state that views read outside the store: services, the
 * formatter, window size, and confirmation state. `cds-aichat-container`
 * creates one per mount; React reads it through `ChatContext`, and Lit through
 * the view-state Lit context.
 */
class ChatViewState {
  readonly announcer: AriaAnnouncer;
  private snapshot: ChatViewStateSnapshot;
  private listeners = new Set<() => void>();
  private unsubscribeIntl: (() => void) | null = null;

  constructor(
    readonly serviceManager: ServiceManager,
    windowSize: Dimension
  ) {
    const { intl } = serviceManager;
    this.snapshot = Object.freeze({
      serviceManager,
      intl,
      windowSize,
      endChatConfirmationOpen: false,
      humanAgentConfirmation: null,
    });
    this.announcer = new AriaAnnouncer(
      serviceManager.store,
      intl?.formatMessage
    );
  }

  getSnapshot = (): ChatViewStateSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Calls `listener` only when the selected value changes. */
  select<T>(
    selector: (snapshot: ChatViewStateSnapshot) => T,
    listener: (value: T) => void,
    isEqual: (left: T, right: T) => boolean = Object.is
  ): () => void {
    let selected = selector(this.snapshot);
    return this.subscribe(() => {
      const next = selector(this.snapshot);
      if (!isEqual(selected, next)) {
        selected = next;
        listener(next);
      }
    });
  }

  connect(): void {
    if (this.unsubscribeIntl) {
      return;
    }
    this.unsubscribeIntl = subscribeToIntl(this.serviceManager, this.syncIntl);
    this.syncIntl();
  }

  disconnect(): void {
    this.unsubscribeIntl?.();
    this.unsubscribeIntl = null;
  }

  setWindowSize(windowSize: Dimension): void {
    const current = this.snapshot.windowSize;
    if (
      current.width !== windowSize.width ||
      current.height !== windowSize.height
    ) {
      this.update({ windowSize });
    }
  }

  showEndChatConfirmation = (): void => {
    this.update({ endChatConfirmationOpen: true });
  };

  hideEndChatConfirmation = (): void => {
    this.update({ endChatConfirmationOpen: false });
  };

  /**
   * Shows a card's confirmation. The returned release clears it only while it
   * is still the current one, so an older card's cleanup cannot close a newer
   * card's confirmation.
   */
  openConfirmation(confirmation: HumanAgentConfirmation): () => void {
    this.update({ humanAgentConfirmation: confirmation });
    return () => {
      if (this.snapshot.humanAgentConfirmation === confirmation) {
        this.update({ humanAgentConfirmation: null });
      }
    };
  }

  private syncIntl = (): void => {
    const { intl } = this.serviceManager;
    if (intl !== this.snapshot.intl) {
      this.announcer.setFormatter(intl.formatMessage);
      this.update({ intl });
    }
  };

  private update(change: Partial<ChatViewStateSnapshot>): void {
    if (
      (Object.keys(change) as (keyof ChatViewStateSnapshot)[]).every(
        (key) => this.snapshot[key] === change[key]
      )
    ) {
      return;
    }
    this.snapshot = Object.freeze({ ...this.snapshot, ...change });
    this.listeners.forEach((listener) => listener());
  }
}

export { ChatViewState };
