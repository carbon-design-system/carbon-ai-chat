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

import "../../chat/web-components/internal/cds-aichat-internal";

import { html, LitElement } from "lit";
import { property, state } from "lit/decorators.js";

import { carbonElement } from "../../chat/web-components/decorators/customElement";
import { PublicConfig } from "../../types/config/PublicConfig";
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
  /**
   * The config to use to load Carbon AI Chat. Note that the "onLoad" property is overridden by this component. If you
   * need to perform any actions after Carbon AI Chat been loaded, use the "onBeforeRender" or "onAfterRender" props.
   */
  @property({ type: Object })
  config: PublicConfig;

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
  @property()
  onBeforeRender: (instance: ChatInstance) => Promise<void> | void;

  /**
   * This function is called after the render function of Carbon AI Chat is called.
   */
  @property()
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

/** @category Web component */
interface CdsAiChatContainerAttributes {
  /**
   * The configuration object used to render Carbon AI Chat.
   */
  config: PublicConfig;

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
