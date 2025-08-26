/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { type ReactNode } from "react";
import { DeepPartial } from "../utilities/DeepPartial";

import { type ChatInstance, WriteableElements } from "../instance/ChatInstance";
import { GenericItem, Message } from "../messaging/Messages";
import { PublicConfig } from "../config/PublicConfig";

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
 * A map of writeable element keys to a ReactNode to render to them.
 *
 * @category React
 */
type RenderWriteableElementResponse = {
  [K in keyof WriteableElements]?: ReactNode;
};

/** @category React */
interface ChatContainerProps {
  /**
   * The config to use to load Carbon AI Chat. If you need to perform any actions after Carbon AI Chat been loaded,
   * use the "onBeforeRender" or "onAfterRender" props.
   */
  config: PublicConfig;

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
   * This is the function that this component will call when a user defined response should be rendered.
   */
  renderUserDefinedResponse?: RenderUserDefinedResponse;

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
  RenderUserDefinedResponse,
  RenderWriteableElementResponse,
  RenderUserDefinedState,
};
