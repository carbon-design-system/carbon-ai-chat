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
import prefix from '@carbon/ai-chat-components/es/globals/settings.js';
import {
  mountHost,
  mountInlineHost,
  unmountHost,
} from '../components/portals/inputNodeHosts';
import {
  collectSlotEntries,
  type InputNodeSlotEntry,
} from '../utils/inputNodeSlots';
import { LightDomHosts, type LightDomEntry } from './lightDomHosts';
import type { AppState } from '../../types/state/AppState';
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
  /** Derived from the store's messages; stable while they are. */
  readonly inputNode: readonly InputNodeSlotEntry[];
  /** Editor content placed in the page's light DOM. */
  readonly lightDom: readonly LightDomEntry[];
}

type SlotKind = Exclude<keyof ExtensionHostsSnapshot, 'inputNode' | 'lightDom'>;
type HostKind = SlotKind | 'inputNode';

interface MessagesStore {
  getState(): Pick<AppState, 'allMessagesByID'>;
  subscribe(listener: () => void): () => void;
}

const SLOT_KINDS: SlotKind[] = [
  'userDefinedResponse',
  'customFooter',
  'customRequestFooter',
];

interface SlotHost {
  element: HTMLElement;
  hasContent: boolean;
}

interface InputNodeHost extends SlotHost {
  isInline: boolean;
  isToken: boolean;
  release: (() => void) | null;
  /**
   * True once the host has been in its target. The target's paragraph may
   * still be detached then; it attaches later in the same commit, before the
   * re-render this flag triggers. It stays true, so a target that
   * re-registers later does not remount the host's content.
   */
  placed: boolean;
}

const EMPTY_SNAPSHOT: ExtensionHostsSnapshot = {
  userDefinedResponse: {},
  customFooter: {},
  customRequestFooter: {},
  inputNode: [],
  lightDom: [],
};

function isTokenNode(entry: InputNodeSlotEntry): boolean {
  const { type } = entry.state.node;
  return type === 'mention' || type === 'command';
}

