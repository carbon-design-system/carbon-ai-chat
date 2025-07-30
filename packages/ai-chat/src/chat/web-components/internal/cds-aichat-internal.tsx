/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This component is mostly a pass-through. Its takes any properties passed into the ChatContainer
 * custom element and then renders the React Carbon AI chat application while passing in properties.
 */

import { LitElement } from "lit";
import { property } from "lit/decorators.js";
import isEqual from "lodash-es/isEqual.js";
import React from "react";
import { createRoot, Root } from "react-dom/client";

import { consoleWarn } from "../../shared/utils/miscUtils";
import { carbonElement } from "../decorators/customElement";
import { PublicConfig } from "../../../types/config/PublicConfig";
import { ChatInstance } from "../../../types/instance/ChatInstance";
import { DYNAMIC_IMPORTS } from "../../dynamic-imports/dynamic-imports";

@carbonElement("cds-aichat-internal")
class ChatContainerInternal extends LitElement {
  /**
   * The config to use to load Carbon AI chat. Note that the "onLoad" property is overridden by this component. If you
   * need to perform any actions after Carbon AI chat been loaded, use the "onBeforeRender" or "onAfterRender" props.
   */
  @property({ type: Object })
  config: PublicConfig;

  /**
   * The optional HTML element to mount the chat to.
   */
  @property({ type: HTMLElement })
  element?: HTMLElement;

  /**
   * This function is called before the render function of Carbon AI chat is called. This function can return a Promise
   * which will cause Carbon AI chat to wait for it before rendering.
   */
  @property()
  onBeforeRender: (instance: ChatInstance) => Promise<void> | void;

  /**
   * This function is called after the render function of Carbon AI chat is called. This function can return a Promise
   * which will cause Carbon AI chat to wait for it before rendering.
   */
  @property()
  onAfterRender: (instance: ChatInstance) => Promise<void> | void;

  firstUpdated() {
    // Render the React component with any updated properties if necessary
    const style = document.createElement("style");
    style.textContent = `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        ${this.element ? "" : "z-index: var(--cds-chat-BASE-z-index);"}
      }
    `;
    this.appendChild(style);
    if (this.config) {
      this.renderReactApp();
    }
  }

  updated(changedProperties: Map<string, any>) {
    // Render the React component with any updated properties if necessary. isEqual performs a deep check, but for
    // elements only checks the reference.
    if (
      changedProperties.has("config") &&
      !isEqual(this.config, changedProperties.get("config"))
    ) {
      if (changedProperties.get("config")) {
        consoleWarn(
          "The config object you have passed to AI chat has updated. Tearing down and re-starting the chat."
        );
      }
      if (this.config) {
        this.renderReactApp();
      }
    }
  }

  /**
   * Track if a previous React 18+ root was already created so we don't create a memory leak on re-renders.
   */
  root: Root;

  async renderReactApp() {
    const { AppContainer } = await DYNAMIC_IMPORTS.AppContainer();
    const previousContainer: HTMLElement = this.shadowRoot.querySelector(
      ".cds--aichat-react-app"
    );
    previousContainer?.remove();
    const container = document.createElement("div");
    container.classList.add("cds--aichat-react-app");
    this.shadowRoot.appendChild(container);

    // Make sure we only have one root.
    if (this.root) {
      this.root.unmount();
    }

    this.root = createRoot(container);
    this.root.render(
      <AppContainer
        config={this.config}
        onBeforeRender={this.onBeforeRender}
        onAfterRender={this.onAfterRender}
        container={container}
        element={this.element}
      />
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-internal": ChatContainerInternal;
  }
}

export default ChatContainerInternal;
