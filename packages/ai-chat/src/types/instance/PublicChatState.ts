/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { WorkspaceCustomPanelConfigOptions } from "./apiTypes";
import type { PersistedState } from "../state/AppState";
import type { PersistedHumanAgentState } from "../state/PersistedHumanAgentState";
import { StructuredData } from "../messaging/Messages";
import type { JSONContent } from "@tiptap/core";

/**
 * This is the state made available by calling {@link ChatInstance.getState}. This is a public method that returns immutable values.
 *
 * @category Instance
 */
export interface PublicInputState {
  /**
   * @experimental Raw text currently queued in the input before being sent to customSendMessage.
   */
  rawValue: string;

  /**
   * Tiptap-native JSON projection of the editor doc. Updated on every doc
   * change: user typing, paste, trigger-driven mentions/commands, host-pushed
   * `updateContent` writes, and any host-dispatched transactions. Always
   * consistent with `rawValue` (both derive from the same underlying
   * document; no extra storage).
   *
   * Hosts persisting this value should serialize through `editor.getJSON()`
   * (canonical) rather than partial walks; the JSONContent shape is
   * governed by Tiptap's stability guarantees.
   *
   * @experimental
   */
  content: JSONContent;

  /**
   * Whether the input editor currently has focus. Mirrors the
   * `cds-aichat-input-focus` / `cds-aichat-input-blur` web component
   * events; for hosts that prefer DOM events or the live editor handle,
   * those remain available (`(await instance.input.getEditor()).isFocused`).
   *
   * Toggles in the same dispatch pass as the underlying focus event, so
   * subscribing via {@link BusEventType.STATE_CHANGE} fires once per
   * focus/blur transition.
   *
   * @experimental
   */
  focused: boolean;

  /**
   * A snapshot of the pending structured data currently queued in the input. This data will be merged
   * into the next outgoing {@link MessageRequest} when the user sends a message via the UI.
   *
   * @experimental
   */
  structuredData?: StructuredData;

  /**
   * `true` while one or more file uploads initiated via {@link UploadConfig.onFileUpload} are still
   * in progress.  The send button is disabled while this is `true`.
   *
   * @experimental
   */
  hasInFlightUploads: boolean;
}

/**
 * Represents public state for default custom panel.
 *
 * @category Instance
 */
export interface PublicDefaultCustomPanelState {
  /** Indicates if the default custom panel overlay is currently open. */
  isOpen: boolean;
}
/**
 * Represents public state for workspace custom panel.
 *
 * @category Instance
 */
export interface PublicWorkspaceCustomPanelState {
  /** Indicates if the workspace custom panel overlay is currently open. */
  isOpen: boolean;

  /**
   * Config options for the workspace panels.
   */
  options: WorkspaceCustomPanelConfigOptions;

  /**
   * The ID of the workspace attached to this panel. Used to match with a given Preview Card.
   */
  workspaceID?: string;

  /**
   * Additional metadata associated with the workspace.
   */
  additionalData?: unknown;
}

/**
 * Represents public state for history panel.
 *
 * @category Instance
 */
export interface PublicHistoryPanelState {
  /** Indicates if the history panel is currently open. */
  isOpen: boolean;

  /** Indicates if the history panel should open in chat panel. */
  isMobile: boolean;
}

/**
 * Represents public state for each supported custom panel variant.
 *
 * @category Instance
 */
export interface PublicCustomPanelsState {
  /** State for the default overlay-style custom panel. */
  default: PublicDefaultCustomPanelState;

  /**
   * State for the workspace custom panel.
   */
  workspace: PublicWorkspaceCustomPanelState;

  /**
   * State for the history panel.
   */
  history: PublicHistoryPanelState;
}

/**
 * Type returned by {@link ChatInstance.getState}.
 *
 * @category Instance
 */
export type PublicChatState = Readonly<
  Omit<PersistedState, "humanAgentState"> & {
    /**
     * Current human agent state.
     */
    humanAgent: PublicChatHumanAgentState;

    /**
     * Counter that indicates if a message is loading and a loading indicator should be displayed.
     * If "0" then we do not show loading indicator.
     */
    isMessageLoadingCounter: number;

    /**
     * Optional string to display next to the loading indicator.
     */
    isMessageLoadingText?: string;

    /**
     * Counter that indicates if the chat is hydrating and a full screen loading state should be displayed.
     */
    isHydratingCounter: number;

    /**
     * The message id of the currently active response. The "active response" is the latest response that has been
     * received or is expected. For instance, if you send another message the current activeResponseId will be set to
     * null until you get a new response back. This is meant to be used to disable any user inputs in a user_defined
     * response that you don't want active if its not a message you should be receiving inputs from.
     */
    activeResponseId: string | null;

    /**
     * @experimental State representing the main input surface.
     */
    input: PublicInputState;

    /**
     * State for any surfaced custom panels.
     */
    customPanels: PublicCustomPanelsState;

    /**
     * State for the workspace panel.
     */
    workspace: PublicWorkspaceCustomPanelState;
  }
>;

/**
 * Current connection state of the human agent experience.
 *
 * @category Instance
 */
export type PublicChatHumanAgentState = Readonly<
  PersistedHumanAgentState & {
    /** Indicates if Carbon AI Chat is attempting to connect to an agent. */
    isConnecting: boolean;
  }
>;
