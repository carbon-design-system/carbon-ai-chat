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

import { css, LitElement, PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import isEqual from 'lodash-es/isEqual.js';

import { ChatAppEntry } from '../../chat/ChatAppEntry';
import { carbonElement } from '@carbon/ai-chat-components/es/globals/decorators/index.js';
import { PublicConfig } from '../../types/config/PublicConfig';
import { ChatInstance } from '../../types/instance/ChatInstance';
import type { RenderUserDefinedInputNode } from '../../types/component/ChatContainer';

/**
 * Structural `hasChanged` for object properties: Lit defaults to identity, which
 * would re-render the React app whenever the host hands us a new reference with
 * unchanged content, such as an inline config object rebuilt on each host
 * render. `resolvedConfig` passes that new reference on. Comparing by value
 * keeps the React reconciliation pass for genuine changes only. Functions inside are compared by
 * reference (lodash `isEqual` semantics), so a changed callback still counts.
 */
const deepChanged = (value: unknown, previous: unknown): boolean =>
  !isEqual(value, previous);

@carbonElement('cds-aichat-internal')
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
  @property({ type: Object, hasChanged: deepChanged })
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

  firstUpdated() {
    if (this.config) {
      this.renderReactApp();
    }
  }

  updated(changedProperties: PropertyValues) {
    // Re-render the React app when any reactive property changes. Every reactive
    // property on this host is forwarded to `ChatAppEntry`, so deriving the
    // trigger from the live `changedProperties` set — rather than a
    // hand-maintained list of names — means a newly-added forwarded prop can't be
    // silently dropped from the re-render path.
    if (this.config && changedProperties.size > 0) {
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

  /**
   * Pending deferred unmount timer. Set in `disconnectedCallback` and
   * cancelled in `connectedCallback` if the element is reattached before
   * the timer fires (i.e. a DOM move, not a real unmount).
   * @internal
   */
  private _pendingUnmountTimer: ReturnType<typeof setTimeout> | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    if (this._pendingUnmountTimer !== null) {
      // Reattached before the deferred unmount ran — this is a DOM move, not
      // a real removal. Cancel the unmount so the React root and its state
      // survive intact.
      clearTimeout(this._pendingUnmountTimer);
      this._pendingUnmountTimer = null;
      return;
    }
    // Reconnected after a real unmount (root was cleared). Re-render if we
    // already have a config (firstUpdated won't fire again).
    if (this.hasUpdated && this.config && !this.root) {
      this.renderReactApp();
    }
  }

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
      />
    );
  }

  private ensureReactRoot(): HTMLDivElement {
    if (!this.reactContainer) {
      const container = document.createElement('div');
      container.classList.add('cds-aichat--react-app');
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
    if (this._pendingUnmountTimer !== null) {
      return;
    }
    // Defer the unmount by a macrotask. A reparent — remove then re-append in
    // the same or adjacent task — will call `connectedCallback` and cancel
    // this before it fires, leaving the React root and its conversation intact.
    this._pendingUnmountTimer = setTimeout(() => {
      this._pendingUnmountTimer = null;
      this.root?.unmount();
      // Clear the root reference so `connectedCallback` can create a fresh one
      // if the element is ever reattached after a real unmount.
      this.root = null;
    }, 0);
    super.disconnectedCallback();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cds-aichat-internal': ChatContainerInternal;
  }
}
