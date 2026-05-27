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
  RenderCustomMessageFooterState,
  RenderUserDefinedState,
  WCMarkdown,
  WCRenderCustomMessageFooter,
  WCRenderUserDefinedResponse,
} from "../../types/component/ChatContainer";

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
   */
  @property({ attribute: false })
  onBeforeRender: (instance: ChatInstance) => Promise<void> | void;

  /**
   * This function is called after the render function of Carbon AI Chat is called.
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
   * Enhanced handler for CUSTOM_FOOTER_SLOT when the renderCustomMessageFooter callback is provided.
   * Tracks both slot names and the full per-slot state used by the callback rendering path.
   */
  private enhancedCustomFooterHandler = (event: BusEventCustomFooterSlot) => {
    const { slotName, message, messageItem, additionalData } = event.data;
    if (!this._customFooterSlotNames.includes(slotName)) {
      this._customFooterSlotNames = [...this._customFooterSlotNames, slotName];
    }
    this._customFooterStateBySlot = {
      ...this._customFooterStateBySlot,
      [slotName]: {
        slotName,
        message,
        messageItem,
        additionalData: additionalData as Record<string, unknown> | undefined,
      },
    };
  };

  /**
   * Enhanced handler for USER_DEFINED_RESPONSE when renderUserDefinedResponse callback is provided.
   * Tracks both slot names and full message state per slot.
   */
  private enhancedUserDefinedHandler = (event: BusEventUserDefinedResponse) => {
    const { slot } = event.data;
    if (!this._userDefinedSlotNames.includes(slot)) {
      this._userDefinedSlotNames = [...this._userDefinedSlotNames, slot];
    }
    this._userDefinedStateBySlot = {
      ...this._userDefinedStateBySlot,
      [slot]: {
        fullMessage: event.data.fullMessage,
        messageItem: event.data.message,
        state: event.data.state,
      },
    };
  };

  /**
   * Enhanced handler for CHUNK_USER_DEFINED_RESPONSE when renderUserDefinedResponse callback is provided.
   * Handles both complete_item and partial_item chunks, accumulating state per slot.
   */
  private enhancedUserDefinedChunkHandler = (
    event: BusEventChunkUserDefinedResponse,
  ) => {
    const { slot, chunk } = event.data;
    if (!this._userDefinedSlotNames.includes(slot)) {
      this._userDefinedSlotNames = [...this._userDefinedSlotNames, slot];
    }

    if ("complete_item" in chunk) {
      this._userDefinedStateBySlot = {
        ...this._userDefinedStateBySlot,
        [slot]: { messageItem: chunk.complete_item },
      };
    } else if ("partial_item" in chunk) {
      const existing = this._userDefinedStateBySlot[slot];
      this._userDefinedStateBySlot = {
        ...this._userDefinedStateBySlot,
        [slot]: {
          ...existing,
          partialItems: [...(existing?.partialItems ?? []), chunk.partial_item],
        },
      };
    }
  };

  /**
   * Handles RESTART_CONVERSATION when the renderUserDefinedResponse and/or renderCustomMessageFooter
   * callback is provided. Clears all accumulated state and removes callback-rendered elements from the DOM.
   *
   * The custom-footer cleanup is guarded by renderCustomMessageFooter so the legacy footer passthrough
   * path (which the host clears itself) is left untouched.
   */
  private restartHandler = () => {
    this._userDefinedStateBySlot = {};
    this._userDefinedSlotNames = [];
    for (const el of this._callbackElements.values()) {
      el.remove();
    }
    this._callbackElements.clear();

    if (this.renderCustomMessageFooter) {
      this._customFooterStateBySlot = {};
      this._customFooterSlotNames = [];
      for (const el of this._callbackFooterElements.values()) {
        el.remove();
      }
      this._callbackFooterElements.clear();
    }
  };

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
        html: string;
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
      return;
    }
    event.preventDefault();
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
    if (host.innerHTML !== detail.html) {
      host.innerHTML = detail.html;
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
    super.disconnectedCallback();
  }

  onBeforeRenderOverride = async (instance: ChatInstance) => {
    this._instance = instance;

    // Opt-in view-change observation hooks. The float container manages its own
    // visibility, so there is no default handler — a prop is only subscribed
    // when the consumer provides it.
    if (this.onViewPreChange) {
      this._instance.on({
        type: BusEventType.VIEW_PRE_CHANGE,
        handler: this.onViewPreChange,
      });
    }
    if (this.onViewChange) {
      this._instance.on({
        type: BusEventType.VIEW_CHANGE,
        handler: this.onViewChange,
      });
    }

    if (this.renderUserDefinedResponse) {
      // Enhanced path: library manages full state for callback rendering
      this._instance.on({
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler: this.enhancedUserDefinedHandler,
      });
      this._instance.on({
        type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
        handler: this.enhancedUserDefinedChunkHandler,
      });
    } else {
      // Legacy path: container only tracks slot names
      this._instance.on({
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler: this.userDefinedHandler,
      });
      this._instance.on({
        type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
        handler: this.userDefinedHandler,
      });
    }

    // Enhanced path manages full per-slot state for callback rendering; the
    // legacy path only tracks slot names for manual slotting.
    this._instance.on({
      type: BusEventType.CUSTOM_FOOTER_SLOT,
      handler: this.renderCustomMessageFooter
        ? this.enhancedCustomFooterHandler
        : this.customFooterHandler,
    });

    // A single RESTART_CONVERSATION subscription clears whichever callback
    // paths are active. Registered once so the handler does not fire twice
    // when both callbacks are provided.
    if (this.renderUserDefinedResponse || this.renderCustomMessageFooter) {
      this._instance.on({
        type: BusEventType.RESTART_CONVERSATION,
        handler: this.restartHandler,
      });
    }

    this.addWriteableElementSlots();
    this.attachWriteableElements();
    await this.onBeforeRender?.(instance);
  };

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

    return html`<cds-aichat-internal
      .config=${this.resolvedConfig}
      .onAfterRender=${this.onAfterRender}
      .onBeforeRender=${this.onBeforeRenderOverride}
      .element=${this.element}
      .markdown=${this.markdown as WCMarkdown | undefined}
    >
      ${this._writeableElementSlots.map(
        (slot) => html`<slot name=${slot} slot=${slot}></slot>`,
      )}
      ${this._userDefinedSlotNames.map(
        (slot) => html`<slot name=${slot} slot=${slot}></slot>`,
      )}
      ${this.renderCustomMessageFooter
        ? this._customFooterSlotNames.map(
            (slot) => html`<slot name=${slot} slot=${slot}></slot>`,
          )
        : this._customFooterSlotNames.map(
            (slot) => html`<div slot=${slot}><slot name=${slot}></slot></div>`,
          )}
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
   * This function is called after the render function of Carbon AI Chat is called.
   */
  onAfterRender?: (instance: ChatInstance) => Promise<void> | void;

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
}

export { CdsAiChatContainerAttributes };
export default ChatContainer;
