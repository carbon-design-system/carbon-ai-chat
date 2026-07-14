/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The framework-neutral slot-projection state shapes shared by every surface: the React render
 * callbacks, the web-component render callbacks, and the core slot-state stores
 * (`src/chat/sdk/slotStates.ts`) all exchange these. Homed here — away from the ReactNode-bearing
 * callback types in `ChatContainer.ts` — so the SDK core can import them without reaching a file
 * that imports React.
 */

import { GenericItem, Message, MessageResponse } from "../messaging/Messages";
import { DeepPartial } from "../utilities/DeepPartial";
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

export { RenderCustomMessageFooterState, RenderUserDefinedState };
