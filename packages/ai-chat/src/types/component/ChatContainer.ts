/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { type ReactNode } from "react";
import type {
  MarkdownCustomRenderers as _MarkdownCustomRenderers,
  MarkdownRendererCodeBlockArgs as _MarkdownRendererCodeBlockArgs,
  MarkdownRendererCodeBlockData as _MarkdownRendererCodeBlockData,
  MarkdownRendererTableArgs as _MarkdownRendererTableArgs,
  MarkdownRendererTableData as _MarkdownRendererTableData,
  TokenTree as _TokenTree,
} from "@carbon/ai-chat-components/es/components/markdown/index.js";
import { type ChatInstance } from "../instance/ChatInstance";
import { WriteableElements } from "../instance/WriteableElements";
import {
  GenericItem,
  Message,
  MessageRequest,
  MessageResponse,
} from "../messaging/Messages";
import { PublicConfig, PublicConfigMarkdown } from "../config/PublicConfig";
import { DeepPartial } from "../utilities/DeepPartial";
import {
  BusEventViewChange,
  BusEventViewPreChange,
} from "../events/eventBusTypes";
import type { JSONContent } from "@tiptap/core";
import { MessageState } from "../config/MessagingConfig";

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

  /**
   * The current {@link MessageState} of the containing message at the moment the renderer
   * was invoked. Use this to drive in-widget streaming indicators or error treatments
   * without inspecting the message items directly.
   *
   * @experimental Field is additive; its presence and semantics may evolve as the
   * lifecycle model stabilizes.
   */
  state?: MessageState;
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
 * The accumulated state for one custom message footer slot, passed to the
 * web component {@link WCRenderCustomMessageFooter} callback.
 *
 * @category Web component
 */
interface RenderCustomMessageFooterState {
  /** The unique identifier for this footer slot. */
  slotName: string;

  /** The assistant response object that contains the messageItem. */
  message: MessageResponse;

  /** The message item that the footer is attached to. */
  messageItem: GenericItem;

  /** Optional application data supplied with the footer slot. */
  additionalData?: Record<string, unknown>;
}

/**
 * The render function used to render a custom message footer in web
 * components. When provided, the library manages all event listening, slot
 * tracking, and element lifecycle. The callback receives the accumulated state
 * and should return an HTMLElement to display, or null to render nothing.
 *
 * This is the web component analogue of {@link RenderCustomMessageFooter} and
 * mirrors the contract of {@link WCRenderUserDefinedResponse}.
 *
 * @param state The accumulated state for this custom footer slot.
 * @param instance The current instance of Carbon AI Chat.
 *
 * @category Web component
 */
type WCRenderCustomMessageFooter = (
  state: RenderCustomMessageFooterState,
  instance: ChatInstance,
) => HTMLElement | null;

/**
 * The state passed to a `renderUserDefinedInputNode` call. The chat surfaces
 * one call per non-text TipTap node inside a sent user message's
 * `display_content` — typically a consumer-registered custom node such as a
 * task card, file pill, or mention with rich rendering.
 *
 * @category React
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
 * @category React
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
 * @category Web component
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
 * Markdown-it parser node tree, surfaced on the `node` field of
 * {@link MarkdownRendererTableArgs} and {@link MarkdownRendererCodeBlockArgs}
 * so custom renderers can inspect the parsed token structure when the
 * high-level data payload isn't enough.
 *
 * @category Messaging
 * @experimental
 */
export type TokenTree = _TokenTree;

/**
 * Parsed table payload extended by {@link MarkdownRendererTableArgs} — the
 * argument shape the table renderer callback actually receives. Carries the
 * headers, rows, and streaming/loading flags.
 *
 * @category Messaging
 * @experimental
 */
export type MarkdownRendererTableData = _MarkdownRendererTableData;

/**
 * Parsed code-block payload extended by {@link MarkdownRendererCodeBlockArgs} —
 * the argument shape the code-block renderer callback actually receives.
 * Carries the language, code text, and streaming flag.
 *
 * @category Messaging
 * @experimental
 */
export type MarkdownRendererCodeBlockData = _MarkdownRendererCodeBlockData;

/**
 * Argument passed to the markdown table renderer callbacks on
 * {@link CustomMarkdownRenderers.table} and
 * {@link WCCustomMarkdownRenderers.table}. Extends
 * {@link MarkdownRendererTableData} with the source token, full
 * {@link TokenTree} node, and a stable `slotName` suitable for use as a key.
 *
 * @category Messaging
 * @experimental
 */
export type MarkdownRendererTableArgs = _MarkdownRendererTableArgs;

/**
 * Argument passed to the fenced code-block renderer callbacks on
 * {@link CustomMarkdownRenderers.codeBlock} and
 * {@link WCCustomMarkdownRenderers.codeBlock}. Extends
 * {@link MarkdownRendererCodeBlockData} with the source token, full
 * {@link TokenTree} node, and a stable `slotName` suitable for use as a key.
 *
 * @category Messaging
 * @experimental
 */
export type MarkdownRendererCodeBlockArgs = _MarkdownRendererCodeBlockArgs;