/**
 * Owns one chat's extension content outside React: the render records for
 * user-defined responses, message footers, request footers, sent input
 * nodes, and editor light-DOM content, and the light-DOM host each record
 * renders into. Editor light-DOM hosts live in `LightDomHosts`, which this
 * service connects. Each kind's records stay the same object until that kind
 * changes, so a view that renders one kind re-renders only for it.
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
  private renderers = new Set<HostKind>();
  private hosts: Record<SlotKind, Map<string, SlotHost>> = {
    userDefinedResponse: new Map(),
    customFooter: new Map(),
    customRequestFooter: new Map(),
  };
  private inputHosts = new Map<string, InputNodeHost>();
  private inputKeys = new Set<string>();
  private messages: AppState['allMessagesByID'] | undefined;
  private unsubscribeStore: (() => void) | null = null;
  private readonly lightDom: LightDomHosts;

  /**
   * `isRequestFooterEnabled` is asked on each request-footer event, so a
   * callback set after boot still collects footers. That event fires for
   * every user message, so a chat without the callback keeps none.
   */
  constructor(
    private readonly instance: ChatInstance,
    private readonly chatWrapper: HTMLElement | undefined,
    private readonly store: MessagesStore,
    private readonly isRequestFooterEnabled: () => boolean
  ) {
    this.lightDom = new LightDomHosts(chatWrapper, this.onLightDomChange);
  }

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
    this.unsubscribeStore = this.store.subscribe(this.onMessagesChange);
    this.onMessagesChange();
    this.lightDom.connect();
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
    this.unsubscribeStore?.();
    this.unsubscribeStore = null;
    this.lightDom.disconnect();
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

  /**
   * The input node's host element, created detached on first use: a `span`
   * for inline and token nodes, so clipboard text keeps paragraph flow, and a
   * `div` otherwise. No DOM effect.
   */
  inputNodeHostFor(entry: InputNodeSlotEntry): HTMLElement {
    let host = this.inputHosts.get(entry.slotKey);
    if (!host) {
      const isInline = entry.isInline;
      const isToken = isTokenNode(entry);
      host = {
        element: document.createElement(isInline || isToken ? 'span' : 'div'),
        hasContent: false,
        isInline,
        isToken,
        release: null,
        placed: !isInline,
      };
      this.inputHosts.set(entry.slotKey, host);
    }
    return host.element;
  }

  /**
   * Whether an input node's host has been placed in its target. An inline host
   * waits for its target in the sent bubble, so its content renders only once
   * this is true and its first effects see a connected element.
   */
  isInputNodePlaced = (slotKey: string): boolean =>
    this.inputHosts.get(slotKey)?.placed ?? false;

  /** A view reports from a layout effect whether a kind has a callback. */
  setRendererPresent(kind: HostKind, present: boolean): void {
    if (present) {
      this.renderers.add(kind);
    } else {
      this.renderers.delete(kind);
    }
    if (kind === 'inputNode') {
      this.inputHosts.forEach((host, key) => this.syncInput(key, host));
    } else {
      this.hosts[kind].forEach((host, slot) => this.sync(kind, slot, host));
    }
  }

  /** A view reports from a layout effect whether a slot rendered content. */
  setHasContent(kind: HostKind, slot: string, hasContent: boolean): void {
    if (kind === 'inputNode') {
      const host = this.inputHosts.get(slot);
      if (host) {
        host.hasContent = hasContent;
        this.syncInput(slot, host);
      }
      return;
    }
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
    if (
      SLOT_KINDS.some((kind) => this.snapshot[kind] !== EMPTY_SNAPSHOT[kind])
    ) {
      this.snapshot = {
        ...EMPTY_SNAPSHOT,
        inputNode: this.snapshot.inputNode,
        lightDom: this.snapshot.lightDom,
      };
      SLOT_KINDS.forEach((kind) => this.releaseExpired(kind));
      this.notify();
    }
  };

  /**
   * Recomputes the input-node entries when the messages change. Entries are
   * cached per message, so an unrelated update keeps the same array.
   */
  private onMessagesChange = () => {
    const { allMessagesByID } = this.store.getState();
    if (allMessagesByID === this.messages) {
      return;
    }
    this.messages = allMessagesByID;
    const entries = collectSlotEntries(allMessagesByID);
    const previous = this.snapshot.inputNode;
    if (
      entries.length === previous.length &&
      entries.every((entry, index) => entry === previous[index])
    ) {
      return;
    }
    this.snapshot = { ...this.snapshot, inputNode: entries };
    this.inputKeys = new Set(entries.map((entry) => entry.slotKey));
    entries.forEach((entry) => {
      const host = this.inputHosts.get(entry.slotKey);
      if (
        host &&
        (host.isInline !== entry.isInline ||
          host.isToken !== isTokenNode(entry))
      ) {
        this.releaseInput(entry.slotKey, host);
      }
    });
    this.inputHosts.forEach((host, key) => {
      if (!this.inputKeys.has(key)) {
        this.releaseInput(key, host);
      }
    });
    this.notify();
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
    this.inputHosts.forEach((host, key) => this.syncInput(key, host));
  }

  private onLightDomChange = () => {
    this.snapshot = { ...this.snapshot, lightDom: this.lightDom.entries };
    this.notify();
  };

  private releaseInput(key: string, host: InputNodeHost): void {
    this.inputHosts.delete(key);
    host.release?.();
    host.release = null;
  }

  /**
   * Input-node hosts attach through the markdown plugin-host protocol: an
   * inline node joins its target in the bubble, and any other node gets a
   * slot. A node without content gets no host, so its fallback label shows.
   */
  private syncInput(key: string, host: InputNodeHost): void {
    const shouldAttach =
      this.handlers !== null &&
      this.renderers.has('inputNode') &&
      host.hasContent &&
      this.inputKeys.has(key) &&
      Boolean(this.chatWrapper);
    if (shouldAttach && !host.release) {
      const { chatWrapper } = this;
      const { element } = host;
      if (host.isInline) {
        element.className = `${prefix}-markdown-inline-plugin`;
        host.release = mountInlineHost(chatWrapper, key, element, () => {
          if (!host.placed) {
            host.placed = true;
            this.notify();
          }
        });
      } else {
        element.setAttribute('slot', key);
        mountHost(chatWrapper, element, key, host.isToken);
        host.release = () => unmountHost(chatWrapper, element, key);
      }
    } else if (!shouldAttach && host.release) {
      host.release();
      host.release = null;
    }
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

  private detach(host: SlotHost): void {
    this.detachElement(host.element);
  }

  // A host element someone moved out of the chat element stays where it is.
  private detachElement(element: HTMLElement): void {
    if (this.chatWrapper && element.parentNode === this.chatWrapper) {
      element.remove();
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
export type { ExtensionHostsSnapshot, HostKind, SlotKind };
