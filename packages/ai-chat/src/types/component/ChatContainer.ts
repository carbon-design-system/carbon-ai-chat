/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { type ReactNode } from "react";
import { type ChatInstance } from "../instance/ChatInstance";
import { WriteableElements } from "../instance/WriteableElements";
import {
  GenericItem,
  Message,
  MessageRequest,
  MessageResponse,
} from "../messaging/Messages";
import { PublicConfig } from "../config/PublicConfig";
import { DeepPartial } from "../utilities/DeepPartial";
import type { JSONContent } from "@tiptap/core";

/**
 * The user_defined message object passed into the renderUserDefinedResponse property on the main chat components.
 *
 * @category React
 */
interface RenderUserDefinedState {
  /**
   * The entire message object received when the entire message (not just the individual messageItem) has finished processing.
   */
  fullMessage?: Message;

  /**
   * The messageItem after all partial chunks are received. This will first be set to the value of the `complete_item`
   * chunk.
   * Once the fullMessage is resolved, this value will update to the value of the item in the fullMessage, which will
   * be the same value unless you have done any post-processing mutations.
   */
  messageItem?: GenericItem;

  /**
   * An array of each user defined item partial chunk. Each chunk contains the new chunk information, they are not
   * concatenated for you. When messageItem has been set an no more chunks are expected, this property is removed
   * to avoid memory leaks.
   */
  partialItems?: DeepPartial<GenericItem>[];
}

/**
 * The type of the render function that is used to render a custom footer. This function should return a
 * component that renders the custom message footer.
 *
 * @param slotName The unique identifier for this footer slot.
 * @param message The assistant response object that contains the messageItem.
 * @param messageItem The message item that is being rendered.
 * @param instance The current instance of the Carbon AI Chat.
 * @param additionalData Any additional data that was passed to the render function.
 *
 * @category React
 */
type RenderCustomMessageFooter = (
  slotName: string,
  message: MessageResponse,
  messageItem: GenericItem,
  instance: ChatInstance,
  additionalData?: Record<string, unknown>,
) => ReactNode | null;

/**
 * The type of the render function that is used to render user defined responses. This function should return a
 * component that renders the display for the message contained in the given event.
 *
 * @param state The BusEventUserDefinedResponse that was originally fired by Carbon AI Chat when the user defined response
 * was first fired.
 * @param instance The current instance of the Carbon AI Chat.
 *
 * @category React
 */
type RenderUserDefinedResponse = (
  state: RenderUserDefinedState,
  instance: ChatInstance,
) => ReactNode;

/**
 * The type of the render function used to render user defined responses in web components.
 * This function should return an HTMLElement to display for the given user defined state,
 * or null to render nothing.
 *
 * The callback is invoked on every state update (new chunk, complete item, full message).
 * If you return the same element reference, the DOM is not disturbed. If you return a
 * new element, the previous content is replaced.
 *
 * @param state The accumulated state for this user defined response slot.
 * @param instance The current instance of Carbon AI Chat.
 *
 * @category Web component
 */
type WCRenderUserDefinedResponse = (
  state: RenderUserDefinedState,
  instance: ChatInstance,
) => HTMLElement | null;

/**
 * The state passed to a `renderUserDefinedInputNode` call. The chat surfaces
 * one call per non-text TipTap node inside a sent user message's
 * `display_content` — typically a consumer-registered custom node such as a
 * task card, file pill, or mention with rich rendering.
 *
 * @category Composition
 * @experimental
 */
interface RenderUserDefinedInputNodeState {
  /** The TipTap JSONContent node being rendered (carries `type`, `attrs`, etc.). */
  node: JSONContent;
  /** The full user message this node belongs to. */
  message: MessageRequest;
}

/**
 * React-side renderer for custom TipTap node types in user message bubbles.
 * Returned content mounts into LIGHT DOM so consumer stylesheets apply. The
 * library manages the slot lifecycle — register a renderer that returns the
 * React node for nodes you care about and `null` for everything else.
 *
 * @category Composition
 * @experimental
 */
type RenderUserDefinedInputNode = (
  state: RenderUserDefinedInputNodeState,
  instance: ChatInstance,
) => ReactNode;

/**
 * Web-component renderer for custom TipTap node types in user message
 * bubbles. Mirrors {@link RenderUserDefinedInputNode} but returns an
 * `HTMLElement` (or `null`). The library moves / removes the element as
 * messages mount and unmount.
 *
 * @category Composition
 * @experimental
 */
type WCRenderUserDefinedInputNode = (
  state: RenderUserDefinedInputNodeState,
  instance: ChatInstance,
) => HTMLElement | null;

/**
 * A map of writeable element keys to a ReactNode to render to them.
 *
 * @category React
 */
type RenderWriteableElementResponse = {
  [K in keyof WriteableElements]?: ReactNode;
};

/**
 * Properties for the ChatContainer React component. This interface extends
 * {@link PublicConfig} with additional component-specific props, flattening all
 * config properties as top-level props for better TypeScript IntelliSense.
 *
 * Any additional DOM attributes passed to the component (for example
 * `className`, `id`, `style`, or `aria-*`) are forwarded to the underlying
 * host element.
 *
 * @category React
 */
interface ChatContainerProps extends PublicConfig {
  /**
   * This function is called before the render function of Carbon AI Chat is called. This function can return a Promise
   * which will cause Carbon AI Chat to wait for it before rendering.
   */
  onBeforeRender?: (instance: ChatInstance) => Promise<void> | void;

  /**
   * This function is called after the render function of Carbon AI Chat is called. This function can return a Promise
   * which will cause Carbon AI Chat to wait for it before rendering.
   */
  onAfterRender?: (instance: ChatInstance) => Promise<void> | void;

  /**
   * This is the function that this component will call when a custom footer should be rendered.
   */
  renderCustomMessageFooter?: RenderCustomMessageFooter;

  /**
   * This is the function that this component will call when a user defined response should be rendered.
   */
  renderUserDefinedResponse?: RenderUserDefinedResponse;

  /**
   * Renderer for custom TipTap node types inside sent user message bubbles
   * (rich user message content). Invoked once per non-built-in node in a
   * user message's `display_content`; returned React content mounts into
   * light DOM. Return `null` for nodes you don't recognize.
   *
   * @experimental
   */
  renderUserDefinedInputNode?: RenderUserDefinedInputNode;

  /**
   * This is the render function this component will call when it needs to render a writeable element.
   */
  renderWriteableElements?: RenderWriteableElementResponse;

  /**
   * @internal
   * The optional HTML element to write the chat into.
   */
  element?: HTMLElement;
}

export {
  ChatContainerProps,
  RenderCustomMessageFooter,
  RenderUserDefinedResponse,
  RenderWriteableElementResponse,
  RenderUserDefinedState,
  WCRenderUserDefinedResponse,
  RenderUserDefinedInputNode,
  RenderUserDefinedInputNodeState,
  WCRenderUserDefinedInputNode,
};
