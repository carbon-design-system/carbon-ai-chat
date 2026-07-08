/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

// Ensure the container custom element is registered whenever the
// custom element module is imported by re-exporting its exports.
// This prevents bundlers (and our own multi-entry Rollup build)
// from pruning the side-effect-only import.
export { default as __cds_aichat_container_register } from "../cds-aichat-container";
import "../cds-aichat-container";

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
  WCMarkdown,
  WCRenderCustomMessageFooter,
  WCRenderUserDefinedResponse,
  WCRenderUserDefinedInputNode,
} from "../../types/component/ChatContainer";

/**
 * cds-aichat-custom-element will is a pass through to cds-aichat-container. It takes any user_defined and writeable element
 * slotted content and forwards it to cds-aichat-container. It also will setup the custom element with a default viewChange
 * pattern (e.g. hiding and showing the custom element when the chat should be open/closed) if a onViewChange property is not
 * defined. Finally, it registers the custom element with cds-aichat-container so a default "floating" element will not be created.
 *
 * The custom element should be sized using external CSS. When hidden, the 'cds-aichat--hidden' class is added to set dimensions to 0x0.
 */
@carbonElement("cds-aichat-custom-element")
class ChatCustomElement extends FlattenedConfigElement {
  /**
   * Shared stylesheet for hiding styles.
   */
  private static hideSheet = new CSSStyleSheet();
  static {
    // Hide styles that override any external sizing. `replaceSync` is absent
    // in non-browser environments (e.g. the jsdom-based test environment), so
    // skip styling there rather than throwing at module-evaluation time.
    ChatCustomElement.hideSheet.replaceSync?.(`
      :host {
        display: block;
      }
      :host(.cds-aichat--hidden) {
        width: 0 !important;
        height: 0 !important;
        min-width: 0 !important;
        min-height: 0 !important;
        max-width: 0 !important;
        max-height: 0 !important;
        inline-size: 0 !important;
        block-size: 0 !important;
        min-inline-size: 0 !important;
        min-block-size: 0 !important;
        max-inline-size: 0 !important;
        max-block-size: 0 !important;
        overflow: hidden !important;
        display: block !important;
      }
    `);
  }

