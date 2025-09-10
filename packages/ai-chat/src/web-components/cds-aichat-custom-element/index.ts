/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../cds-aichat-container";

import { html, LitElement } from "lit";
import { property, state } from "lit/decorators.js";

import { carbonElement } from "../../chat/ai-chat-components/web-components/decorators/customElement";
import { PublicConfig, OnErrorData } from "../../types/config/PublicConfig";
import { DeepPartial } from "../../types/utilities/DeepPartial";
import { LanguagePack } from "../../types/config/PublicConfig";
import type {
  ServiceDesk,
  ServiceDeskFactoryParameters,
  ServiceDeskPublicConfig,
} from "../../types/config/ServiceDeskConfig";
import { ChatInstance } from "../../types/instance/ChatInstance";
import {
  BusEventChunkUserDefinedResponse,
  BusEventType,
  BusEventUserDefinedResponse,
  BusEventViewChange,
} from "../../types/events/eventBusTypes";

/**
 * cds-aichat-custom-element will is a pass through to cds-aichat-container. It takes any user_defined and writeable element
 * slotted content and forwards it to cds-aichat-container. It also will setup the custom element with a default viewChange
 * pattern (e.g. hiding and showing the custom element when the chat should be open/closed) if a onViewChange property is not
 * defined. Finally, it registers the custom element with cds-aichat-container so a default "floating" element will not be created.
 */
@carbonElement("cds-aichat-custom-element")
class ChatCustomElement extends LitElement {
  /**
   * Shared stylesheet for host-size rules.
   */
  private static sizeSheet = new CSSStyleSheet();
  static {
    // initial host rule; width/height will be overridden dynamically
    ChatCustomElement.sizeSheet.replaceSync(`
      :host {
        display: block;
        width: auto;
        height: auto;
      }
    `);
  }

