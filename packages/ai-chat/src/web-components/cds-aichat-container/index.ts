/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This is the exposed web component for a basic floating chat.
 */

import "./cds-aichat-internal";

import { html } from "lit";
import { property, state } from "lit/decorators.js";

import { carbonElement } from "@carbon/ai-chat-components/es/globals/decorators/index.js";
import { PublicConfig } from "../../types/config/PublicConfig";
import { FlattenedConfigElement } from "../shared/FlattenedConfigElement";
import { ChatInstance } from "../../types/instance/ChatInstance";
import {
  BusEventChunkUserDefinedResponse,
  BusEventCustomFooterSlot,
  BusEventType,
  BusEventUserDefinedResponse,
  BusEventViewChange,
  BusEventViewPreChange,
} from "../../types/events/eventBusTypes";
import type {
  OnAttachDetails,
  RenderCustomMessageFooterState,
  RenderUserDefinedState,
  WCMarkdown,
  WCRenderCustomMessageFooter,
  WCRenderUserDefinedResponse,
  WCRenderUserDefinedInputNode,
  RenderUserDefinedInputNode,
} from "../../types/component/ChatContainer";
import { adaptWCRenderUserDefinedInputNode } from "./adapt-wc-input-node-renderer";
import type { ChatSlotStates } from "../../chat/sdk/slotStates.js";

/**
 * The cds-aichat-container managing creating slotted elements for user_defined responses, custom message footers, and writable elements.
 * It then passes that slotted content into cds-aichat-internal. That component will boot up the full chat application
 * and pass the slotted elements into their slots.
 */
@carbonElement("cds-aichat-container")
class ChatContainer extends FlattenedConfigElement {
  /**
   * The element to render to instead of the default float element.
   *
   * @internal
   */
  @property({ type: HTMLElement })
  element?: HTMLElement;

  /**
   * This function is called before the render function of Carbon AI Chat is called. This function can return a Promise
   * which will cause Carbon AI Chat to wait for it before rendering.
   *
   * Use it to capture the {@link ChatInstance} so you can call instance methods later.
   *
   * @example
   * ```ts
   * const onBeforeRender = (instance: ChatInstance) => {
   *   this.instance = instance;
   * };
   * // <cds-aichat-container .onBeforeRender=${onBeforeRender}></cds-aichat-container>
   * ```
   */
  @property({ attribute: false })
  onBeforeRender: (instance: ChatInstance) => Promise<void> | void;

  /**
   * This function is called once per chat boot, after the first render of Carbon AI Chat has
   * committed (it is not re-fired on a reuse re-attach — see `featureFlags.reuseInstance`). Like
   * `onBeforeRender`, it receives the {@link ChatInstance}; use it when you need the instance only after the
   * initial render has completed. Unlike `onBeforeRender`, this does not gate rendering — its return value is
   * not awaited.
   */
  @property({ attribute: false })
  onAfterRender: (instance: ChatInstance) => Promise<void> | void;

  /**
   * Called before a view change (the chat opening or closing). Async — return a
   * Promise to defer the view change until it resolves.
   *
   * This is an opt-in observation hook. Unlike `cds-aichat-custom-element`, the
   * container has no wrapping element to size, so no default visibility
   * behavior runs when this property is omitted.
   */
  @property()
  onViewPreChange?: (event: BusEventViewPreChange) => Promise<void> | void;

  /**
   * Called when a view change (the chat opening or closing) is complete.
   *
   * This is an opt-in observation hook. Unlike `cds-aichat-custom-element`, the
   * container has no wrapping element to size, so no default visibility
   * behavior runs when this property is omitted.
   */
  @property()
  onViewChange?: (event: BusEventViewChange, instance: ChatInstance) => void;

  /**
   * Called on every mount/attach of Carbon AI Chat — the first boot and each reuse re-attach (see
   * `featureFlags.reuseInstance`). Receives the same {@link ChatInstance}; capture it here (it
   * survives remounts) and use `details.remount` to run one-time setup only on the first attach.
   */
  @property({ attribute: false })
  onAttach?: (instance: ChatInstance, details: OnAttachDetails) => void;

