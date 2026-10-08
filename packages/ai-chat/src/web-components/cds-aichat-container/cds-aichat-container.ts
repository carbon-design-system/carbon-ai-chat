/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ContextProvider } from '@lit/context';
import { css, nothing, type PropertyValues } from 'lit';
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
import type { ChatAppEntryProps } from '../../chat/ChatAppEntry';
import { resolvablePromise } from '../../chat/utils/resolvablePromise';
import type { ResolvablePromise } from '../../chat/utils/resolvablePromise';
import { resolvePromptLineMode } from '../../chat/components/input/promptLineMode';
import { preloadBuildCarbonExtensions } from '../../chat/components/input/buildExtensionsLoader';
import { consoleError } from '../../chat/utils/miscUtils';
import {
  BusEventType,
  BusEventViewChange,
  BusEventViewPreChange,
} from '../../types/events/eventBusTypes';
import type {
  RenderCustomMessageFooter,
  RenderCustomRequestFooter,
  RenderUserDefinedResponse,
  WCMarkdown,
  WCRenderCustomMessageFooter,
  WCRenderCustomRequestFooter,
  WCRenderUserDefinedResponse,
  WCRenderUserDefinedInputNode,
  RenderUserDefinedInputNode,
} from '../../types/component/ChatContainer';
import React, {
  ComponentType,
  ReactNode,
  useLayoutEffect,
  useRef,
} from 'react';

// Derived rather than written out: the es-custom build rewrites lowercase
// `cds-aichat` text in its output, so an uppercase literal would never match
// there.
const OUTER_CHAT_TAG_NAME = 'cds-aichat-custom-element'.toUpperCase();

