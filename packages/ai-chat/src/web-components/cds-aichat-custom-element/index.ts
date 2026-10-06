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
export { default as __cds_aichat_container_register } from '../cds-aichat-container';
import '../cds-aichat-container';
import { installReactDomRenderer } from '../shared/react-dom-renderer';

import { html } from 'lit';
import { property, state } from 'lit/decorators.js';

import { carbonElement } from '@carbon/ai-chat-components/es/globals/decorators/index.js';
import { createMarkdownPluginHostController } from '@carbon/ai-chat-components/es/components/markdown/src/utils/plugin-host-container.js';
import { FlattenedConfigElement } from '../shared/FlattenedConfigElement';
import { ChatInstance } from '../../types/instance/ChatInstance';
import type { TypeAndHandler } from '../../types/instance/EventHandlers';
import {
  BusEventChunkUserDefinedResponse,
  BusEventCustomFooterSlot,
  BusEventType,
  BusEventUserDefinedResponse,
  BusEventViewChange,
  BusEventViewPreChange,
} from '../../types/events/eventBusTypes';
import type {
  WCRenderCustomMessageFooter,
  WCRenderCustomRequestFooter,
  WCRenderUserDefinedResponse,
  WCRenderUserDefinedInputNode,
} from '../../types/component/ChatContainer';

installReactDomRenderer();

/**
 * cds-aichat-custom-element will is a pass through to cds-aichat-container. It takes any user_defined and writeable element
 * slotted content and forwards it to cds-aichat-container. It also will setup the custom element with a default viewChange
 * pattern (e.g. hiding and showing the custom element when the chat should be open/closed) if a onViewChange property is not
 * defined. Finally, it registers the custom element with cds-aichat-container so a default "floating" element will not be created.
 *
 * The custom element should be sized using external CSS. When hidden, the 'cds-aichat--hidden' class is added to set dimensions to 0x0.
 */