  /**
   * Optional callback to render user defined responses. When provided, the library manages all event listening,
   * slot tracking, streaming state, and element lifecycle. The callback receives the accumulated state and should
   * return an HTMLElement or null.
   *
   * When this property is not set, the existing event + manual slot approach continues to work.
   */
  @property({ attribute: false })
  renderUserDefinedResponse?: WCRenderUserDefinedResponse;

  /**
   * Optional callback to render custom message footers. When provided, the library manages all event listening,
   * slot tracking, and element lifecycle. The callback receives the accumulated state and should
   * return an HTMLElement or null.
   *
   * When this property is not set, the existing event + manual slot approach continues to work.
   */
  @property({ attribute: false })
  renderCustomMessageFooter?: WCRenderCustomMessageFooter;

  // markdown is declared on the FlattenedConfigElement base; the attributes
  // interface narrows its type.

  /**
   * Renderer for custom TipTap node types inside sent user message bubbles
   * (rich user message content). Called with `{ node, message }` plus the
   * chat instance and should return an `HTMLElement` (or `null`). The
   * library mounts the element inside the bubble via a slot.
   *
   * @experimental
   */
  @property({ attribute: false })
  renderUserDefinedInputNode?: WCRenderUserDefinedInputNode;

  /**
   * The existing array of slot names for all user_defined components.
   */
  @state()
  _userDefinedSlotNames: string[] = [];

  /**
   * The existing array of slot names for all custom footers.
   */
  @state()
  _customFooterSlotNames: string[] = [];

  /**
   * The existing array of slot names for all writeable elements.
   */
  @state()
  _writeableElementSlots: string[] = [];

  /**
   * Active slot names for markdown-plugin output hosted at this element.
   * Populated when this element takes over from the markdown element by
   * accepting the host-mount event; drained when the matching unmount
   * event fires.
   */
  @state()
  _pluginSlotNames: string[] = [];

  /**
   * Page-level host elements created for plugin-output slots, keyed by slot
   * name. Created in this element's outer light DOM so consumer-loaded
   * stylesheets (e.g. KaTeX) reach the rendered HTML normally.
   */
  private _pluginHosts: Map<string, HTMLElement> = new Map();

  /**
   * The chat instance.
   */
  @state()
  _instance: ChatInstance;

  /**
   * Accumulated state per slot for user_defined responses when renderUserDefinedResponse is provided.
   */
  @state()
  _userDefinedStateBySlot: Record<string, RenderUserDefinedState> = {};

  /**
   * Accumulated state per slot for custom message footers when renderCustomMessageFooter is provided.
   */
  @state()
  _customFooterStateBySlot: Record<string, RenderCustomMessageFooterState> = {};

  /**
   * Tracks the wrapper elements created by the callback rendering path.
   */
  private _callbackElements = new Map<string, HTMLElement>();

  /**
   * Tracks the wrapper elements created by the custom-footer callback rendering path.
   */
  private _callbackFooterElements = new Map<string, HTMLElement>();

  /**
   * Cached adapter so each container update doesn't churn a new React
   * function down into ChatAppEntry. Keyed on the WC function identity.
   */
  private _inputNodeRendererCache:
    | { wc: WCRenderUserDefinedInputNode; react: RenderUserDefinedInputNode }
    | undefined;

  private _inputNodeReactRendererFor(
    wc: WCRenderUserDefinedInputNode,
  ): RenderUserDefinedInputNode {
    if (this._inputNodeRendererCache?.wc === wc) {
      return this._inputNodeRendererCache.react;
    }
    const react = adaptWCRenderUserDefinedInputNode(wc);
    this._inputNodeRendererCache = { wc, react };
    return react;
  }

