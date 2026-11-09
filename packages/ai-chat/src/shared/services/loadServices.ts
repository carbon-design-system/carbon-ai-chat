/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { getSpeakerName } from '../utils/messageUtils';
import type { MessageResponse } from '../../types/messaging/Messages';
import { ChatInstanceService } from './ChatInstanceService';
import { HydrationService } from './HydrationService';
import { InputActionsService } from './InputActionsService';
import { PublicStateService } from './PublicStateService';
import { MessageCoordinator } from './messaging/MessageCoordinator';
import { SlotEventService } from './messaging/presentation/SlotEventService';
import { StreamAnnouncerService } from './messaging/presentation/StreamAnnouncerService';
import { EventBus } from '../events/EventBus';
import { HistoryService } from './HistoryService';
import { NamespaceService } from './NamespaceService';
import { ServiceManager } from './ServiceManager';
import { UserSessionStorageService } from './UserSessionStorageService';
import {
  humanAgentStateConfig,
  reportHumanAgentStateOnChange,
} from '../store/humanAgentStatePersistence';
import { doCreateStore } from '../store/doCreateStore';
import { refreshLocalizationOnChange } from '../store/subscriptions';
import type { ConversationAppConfig } from '../../types/state/ConversationState';
import { WriteableElementName } from '../utils/constants';
import { assertType, setEnableDebugLog } from '../utils/miscUtils';
import { setIntl } from '../utils/intlUtils';
import { isBrowser } from '../utils/browserUtils';

/** How a chat's services are built. */
interface CreateServiceManagerOptions {
  /**
   * Saves and restores the session in browser session storage, as the
   * prebuilt chat does. A chat started by `createChatSDK` passes `false`, so it
   * reads and writes no storage of its own (#1732).
   */
  sessionStorage?: boolean;
}

type CreateServiceManagerFunction = (
  appConfig: ConversationAppConfig,
  options?: CreateServiceManagerOptions
) => ServiceManager;

/**
 * This file contains the code needed to bootstrap all the shared services in Carbon AI Chat. Services are used to hold
 * functions that are used throughout the application that need access to the current instance of the Carbon AI Chat.
 */
function createServiceManager(
  appConfig: ConversationAppConfig,
  { sessionStorage = true }: CreateServiceManagerOptions = {}
) {
  const publicConfig = appConfig.public;

  const serviceManager = new ServiceManager();

  // Create all the services we will be using.
  serviceManager.namespace = new NamespaceService(publicConfig.namespace);
  if (sessionStorage) {
    serviceManager.userSessionStorageService = new UserSessionStorageService(
      serviceManager
    );
  }
  serviceManager.actions = new ChatInstanceService(serviceManager);
  serviceManager.inputActionsService = new InputActionsService(serviceManager);
  serviceManager.streamAnnouncerService = new StreamAnnouncerService({
    announceStreamStart: (messageID, languageKey, responseUserProfile) => {
      const { store } = serviceManager;
      const { config } = store.getState();

      const assistantName = config.public.assistantName;

      const message = store.getState().allMessagesByID[messageID] as
        MessageResponse | undefined;

      const messageWithProfile: MessageResponse | undefined =
        responseUserProfile
          ? ({
              ...message,
              message_options: {
                ...message?.message_options,
                response_user_profile: responseUserProfile,
              },
            } as MessageResponse)
          : message;

      const speakerName = getSpeakerName(messageWithProfile, assistantName);

      serviceManager.view?.current?.messaging.announce?.({
        messageID: languageKey,
        messageValues: { sender: speakerName },
      });
    },
  });
  serviceManager.slotEventService = new SlotEventService(serviceManager);
  serviceManager.hydrationService = new HydrationService(serviceManager);
  serviceManager.eventBus = new EventBus();
  serviceManager.store = doCreateStore(appConfig, serviceManager);
  serviceManager.publicStateService = new PublicStateService(serviceManager);
  serviceManager.messageCoordinator = new MessageCoordinator(serviceManager);
  serviceManager.historyService = new HistoryService(serviceManager);
  serviceManager.messageCoordinator.configureMessageTimeout(publicConfig);
  // Single post-boot owner of `serviceManager.intl`: rebuild it whenever the
  // strings or locale change. Boot's `setIntl` below seeds the formatter before
  // first paint (no dispatch fires during boot, so this subscription can't).
  serviceManager.store.subscribe(refreshLocalizationOnChange(serviceManager));
  if (humanAgentStateConfig(publicConfig)?.onStateChange) {
    serviceManager.store.subscribe(
      reportHumanAgentStateOnChange(serviceManager)
    );
  }

  setIntl(
    serviceManager,
    serviceManager.store.getState().config.public.locale || 'en',
    serviceManager.store.getState().languagePack
  );

  // Create all custom elements for Deb.
  serviceManager.writeableElements = {};
  if (isBrowser()) {
    serviceManager.writeableElements = {
      [WriteableElementName.AI_TOOLTIP_AFTER_DESCRIPTION_ELEMENT]:
        document.createElement('div'),
      [WriteableElementName.EXPLAINABILITY_POPOVER_CONTENT]:
        document.createElement('div'),
      [WriteableElementName.EXPLAINABILITY_POPOVER_ACTIONS]:
        document.createElement('div'),
      [WriteableElementName.WELCOME_NODE_BEFORE_ELEMENT]:
        document.createElement('div'),
      [WriteableElementName.HEADER_BOTTOM_ELEMENT]:
        document.createElement('div'),
      [WriteableElementName.HEADER_FIXED_ACTIONS_ELEMENT]:
        document.createElement('div'),
      [WriteableElementName.BEFORE_INPUT_ELEMENT]:
        document.createElement('div'),
      [WriteableElementName.AFTER_INPUT_ELEMENT]: document.createElement('div'),
      [WriteableElementName.PROMPT_LINE_ACTIONS_END]:
        document.createElement('div'),
      [WriteableElementName.PROMPT_LINE_SEND_BUTTON_START]:
        document.createElement('div'),
      [WriteableElementName.FOOTER_ELEMENT]: document.createElement('div'),
      [WriteableElementName.HOME_SCREEN_HEADER_BOTTOM_ELEMENT]:
        document.createElement('div'),
      [WriteableElementName.HOME_SCREEN_AFTER_STARTERS_ELEMENT]:
        document.createElement('div'),
      [WriteableElementName.HOME_SCREEN_BEFORE_INPUT_ELEMENT]:
        document.createElement('div'),
      [WriteableElementName.CUSTOM_PANEL_ELEMENT]:
        document.createElement('div'),
      [WriteableElementName.WORKSPACE_PANEL_ELEMENT]:
        document.createElement('div'),
      [WriteableElementName.HISTORY_PANEL_ELEMENT]:
        document.createElement('div'),
      [WriteableElementName.CUSTOM_HEADER]: document.createElement('div'),
      [WriteableElementName.CUSTOM_PROMPT_LINE]: document.createElement('div'),
    };
  }

  if (publicConfig.debug) {
    setEnableDebugLog(true);
  }

  return serviceManager;
}
assertType<CreateServiceManagerFunction>(createServiceManager);

export { createServiceManager };
