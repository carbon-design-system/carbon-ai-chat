/*
 *  Copyright IBM Corp. 2025, 2026
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

import { css, LitElement, PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import React from "react";
import { createRoot, Root } from "react-dom/client";

import ChatAppEntry from "../../chat/ChatAppEntry";
import { carbonElement } from "@carbon/ai-chat-components/es/globals/decorators/index.js";
import { PublicConfig } from "../../types/config/PublicConfig";
import { ChatInstance } from "../../types/instance/ChatInstance";
import type { RenderUserDefinedInputNode } from "../../types/component/ChatContainer";
import type { MarkdownConfigContextValue } from "../../chat/contexts/MarkdownConfigContext";

@carbonElement("cds-aichat-internal")
class ChatContainerInternal extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      z-index: var(--cds-aichat-z-index, auto);
    }
  `;

  /**
   * The config to use to load Carbon AI Chat. Note that the "onLoad" property is overridden by this component. If you
   * need to perform any actions after Carbon AI Chat been loaded, use the "onBeforeRender" or "onAfterRender" props.
   *
   * `serviceDeskFactory`, `serviceDesk`, and `strings` flow through this object —
   * they live on `PublicConfig` and are populated by the parent web component's
   * `resolvedConfig` getter.
   */
  @property({ type: Object })
  config: PublicConfig;

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

  /**
   * Internal renderer for custom TipTap node types in user message bubbles.
   * The outer cds-aichat-container converts its WC-style callback (returns
   * HTMLElement) to this React-style callback before passing it down.
   */
  @property({ attribute: false })
  renderUserDefinedInputNode?: RenderUserDefinedInputNode;

  /**
   * Merged markdown config (framework-neutral `markdownItPlugins` plus
   * layer-specific `customRenderers`). Forwarded to the React app via
   * `MarkdownConfigContext` so {@link MarkdownWithDefaults} can portal
   * consumer overrides into the rendered markdown components.
   *
   * @experimental
   */
  @property({ attribute: false })
  markdown?: MarkdownConfigContextValue;

  firstUpdated() {
    if (this.config) {
      this.renderReactApp();
    }
  }

  updated(changedProperties: PropertyValues) {
    // Re-render React app when config or other properties change
    if (
      this.config &&
      (changedProperties.has("config") ||
        changedProperties.has("onBeforeRender") ||
        changedProperties.has("onAfterRender") ||
        changedProperties.has("element") ||
        changedProperties.has("renderUserDefinedInputNode") ||
        changedProperties.has("markdown"))
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
        onBeforeRender={this.onBeforeRender}
        onAfterRender={this.onAfterRender}
        renderUserDefinedInputNode={this.renderUserDefinedInputNode}
        container={container}
        element={this.element}
        chatWrapper={this}
        markdown={this.markdown}
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
