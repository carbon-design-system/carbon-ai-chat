/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { PublicConfig } from '../../types/config/PublicConfig';
import type { ChatInstance } from '../../types/instance/ChatInstance';
import type {
  BusEventViewChange,
  BusEventViewPreChange,
} from '../../types/events/eventBusTypes';
import type {
  WCMarkdown,
  WCRenderCustomMessageFooter,
  WCRenderCustomRequestFooter,
  WCRenderUserDefinedResponse,
  WCRenderUserDefinedInputNode,
} from '../../types/component/ChatContainer';

/**
 * Attributes interface for the cds-aichat-custom-element web component.
 * Extends {@link PublicConfig} with component-specific props, flattening all
 * config properties as top-level properties for TypeScript IntelliSense.
 *
 * @category Web component
 */
interface CdsAiChatCustomElementAttributes extends Omit<
  PublicConfig,
  'markdown'
> {
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
   * Called before a view change (the chat opening or closing) and awaited before the change proceeds. Use it to update
   * this element's CSS classes and run open/close animations to completion before the chat shell's inner contents are
   * hidden. A common pattern is to use this when the chat is closing and `onViewChange` when it opens.
   *
   * Note that this function can only be provided before Carbon AI Chat is loaded. After Carbon AI Chat is loaded, the
   * callback will not be updated.
   */
  onViewPreChange?: (event: BusEventViewPreChange) => Promise<void> | void;

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

  /**
   * Optional callback to render user defined responses. When provided, the inner cds-aichat-container
   * manages all event listening, slot tracking, streaming state, and element lifecycle.
   */
  renderUserDefinedResponse?: WCRenderUserDefinedResponse;

  /**
   * Optional callback to render custom message footers. When provided, the inner cds-aichat-container
   * manages all event listening, slot tracking, and element lifecycle.
   */
  renderCustomMessageFooter?: WCRenderCustomMessageFooter;

  /**
   * Called when a footer below a user message should be rendered. Leave it off and user messages have no footer.
   */
  renderCustomRequestFooter?: WCRenderCustomRequestFooter;

  /**
   * Renderer for `mention` chips, `command` chips, and custom TipTap nodes
   * inside sent user message bubbles (rich user message content). Forwarded to the inner cds-aichat-container.
   *
   * @experimental
   */
  renderUserDefinedInputNode?: WCRenderUserDefinedInputNode;
}

export { CdsAiChatCustomElementAttributes };
