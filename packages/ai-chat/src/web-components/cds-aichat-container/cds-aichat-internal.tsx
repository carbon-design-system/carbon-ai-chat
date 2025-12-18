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
 * custom element and then renders the React Carbon AI Chat application while passing in properties.
 */

import { LitElement, PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import React from "react";
import { createRoot, Root } from "react-dom/client";

import ChatAppEntry from "../../chat/ChatAppEntry";
import { carbonElement } from "@carbon/ai-chat-components/es/globals/decorators/index.js";
import { PublicConfig } from "../../types/config/PublicConfig";
import { ChatInstance } from "../../types/instance/ChatInstance";
import { DeepPartial } from "../../types/utilities/DeepPartial";
import { LanguagePack } from "../../types/config/PublicConfig";
import type {
  ServiceDesk,
  ServiceDeskFactoryParameters,
  ServiceDeskPublicConfig,
} from "../../types/config/ServiceDeskConfig";

@carbonElement("cds-aichat-internal")
class ChatContainerInternal extends LitElement {
  /**
   * The config to use to load Carbon AI Chat. Note that the "onLoad" property is overridden by this component. If you
   * need to perform any actions after Carbon AI Chat been loaded, use the "onBeforeRender" or "onAfterRender" props.
   */
  @property({ type: Object })
  config: PublicConfig;

  /** Optional partial language pack overrides */
  @property({ type: Object })
  strings?: DeepPartial<LanguagePack>;

  /** A factory for the {@link ServiceDesk} integration. */
  @property({ attribute: false })
  serviceDeskFactory?: (
    parameters: ServiceDeskFactoryParameters,
  ) => Promise<ServiceDesk>;

  /** Public configuration for the service desk integration. */
  @property({ type: Object })
  serviceDesk?: ServiceDeskPublicConfig;

  /**
   * The optional HTML element to mount the chat to.
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
   * This function is called after the render function of Carbon AI Chat is called. This function can return a Promise
   * which will cause Carbon AI Chat to wait for it before rendering.
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
        ${this.element ? "" : "z-index: var(--cds-aichat-z-index);"}
      }
    `;
    this.appendChild(style);
    if (this.config) {
      this.renderReactApp();
    }
  }

  updated(changedProperties: PropertyValues) {
    // Re-render React app when config or other properties change
    if (
      this.config &&
      (changedProperties.has("config") ||
        changedProperties.has("strings") ||
        changedProperties.has("serviceDeskFactory") ||
        changedProperties.has("serviceDesk") ||
        changedProperties.has("onBeforeRender") ||
        changedProperties.has("onAfterRender") ||
        changedProperties.has("element"))
    ) {
      this.renderReactApp();
    }
  }

  /**
   * Track if a previous React 18+ root was already created so we don't create a memory leak on re-renders.
   */
  root: Root;

  /**
   * Cache the container we hand to React so we can reuse it between renders.
   */
  reactContainer?: HTMLDivElement;

  async renderReactApp() {
    const container = this.ensureReactRoot();

    this.root.render(
      <ChatAppEntry
        config={this.config}
        strings={this.strings}
        serviceDeskFactory={this.serviceDeskFactory}
        serviceDesk={this.serviceDesk}
        onBeforeRender={this.onBeforeRender}
        onAfterRender={this.onAfterRender}
        container={container}
        element={this.element}
      />,
    );
  }

  private ensureReactRoot(): HTMLDivElement {
    if (!this.reactContainer) {
      const container = document.createElement("div");
      container.classList.add("cds-aichat--react-app");
      this.shadowRoot.appendChild(container);
      this.reactContainer = container;
    }

    // Make sure we only create one root and reuse it for prop updates.
    if (!this.root) {
      this.root = createRoot(this.reactContainer);
    }

    return this.reactContainer;
  }

  disconnectedCallback(): void {
    this.root?.unmount();
    super.disconnectedCallback();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-internal": ChatContainerInternal;
  }
}

export default ChatContainerInternal;
