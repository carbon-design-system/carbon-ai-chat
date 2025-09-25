/*
 *  Copyright IBM Corp. 2025
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

import { html, LitElement } from "lit";
import { property, state } from "lit/decorators.js";

import { carbonElement } from "../../chat/ai-chat-components/web-components/decorators/customElement";
import {
  PublicConfig,
  OnErrorData,
  DisclaimerPublicConfig,
  CarbonTheme,
  HeaderConfig,
  LayoutConfig,
  PublicConfigMessaging,
  LanguagePack,
} from "../../types/config/PublicConfig";
import { DeepPartial } from "../../types/utilities/DeepPartial";
import { HomeScreenConfig } from "../../types/config/HomeScreenConfig";
import { LauncherConfig } from "../../types/config/LauncherConfig";
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
 *
 * The custom element should be sized using external CSS. When hidden, the 'cds-aichat--hidden' class is added to set dimensions to 0x0.
 */
@carbonElement("cds-aichat-custom-element")
class ChatCustomElement extends LitElement {
  @property({ attribute: false, type: Object })
  config?: PublicConfig;

  /**
   * Shared stylesheet for hiding styles.
   */
  private static hideSheet = new CSSStyleSheet();
  static {
    // Hide styles that override any external sizing
    ChatCustomElement.hideSheet.replaceSync(`
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

  // Flattened PublicConfig properties
  @property({ attribute: false })
  onError?: (data: OnErrorData) => void;

  @property({ type: Boolean, attribute: "open-chat-by-default" })
  openChatByDefault?: boolean;

  @property({ type: Object })
  disclaimer?: DisclaimerPublicConfig;

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
  injectCarbonTheme?: CarbonTheme;

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
  header?: HeaderConfig;

  @property({ type: Object })
  layout?: LayoutConfig;

  @property({ type: Object })
  messaging?: PublicConfigMessaging;

  @property({ type: Boolean, attribute: "is-readonly" })
  isReadonly?: boolean;

  @property({ type: String, attribute: "assistant-name" })
  assistantName?: string;

  @property({ type: String })
  locale?: string;

  @property({ type: Object })
  homescreen?: HomeScreenConfig;

  @property({ type: Object })
  launcher?: LauncherConfig;

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
  private _userDefinedSlotNames: string[] = [];

  @state()
  private _writeableElementSlots: string[] = [];

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

  private get resolvedConfig(): PublicConfig {
    const baseConfig = this.config ?? {};
    const resolvedConfig: PublicConfig = { ...baseConfig };

    if (this.onError !== undefined) {
      resolvedConfig.onError = this.onError;
    }
    if (this.openChatByDefault !== undefined) {
      resolvedConfig.openChatByDefault = this.openChatByDefault;
    }
    if (this.disclaimer !== undefined) {
      resolvedConfig.disclaimer = this.disclaimer;
    }
    if (this.disableCustomElementMobileEnhancements !== undefined) {
      resolvedConfig.disableCustomElementMobileEnhancements =
        this.disableCustomElementMobileEnhancements;
    }
    if (this.debug !== undefined) {
      resolvedConfig.debug = this.debug;
    }
    if (this.exposeServiceManagerForTesting !== undefined) {
      resolvedConfig.exposeServiceManagerForTesting =
        this.exposeServiceManagerForTesting;
    }
    if (this.injectCarbonTheme !== undefined) {
      resolvedConfig.injectCarbonTheme = this.injectCarbonTheme;
    }
    if (this.serviceDeskFactory !== undefined) {
      resolvedConfig.serviceDeskFactory = this.serviceDeskFactory;
    }
    if (this.serviceDesk !== undefined) {
      resolvedConfig.serviceDesk = this.serviceDesk;
    }
    if (this.shouldTakeFocusIfOpensAutomatically !== undefined) {
      resolvedConfig.shouldTakeFocusIfOpensAutomatically =
        this.shouldTakeFocusIfOpensAutomatically;
    }
    if (this.namespace !== undefined) {
      resolvedConfig.namespace = this.namespace;
    }
    if (this.enableFocusTrap !== undefined) {
      resolvedConfig.enableFocusTrap = this.enableFocusTrap;
    }
    if (this.shouldSanitizeHTML !== undefined) {
      resolvedConfig.shouldSanitizeHTML = this.shouldSanitizeHTML;
    }
    if (this.header !== undefined) {
      resolvedConfig.header = this.header;
    }
    if (this.layout !== undefined) {
      resolvedConfig.layout = this.layout;
    }
    if (this.messaging !== undefined) {
      resolvedConfig.messaging = this.messaging;
    }
    if (this.isReadonly !== undefined) {
      resolvedConfig.isReadonly = this.isReadonly;
    }
    if (this.assistantName !== undefined) {
      resolvedConfig.assistantName = this.assistantName;
    }
    if (this.locale !== undefined) {
      resolvedConfig.locale = this.locale;
    }
    if (this.homescreen !== undefined) {
      resolvedConfig.homescreen = this.homescreen;
    }
    if (this.launcher !== undefined) {
      resolvedConfig.launcher = this.launcher;
    }
    if (this.strings !== undefined) {
      resolvedConfig.strings = this.strings;
    }

    if (this.aiDisabled === true) {
      resolvedConfig.aiEnabled = false;
    } else if (this.aiEnabled !== undefined) {
      resolvedConfig.aiEnabled = this.aiEnabled;
    }

    return resolvedConfig;
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
        .config=${this.resolvedConfig}
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
