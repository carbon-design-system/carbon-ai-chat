/*
 *  Copyright IBM Corp. 2025
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
} from "../../types/config/PublicConfig";
import { DeepPartial } from "../../types/utilities/DeepPartial";
import { LanguagePack } from "../../types/config/PublicConfig";
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
} from "../../types/events/eventBusTypes";

/**
 * The cds-aichat-container managing creating slotted elements for user_defined responses and writable elements.
 * It then passes that slotted content into cds-aichat-internal. That component will boot up the full chat application
 * and pass the slotted elements into their slots.
 */
@carbonElement("cds-aichat-container")
class ChatContainer extends LitElement {
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
    // Custom converter so HTML authors can write ai-enabled="false" | "0" | "off" | "no"
    // and absence keeps it undefined (so defaults apply further down the stack).
    converter: {
      fromAttribute: (value: string | null) => {
        if (value === null) {
          return undefined; // attribute absent -> leave undefined to use defaults
        }
        const v = String(value).trim().toLowerCase();
        const falsey = v === "false" || v === "0" || v === "off" || v === "no";
        // Any presence that's not an explicit falsey string is treated as true
        return !falsey;
      },
    },
  })
  aiEnabled?: boolean;

  // Optional explicit opt-out attribute. If present, it wins over ai-enabled.
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

  /** Optional partial language pack overrides */
  @property({ type: Object })
  strings?: DeepPartial<LanguagePack>;

  /**
   * A factory to create a {@link ServiceDesk} integration instance.
   */
  @property({ attribute: false })
  serviceDeskFactory?: (
    parameters: ServiceDeskFactoryParameters,
  ) => Promise<ServiceDesk>;

  /**
   * Public configuration for the service desk integration.
   */
  @property({ type: Object, attribute: "service-desk" })
  serviceDesk?: ServiceDeskPublicConfig;

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
   * The existing array of slot names for all user_defined components.
   */
  @state()
  _userDefinedSlotNames: string[] = [];

  /**
   * The existing array of slot names for all writeable elements.
   */
  @state()
  _writeableElementSlots: string[] = [];

  /**
   * The chat instance.
   */
  @state()
  _instance: ChatInstance;

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

  onBeforeRenderOverride = async (instance: ChatInstance) => {
    this._instance = instance;
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

  addWriteableElementSlots() {
    const writeableElementSlots: string[] = [];
    Object.keys(this._instance.writeableElements).forEach(
      (writeableElementKey) => {
        writeableElementSlots.push(writeableElementKey);
      },
    );
    this._writeableElementSlots = writeableElementSlots;
  }

  /**
   * Renders the template while passing in class functionality
   */
  render() {
    return html`<cds-aichat-internal
      .config=${this.config}
      .onAfterRender=${this.onAfterRender}
      .onBeforeRender=${this.onBeforeRenderOverride}
      .element=${this.element}
    >
      ${this._writeableElementSlots.map(
        (slot) => html`<div slot=${slot}><slot name=${slot}></slot></div>`,
      )}
      ${this._userDefinedSlotNames.map(
        (slot) => html`<div slot=${slot}><slot name=${slot}></slot></div>`,
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
interface CdsAiChatContainerAttributes extends PublicConfig {
  /**
   * This function is called before the render function of Carbon AI Chat is called. This function can return a Promise
   * which will cause Carbon AI Chat to wait for it before rendering.
   */
  onBeforeRender?: (instance: ChatInstance) => Promise<void> | void;

  /**
   * This function is called after the render function of Carbon AI Chat is called.
   */
  onAfterRender?: (instance: ChatInstance) => Promise<void> | void;
}

export { CdsAiChatContainerAttributes };
export default ChatContainer;