  /**
   * The framework-agnostic slot-state stores (`src/chat/sdk/slotStates.ts`), handed down from
   * `ChatAppEntry` via the internal `onSlotStatesReady` handshake (see `cds-aichat-internal.tsx`).
   * Subscribed instead of re-accumulating the same bus events locally.
   */
  private _slotStates?: ChatSlotStates;

  private _unsubscribeUserDefined?: () => void;

  private _unsubscribeCustomFooter?: () => void;

  /**
   * The bus handlers this element currently has registered on the instance, so they can be
   * `off()`d on disconnect and re-registered on the next attach — under `reuseInstance` the
   * event bus outlives the element, and an orphaned handler would keep firing against a
   * detached node forever.
   */
  private _instanceHandlers: Array<{
    type: BusEventType;
    handler: (...args: unknown[]) => unknown;
  }> = [];

  /**
   * Adds the slot attribute to the element for the user_defined response type and then injects it into the component by
   * updating this._userDefinedSlotNames;
   */
  userDefinedHandler = (
    event: BusEventUserDefinedResponse | BusEventChunkUserDefinedResponse,
  ) => {
    // This element already has `slot` as an attribute.
    const { slot } = event.data;
    if (!this._userDefinedSlotNames.includes(slot)) {
      this._userDefinedSlotNames = [...this._userDefinedSlotNames, slot];
    }
  };

  /**
   * Adds the slot attribute to the element for the custom_footer_slot type and then injects it into the component by
   * updating this._customFooterSlotNames;
   */
  customFooterHandler = (event: BusEventCustomFooterSlot) => {
    // This element already has `slotName` as an attribute.
    const { slotName } = event.data;
    if (!this._customFooterSlotNames.includes(slotName)) {
      this._customFooterSlotNames = [...this._customFooterSlotNames, slotName];
    }
  };

  /**
   * Called once the slot-state stores are available (every acquire, cold boot and reuse
   * re-attach alike — see `onSlotStatesReady`'s doc). (Re-)subscribes the callback-rendering
   * paths to the core-owned stores instead of the element's own bus-event accumulation.
   */
  private handleSlotStatesReady = (slotStates: ChatSlotStates) => {
    this._slotStates = slotStates;
    this.subscribeToSlotStates();
  };

  /**
   * Subscribes the user-defined-response and custom-footer callback-rendering paths to the
   * shared core stores. Replaces the previous enhanced bus-event handlers: the projection logic
   * (`syncCallbackRenderedElements`/`syncCallbackRenderedFooterElements`) is unchanged, only the
   * feed into `_userDefinedStateBySlot`/`_customFooterStateBySlot` changes. Seeds state
   * immediately from `.get()` so a reuse re-attach shows already-accumulated slot content without
   * waiting for a new bus event. `RESTART_CONVERSATION` needs no dedicated handler here — the core
   * store resets to `{}`, which flows through this same subscription and (via the sync methods'
   * existing "slot no longer in state" cleanup loop) removes any stale rendered elements.
   */
  private subscribeToSlotStates() {
    if (!this._slotStates) {
      return;
    }
    this._unsubscribeUserDefined?.();
    this._unsubscribeCustomFooter?.();

    if (this.renderUserDefinedResponse) {
      const store = this._slotStates.userDefinedBySlot;
      const apply = () => {
        this._userDefinedStateBySlot = store.get();
        this._userDefinedSlotNames = Object.keys(this._userDefinedStateBySlot);
      };
      apply();
      this._unsubscribeUserDefined = store.subscribe(apply);
    }

    if (this.renderCustomMessageFooter) {
      const store = this._slotStates.customFooterBySlot;
      const apply = () => {
        this._customFooterStateBySlot = store.get();
        this._customFooterSlotNames = Object.keys(
          this._customFooterStateBySlot,
        );
      };
      apply();
      this._unsubscribeCustomFooter = store.subscribe(apply);
    }
  }

