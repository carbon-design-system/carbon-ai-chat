/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "./cds-aichat-container";

import { html, LitElement } from "lit";
import { property, state } from "lit/decorators.js";

import { carbonElement } from "../chat/web-components/decorators/customElement";
import { PublicConfig } from "../types/config/PublicConfig";
import { ChatInstance } from "../types/instance/ChatInstance";
import {
  BusEventChunkUserDefinedResponse,
  BusEventType,
  BusEventUserDefinedResponse,
  BusEventViewChange,
} from "../types/events/eventBusTypes";

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

  @property({ type: Object })
  config!: PublicConfig;

  /**
   * This function is called before the render function of Carbon AI chat is called. This function can return a Promise
   * which will cause Carbon AI chat to wait for it before rendering.
   */
  @property()
  onBeforeRender?: (instance: ChatInstance) => Promise<void> | void;

  /**
   * This function is called after the render function of Carbon AI chat is called.
   */
  @property()
  onAfterRender?: (instance: ChatInstance) => Promise<void> | void;

  /**
   * An optional listener for "view:change" events. Such a listener is required when using a custom element in order
   * to control the visibility of the Carbon AI chat main window. If no callback is provided here, a default one will be
   * used that injects styling into the app that will show and hide the Carbon AI chat main window and also change the
   * size of the custom element so it doesn't take up space when the main window is closed.
   *
   * You can provide a different callback here if you want custom behavior such as an animation when the main window
   * is opened or closed.
   *
   * Note that this function can only be provided before Carbon AI chat is loaded. After Carbon AI chat is loaded, the event
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
    console.log({ width, height });
    const rule = ChatCustomElement.sizeSheet.cssRules[0] as CSSStyleRule;
    rule.style.width = width;
    rule.style.height = height;
  }

  private defaultViewChangeHandler = (
    event: BusEventViewChange,
    instance: ChatInstance
  ) => {
    if (event.newViewState.mainWindow) {
      // restore original
      this.updateHostSize(
        this._originalStyles.width,
        this._originalStyles.height
      );
      instance.elements.getMainWindow().removeClassName("HideWebChat");
    } else {
      const { width, height } = getComputedStyle(this);
      this._originalStyles = { width, height };
      this.updateHostSize("0px", "0px");
      instance.elements.getMainWindow().addClassName("HideWebChat");
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
          (slot) => html`<div slot=${slot}><slot name=${slot}></slot></div>`
        )}
        ${this._userDefinedSlotNames.map(
          (slot) => html`<div slot=${slot}><slot name=${slot}></slot></div>`
        )}
      </cds-aichat-container>
    `;
  }
}

/** @category Web component */
interface CdsAiChatCustomElementAttributes {
  /**
   * The configuration object used to render Carbon AI chat.
   */
  config: PublicConfig;

  /**
   * This function is called before the render function of Carbon AI chat is called. This function can return a Promise
   * which will cause Carbon AI chat to wait for it before rendering.
   */
  onBeforeRender?: (instance: ChatInstance) => Promise<void> | void;

  /**
   * This function is called after the render function of Carbon AI chat is called.
   */
  onAfterRender?: (instance: ChatInstance) => Promise<void> | void;

  /**
   * An optional listener for "view:change" events. Such a listener is required when using a custom element in order
   * to control the visibility of the Carbon AI chat main window. If no callback is provided here, a default one will be
   * used that injects styling into the app that will show and hide the Carbon AI chat main window and also change the
   * size of the custom element so it doesn't take up space when the main window is closed.
   *
   * You can provide a different callback here if you want custom behavior such as an animation when the main window
   * is opened or closed.
   *
   * Note that this function can only be provided before Carbon AI chat is loaded. After Carbon AI chat is loaded, the event
   * handler will not be updated.
   */
  onViewChange?: (event: BusEventViewChange, instance: ChatInstance) => void;
}

export { CdsAiChatCustomElementAttributes };

export default ChatCustomElement;