/** Everything one mount holds, from startup until it detaches. */
interface MountState {
  mount?: ChatRenderMount;
  App?: ComponentType<ChatAppEntryProps>;
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
 * Loads the dynamic modules needed to boot a chat. The object seam lets tests
 * simulate a failed chunk load without changing the production imports.
 */
export const bootModuleLoader = {
  loadBootModules: () =>
    Promise.all([
      import('../../chat/utils/chatBoot'),
      import('../../chat/utils/appConfigUpdates'),
      import('../../chat/ChatAppEntry'),
      import('../../chat/utils/customPromptLine'),
    ]),
};

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
  // No box of its own by default: a float chat positions itself and must add
  // nothing to the page's layout. With a custom host element it fills that
  // host instead.
  static styles = css`
    :host {
      box-sizing: border-box;
      z-index: var(--cds-aichat-z-index, auto);
    }

    :host([custom-host]) {
      display: block;
      width: 100%;
      height: 100%;
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
   * True when the React wrapper renders the custom prompt line. That content
   * reaches its slot only after the first render, too late for the startup
   * check that skips the rich editor's chunks.
   *
   * @internal
   */
  hostRendersCustomPromptLine = false;

  /**
   * Called once per mount, after the {@link ChatInstance} is ready and before the chat renders.
   *
   * Use it to capture the instance so you can call instance methods later. Events the chat fires while this runs
   * still reach your render callbacks.
   *
   * If it returns a promise, the chat waits for that promise before it renders. If it throws or rejects, the chat
   * logs the error, stays unrendered, and skips `onAfterRender`. Changing properties does not retry it; mount the
   * chat again to retry.
   *
   * Don't return a promise that waits for `onAfterRender`. That callback runs only after this promise settles, so
   * the chat would never render.
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
   * Called once per mount, after the chat first renders and applies its initial view.
   *
   * Like `onBeforeRender`, it receives the {@link ChatInstance}. Use it when you need the instance only after the
   * first render. It does not wait for history to load, and the chat does not wait for a promise it returns.
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

  /** Handlers this element added to the current mount's instance. */
  private _mountHandlers: TypeAndHandler[] = [];

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

  willUpdate(changed: PropertyValues<this>) {
    if (changed.has('element')) {
      this.toggleAttribute('custom-host', Boolean(this.element));
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
    // A move is a detach and reattach in one task, as when React reorders
    // keyed siblings. Keep the running chat through it; release only when the
    // element is still detached once the task's microtasks run.
    queueMicrotask(() => {
      if (!this.isConnected) {
        this.pluginHostController.disconnect();
        this.releaseMount();
      }
    });
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

    Object.values(this._instance?.writeableElements ?? {}).forEach(
      (element) => {
        if (element?.parentNode === this) {
          element.remove();
        }
      }
    );

    this._instance = undefined;
  }

  /** Records a subscription so {@link releaseMount} can remove it. */
  private subscribe(handler: TypeAndHandler) {
    this._mountHandlers.push(handler);
    this._instance.on(handler);
  }

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
   * The app renders its own slots into this shadow root, so this element
   * renders no template of its own.
   */
  render() {
    return nothing;
  }

  // -------------------------------------------------------------------------
  // Startup
  // -------------------------------------------------------------------------

  private renderTarget?: HTMLDivElement;

  private current?: MountState;

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
      // Service and UI imports reach Carbon UI modules, which need browser
      // globals. Keep registration server-safe and load them only for a live
      // mount, so a failed load lands in the catch below for every host.
      const [
        {
          initServiceManagerAndInstance,
          mergePublicConfig,
          performInitialViewChange,
        },
        { applyConfigUpdate, createAppliedConfig },
        { ChatAppEntry },
        { hasCustomPromptLine },
      ] = await bootModuleLoader.loadBootModules();
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
      state.App = ChatAppEntry;
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
      // A custom prompt line replaces the editor, so it never loads them.
      if (
        resolvePromptLineMode(this.resolvedConfig.input) === 'rich' &&
        !hasCustomPromptLine(serviceManager) &&
        !this.hostRendersCustomPromptLine
      ) {
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
    if (!state?.serviceManager || !state.App) {
      return;
    }

    state.mount?.render(state.App, {
      serviceManager: state.serviceManager,
      instance: state.instance,
      windowSize: this.windowSize,
      renderReady: state.renderReady,
      initialViewReady: state.initialViewReady,
      onListenersReady: () => state.listenersReady.doResolve(),
      onInitialViewCommitted: () => state.initialViewCommitted.doResolve(),
      renderUserDefinedResponse: toReactUserDefinedResponse(
        this.renderUserDefinedResponse
      ),
      removeEmptyUserDefinedResponseHost: Boolean(
        this.renderUserDefinedResponse
      ),
      renderCustomMessageFooter: toReactCustomMessageFooter(
        this.renderCustomMessageFooter
      ),
      removeEmptyCustomMessageFooterHost: Boolean(
        this.renderCustomMessageFooter
      ),
      renderCustomRequestFooter: toReactCustomRequestFooter(
        this.renderCustomRequestFooter
      ),
      isCustomRequestFooterEnabled: () =>
        Boolean(this.renderCustomRequestFooter),
      renderUserDefinedInputNode: toReactUserDefinedInputNode(
        this.renderUserDefinedInputNode
      ),
      chatWrapper: this,
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
    // Held here: the release runs a microtask after disconnect, and a closing
    // page (or test environment) may have dropped its globals by then.
    const view = window;
    const doc = document;
    view.addEventListener('resize', onResize);
    doc.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      view.removeEventListener('resize', onResize);
      doc.removeEventListener('visibilitychange', onVisibilityChange);
      serviceManager.themeWatcherService?.stopWatching();
    };
  }

  /**
   * A host can connect after the React entry loaded but before the
   * web-component entry installs its renderer. Wake it once that happens;
   * `startMount` ignores the wake if the element has left the page.
   */
  private waitForDefaultRenderer() {
    whenDefaultRenderer().then(() => this.requestUpdate());
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
 * Mounts the element a WC-style `renderUserDefinedInputNode` returned. React
 * owns the slot wrapper; the consumer owns the element inside it.
 */
function WCInputNodeMount({ element }: { element: HTMLElement }) {
  const hostRef = useRef<HTMLSpanElement | null>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    host.appendChild(element);
    return () => {
      if (element.parentNode === host) {
        host.removeChild(element);
      }
    };
  }, [element]);

  // No JSX here: this module is a Lit element, compiled as plain TypeScript.
  return React.createElement('span', { ref: hostRef });
}

/**
 * Makes one React render prop per web-component callback. The same callback
 * always gets the same adapter, so an unchanged callback does not re-render
 * the app's portals.
 */
function cachedAdapter<TCallback extends object, TRenderProp>(
  adapt: (callback: TCallback) => TRenderProp
) {
  const adapters = new WeakMap<TCallback, TRenderProp>();
  return (callback: TCallback | undefined) => {
    if (!callback) {
      return undefined;
    }
    let adapter = adapters.get(callback);
    if (!adapter) {
      adapter = adapt(callback);
      adapters.set(callback, adapter);
    }
    return adapter;
  };
}

// The slot callbacks return a DOM element, which the app's slot portals place
// in the slot host directly; see `SlotHostPortal`.
const asSlotContent = (element: HTMLElement | null) =>
  element as unknown as ReactNode;

function renderWCSlotContent(
  callbackName: string,
  render: () => HTMLElement | null
): ReactNode {
  try {
    return asSlotContent(render());
  } catch (error) {
    consoleError(`Error in ${callbackName}:`, error);
    return null;
  }
}

const toReactUserDefinedResponse = cachedAdapter(
  (render: WCRenderUserDefinedResponse): RenderUserDefinedResponse =>
    (state, instance) =>
      renderWCSlotContent('renderUserDefinedResponse', () =>
        render(state, instance)
      )
);

const toReactCustomMessageFooter = cachedAdapter(
  (render: WCRenderCustomMessageFooter): RenderCustomMessageFooter =>
    (slotName, message, messageItem, instance, additionalData) =>
      renderWCSlotContent('renderCustomMessageFooter', () =>
        render({ slotName, message, messageItem, additionalData }, instance)
      )
);

const toReactCustomRequestFooter = cachedAdapter(
  (render: WCRenderCustomRequestFooter): RenderCustomRequestFooter =>
    (slotName, message, instance) =>
      renderWCSlotContent('renderCustomRequestFooter', () =>
        render({ slotName, message }, instance)
      )
);

const toReactUserDefinedInputNode = cachedAdapter(
  (wcRenderer: WCRenderUserDefinedInputNode): RenderUserDefinedInputNode =>
    // Called here rather than in the mount, so a null result leaves no host
    // assigned to the bubble's slot and its fallback label shows.
    // eslint-disable-next-line react/display-name -- this is a render callback, not a component
    (state, instance) => {
      const element = wcRenderer(state, instance);
      return element
        ? React.createElement(WCInputNodeMount, { element })
        : null;
    }
);

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
   * Called once per mount, after the {@link ChatInstance} is ready and before the chat renders.
   *
   * Use it to capture the instance so you can call instance methods later. Events the chat fires while this runs
   * still reach your render callbacks.
   *
   * If it returns a promise, the chat waits for that promise before it renders. If it throws or rejects, the chat
   * logs the error, stays unrendered, and skips `onAfterRender`. Changing properties does not retry it; mount the
   * chat again to retry.
   *
   * Don't return a promise that waits for `onAfterRender`. That callback runs only after this promise settles, so
   * the chat would never render.
   */
  onBeforeRender?: (instance: ChatInstance) => Promise<void> | void;

  /**
   * Called once per mount, after the chat first renders and applies its initial view.
   *
   * Like `onBeforeRender`, it receives the {@link ChatInstance}. Use it when you need the instance only after the
   * first render. It does not wait for history to load, and the chat does not wait for a promise it returns.
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