  /**
   * Synchronizes callback-rendered elements in the light DOM based on current state.
   * Called from render() when renderUserDefinedResponse is provided.
   */
  private syncCallbackRenderedElements() {
    for (const [slot, slotState] of Object.entries(
      this._userDefinedStateBySlot,
    )) {
      const newContent =
        this.renderUserDefinedResponse?.(slotState, this._instance) ?? null;

      if (!newContent) {
        const existing = this._callbackElements.get(slot);
        if (existing) {
          existing.remove();
          this._callbackElements.delete(slot);
        }
        continue;
      }

      let wrapper = this._callbackElements.get(slot);
      if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.setAttribute("slot", slot);
        this._callbackElements.set(slot, wrapper);
        this.appendChild(wrapper);
      }

      wrapper.replaceChildren(newContent);
    }

    // Clean up wrappers for slots that no longer exist in state
    for (const [slot, el] of this._callbackElements.entries()) {
      if (!(slot in this._userDefinedStateBySlot)) {
        el.remove();
        this._callbackElements.delete(slot);
      }
    }
  }

  /**
   * Synchronizes custom-footer callback-rendered elements in the light DOM based on current state.
   * Called from render() when renderCustomMessageFooter is provided. Direct analogue of
   * syncCallbackRenderedElements().
   */
  private syncCallbackRenderedFooterElements() {
    for (const [slotName, slotState] of Object.entries(
      this._customFooterStateBySlot,
    )) {
      const newContent =
        this.renderCustomMessageFooter?.(slotState, this._instance) ?? null;

      if (!newContent) {
        const existing = this._callbackFooterElements.get(slotName);
        if (existing) {
          existing.remove();
          this._callbackFooterElements.delete(slotName);
        }
        continue;
      }

      let wrapper = this._callbackFooterElements.get(slotName);
      if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.setAttribute("slot", slotName);
        this._callbackFooterElements.set(slotName, wrapper);
        this.appendChild(wrapper);
      }

      wrapper.replaceChildren(newContent);
    }

    // Clean up wrappers for slots that no longer exist in state
    for (const [slotName, el] of this._callbackFooterElements.entries()) {
      if (!(slotName in this._customFooterStateBySlot)) {
        el.remove();
        this._callbackFooterElements.delete(slotName);
      }
    }
  }

  /**
   * True when an outer chat element (cds-aichat-custom-element) further up
   * the composed path will catch the host-mount event. When true, this
   * element only forwards the slot through its render template and lets the
   * outer element create the page-level host. When false, this element is
   * outermost and must create the host itself.
   */
  private hasOuterChatHandler(event: Event): boolean {
    const path = event.composedPath();
    const myIndex = path.indexOf(this);
    if (myIndex < 0) {
      return false;
    }
    for (let i = myIndex + 1; i < path.length; i++) {
      const node = path[i] as Element;
      if (
        node?.tagName === "CDS-AICHAT-CUSTOM-ELEMENT" ||
        node?.tagName === "CDS-AICHAT-REACT"
      ) {
        return true;
      }
    }
    return false;
  }

  private handlePluginHostMount = (event: Event) => {
    const detail = (
      event as CustomEvent<{
        slotName: string;
        html?: string;
        element?: HTMLElement;
        isInline: boolean;
      }>
    ).detail;
    if (!detail?.slotName) {
      return;
    }
    // Track the slot regardless of who owns hosting so our render forwarder
    // projects the page-level content into cds-aichat-internal's slot.
    if (!this._pluginSlotNames.includes(detail.slotName)) {
      this._pluginSlotNames = [...this._pluginSlotNames, detail.slotName];
    }
    if (this.hasOuterChatHandler(event)) {
      // An outer chat element will create the page-level host; just forward.
      // This applies to the live-element path too: appending here would land
      // the node in this element's light DOM (inside the outer chat element's
      // shadow root), where global CSS still wouldn't reach it.
      return;
    }
    event.preventDefault();
    // Custom-renderer hosts (table/codeBlock) forward a live element — the
    // markdown element keeps ownership of its content; we only relocate the
    // node into our outer light DOM so the consumer's global CSS reaches it.
    // Plugin fallbacks forward an HTML string instead.
    if (detail.element) {
      const element = detail.element;
      element.setAttribute("slot", detail.slotName);
      if (!detail.isInline) {
        element.style.marginBlockStart = "1rem";
      }
      if (element.parentElement !== this) {
        this.appendChild(element);
      }
      return;
    }
    let host = this._pluginHosts.get(detail.slotName);
    if (!host) {
      host = document.createElement(detail.isInline ? "span" : "div");
      host.setAttribute("slot", detail.slotName);
      // Match `.cds-aichat-markdown-stack > *:not(:first-child)` spacing;
      // shadow CSS doesn't reach this host (it lives in this element's
      // outer light DOM), so apply it inline. Inline output flows with
      // text and gets no extra spacing.
      if (!detail.isInline) {
        host.style.marginBlockStart = "1rem";
      }
      this._pluginHosts.set(detail.slotName, host);
      this.appendChild(host);
    }
    if (host.innerHTML !== (detail.html ?? "")) {
      host.innerHTML = detail.html ?? "";
    }
  };

  private handlePluginHostUpdate = (event: Event) => {
    const detail = (event as CustomEvent<{ slotName: string; html: string }>)
      .detail;
    if (!detail?.slotName) {
      return;
    }
    const host = this._pluginHosts.get(detail.slotName);
    if (host && host.innerHTML !== detail.html) {
      host.innerHTML = detail.html;
    }
  };

  private handlePluginHostUnmount = (event: Event) => {
    const detail = (event as CustomEvent<{ slotName: string }>).detail;
    if (!detail?.slotName) {
      return;
    }
    this._pluginSlotNames = this._pluginSlotNames.filter(
      (n) => n !== detail.slotName,
    );
    const host = this._pluginHosts.get(detail.slotName);
    if (host) {
      host.remove();
      this._pluginHosts.delete(detail.slotName);
    }
  };

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener(
      "cds-aichat-markdown-plugin-host-mount",
      this.handlePluginHostMount,
    );
    this.addEventListener(
      "cds-aichat-markdown-plugin-host-update",
      this.handlePluginHostUpdate,
    );
    this.addEventListener(
      "cds-aichat-markdown-plugin-host-unmount",
      this.handlePluginHostUnmount,
    );
    // A transient DOM move runs disconnected -> connected while the inner React root survives
    // (see cds-aichat-internal's deferred teardown), so nothing re-fires onSlotStatesReady or
    // onAttach — re-wire from the retained references instead. Both no-op before first boot.
    this.subscribeToSlotStates();
    this.registerInstanceHandlers();
  }

  disconnectedCallback() {
    this.removeEventListener(
      "cds-aichat-markdown-plugin-host-mount",
      this.handlePluginHostMount,
    );
    this.removeEventListener(
      "cds-aichat-markdown-plugin-host-update",
      this.handlePluginHostUpdate,
    );
    this.removeEventListener(
      "cds-aichat-markdown-plugin-host-unmount",
      this.handlePluginHostUnmount,
    );
    for (const host of this._pluginHosts.values()) {
      host.remove();
    }
    this._pluginHosts.clear();
    this._unsubscribeUserDefined?.();
    this._unsubscribeCustomFooter?.();
    this.removeInstanceHandlers();
    super.disconnectedCallback();
  }

  /**
   * Fires on every attach — cold boot and each reuse re-attach. All per-element wiring lives
   * here (not in the boot-once `onBeforeRender` path) so a fresh element adopting a reused
   * instance still captures the instance, re-projects the writeable elements, and re-registers
   * its bus handlers; mirrors the React surface's `onAttachOverride`.
   */
  private onAttachOverride = (
    instance: ChatInstance,
    details: OnAttachDetails,
  ) => {
    this._instance = instance;
    this.registerInstanceHandlers();
    this.addWriteableElementSlots();
    this.attachWriteableElements();
    this.onAttach?.(instance, details);
  };

  onBeforeRenderOverride = async (instance: ChatInstance) => {
    // Per-element wiring happens in `onAttachOverride`, which ChatAppEntry always fires first
    // (and again on each reuse re-attach, which never reaches this boot-once path).
    await this.onBeforeRender?.(instance);
  };

  /**
   * (Re-)registers this element's bus handlers on the instance, replacing any prior set.
   * Opt-in view-change observation hooks: the float container manages its own visibility, so
   * there is no default handler — a prop is only subscribed when the consumer provides it. The
   * enhanced (callback-rendering) state comes from the core-owned slot-state stores via
   * `subscribeToSlotStates`, not bus handlers; the legacy path (no render callback) still only
   * needs slot names, so it keeps its own lightweight bus subscription.
   */
  private registerInstanceHandlers() {
    this.removeInstanceHandlers();
    if (!this._instance) {
      return;
    }
    const register = (
      type: BusEventType,
      handler: (...args: unknown[]) => unknown,
    ) => {
      this._instance.on({ type, handler });
      this._instanceHandlers.push({ type, handler });
    };

    if (this.onViewPreChange) {
      register(
        BusEventType.VIEW_PRE_CHANGE,
        this.onViewPreChange as (...args: unknown[]) => unknown,
      );
    }
    if (this.onViewChange) {
      register(
        BusEventType.VIEW_CHANGE,
        this.onViewChange as (...args: unknown[]) => unknown,
      );
    }
    if (!this.renderUserDefinedResponse) {
      register(
        BusEventType.USER_DEFINED_RESPONSE,
        this.userDefinedHandler as (...args: unknown[]) => unknown,
      );
      register(
        BusEventType.CHUNK_USER_DEFINED_RESPONSE,
        this.userDefinedHandler as (...args: unknown[]) => unknown,
      );
    }
    if (!this.renderCustomMessageFooter) {
      register(
        BusEventType.CUSTOM_FOOTER_SLOT,
        this.customFooterHandler as (...args: unknown[]) => unknown,
      );
    }
  }

  private removeInstanceHandlers() {
    if (this._instance) {
      for (const { type, handler } of this._instanceHandlers) {
        this._instance.off({ type, handler });
      }
    }
    this._instanceHandlers = [];
  }

  addWriteableElementSlots() {
    const writeableElementSlots: string[] = [];
    Object.keys(this._instance.writeableElements).forEach(
      (writeableElementKey) => {
        writeableElementSlots.push(writeableElementKey);
      },
    );
    this._writeableElementSlots = writeableElementSlots;
  }

  private attachWriteableElements() {
    const writeableElements = this._instance?.writeableElements;
    if (!writeableElements) {
      return;
    }

    Object.entries(writeableElements).forEach(([slot, element]) => {
      if (!element) {
        return;
      }

      element.setAttribute("slot", slot);

      if (!element.isConnected) {
        this.appendChild(element);
      }
    });
  }

  /**
   * Renders the template while passing in class functionality
   */
  render() {
    if (this.renderUserDefinedResponse) {
      this.syncCallbackRenderedElements();
    }
    if (this.renderCustomMessageFooter) {
      this.syncCallbackRenderedFooterElements();
    }

    // Convert the WC-style renderer (returns HTMLElement) into the React-
    // style renderer (returns ReactNode) the React infrastructure expects.
    // Memoization is by reference: as long as the consumer hands us the
    // same function we hand the same adapter down to the React tree, so
    // ChatAppEntry doesn't re-render on every container update.
    const inputNodeReactRenderer = this.renderUserDefinedInputNode
      ? this._inputNodeReactRendererFor(this.renderUserDefinedInputNode)
      : undefined;

    return html`<cds-aichat-internal
      .config=${this.resolvedConfig}
      .onAfterRender=${this.onAfterRender}
      .onBeforeRender=${this.onBeforeRenderOverride}
      .onAttach=${this.onAttachOverride}
      .onSlotStatesReady=${this.handleSlotStatesReady}
      .element=${this.element}
      .renderUserDefinedInputNode=${inputNodeReactRenderer}
    >
      ${this._writeableElementSlots.map(
        (slot) => html`<slot name=${slot} slot=${slot}></slot>`,
      )}
      ${this._userDefinedSlotNames.map(
        (slot) => html`<slot name=${slot} slot=${slot}></slot>`,
      )}
      ${
        this.renderCustomMessageFooter
          ? this._customFooterSlotNames.map(
              (slot) => html`<slot name=${slot} slot=${slot}></slot>`,
            )
          : this._customFooterSlotNames.map(
              (slot) =>
                html`<div slot=${slot}><slot name=${slot}></slot></div>`,
            )
      }
      ${this._pluginSlotNames.map(
        (slot) => html`<slot name=${slot} slot=${slot}></slot>`,
      )}
    </cds-aichat-internal>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-container": ChatContainer;
  }
}

/**
 * Attributes interface for the cds-aichat-container web component.
 * This interface extends {@link PublicConfig} with additional component-specific props,
 * flattening all config properties as top-level properties for better TypeScript IntelliSense.
 *
 * @category Web component
 */
interface CdsAiChatContainerAttributes extends Omit<PublicConfig, "markdown"> {
  /**
   * Markdown rendering customization. Extends the framework-neutral
   * `PublicConfig.markdown` with web-component `customRenderers`.
   *
   * @experimental
   */
  markdown?: WCMarkdown;

  /**
   * This function is called before the render function of Carbon AI Chat is called. This function can return a Promise
   * which will cause Carbon AI Chat to wait for it before rendering.
   */
  onBeforeRender?: (instance: ChatInstance) => Promise<void> | void;

  /**
   * This function is called once per chat boot, after the first render of Carbon AI Chat has
   * committed (it is not re-fired on a reuse re-attach — see `featureFlags.reuseInstance`). It receives the
   * {@link ChatInstance}; use it when you need the instance only after the initial render has completed. Its
   * return value is not awaited (it does not gate rendering).
   */
  onAfterRender?: (instance: ChatInstance) => Promise<void> | void;

  /**
   * Called on every mount/attach of Carbon AI Chat — the first boot and each reuse re-attach (see
   * {@link PublicConfigFeatureFlags.reuseInstance}). Receives the same {@link ChatInstance}; capture it
   * here (it survives remounts) and use {@link OnAttachDetails.remount} to run one-time setup only on the
   * first attach.
   */
  onAttach?: (instance: ChatInstance, details: OnAttachDetails) => void;

  /**
   * Called before a view change (the chat opening or closing). Async — return a Promise to defer the view
   * change until it resolves. This is an opt-in observation hook with no default visibility behavior.
   */
  onViewPreChange?: (event: BusEventViewPreChange) => Promise<void> | void;

  /**
   * Called when a view change (the chat opening or closing) is complete. This is an opt-in observation hook
   * with no default visibility behavior.
   */
  onViewChange?: (event: BusEventViewChange, instance: ChatInstance) => void;

  /**
   * Optional callback to render user defined responses. When provided, the library manages all event listening,
   * slot tracking, streaming state, and element lifecycle.
   */
  renderUserDefinedResponse?: WCRenderUserDefinedResponse;

  /**
   * Optional callback to render custom message footers. When provided, the library manages all event listening,
   * slot tracking, and element lifecycle. When omitted, the legacy event + manual slot approach continues to work.
   */
  renderCustomMessageFooter?: WCRenderCustomMessageFooter;

  /**
   * Renderer for custom TipTap node types inside sent user message bubbles
   * (rich user message content).
   *
   * @experimental
   */
  renderUserDefinedInputNode?: WCRenderUserDefinedInputNode;
}

export { CdsAiChatContainerAttributes };
export default ChatContainer;