  protected firstUpdated() {
    // Grab whatever size the host naturally renders at:
    const { width, height } = getComputedStyle(this);
    this._originalStyles = { width, height };
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
      ChatCustomElement.sizeSheet,
    ];
    return root;
  }

  // Flattened PublicConfig properties
  @property({ attribute: false })
  onError?: (
    data: import("../../types/config/PublicConfig").OnErrorData,
  ) => void;

  @property({ type: Boolean, attribute: "open-chat-by-default" })
  openChatByDefault?: boolean;

  @property({ type: Object })
  disclaimer?: import("../../types/config/PublicConfig").DisclaimerPublicConfig;

  @property({
    type: Boolean,
    attribute: "disable-custom-element-mobile-enhancements",
  })
  disableCustomElementMobileEnhancements?: boolean;

  @property({ type: Boolean })
  debug?: boolean;

  @property({ type: Boolean, attribute: "expose-service-manager-for-testing" })
  exposeServiceManagerForTesting?: boolean;

  @property({ type: String, attribute: "inject-carbon-theme" })
  injectCarbonTheme?: import("../../types/config/PublicConfig").CarbonTheme;

  @property({
    attribute: "ai-enabled",
    converter: {
      fromAttribute: (value: string | null) => {
        if (value === null) {
          return undefined;
        }
        const v = String(value).trim().toLowerCase();
        const falsey = v === "false" || v === "0" || v === "off" || v === "no";
        return !falsey;
      },
    },
  })
  aiEnabled?: boolean;

  @property({ type: Boolean, attribute: "ai-disabled" })
  aiDisabled?: boolean;

  @property({
    type: Boolean,
    attribute: "should-take-focus-if-opens-automatically",
  })
  shouldTakeFocusIfOpensAutomatically?: boolean;

  @property({ type: String })
  namespace?: string;

  @property({ type: Boolean, attribute: "enable-focus-trap" })
  enableFocusTrap?: boolean;

  @property({ type: Boolean, attribute: "should-sanitize-html" })
  shouldSanitizeHTML?: boolean;

  @property({ type: Object })
  header?: import("../../types/config/PublicConfig").HeaderConfig;

  @property({ type: Object })
  layout?: import("../../types/config/PublicConfig").LayoutConfig;

  @property({ type: Object })
  messaging?: import("../../types/config/PublicConfig").PublicConfigMessaging;

  @property({ type: Boolean, attribute: "is-readonly" })
  isReadonly?: boolean;

  @property({ type: String, attribute: "assistant-name" })
  assistantName?: string;

  @property({ type: String })
  locale?: string;

  @property({ type: Object })
  homescreen?: import("../../types/config/HomeScreenConfig").HomeScreenConfig;

  @property({ type: Object })
  launcher?: import("../../types/config/LauncherConfig").LauncherConfig;

  /** A factory for the {@link ServiceDesk} integration. */
  @property({ attribute: false })
  serviceDeskFactory?: (
    parameters: ServiceDeskFactoryParameters,
  ) => Promise<ServiceDesk>;

  /** Public configuration for the service desk integration. */
  @property({ type: Object, attribute: "service-desk" })
  serviceDesk?: ServiceDeskPublicConfig;

  /** Optional partial language pack overrides */
  @property({ type: Object })
  strings?: DeepPartial<LanguagePack>;

  /**
   * This function is called before the render function of Carbon AI Chat is called. This function can return a Promise
   * which will cause Carbon AI Chat to wait for it before rendering.
   */
  @property({ attribute: false })
  onBeforeRender?: (instance: ChatInstance) => Promise<void> | void;

  /**
   * This function is called after the render function of Carbon AI Chat is called.
   */
  @property({ attribute: false })
  onAfterRender?: (instance: ChatInstance) => Promise<void> | void;

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
  @property()
  onViewChange?: (event: BusEventViewChange, instance: ChatInstance) => void;

  @state()
  private _originalStyles: { width: string; height: string } = {
    width: this.style.width,
    height: this.style.height,
  };

  @state()
  private _userDefinedSlotNames: string[] = [];

  @state()
  private _writeableElementSlots: string[] = [];

  @state()
  private _instance!: ChatInstance;

  /**
   * Update the CSSStyleSheet’s first rule with new width/height.
   */
  private updateHostSize(width: string, height: string) {
    const rule = ChatCustomElement.sizeSheet.cssRules[0] as CSSStyleRule;
    rule.style.width = width;
    rule.style.height = height;
  }

  private defaultViewChangeHandler = (
    event: BusEventViewChange,
    _instance: ChatInstance,
  ) => {
    if (event.newViewState.mainWindow) {
      // restore original host element size
      this.updateHostSize(
        this._originalStyles.width,
        this._originalStyles.height,
      );
    } else {
      // minimize host element size
      const { width, height } = getComputedStyle(this);
      this._originalStyles = { width, height };
      this.updateHostSize("0px", "0px");
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

  // Computed property to reconstruct PublicConfig from flattened props
  private get config(): PublicConfig {
    return {
      onError: this.onError,
      openChatByDefault: this.openChatByDefault,
      disclaimer: this.disclaimer,
      disableCustomElementMobileEnhancements:
        this.disableCustomElementMobileEnhancements,
      debug: this.debug,
      exposeServiceManagerForTesting: this.exposeServiceManagerForTesting,
      injectCarbonTheme: this.injectCarbonTheme,
      aiEnabled: this.aiDisabled === true ? false : this.aiEnabled,
      serviceDeskFactory: this.serviceDeskFactory,
      serviceDesk: this.serviceDesk,
      shouldTakeFocusIfOpensAutomatically:
        this.shouldTakeFocusIfOpensAutomatically,
      namespace: this.namespace,
      enableFocusTrap: this.enableFocusTrap,
      shouldSanitizeHTML: this.shouldSanitizeHTML,
      header: this.header,
      layout: this.layout,
      messaging: this.messaging,
      isReadonly: this.isReadonly,
      assistantName: this.assistantName,
      locale: this.locale,
      homescreen: this.homescreen,
      launcher: this.launcher,
      strings: this.strings,
    };
  }

  private onBeforeRenderOverride = async (instance: ChatInstance) => {
    this._instance = instance;
    this._instance.on({
      type: BusEventType.VIEW_CHANGE,
      handler: this.onViewChange || this.defaultViewChangeHandler,
    });
    this._instance.on({
      type: BusEventType.USER_DEFINED_RESPONSE,
      handler: this.userDefinedHandler,
    });
    this._instance.on({
      type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
      handler: this.userDefinedHandler,
    });
    this.addWriteableElementSlots();
    await this.onBeforeRender?.(instance);
  };

  private addWriteableElementSlots() {
    this._writeableElementSlots = Object.keys(this._instance.writeableElements);
  }

  render() {
    return html`
      <cds-aichat-container
        .config=${this.config}
        .onAfterRender=${this.onAfterRender}
        .onBeforeRender=${this.onBeforeRenderOverride}
        .element=${this}
      >
        ${this._writeableElementSlots.map(
          (slot) => html`<div slot=${slot}><slot name=${slot}></slot></div>`,
        )}
        ${this._userDefinedSlotNames.map(
          (slot) => html`<div slot=${slot}><slot name=${slot}></slot></div>`,
        )}
      </cds-aichat-container>
    `;
  }
}

/**
 * Attributes interface for the cds-aichat-custom-element web component.
 * This interface extends {@link CdsAiChatContainerAttributes} and {@link PublicConfig} with additional component-specific props,
 * flattening all config properties as top-level properties for better TypeScript IntelliSense.
 *
 * @category Web component
 */
interface CdsAiChatCustomElementAttributes extends PublicConfig {
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
}

export { CdsAiChatCustomElementAttributes };

export default ChatCustomElement;
