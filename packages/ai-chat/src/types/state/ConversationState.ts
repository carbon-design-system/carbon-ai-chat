/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ChatSDKConfig } from '../config/ChatSDKConfig';
import type { OnErrorData } from '../config/ErrorConfig';
import type { HomeScreenConfig } from '../config/HomeScreenConfig';
import type { LanguagePack } from '../config/LanguagePack';
import type { PersistedStateConfig } from '../config/PersistedStateConfig';
import type { PublicConfigMessaging } from '../config/PublicConfigMessaging';
import type { ServiceDeskPublicConfig } from '../config/ServiceDeskConfig';
import type { UploadConfig } from '../config/UploadConfig';
import type { ChatInstance } from '../instance/ChatInstance';
import type { ConversationStatus } from '../instance/PublicChatState';
import type { DeepPartial } from '../utilities/DeepPartial';
import type { AppStateMessages } from './ChatMessagesState';
import type { HumanAgentState } from './HumanAgentState';
import type { InputState } from './InputState';
import type { PersistedState } from './PersistedState';
import type { ThemeState } from './ThemeState';

/**
 * The config conversation code reads: the SDK config, plus the prebuilt-chat
 * fields it still reads. The prebuilt chat stores its whole `PublicConfig`
 * here, so each field has `PublicConfig`'s type, except `humanAgentState`,
 * which only the SDK sets. `conversationConfig.fixture.ts` checks it. Internal.
 */
interface ConversationConfig extends Omit<
  ChatSDKConfig<ChatInstance>,
  'messaging' | 'serviceDesk'
> {
  onError?: (data: OnErrorData) => void;
  messaging?: PublicConfigMessaging;
  serviceDesk?: ServiceDeskPublicConfig;
  locale?: string;
  strings?: DeepPartial<LanguagePack>;
  assistantName?: string;
  upload?: UploadConfig;
  homescreen?: HomeScreenConfig;
  persistedState?: PersistedStateConfig;

  /** The input flags the conversation's selectors read. */
  input?: {
    isVisible?: boolean;
    isDisabled?: boolean;
    showStopStreamingButton?: boolean;
  };
}

/**
 * The conversation's view of the `config` slice. The prebuilt chat stores its
 * whole `AppConfig` there; conversation code reads only these fields.
 */
interface ConversationAppConfig {
  public: ConversationConfig;
  derived: {
    /** The theme watcher resolves an inherited theme into this (#1681). */
    themeWithDefaults: ThemeState;
  };
}

/** The conversation's half of {@link PersistedState}. */
type ConversationPersistedState = Pick<
  PersistedState,
  'hasSentNonWelcomeMessage' | 'humanAgentState'
>;

/**
 * The conversation partition: the chat's one store without its view part.
 * Conversation code sees only this.
 */
interface ConversationState extends AppStateMessages {
  /** Current conversation operation phase. */
  conversationStatus: ConversationStatus;

  /**
   * Whether we have hydrated Carbon AI Chat. This means we have loaded session history if it exists as well as the
   * welcome node (if appropriate).
   */
  isHydrated: boolean;

  /**
   * Indicates if a restart is currently in progress.
   */
  isRestarting: boolean;

  /**
   * The state of the input area when the user is interacting with an assistant (not a human agent).
   */
  assistantInputState: InputState;

  /**
   * The external configuration for the chat widget that includes the public config provided by the host page as well
   * as the remote config provided by the tooling.
   */
  config: ConversationAppConfig;

  /**
   * The active language pack: the `enLanguagePack` defaults merged with any host-provided `strings` overrides. Kept in
   * its own top-level slice (rather than under `config.derived`) so that changing a string updates only language-pack
   * consumers and never churns the rest of the config tree. Updated via `setAppStateValue("languagePack", ...)`.
   */
  languagePack: LanguagePack;

  /**
   * Volatile UI state related to the current human agent session. This is not persisted and is reset on reload.
   */
  humanAgentState: HumanAgentState;

  /**
   * The conversation's half of the saved session: the agent connection, and whether a message was sent. The view
   * partition saves the rest.
   */
  persistedToBrowserStorage: ConversationPersistedState;
}

export type {
  ConversationAppConfig,
  ConversationConfig,
  ConversationPersistedState,
  ConversationState,
};