/**
 * Framework-neutral per-element renderer overrides accepted by the
 * underlying `cds-aichat-markdown` element. The React variant
 * {@link CustomMarkdownRenderers} and the web-component variant
 * {@link WCCustomMarkdownRenderers} extend this contract with their layer's
 * return type. Application code typically uses one of those variants rather
 * than this baseline directly.
 *
 * @category Messaging
 * @experimental
 */
export type MarkdownCustomRenderers = _MarkdownCustomRenderers;

/**
 * Per-element renderer overrides for the React `ChatContainer`. Each callback
 * receives the parsed token data and returns a `ReactNode` that renders in
 * place of the default Carbon rendering. Return `null` to opt out of the
 * override for that particular descriptor — the default Carbon rendering
 * runs unchanged.
 *
 * Callbacks fire once per matching element per render pass, including every
 * streaming chunk that adds or changes the element's contents. When the
 * underlying element stays in the document but its data changes (a new table
 * row, more code lines), the same `slotName` is reused and the callback is
 * invoked again with the updated payload.
 *
 * @experimental
 * @category React
 */
interface CustomMarkdownRenderers {
  /**
   * Override the default rendering for markdown tables. Receives parsed table
   * data; return `null` to fall back to the default Carbon table renderer.
   */
  table?: (args: MarkdownRendererTableArgs) => ReactNode;
  /**
   * Override the default rendering for fenced code blocks. Receives parsed
   * code-block data; return `null` to fall back to the default Carbon code
   * snippet renderer.
   */
  codeBlock?: (args: MarkdownRendererCodeBlockArgs) => ReactNode;
}

/**
 * The web-component analogue of {@link CustomMarkdownRenderers} — same shape,
 * but each callback returns an `HTMLElement` (or `null`) instead of a React
 * node. Return `null` to opt out for a specific descriptor and use the
 * default Carbon rendering instead.
 *
 * Callbacks fire once per matching element per render pass; return the same
 * element reference across renders to avoid unnecessary DOM churn.
 *
 * @experimental
 * @category Web component
 */
interface WCCustomMarkdownRenderers {
  /**
   * Override the default rendering for markdown tables. Receives parsed table
   * data; return `null` to fall back to the default Carbon table renderer.
   */
  table?: (args: MarkdownRendererTableArgs) => HTMLElement | null;
  /**
   * Override the default rendering for fenced code blocks. Receives parsed
   * code-block data; return `null` to fall back to the default Carbon code
   * snippet renderer.
   */
  codeBlock?: (args: MarkdownRendererCodeBlockArgs) => HTMLElement | null;
}

/**
 * React-layer `markdown` config — extends {@link PublicConfigMarkdown} with
 * React renderers.
 *
 * @experimental
 * @category React
 */
interface ChatContainerPropsMarkdown extends PublicConfigMarkdown {
  /**
   * Per-element renderer overrides — see {@link CustomMarkdownRenderers}.
   * Pass a stable reference (`useMemo`) — an inline object literal will be a
   * fresh reference each render.
   *
   * @experimental
   */
  customRenderers?: CustomMarkdownRenderers;
}

/**
 * Web-component-layer `markdown` config — extends {@link PublicConfigMarkdown}
 * with renderers returning `HTMLElement` (or `null`).
 *
 * @experimental
 * @category Web component
 */
interface WCMarkdown extends PublicConfigMarkdown {
  /**
   * Per-element renderer overrides — see {@link WCCustomMarkdownRenderers}.
   * Return the same element reference across renders to avoid unnecessary DOM
   * churn.
   *
   * @experimental
   */
  customRenderers?: WCCustomMarkdownRenderers;
}

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
interface ChatContainerProps extends Omit<PublicConfig, "markdown"> {
  /**
   * Markdown rendering customization. Extends the framework-neutral
   * {@link PublicConfigMarkdown} with React-layer custom renderers.
   *
   * @experimental
   */
  markdown?: ChatContainerPropsMarkdown;

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
   * Called before a view change (the chat opening or closing). Async — return a
   * Promise to defer the view change until it resolves.
   *
   * This is an opt-in observation hook. Unlike {@link ChatCustomElementProps},
   * the container has no wrapping element to size, so no default visibility
   * behavior runs when this prop is omitted.
   */
  onViewPreChange?: (
    event: BusEventViewPreChange,
    instance: ChatInstance,
  ) => Promise<void> | void;

  /**
   * Called when a view change (the chat opening or closing) is complete.
   *
   * This is an opt-in observation hook. Unlike {@link ChatCustomElementProps},
   * the container has no wrapping element to size, so no default visibility
   * behavior runs when this prop is omitted.
   */
  onViewChange?: (event: BusEventViewChange, instance: ChatInstance) => void;

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
  ChatContainerPropsMarkdown,
  CustomMarkdownRenderers,
  RenderCustomMessageFooter,
  RenderCustomMessageFooterState,
  RenderUserDefinedResponse,
  RenderWriteableElementResponse,
  RenderUserDefinedState,
  WCCustomMarkdownRenderers,
  WCMarkdown,
  WCRenderCustomMessageFooter,
  WCRenderUserDefinedResponse,
  RenderUserDefinedInputNode,
  RenderUserDefinedInputNodeState,
  WCRenderUserDefinedInputNode,
};
