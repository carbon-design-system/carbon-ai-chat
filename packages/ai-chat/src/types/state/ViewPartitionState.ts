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

/**
 * The saved view half: every saved field except the agent connection and
 * whether a message was sent, which the conversation saves.
 */
type ViewPersistedState = Omit<
  PersistedState,
  'humanAgentState' | 'hasSentNonWelcomeMessage'
>;

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

export type { ViewPartitionState, ViewPersistedState };