  /**
   * Adopt our stylesheet into every shadowRoot.
   */
  protected createRenderRoot(): ShadowRoot {
    // Lits default createRenderRoot actually returns a ShadowRoot
    const root = super.createRenderRoot() as ShadowRoot;

    // now TS knows root.adoptedStyleSheets exists
    root.adoptedStyleSheets = [
      ...root.adoptedStyleSheets,
      ChatCustomElement.hideSheet,
    ];
    return root;
  }

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
   * // <cds-aichat-custom-element .onBeforeRender=${onBeforeRender}></cds-aichat-custom-element>
   * ```
   */
  @property({ attribute: false })
  onBeforeRender?: (instance: ChatInstance) => Promise<void> | void;

  /**
   * This function is called after the render function of Carbon AI Chat is called.
   *
   * Like `onBeforeRender`, it receives the {@link ChatInstance}; use it when you need the instance only after the
   * first render has completed.
   */
  @property({ attribute: false })
  onAfterRender?: (instance: ChatInstance) => Promise<void> | void;

  /**
   * Called before a view change (chat opening/closing). The chat will hide the chat shell inside your custom element
   * to prevent invisible keyboard stops when the view change is complete.
   *
   * Use this callback to update your CSS class name values on this element before the view change happens if you want to add any open/close
   * animations to your custom element before the chat shell inner contents are hidden. It is async and so you can
   * tie it to native the AnimationEvent and only return when your animations have completed.
   *
   * A common pattern is to use this for when the chat is closing and to use onViewChange for when the chat opens.
   *
   * Note that this function can only be provided before Carbon AI Chat is loaded as it is registered before the
   * chat renders. After Carbon AI Chat is loaded, the callback will not be updated.
   */
  @property()
  onViewPreChange?: (event: BusEventViewPreChange) => Promise<void> | void;

  /**
   * Called when the chat view change is complete. If no callback is provided here, the default behavior will be to set
   * the chat shell to 0x0 size and set all inner contents aside from the launcher, if you are using it, to display: none.
   * The inner contents of the chat shell (aside from the launcher if you are using it) are always set to display: none
   * regardless of what is configured with this callback to prevent invisible tab stops and screen reader issues.
   *
   * Use this callback to update your className value when the chat has finished being opened or closed.
   *
   * You can provide a different callback here if you want custom animation behavior when the chat is opened or closed.
   * The animation behavior defined here will run in concert with the chat inside your custom container being hidden.
   *
   * If you want to run animations before the inner contents of the chat shell is shrunk and the inner contents are hidden,
   * make use of onViewPreChange.
   *
   * A common pattern is to use this for when the chat is opening and to use onViewPreChange for when the chat closes.
   *
   * Note that this function can only be provided before Carbon AI Chat is loaded as it is registered before the
   * chat renders. After Carbon AI Chat is loaded, the callback will not be updated.
   */
  @property()
  onViewChange?: (event: BusEventViewChange, instance: ChatInstance) => void;

  /**
   * Optional callback to render user defined responses. When provided, the inner cds-aichat-container
   * manages all event listening, slot tracking, and element lifecycle.
   */
  @property({ attribute: false })
  renderUserDefinedResponse?: WCRenderUserDefinedResponse;

  /**
   * Optional callback to render custom message footers. When provided, the inner cds-aichat-container
   * manages all event listening, slot tracking, and element lifecycle.
   */
  @property({ attribute: false })
  renderCustomMessageFooter?: WCRenderCustomMessageFooter;

  /**
   * Renderer for custom TipTap node types inside sent user message bubbles
   * (rich user message content). Forwarded to the inner cds-aichat-container.
   *
   * @experimental
   */
  @property({ attribute: false })
  renderUserDefinedInputNode?: WCRenderUserDefinedInputNode;

  // markdown is declared on the FlattenedConfigElement base; the attributes
  // interface narrows its type.

  @state()
  private _userDefinedSlotNames: string[] = [];

  @state()
  private _writeableElementSlots: string[] = [];

  @state()
  private _customFooterSlotNames: string[] = [];

  /**
   * Active slot names for markdown-plugin output hosted at this element.
   * Populated when this element accepts the host-mount event; drained when
   * the matching unmount event fires.
   */
  @state()
  private _pluginSlotNames: string[] = [];

  /**
   * Page-level host elements created for plugin-output slots, keyed by slot
   * name. Created in this element's outer light DOM so consumer-loaded
   * stylesheets (e.g. KaTeX) reach the rendered HTML normally.
   */
  private _pluginHosts: Map<string, HTMLElement> = new Map();

  @state()
  private _instance!: ChatInstance;

  private defaultViewChangeHandler = (event: BusEventViewChange) => {
    if (event.newViewState.mainWindow) {
      this.classList.remove("cds-aichat--hidden");
    } else {
      this.classList.add("cds-aichat--hidden");
    }
  };

  private userDefinedHandler = (
    event: BusEventUserDefinedResponse | BusEventChunkUserDefinedResponse,
  ) => {
    const { slot } = event.data;
    if (!this._userDefinedSlotNames.includes(slot)) {
      this._userDefinedSlotNames = [...this._userDefinedSlotNames, slot];
    }
  };

  private customFooterHandler = (event: BusEventCustomFooterSlot) => {
    const { slotName } = event.data;
    if (!this._customFooterSlotNames.includes(slotName)) {
      this._customFooterSlotNames = [...this._customFooterSlotNames, slotName];
    }
  };

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
    if (!this._pluginSlotNames.includes(detail.slotName)) {
      this._pluginSlotNames = [...this._pluginSlotNames, detail.slotName];
    }
    // cds-aichat-custom-element is always the outermost chat element in its
    // shadow chain; there is no further chat ancestor to defer to. Take
    // hosting unconditionally.
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

  private onBeforeRenderOverride = async (instance: ChatInstance) => {
    this._instance = instance;
    if (this.onViewPreChange) {
      this._instance.on({
        type: BusEventType.VIEW_PRE_CHANGE,
        handler: this.onViewPreChange,
      });
    }
    this._instance.on({
      type: BusEventType.VIEW_CHANGE,
      handler: this.onViewChange || this.defaultViewChangeHandler,
    });

    if (!this.renderUserDefinedResponse) {
      // Legacy path: custom-element tracks slot names for manual slotting.
      // When renderUserDefinedResponse is set, the inner cds-aichat-container handles everything.
      this._instance.on({
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler: this.userDefinedHandler,
      });
      this._instance.on({
        type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
        handler: this.userDefinedHandler,
      });
    }

    if (!this.renderCustomMessageFooter) {
      // Legacy path: custom-element tracks slot names for manual slotting.
      // When renderCustomMessageFooter is set, the inner cds-aichat-container handles everything.
      this._instance.on({
        type: BusEventType.CUSTOM_FOOTER_SLOT,
        handler: this.customFooterHandler,
      });
    }
    this.addWriteableElementSlots();
    await this.onBeforeRender?.(instance);
  };

  private addWriteableElementSlots() {
    this._writeableElementSlots = Object.keys(this._instance.writeableElements);
  }

  render() {
    return html`
      <cds-aichat-container
        .config=${this.resolvedConfig}
        .header=${this.resolvedConfig.header}
        .onAfterRender=${this.onAfterRender}
        .onBeforeRender=${this.onBeforeRenderOverride}
        .element=${this}
        .renderUserDefinedResponse=${this.renderUserDefinedResponse}
        .renderCustomMessageFooter=${this.renderCustomMessageFooter}
        .renderUserDefinedInputNode=${this.renderUserDefinedInputNode}
      >
        ${this._writeableElementSlots.map(
          (slot) => html`<slot name=${slot} slot=${slot}></slot>`,
        )}
        ${this.renderUserDefinedResponse
          ? null
          : this._userDefinedSlotNames.map(
              (slot) => html`<slot name=${slot} slot=${slot}></slot>`,
            )}
        ${this.renderCustomMessageFooter
          ? null
          : this._customFooterSlotNames.map(
              (slot) =>
                html`<div slot=${slot}><slot name=${slot}></slot></div>`,
            )}
        ${this._pluginSlotNames.map(
          (slot) => html`<slot name=${slot} slot=${slot}></slot>`,
        )}
      </cds-aichat-container>
    `;
  }
}

/**
 * Attributes interface for the cds-aichat-custom-element web component.
 * This interface extends {@link PublicConfig} with additional component-specific props,
 * flattening all config properties as top-level properties for better TypeScript IntelliSense.
 *
 * @category Web component
 */
interface CdsAiChatCustomElementAttributes extends Omit<
  PublicConfig,
  "markdown"
> {
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
   * Called before a view change (the chat opening or closing) and awaited before the change proceeds. Use it to update
   * this element's CSS classes and run open/close animations to completion before the chat shell's inner contents are
   * hidden. A common pattern is to use this when the chat is closing and `onViewChange` when it opens.
   *
   * Note that this function can only be provided before Carbon AI Chat is loaded. After Carbon AI Chat is loaded, the
   * callback will not be updated.
   */
  onViewPreChange?: (event: BusEventViewPreChange) => Promise<void> | void;

  /**
   * An optional listener for "view:change" events. Such a listener is required when using a custom element in order
   * to control the visibility of the Carbon AI Chat main window. If no callback is provided here, a default one will be
   * used that injects styling into the app that will show and hide the Carbon AI Chat main window and also change the
   * size of the custom element so it doesn't take up space when the main window is closed.
   *
   * You can provide a different callback here if you want custom behavior such as an animation when the main window
   * is opened or closed.
   *
   * Note that this function can only be provided before Carbon AI Chat is loaded. After Carbon AI Chat is loaded, the event
   * handler will not be updated.
   */
  onViewChange?: (event: BusEventViewChange, instance: ChatInstance) => void;

  /**
   * Optional callback to render user defined responses. When provided, the inner cds-aichat-container
   * manages all event listening, slot tracking, streaming state, and element lifecycle.
   */
  renderUserDefinedResponse?: WCRenderUserDefinedResponse;

  /**
   * Optional callback to render custom message footers. When provided, the inner cds-aichat-container
   * manages all event listening, slot tracking, and element lifecycle.
   */
  renderCustomMessageFooter?: WCRenderCustomMessageFooter;

  /**
   * Renderer for custom TipTap node types inside sent user message bubbles
   * (rich user message content). Forwarded to the inner cds-aichat-container.
   *
   * @experimental
   */
  renderUserDefinedInputNode?: WCRenderUserDefinedInputNode;
}

export { CdsAiChatCustomElementAttributes };

export default ChatCustomElement;