@carbonElement('cds-aichat-custom-element')
class ChatCustomElement extends FlattenedConfigElement {
  /**
   * Shared stylesheet for hiding styles.
   */
  private static hideSheet =
    typeof CSSStyleSheet === 'undefined' ? undefined : new CSSStyleSheet();
  static {
    // Hide styles that override any external sizing. `CSSStyleSheet` is absent
    // on a server and `replaceSync` in jsdom, so skip styling there rather than
    // throwing at module-evaluation time.
    ChatCustomElement.hideSheet?.replaceSync?.(`
      :host {
        display: block;
      }
      :host(.cds-aichat--hidden) {
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
    if (ChatCustomElement.hideSheet) {
      root.adoptedStyleSheets = [
        ...root.adoptedStyleSheets,
        ChatCustomElement.hideSheet,
      ];
    }
    return root;
  }

  /**
   * Called once per mount, after the {@link ChatInstance} is ready and before the chat renders.
   *
   * Use it to capture the instance so you can call instance methods later. Events the chat fires while this runs
   * still reach your render callbacks.
   *
   * If it returns a promise, the chat waits for that promise before it renders. If it throws or rejects, the chat
   * logs the error, stays unrendered, and skips `onAfterRender`. Changing properties does not retry it; mount the
   * chat again to retry.
   *
   * Don't return a promise that waits for `onAfterRender`. That callback runs only after this promise settles, so
   * the chat would never render.
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
   * Called once per mount, after the chat first renders and applies its initial view.
   *
   * Like `onBeforeRender`, it receives the {@link ChatInstance}. Use it when you need the instance only after the
   * first render. It does not wait for history to load, and the chat does not wait for a promise it returns.
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
   * Optional callback to render a footer below each user message. When provided, the inner cds-aichat-container
   * manages all event listening, slot tracking, and element lifecycle.
   */
  @property({ attribute: false })
  renderCustomRequestFooter?: WCRenderCustomRequestFooter;

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

  @state()
  private _instance!: ChatInstance;

  /** Handlers this element added to the current mount's instance. */
  private _mountHandlers: TypeAndHandler[] = [];

  private defaultViewChangeHandler = (event: BusEventViewChange) => {
    if (event.newViewState.mainWindow) {
      this.classList.remove('cds-aichat--hidden');
    } else {
      this.classList.add('cds-aichat--hidden');
    }
  };

  private userDefinedHandler = (
    event: BusEventUserDefinedResponse | BusEventChunkUserDefinedResponse
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

  /**
   * The container half of the plugin-host protocol. Hosts land in this
   * element's own light DOM — page DOM, since a `cds-aichat-custom-element` is
   * always the outermost chat element in its shadow chain — so a
   * consumer-loaded stylesheet reaches the plugin output. There is no outer
   * chat ancestor to defer to, so this surface takes hosting unconditionally.
   */
  private pluginHostController = createMarkdownPluginHostController(this, {
    onSlotNamesChange: (slotNames) => {
      this._pluginSlotNames = slotNames;
    },
  });

  connectedCallback() {
    super.connectedCallback();
    this.pluginHostController.connect();
  }

  disconnectedCallback() {
    this.pluginHostController.disconnect();
    // Matches the inner container: a move keeps the running chat.
    queueMicrotask(() => {
      if (!this.isConnected) {
        this.releaseMount();
      }
    });
    super.disconnectedCallback();
  }

  /**
   * Clears what this element holds for the current mount: its instance
   * subscriptions and the slot names collected from them. Services keep
   * running.
   */
  private releaseMount() {
    this._instance?.off(this._mountHandlers);
    this._mountHandlers = [];
    this._userDefinedSlotNames = [];
    this._writeableElementSlots = [];
    this._customFooterSlotNames = [];
    this._instance = undefined;
  }

  /** Records a subscription so {@link releaseMount} can remove it. */
  private subscribe(handler: TypeAndHandler) {
    this._mountHandlers.push(handler);
    this._instance.on(handler);
  }

  /**
   * Called by the inner element once per mount, which drops calls from a
   * retired mount. A new mount replaces whatever the previous one left here.
   */
  private onBeforeRenderOverride = async (instance: ChatInstance) => {
    if (this._instance) {
      this.releaseMount();
    }
    this._instance = instance;
    if (this.onViewPreChange) {
      this.subscribe({
        type: BusEventType.VIEW_PRE_CHANGE,
        handler: this.onViewPreChange,
      });
    }
    this.subscribe({
      type: BusEventType.VIEW_CHANGE,
      handler: this.onViewChange || this.defaultViewChangeHandler,
    });

    if (!this.renderUserDefinedResponse) {
      // Legacy path: custom-element tracks slot names for manual slotting.
      // When renderUserDefinedResponse is set, the inner cds-aichat-container handles everything.
      this.subscribe({
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler: this.userDefinedHandler,
      });
      this.subscribe({
        type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
        handler: this.userDefinedHandler,
      });
    }

    if (!this.renderCustomMessageFooter) {
      // Legacy path: custom-element tracks slot names for manual slotting.
      // When renderCustomMessageFooter is set, the inner cds-aichat-container handles everything.
      this.subscribe({
        type: BusEventType.CUSTOM_FOOTER_SLOT,
        handler: this.customFooterHandler,
      });
    }

    // No CUSTOM_REQUEST_FOOTER_SLOT subscription. Outbound has no legacy static-slot path to fall back on —
    // the chat mints the slot name, so markup cannot name it — which leaves the inner cds-aichat-container as
    // the only owner of that slot.
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
        .renderCustomRequestFooter=${this.renderCustomRequestFooter}
        .renderUserDefinedInputNode=${this.renderUserDefinedInputNode}>
        ${this._writeableElementSlots.map(
          (slot) => html`<slot name=${slot} slot=${slot}></slot>`
        )}
        ${
          this.renderUserDefinedResponse
            ? null
            : this._userDefinedSlotNames.map(
                (slot) => html`<slot name=${slot} slot=${slot}></slot>`
              )
        }
        ${
          this.renderCustomMessageFooter
            ? null
            : this._customFooterSlotNames.map(
                (slot) =>
                  html`<div slot=${slot}><slot name=${slot}></slot></div>`
              )
        }
        ${this._pluginSlotNames.map(
          (slot) => html`<slot name=${slot} slot=${slot}></slot>`
        )}
      </cds-aichat-container>
    `;
  }
}

export type { CdsAiChatCustomElementAttributes } from './types';

export default ChatCustomElement;
