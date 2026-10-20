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

const SLOT_KINDS: SlotKind[] = [
  'userDefinedResponse',
  'customFooter',
  'customRequestFooter',
];

interface SlotHost {
  element: HTMLElement;
  hasContent: boolean;
}

const EMPTY_SNAPSHOT: ExtensionHostsSnapshot = {
  userDefinedResponse: {},
  customFooter: {},
  customRequestFooter: {},
};

/**
 * Owns one chat's extension content outside React: the render records for
 * user-defined responses, message footers, and request footers, and the
 * light-DOM host each record renders into. Each kind's records stay the same
 * object until that kind changes, so a view that renders one kind re-renders
 * only for it.
 *
 * A host's identity is separate from its attachment. `hostFor` creates one
 * detached host per slot and keeps it, so a view can ask for it while it
 * renders. The service attaches it to the chat element only while the chat is
 * connected, its kind has a render callback, the view reported content, and
 * the record still exists.
 */
class ExtensionHosts {
  private snapshot = EMPTY_SNAPSHOT;
  private listeners = new Set<() => void>();
  private handlers: TypeAndHandler[] | null = null;
  private renderers = new Set<SlotKind>();
  private hosts: Record<SlotKind, Map<string, SlotHost>> = {
    userDefinedResponse: new Map(),
    customFooter: new Map(),
    customRequestFooter: new Map(),
  };

  /**
   * `isRequestFooterEnabled` is asked on each request-footer event, so a
   * callback set after boot still collects footers. That event fires for
   * every user message, so a chat without the callback keeps none.
   */
  constructor(
    private readonly instance: ChatInstance,
    private readonly chatWrapper: HTMLElement | undefined,
    private readonly isRequestFooterEnabled: () => boolean
  ) {}

  getSnapshot = (): ExtensionHostsSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * Starts collecting records and attaches every host that should be
   * attached, as after a StrictMode effect replay. Repeat-safe.
   */
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
    this.syncAll();
  }

  /**
   * Stops collecting and detaches every host. Records and host identities
   * stay, so a later connect restores them. Repeat-safe.
   */
  disconnect(): void {
    if (this.handlers) {
      this.instance.off(this.handlers);
      this.handlers = null;
    }
    this.syncAll();
  }

  /** The slot's host element, created detached on first use. No DOM effect. */
  hostFor(kind: SlotKind, slot: string): HTMLElement {
    let host = this.hosts[kind].get(slot);
    if (!host) {
      const element = document.createElement('div');
      element.setAttribute('slot', slot);
      host = { element, hasContent: false };
      this.hosts[kind].set(slot, host);
    }
    return host.element;
  }

  /** A view reports from a layout effect whether a kind has a callback. */
  setRendererPresent(kind: SlotKind, present: boolean): void {
    if (present) {
      this.renderers.add(kind);
    } else {
      this.renderers.delete(kind);
    }
    this.hosts[kind].forEach((host, slot) => this.sync(kind, slot, host));
  }

  /** A view reports from a layout effect whether a slot rendered content. */
  setHasContent(kind: SlotKind, slot: string, hasContent: boolean): void {
    const host = this.hosts[kind].get(slot);
    if (host) {
      host.hasContent = hasContent;
      this.sync(kind, slot, host);
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
    if (
      !this.renderers.has('customRequestFooter') &&
      !this.isRequestFooterEnabled()
    ) {
      return;
    }
    const { slotName, message } = event.data;
    this.setRecord('customRequestFooter', slotName, { slotName, message });
  };

  private onRestart = () => {
    if (this.snapshot !== EMPTY_SNAPSHOT) {
      this.snapshot = EMPTY_SNAPSHOT;
      SLOT_KINDS.forEach((kind) => this.releaseExpired(kind));
      this.notify();
    }
  };

  /** Releases the hosts of slots whose record left. */
  private releaseExpired(kind: SlotKind): void {
    this.hosts[kind].forEach((host, slot) => {
      if (!(slot in this.snapshot[kind])) {
        this.hosts[kind].delete(slot);
        this.detach(host);
      }
    });
  }

  private syncAll(): void {
    SLOT_KINDS.forEach((kind) =>
      this.hosts[kind].forEach((host, slot) => this.sync(kind, slot, host))
    );
  }

  private sync(kind: SlotKind, slot: string, host: SlotHost): void {
    const shouldAttach =
      this.handlers !== null &&
      this.renderers.has(kind) &&
      host.hasContent &&
      slot in this.snapshot[kind];
    if (shouldAttach && this.chatWrapper) {
      if (host.element.parentNode !== this.chatWrapper) {
        this.chatWrapper.appendChild(host.element);
      }
    } else {
      this.detach(host);
    }
  }

  // A host element someone moved out of the chat element stays where it is.
  private detach(host: SlotHost): void {
    if (this.chatWrapper && host.element.parentNode === this.chatWrapper) {
      host.element.remove();
    }
  }

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
export type { ExtensionHostsSnapshot, SlotKind };
