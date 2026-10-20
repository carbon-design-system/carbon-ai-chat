/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  BusEventType,
  type BusEventChunkUserDefinedResponse,
  type BusEventCustomFooterSlot,
  type BusEventCustomRequestFooterSlot,
  type BusEventUserDefinedResponse,
} from '../../types/events/eventBusTypes';
import type { ChatInstance } from '../../types/instance/ChatInstance';
import type { TypeAndHandler } from '../../types/instance/EventHandlers';
import type {
  RenderCustomMessageFooterState,
  RenderCustomRequestFooterState,
  RenderUserDefinedState,
} from '../../types/component/ChatContainer';

interface ExtensionHostsSnapshot {
  readonly userDefinedResponse: Readonly<
    Record<string, RenderUserDefinedState>
  >;
  readonly customFooter: Readonly<
    Record<string, RenderCustomMessageFooterState>
  >;
  readonly customRequestFooter: Readonly<
    Record<string, RenderCustomRequestFooterState>
  >;
}

type SlotKind = keyof ExtensionHostsSnapshot;

const EMPTY_SNAPSHOT: ExtensionHostsSnapshot = {
  userDefinedResponse: {},
  customFooter: {},
  customRequestFooter: {},
};

/**
 * Owns the render records for one chat's extension content: user-defined
 * responses, message footers, and request footers. Each kind's records stay
 * the same object until that kind changes, so a view that renders one kind
 * re-renders only for it.
 */
class ExtensionHosts {
  private snapshot = EMPTY_SNAPSHOT;
  private listeners = new Set<() => void>();
  private handlers: TypeAndHandler[] | null = null;

  /**
   * `isRequestFooterEnabled` is asked on each request-footer event, so a
   * callback set after boot still collects footers. That event fires for
   * every user message, so a chat without the callback keeps none.
   */
  constructor(
    private readonly instance: ChatInstance,
    private readonly isRequestFooterEnabled: () => boolean
  ) {}

  getSnapshot = (): ExtensionHostsSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Starts collecting records from the instance's events. Repeat-safe. */
  connect(): void {
    if (this.handlers) {
      return;
    }
    this.handlers = [
      {
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler: this.onUserDefinedResponse,
      },
      {
        type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
        handler: this.onUserDefinedChunk,
      },
      { type: BusEventType.CUSTOM_FOOTER_SLOT, handler: this.onCustomFooter },
      {
        type: BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
        handler: this.onCustomRequestFooter,
      },
      { type: BusEventType.RESTART_CONVERSATION, handler: this.onRestart },
    ];
    this.instance.on(this.handlers);
  }

  /** Stops collecting. Records stay, so a later connect resumes. */
  disconnect(): void {
    if (this.handlers) {
      this.instance.off(this.handlers);
      this.handlers = null;
    }
  }

  private onUserDefinedResponse = (event: BusEventUserDefinedResponse) => {
    this.setRecord('userDefinedResponse', event.data.slot, {
      fullMessage: event.data.fullMessage,
      messageItem: event.data.message,
      state: event.data.state,
    });
  };

  private onUserDefinedChunk = (event: BusEventChunkUserDefinedResponse) => {
    const { slot, chunk } = event.data;
    if ('complete_item' in chunk) {
      this.setRecord('userDefinedResponse', slot, {
        messageItem: chunk.complete_item,
      });
    } else if ('partial_item' in chunk) {
      const partialItems =
        this.snapshot.userDefinedResponse[slot]?.partialItems ?? [];
      this.setRecord('userDefinedResponse', slot, {
        partialItems: [...partialItems, chunk.partial_item],
      });
    }
  };

  private onCustomFooter = (event: BusEventCustomFooterSlot) => {
    const { slotName, message, messageItem, additionalData } = event.data;
    this.setRecord('customFooter', slotName, {
      slotName,
      message,
      messageItem,
      additionalData: additionalData as Record<string, unknown> | undefined,
    });
  };

  private onCustomRequestFooter = (event: BusEventCustomRequestFooterSlot) => {
    if (!this.isRequestFooterEnabled()) {
      return;
    }
    const { slotName, message } = event.data;
    this.setRecord('customRequestFooter', slotName, { slotName, message });
  };

  private onRestart = () => {
    if (this.snapshot !== EMPTY_SNAPSHOT) {
      this.snapshot = EMPTY_SNAPSHOT;
      this.notify();
    }
  };

  private setRecord<K extends SlotKind>(
    kind: K,
    slot: string,
    record: ExtensionHostsSnapshot[K][string]
  ): void {
    this.snapshot = {
      ...this.snapshot,
      [kind]: { ...this.snapshot[kind], [slot]: record },
    };
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export { ExtensionHosts };
