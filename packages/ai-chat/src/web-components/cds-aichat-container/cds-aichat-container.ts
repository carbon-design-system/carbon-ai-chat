/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ContextProvider } from '@lit/context';
import { css, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';

import { carbonElement } from '@carbon/ai-chat-components/es/globals/decorators/index.js';
import { createMarkdownPluginHostController } from '@carbon/ai-chat-components/es/components/markdown/src/utils/plugin-host-container.js';
import { preloadPromptLineRich } from '@carbon/ai-chat-components/es/components/prompt-line/src/prompt-line-rich-loader.js';
import { PublicConfig } from '../../types/config/PublicConfig';
import { FlattenedConfigElement } from '../shared/FlattenedConfigElement';
import {
  getDefaultRenderer,
  whenDefaultRenderer,
} from '../shared/react-renderer';
import type { ChatRenderer, ChatRenderMount } from '../shared/react-renderer';
import { serviceManagerContext } from '../shared/service-manager-context';
import { ChatInstance } from '../../types/instance/ChatInstance';
import type { TypeAndHandler } from '../../types/instance/EventHandlers';
import { Dimension } from '../../types/utilities/Dimension';
import type { ServiceManager } from '../../chat/services/ServiceManager';
import appActions from '../../chat/store/actions';
import type { AppliedConfig } from '../../chat/utils/appConfigUpdates';
import { resolvablePromise } from '../../chat/utils/resolvablePromise';
import type { ResolvablePromise } from '../../chat/utils/resolvablePromise';
import { resolvePromptLineMode } from '../../chat/components/input/promptLineMode';
import { preloadBuildCarbonExtensions } from '../../chat/components/input/buildExtensionsLoader';
import {
  BusEventChunkUserDefinedResponse,
  BusEventCustomFooterSlot,
  BusEventCustomRequestFooterSlot,
  BusEventType,
  BusEventUserDefinedResponse,
  BusEventViewChange,
  BusEventViewPreChange,
} from '../../types/events/eventBusTypes';
import type {
  RenderCustomMessageFooterState,
  RenderCustomRequestFooterState,
  RenderUserDefinedInputNodeState,
  RenderUserDefinedState,
  WCMarkdown,
  WCRenderCustomMessageFooter,
  WCRenderCustomRequestFooter,
  WCRenderUserDefinedResponse,
  WCRenderUserDefinedInputNode,
  RenderUserDefinedInputNode,
} from '../../types/component/ChatContainer';
import React, { useEffect, useRef } from 'react';

// Derived rather than written out: the es-custom build rewrites lowercase
// `cds-aichat` text in its output, so an uppercase literal would never match
// there.
const OUTER_CHAT_TAG_NAME = 'cds-aichat-custom-element'.toUpperCase();

/** Everything one mount holds, from startup until it detaches. */
interface MountState {
  mount?: ChatRenderMount;
  serviceManager?: ServiceManager;
  instance?: ChatInstance;
  bootConfig?: PublicConfig;
  appliedConfig?: AppliedConfig;
  applyConfig?: (config: PublicConfig) => void;
  renderReady: boolean;
  initialViewReady: boolean;
  listenersReady: ResolvablePromise;
  initialViewCommitted: ResolvablePromise;
  afterRenderTimer?: ReturnType<typeof setTimeout>;
  removeWindowListeners?: () => void;
}

function currentWindowSize(): Dimension {
  return { width: window.innerWidth, height: window.innerHeight };
}

/**
 * The chat element. It starts the chat's services, runs the host's lifecycle
 * callbacks, and renders the app into its own shadow root through a renderer.
 *
 * Content the host slots in — user_defined responses, custom footers,
 * writeable elements, markdown plugin output — stays in this element's light
 * DOM, where page CSS reaches it, and the app's own `<slot>` elements pick it
 * up from the same shadow root.
 */
@carbonElement('cds-aichat-container')
class ChatContainer extends FlattenedConfigElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      z-index: var(--cds-aichat-z-index, auto);
    }

    :host([hidden]) {
      display: none;
    }
  `;
  /**
   * The element to render to instead of the default float element.
   *
   * @internal
   */
  @property({ attribute: false })
  element?: HTMLElement;

  /**
   * Renders the app inside this element. The React wrappers supply one; plain
   * web-component hosts use the default the public entry installs.
   *
   * @internal
   */
  @property({ attribute: false })
  renderer?: ChatRenderer;

  /**
   * This function is called before the render function of Carbon AI Chat is called. This function can return a Promise
   * which will cause Carbon AI Chat to wait for it before rendering.
   *
   * Use it to capture the {@link ChatInstance} so you can call instance methods later.
   *
   * @example
   * ```ts
   * const onBeforeRender = (instance: ChatInstance) => {
   *   this.instance = instance;
   * };
   * // <cds-aichat-container .onBeforeRender=${onBeforeRender}></cds-aichat-container>
   * ```
   */
  @property({ attribute: false })
  onBeforeRender: (instance: ChatInstance) => Promise<void> | void;

  /**
   * This function is called after the render function of Carbon AI Chat is called.
   *
   * Like `onBeforeRender`, it receives the {@link ChatInstance}; use it when you need the instance only after the
   * first render has completed.
   */
  @property({ attribute: false })
  onAfterRender: (instance: ChatInstance) => Promise<void> | void;

  /**
   * Called before a view change (the chat opening or closing). Async — return a
   * Promise to defer the view change until it resolves.
   *
   * This is an opt-in observation hook. Unlike `cds-aichat-custom-element`, the
   * container has no wrapping element to size, so no default visibility
   * behavior runs when this property is omitted.
   */
  @property()
  onViewPreChange?: (event: BusEventViewPreChange) => Promise<void> | void;

  /**
   * Called when a view change (the chat opening or closing) is complete.
   *
   * This is an opt-in observation hook. Unlike `cds-aichat-custom-element`, the
   * container has no wrapping element to size, so no default visibility
   * behavior runs when this property is omitted.
   */
  @property()
  onViewChange?: (event: BusEventViewChange, instance: ChatInstance) => void;

  /**
   * Optional callback to render user defined responses. When provided, the library manages all event listening,
   * slot tracking, streaming state, and element lifecycle. The callback receives the accumulated state and should
   * return an HTMLElement or null.
   *
   * When this property is not set, the existing event + manual slot approach continues to work.
   */
  @property({ attribute: false })
  renderUserDefinedResponse?: WCRenderUserDefinedResponse;

  /**
   * Optional callback to render custom message footers. When provided, the library manages all event listening,
   * slot tracking, and element lifecycle. The callback receives the accumulated state and should
   * return an HTMLElement or null.
   *
   * When this property is not set, the existing event + manual slot approach continues to work.
   */
  @property({ attribute: false })
  renderCustomMessageFooter?: WCRenderCustomMessageFooter;

  /**
   * Optional callback to render a footer below each user message. When provided, the library manages all event
   * listening, slot tracking, and element lifecycle. The callback receives the accumulated state and should
   * return an HTMLElement or null.
   *
   * Passing this callback is how you opt in. Leave it off and user messages have no footer.
   */
  @property({ attribute: false })
  renderCustomRequestFooter?: WCRenderCustomRequestFooter;

  // markdown is declared on the FlattenedConfigElement base; the attributes
  // interface narrows its type.

  /**
   * Renderer for custom TipTap node types inside sent user message bubbles
   * (rich user message content). Called with `{ node, message }` plus the
   * chat instance and should return an `HTMLElement` (or `null`). The
   * library mounts the element inside the bubble via a slot.
   *
   * @experimental
   */
  @property({ attribute: false })
  renderUserDefinedInputNode?: WCRenderUserDefinedInputNode;

  /**
   * The chat instance.
   */
  @state()
  _instance: ChatInstance;

  /**
   * Accumulated state per slot for user_defined responses when renderUserDefinedResponse is provided.
   */
  @state()
  _userDefinedStateBySlot: Record<string, RenderUserDefinedState> = {};

  /**
   * Accumulated state per slot for custom message footers when renderCustomMessageFooter is provided.
   */
  @state()
  _customFooterStateBySlot: Record<string, RenderCustomMessageFooterState> = {};

  /**
   * Accumulated state per slot for the footers below user messages when renderCustomRequestFooter is provided.
   * Unlike the incoming twin there is no second array of slot names: nothing tracks a name without state, so the
   * keys of this record are the slot names.
   */
  @state()
  _customRequestFooterStateBySlot: Record<
    string,
    RenderCustomRequestFooterState
  > = {};

  /**
   * Tracks the wrapper elements created by the callback rendering path.
   */
  private _callbackElements = new Map<string, HTMLElement>();

  /**
   * Tracks the wrapper elements created by the custom-footer callback rendering path.
   */
  private _callbackFooterElements = new Map<string, HTMLElement>();

  /**
   * Tracks the wrapper elements created by the request-footer callback rendering path.
   */
  private _callbackRequestFooterElements = new Map<string, HTMLElement>();

  /** Handlers this element added to the current mount's instance. */
  private _mountHandlers: TypeAndHandler[] = [];

  /**
   * Cached adapter so each container update doesn't churn a new React
   * function down into ChatAppEntry. Keyed on the WC function identity.
   */
  private _inputNodeRendererCache:
    | { wc: WCRenderUserDefinedInputNode; react: RenderUserDefinedInputNode }
    | undefined;

  private _inputNodeReactRendererFor(
    wc: WCRenderUserDefinedInputNode
  ): RenderUserDefinedInputNode {
    if (this._inputNodeRendererCache?.wc === wc) {
      return this._inputNodeRendererCache.react;
    }
    const react = adaptWCRenderUserDefinedInputNode(wc);
    this._inputNodeRendererCache = { wc, react };
    return react;
  }

  /**
   * Enhanced handler for CUSTOM_FOOTER_SLOT when the renderCustomMessageFooter callback is provided.
   * Tracks both slot names and the full per-slot state used by the callback rendering path.
   */
  private enhancedCustomFooterHandler = (event: BusEventCustomFooterSlot) => {
    const { slotName, message, messageItem, additionalData } = event.data;
    this._customFooterStateBySlot = {
      ...this._customFooterStateBySlot,
      [slotName]: {
        slotName,
        message,
        messageItem,
        additionalData: additionalData as Record<string, unknown> | undefined,
      },
    };
  };

  /**
   * Handler for CUSTOM_REQUEST_FOOTER_SLOT. Unlike the incoming footer there is no legacy passthrough path, so this
   * always tracks full per-slot state.
   *
   * The event fires for every user message rather than only when a backend opts in, so the callback is checked on
   * each one: without it nothing accumulates. Checking here rather than gating the subscription is what lets a host
   * set the callback after the chat has booted.
   */
  private customRequestFooterHandler = (
    event: BusEventCustomRequestFooterSlot
  ) => {
    if (!this.renderCustomRequestFooter) {
      return;
    }

    const { slotName, message } = event.data;
    this._customRequestFooterStateBySlot = {
      ...this._customRequestFooterStateBySlot,
      [slotName]: { slotName, message },
    };
  };

  /**
   * Enhanced handler for USER_DEFINED_RESPONSE when renderUserDefinedResponse callback is provided.
   * Tracks both slot names and full message state per slot.
   */
  private enhancedUserDefinedHandler = (event: BusEventUserDefinedResponse) => {
    const { slot } = event.data;
    this._userDefinedStateBySlot = {
      ...this._userDefinedStateBySlot,
      [slot]: {
        fullMessage: event.data.fullMessage,
        messageItem: event.data.message,
        state: event.data.state,
      },
    };
  };

  /**
   * Enhanced handler for CHUNK_USER_DEFINED_RESPONSE when renderUserDefinedResponse callback is provided.
   * Handles both complete_item and partial_item chunks, accumulating state per slot.
   */
  private enhancedUserDefinedChunkHandler = (
    event: BusEventChunkUserDefinedResponse
  ) => {
    const { slot, chunk } = event.data;

    if ('complete_item' in chunk) {
      this._userDefinedStateBySlot = {
        ...this._userDefinedStateBySlot,
        [slot]: { messageItem: chunk.complete_item },
      };
    } else if ('partial_item' in chunk) {
      const existing = this._userDefinedStateBySlot[slot];
      this._userDefinedStateBySlot = {
        ...this._userDefinedStateBySlot,
        [slot]: {
          ...existing,
          partialItems: [...(existing?.partialItems ?? []), chunk.partial_item],
        },
      };
    }
  };

  /**
   * Handles RESTART_CONVERSATION when the renderUserDefinedResponse and/or renderCustomMessageFooter
   * callback is provided. Clears all accumulated state and removes callback-rendered elements from the DOM.
   *
   * The custom-footer cleanup is guarded by renderCustomMessageFooter so the legacy footer passthrough
   * path (which the host clears itself) is left untouched.
   */
  private restartHandler = () => {
    this._userDefinedStateBySlot = {};
    for (const el of this._callbackElements.values()) {
      el.remove();
    }
    this._callbackElements.clear();

    if (this.renderCustomMessageFooter) {
      this._customFooterStateBySlot = {};
      for (const el of this._callbackFooterElements.values()) {
        el.remove();
      }
      this._callbackFooterElements.clear();
    }

    this._customRequestFooterStateBySlot = {};
    for (const el of this._callbackRequestFooterElements.values()) {
      el.remove();
    }
    this._callbackRequestFooterElements.clear();
  };

  /**
   * Synchronizes callback-rendered wrapper elements in the light DOM against the accumulated per-slot state.
   *
   * Each slot owns one wrapper div. A slot whose callback returns nothing loses its wrapper, and so does a slot
   * that has left the state. Returning the same element as last time leaves the node alone: replaceChildren would
   * detach and re-attach it, which restarts media and fires disconnectedCallback on a custom element.
   */
  private syncCallbackRenderedWrappers<TState>(
    stateBySlot: Record<string, TState>,
    wrappersBySlot: Map<string, HTMLElement>,
    render: (state: TState) => HTMLElement | null
  ) {
    for (const [slotName, slotState] of Object.entries(stateBySlot)) {
      const newContent = render(slotState) ?? null;

      if (!newContent) {
        const existing = wrappersBySlot.get(slotName);
        if (existing) {
          existing.remove();
          wrappersBySlot.delete(slotName);
        }
        continue;
      }

      let wrapper = wrappersBySlot.get(slotName);
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.setAttribute('slot', slotName);
        wrappersBySlot.set(slotName, wrapper);
        this.appendChild(wrapper);
      }

      if (
        wrapper.firstChild !== newContent ||
        wrapper.childNodes.length !== 1
      ) {
        wrapper.replaceChildren(newContent);
      }
    }

    // Clean up wrappers for slots that no longer exist in state
    for (const [slotName, el] of wrappersBySlot.entries()) {
      if (!(slotName in stateBySlot)) {
        el.remove();
        wrappersBySlot.delete(slotName);
      }
    }
  }

  /**
   * True when an outer chat element (cds-aichat-custom-element) further up
   * the composed path will catch the host-mount event. When true, this
   * element only forwards the slot through its render template and lets the
   * outer element create the page-level host. When false, this element is
   * outermost and must create the host itself.
   */
  private hasOuterChatHandler(event: Event): boolean {
    const path = event.composedPath();
    const myIndex = path.indexOf(this);
    if (myIndex < 0) {
      return false;
    }
    for (let i = myIndex + 1; i < path.length; i++) {
      const node = path[i] as Element;
      if (node?.tagName === OUTER_CHAT_TAG_NAME) {
        return true;
      }
    }
    return false;
  }

  /**
   * The container half of the plugin-host protocol. Hosts land in this
   * element's own light DOM — page DOM when this element is outermost — so a
   * consumer-loaded stylesheet reaches the plugin output; the markdown
   * element's own light DOM sits inside the chat's shadow root, where it
   * cannot.
   */
  private pluginHostController = createMarkdownPluginHostController(this, {
    shouldDefer: (event) => this.hasOuterChatHandler(event),
  });

  connectedCallback() {
    super.connectedCallback();
    this.pluginHostController.connect();
    if (this.hasUpdated) {
      this.requestUpdate();
    }
  }

  updated() {
    const state = this.current;
    if (!state) {
      this.startMount();
      return;
    }
    // `resolvedConfig` is cached against the fields it was built from, so a
    // new identity is a real config change rather than render churn.
    if (
      state.renderReady &&
      this.resolvedConfig !== state.appliedConfig.source
    ) {
      state.applyConfig(this.resolvedConfig);
    }
    this.renderApp();
  }

  disconnectedCallback() {
    this.pluginHostController.disconnect();
    this.connectionGeneration++;
    this.releaseMount();
    super.disconnectedCallback();
  }

  /**
   * Retires the current mount: no more rendering or callbacks from it, and
   * nothing it collected survives. This is not service teardown — its
   * services keep running, and work the host's callbacks started is not
   * canceled. Exhaustive disposal is #1681.
   */
  private releaseMount() {
    const state = this.current;
    if (state) {
      this.current = undefined;
      clearTimeout(state.afterRenderTimer);
      state.removeWindowListeners?.();
      // Settle the private waits so a boot paused on one resumes, finds it is
      // retired, and stops.
      state.listenersReady.doResolve();
      state.initialViewCommitted.doResolve();
      this.servicesProvider.setValue(undefined);
      state.mount?.unmount();
    }

    this._instance?.off(this._mountHandlers);
    this._mountHandlers = [];

    for (const wrappers of [
      this._callbackElements,
      this._callbackFooterElements,
      this._callbackRequestFooterElements,
    ]) {
      wrappers.forEach((wrapper) => wrapper.remove());
      wrappers.clear();
    }
    Object.values(this._instance?.writeableElements ?? {}).forEach(
      (element) => {
        if (element?.parentNode === this) {
          element.remove();
        }
      }
    );

    this._userDefinedStateBySlot = {};
    this._customFooterStateBySlot = {};
    this._customRequestFooterStateBySlot = {};
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
  /** Subscribes this element to the mount's instance, then calls the host. */
  private async runBeforeRender(instance: ChatInstance) {
    this._instance = instance;

    // Opt-in view-change observation hooks. The float container manages its own
    // visibility, so there is no default handler — a prop is only subscribed
    // when the consumer provides it.
    if (this.onViewPreChange) {
      this.subscribe({
        type: BusEventType.VIEW_PRE_CHANGE,
        handler: this.onViewPreChange,
      });
    }
    if (this.onViewChange) {
      this.subscribe({
        type: BusEventType.VIEW_CHANGE,
        handler: this.onViewChange,
      });
    }

    if (this.renderUserDefinedResponse) {
      // Enhanced path: library manages full state for callback rendering
      this.subscribe({
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler: this.enhancedUserDefinedHandler,
      });
      this.subscribe({
        type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
        handler: this.enhancedUserDefinedChunkHandler,
      });
    }

    // Only the callback path needs per-slot state. Without it the host slots
    // its own content in, and the app's slots pick it up directly.
    if (this.renderCustomMessageFooter) {
      this.subscribe({
        type: BusEventType.CUSTOM_FOOTER_SLOT,
        handler: this.enhancedCustomFooterHandler,
      });
    }

    this.subscribe({
      type: BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
      handler: this.customRequestFooterHandler,
    });

    // A single RESTART_CONVERSATION subscription clears whichever callback
    // paths are active. Registered once so the handler does not fire twice
    // when both callbacks are provided, and unconditionally so a callback set
    // after boot still gets its wrappers cleared.
    this.subscribe({
      type: BusEventType.RESTART_CONVERSATION,
      handler: this.restartHandler,
    });

    this.attachWriteableElements();
    await this.onBeforeRender?.(instance);
  }

  private attachWriteableElements() {
    const writeableElements = this._instance?.writeableElements;
    if (!writeableElements) {
      return;
    }

    // Prepend so these host nodes land before any Lit ChildPart comment
    // markers a parent template may have stamped into this element's light
    // DOM. Lit only manages nodes between its start/end markers; a node
    // prepended before the start marker is outside that range and survives
    // parent re-renders unchanged. One call keeps them in their map order.
    const unattached: HTMLElement[] = [];
    Object.entries(writeableElements).forEach(([slot, element]) => {
      if (!element) {
        return;
      }

      element.setAttribute('slot', slot);

      if (!element.isConnected) {
        unattached.push(element);
      }
    });
    this.prepend(...unattached);
  }

  /**
   * Keeps the callback-rendered wrappers in step with the collected state.
   * The app renders its own slots into this shadow root, so this element
   * renders no template of its own.
   */
  render() {
    if (this.renderUserDefinedResponse) {
      this.syncCallbackRenderedWrappers(
        this._userDefinedStateBySlot,
        this._callbackElements,
        (state) =>
          this.renderUserDefinedResponse?.(state, this._instance) ?? null
      );
    }
    if (this.renderCustomMessageFooter) {
      this.syncCallbackRenderedWrappers(
        this._customFooterStateBySlot,
        this._callbackFooterElements,
        (state) =>
          this.renderCustomMessageFooter?.(state, this._instance) ?? null
      );
    }
    if (this.renderCustomRequestFooter) {
      this.syncCallbackRenderedWrappers(
        this._customRequestFooterStateBySlot,
        this._callbackRequestFooterElements,
        (state) =>
          this.renderCustomRequestFooter?.(state, this._instance) ?? null
      );
    }

    return nothing;
  }

  // -------------------------------------------------------------------------
  // Startup
  // -------------------------------------------------------------------------

  private renderTarget?: HTMLDivElement;

  private current?: MountState;

  /** Advanced on every detach, so a renderer wait that outlives its connection is ignored. */
  private connectionGeneration = 0;

  private waitingGeneration?: number;

  private windowSize: Dimension = { width: 0, height: 0 };

  private servicesProvider = new ContextProvider(this, {
    context: serviceManagerContext,
  });

  private startMount() {
    if (!this.isConnected) {
      return;
    }
    const renderer = this.renderer ?? getDefaultRenderer();
    if (!renderer) {
      this.waitForDefaultRenderer();
      return;
    }
    const state: MountState = {
      renderReady: false,
      initialViewReady: false,
      listenersReady: resolvablePromise(),
      initialViewCommitted: resolvablePromise(),
    };
    // Recorded before mounting: a renderer can detach this element while it
    // mounts, and that mount still has to be released.
    this.current = state;
    this.windowSize = currentWindowSize();
    state.mount = renderer.mount(this.ensureRenderTarget());
    if (this.current !== state) {
      state.mount.unmount();
      return;
    }
    this.boot(state);
  }

  /**
   * Starts services, runs the host's callbacks, and opens the render gate.
   * Each await can outlive the mount, so each is followed by a check that
   * this mount is still the current one.
   */
  private async boot(state: MountState) {
    const isCurrent = () => this.current === state;
    try {
      // Service imports reach Carbon UI modules, which need browser globals.
      // Keep registration server-safe and load them only for a live mount.
      const [
        {
          initServiceManagerAndInstance,
          mergePublicConfig,
          performInitialViewChange,
        },
        { applyConfigUpdate, createAppliedConfig },
      ] = await Promise.all([
        import('../../chat/utils/chatBoot'),
        import('../../chat/utils/appConfigUpdates'),
      ]);
      if (!isCurrent()) {
        return;
      }
      const config = this.resolvedConfig;
      const publicConfig = mergePublicConfig(config);
      const { serviceManager, instance } = await initServiceManagerAndInstance({
        publicConfig,
        container: this.renderTarget,
        customHostElement: this.element,
      });
      if (!isCurrent()) {
        return;
      }

      // Read markdown off the original config, not the merged one, to keep the
      // host's plugin and renderer references for the slice's isEqual guard.
      if (config.markdown) {
        serviceManager.store.dispatch(
          appActions.setAppStateValue('markdownConfig', config.markdown)
        );
      }
      state.serviceManager = serviceManager;
      state.instance = instance;
      state.bootConfig = config;
      state.appliedConfig = createAppliedConfig(publicConfig, config);
      state.applyConfig = (nextConfig) =>
        applyConfigUpdate(state.appliedConfig, nextConfig, serviceManager);
      state.removeWindowListeners = this.listenToWindow(serviceManager);
      this.servicesProvider.setValue(serviceManager);

      this.renderApp();
      await state.listenersReady;
      if (!isCurrent()) {
        return;
      }

      await this.runBeforeRender(instance);
      if (!isCurrent()) {
        return;
      }

      // Before-render can change the input config. All rich modes share these
      // chunks; config changes during the wait are applied before rendering.
      if (resolvePromptLineMode(this.resolvedConfig.input) === 'rich') {
        await Promise.all([
          preloadPromptLineRich(),
          preloadBuildCarbonExtensions(),
        ]);
        if (!isCurrent()) {
          return;
        }
      }

      state.renderReady = true;
      if (this.resolvedConfig !== state.bootConfig) {
        state.applyConfig(this.resolvedConfig);
      }
      this.renderApp();

      await performInitialViewChange(serviceManager);
      if (!isCurrent()) {
        return;
      }
      serviceManager.store.dispatch(
        appActions.setInitialViewChangeComplete(true)
      );
      state.initialViewReady = true;
      this.renderApp();

      await state.initialViewCommitted;
      const { onAfterRender } = this;
      if (!isCurrent() || !onAfterRender) {
        return;
      }
      state.afterRenderTimer = setTimeout(() => onAfterRender(instance), 0);
    } catch (error) {
      console.error('Error initializing chat:', error);
    }
  }

  private renderApp() {
    const state = this.current;
    if (!state?.serviceManager) {
      return;
    }

    // Convert the WC-style renderer (returns HTMLElement) into the React-
    // style renderer (returns ReactNode) the React infrastructure expects.
    // Memoization is by reference: as long as the consumer hands us the
    // same function we hand the same adapter down, so the app does not
    // re-render on every update here.
    const renderUserDefinedInputNode = this.renderUserDefinedInputNode
      ? this._inputNodeReactRendererFor(this.renderUserDefinedInputNode)
      : undefined;

    state.mount?.render({
      serviceManager: state.serviceManager,
      instance: state.instance,
      windowSize: this.windowSize,
      renderReady: state.renderReady,
      initialViewReady: state.initialViewReady,
      onListenersReady: () => state.listenersReady.doResolve(),
      onInitialViewCommitted: () => state.initialViewCommitted.doResolve(),
      renderUserDefinedInputNode,
      chatWrapper: this,
      observationRoot: this.shadowRoot,
    });
  }

  /**
   * Feeds window size to the app and page visibility to the store, and stops
   * the theme watcher's polling when the mount goes. The watcher is the one
   * service the retired React effect named; broader disposal is #1681.
   */
  private listenToWindow(serviceManager: ServiceManager) {
    const onResize = () => {
      this.windowSize = currentWindowSize();
      this.renderApp();
    };
    const onVisibilityChange = () => {
      serviceManager.store.dispatch(
        appActions.setIsBrowserPageVisible(
          document.visibilityState === 'visible'
        )
      );
    };
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      serviceManager.themeWatcherService?.stopWatching();
    };
  }

  /**
   * A host can connect after the React entry loaded but before the
   * web-component entry installs its renderer. Wake it once that happens.
   */
  private waitForDefaultRenderer() {
    const generation = this.connectionGeneration;
    if (this.waitingGeneration === generation) {
      return;
    }
    this.waitingGeneration = generation;
    whenDefaultRenderer().then(() => {
      if (generation === this.connectionGeneration) {
        this.requestUpdate();
      }
    });
  }

  private ensureRenderTarget(): HTMLDivElement {
    if (!this.renderTarget) {
      this.renderTarget = document.createElement('div');
      this.renderTarget.classList.add('cds-aichat--react-app');
      // Appended after Lit's markers, and this element renders no template,
      // so a re-render never reaches it.
      this.shadowRoot.appendChild(this.renderTarget);
    }
    return this.renderTarget;
  }
}

/**
 * Mounts the element a WC-style `renderUserDefinedInputNode` returns. React
 * owns the slot wrapper; the consumer owns the element inside it.
 */
function WCInputNodeMount({
  state,
  instance,
  wcRenderer,
}: {
  state: RenderUserDefinedInputNodeState;
  instance: ChatInstance;
  wcRenderer: WCRenderUserDefinedInputNode;
}) {
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const lastElRef = useRef<HTMLElement | null>(null);

  // Depend on the individual `state` fields, not the wrapper object:
  // `InputNodePortalsContainer` allocates a fresh `{ node, message }` on every
  // render, but `node` / `message` themselves are stable (derived from the
  // memoized `slotEntries`). Keying the effect on the wrapper would tear down
  // and rebuild the consumer's element on every unrelated chat re-render.
  const { node, message } = state;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return undefined;
    }

    const el = wcRenderer({ node, message }, instance);
    if (lastElRef.current && lastElRef.current.parentNode === host) {
      host.removeChild(lastElRef.current);
    }
    lastElRef.current = el ?? null;

    if (el) {
      host.appendChild(el);
    }

    return () => {
      if (lastElRef.current && lastElRef.current.parentNode === host) {
        host.removeChild(lastElRef.current);
        lastElRef.current = null;
      }
    };
  }, [node, message, instance, wcRenderer]);

  // No JSX here: this module is a Lit element, compiled as plain TypeScript.
  return React.createElement('span', { ref: hostRef });
}

/**
 * Bridges the WC-style `renderUserDefinedInputNode` (returns `HTMLElement`)
 * to the React-style API the underlying `InputNodePortalsContainer` consumes.
 */
function adaptWCRenderUserDefinedInputNode(
  wcRenderer: WCRenderUserDefinedInputNode
): RenderUserDefinedInputNode {
  // eslint-disable-next-line react/display-name -- this is a render callback, not a component
  return (state, instance) =>
    React.createElement(WCInputNodeMount, { state, instance, wcRenderer });
}

declare global {
  interface HTMLElementTagNameMap {
    'cds-aichat-container': ChatContainer;
  }
}

/**
 * Attributes interface for the cds-aichat-container web component.
 * This interface extends {@link PublicConfig} with additional component-specific props,
 * flattening all config properties as top-level properties for better TypeScript IntelliSense.
 *
 * @category Web component
 */
interface CdsAiChatContainerAttributes extends Omit<PublicConfig, 'markdown'> {
  /**
   * Markdown rendering customization. Extends the framework-neutral
   * `PublicConfig.markdown` with web-component `customRenderers`.
   */
  markdown?: WCMarkdown;

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
   * Called before a view change (the chat opening or closing). Async — return a Promise to defer the view
   * change until it resolves. This is an opt-in observation hook with no default visibility behavior.
   */
  onViewPreChange?: (event: BusEventViewPreChange) => Promise<void> | void;

  /**
   * Called when a view change (the chat opening or closing) is complete. This is an opt-in observation hook
   * with no default visibility behavior.
   */
  onViewChange?: (event: BusEventViewChange, instance: ChatInstance) => void;

  /**
   * Optional callback to render user defined responses. When provided, the library manages all event listening,
   * slot tracking, streaming state, and element lifecycle.
   */
  renderUserDefinedResponse?: WCRenderUserDefinedResponse;

  /**
   * Optional callback to render custom message footers. When provided, the library manages all event listening,
   * slot tracking, and element lifecycle. When omitted, the legacy event + manual slot approach continues to work.
   */
  renderCustomMessageFooter?: WCRenderCustomMessageFooter;

  /**
   * Called when a footer below a user message should be rendered. Leave it off and user messages have no footer.
   */
  renderCustomRequestFooter?: WCRenderCustomRequestFooter;

  /**
   * Renderer for custom TipTap node types inside sent user message bubbles
   * (rich user message content).
   *
   * @experimental
   */
  renderUserDefinedInputNode?: WCRenderUserDefinedInputNode;
}

export { CdsAiChatContainerAttributes };
export default ChatContainer;
