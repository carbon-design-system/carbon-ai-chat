/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { AnnounceMessage } from './AnnounceMessage';
import type { ChatWidthBreakpoint } from './ChatWidthBreakpoint';
import type { PersistedState } from './PersistedState';
import type { ViewState } from '../instance/apiTypes';
import type { MarkdownConfig } from '../config/MarkdownConfig';
import type { DerivedConfig } from './AppConfig';
import type { CatastrophicErrorPanelState } from './panels/CatastrophicErrorPanelState';
import type { IFramePanelState } from './panels/IFramePanelState';
import type { ViewSourcePanelState } from './panels/ViewSourcePanelState';
import type { CustomPanelState } from './panels/CustomPanelState';
import type { WorkspacePanelState } from './panels/WorkspacePanelState';
import type { HistoryPanelState } from './panels/HistoryPanelState';
import type { MessagePanelState } from './panels/MessagePanelState';
import type { MessageRequest } from '../messaging/Messages';

/**
 * The saved view half: every saved field except the agent connection and
 * whether a message was sent, which the conversation saves.
 */
type ViewPersistedState = Omit<
  PersistedState,
  'humanAgentState' | 'hasSentNonWelcomeMessage'
>;

/**
 * A confirmation the chat is asking: the end-chat prompt from the header, or
 * a connect card's prompt to leave a suspended agent chat. It holds the
 * question only; the answers live outside the store for as long as the chat.
 */
interface ChatPrompt {
  /** Names this opening of the prompt, so a stale answer does nothing. */
  id: string;
  kind: 'endChat' | 'humanAgent';
  /** Replaces the panel's default title. */
  title?: string;
  /** Replaces the panel's default message. */
  message?: string;
}

/**
 * The view's flags for one drawn message item. The item is named by its
 * public ID (`ChatSDKMessageItem.id`), which stays the same when the chat
 * rebuilds the item's local copy.
 */
interface MessageItemViewFlags {
  /** The message the item belongs to. */
  messageID: string;

  /**
   * The request the user's choice in this item sent: a chosen option, date,
   * or post-back button. History loading restores it.
   */
  optionSelected?: MessageRequest;

  /**
   * Set while a screen reader should announce the item: the message renderer
   * announces it once it draws the item, and then sets `wasAnnounced`.
   */
  needsAnnouncement?: boolean;

  /**
   * Set once a screen reader has announced the item. An upsert that builds a
   * new copy of the item keeps it, so the new copy isn't announced again.
   */
  wasAnnounced?: boolean;

  /**
   * Set when `upsertMessage` wrote a version of the item the chat can't draw,
   * with the path of each field it's missing. While the item streams it stays
   * hidden; once its stream completes it shows an error instead.
   */
  cannotDraw?: { missing: string[] };
}

/**
 * The prebuilt chat's view partition, under `view` in the chat's one store.
 * Conversation code never reads it. Internal; never exported.
 */
interface ViewPartitionState {
  // Panels
  catastrophicErrorType?: boolean;
  catastrophicErrorPanelState?: CatastrophicErrorPanelState;
  iFramePanelState: IFramePanelState;
  viewSourcePanelState: ViewSourcePanelState;
  customPanelState: CustomPanelState;
  workspacePanelState: WorkspacePanelState;
  historyPanelState: HistoryPanelState;
  responsePanelState: MessagePanelState;

  // Layout
  chatWidthBreakpoint: ChatWidthBreakpoint;
  chatWidth: number;
  chatHeight: number;
  viewChanging: boolean;
  initialViewChangeComplete: boolean;
  targetViewState: ViewState;
  showNonHeaderBackgroundCover: boolean;
  suspendScrollDetection: boolean;
  isBrowserPageVisible: boolean;

  /** The confirmation the chat is asking, if any. It outlives a mount. */
  prompt: ChatPrompt | null;

  /**
   * The view's flags for each message item that has any, keyed by public
   * item ID. They outlive a mount. An item's flags go when the chat builds a
   * new copy of the item, or removes it, as they did when they lived on the
   * item's local copy.
   */
  messageItemFlags: Readonly<Record<string, Readonly<MessageItemViewFlags>>>;

  /** An ARIA message, announced whenever it changes. */
  announceMessage?: AnnounceMessage;

  /** Host markdown renderers and plugins. */
  markdownConfig?: MarkdownConfig;

  /** The values the chat computes from its public config: header, layout, theme, and the like. */
  derivedConfig: DerivedConfig;

  /** Shows the message loading indicator while above 0. */
  isMessageLoadingCounter: number;
  /** Text beside the message loading indicator. */
  isMessageLoadingText?: string;
  /** Shows the full-screen loading state while above 0 (#2695). */
  isHydratingCounter: number;

  /** Agent messages that arrived while the chat was out of sight. */
  numUnreadMessages: number;

  /** The saved view half. */
  persistedToBrowserStorage: ViewPersistedState;
}

export type {
  ChatPrompt,
  MessageItemViewFlags,
  ViewPartitionState,
  ViewPersistedState,
};
