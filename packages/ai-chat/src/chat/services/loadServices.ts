/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import actions from '../store/actions';
import { getSpeakerName } from '../utils/messageUtils';
import type { MessageResponse } from '../../types/messaging/Messages';
import {
  hasCustomPromptLine,
  requestComposerFocus,
} from '../utils/customPromptLine';
import { MessagePresentationAdapter } from './messaging/presentation/MessagePresentationAdapter';
import { ChatInstanceService } from './ChatInstanceService';
import { HydrationService } from './HydrationService';
import { InputActionsService } from './InputActionsService';
import { PublicStateService } from './PublicStateService';
import { MessageCoordinator } from './messaging/MessageCoordinator';
import { SlotEventService } from './messaging/presentation/SlotEventService';
import { StreamAnnouncerService } from './messaging/presentation/StreamAnnouncerService';
import { ViewService } from './ViewService';
import { EventBus } from '../events/EventBus';
import { HistoryService } from './HistoryService';
import { createCustomPanelManager } from './CustomPanelManager';
import { NamespaceService } from './NamespaceService';
import { ServiceManager } from './ServiceManager';
import { ThemeWatcherService } from './ThemeWatcherService';
import { UserSessionStorageService } from './UserSessionStorageService';
import { doCreateStore } from '../store/doCreateStore';
import {
  copyToSessionStorage,
  refreshLocalizationOnChange,
} from '../store/subscriptions';
import { AppConfig } from '../../types/state/AppConfig';
import { WriteableElementName } from '../utils/constants';
import { assertType, setEnableDebugLog } from '../utils/miscUtils';
import { setIntl } from '../utils/intlUtils';
import { isBrowser } from '../utils/browserUtils';

type CreateServiceManagerFunction = (appConfig: AppConfig) => ServiceManager;

/**
 * This file contains the code needed to bootstrap all the shared services in Carbon AI Chat. Services are used to hold
 * functions that are used throughout the application that need access to the current instance of the Carbon AI Chat.
 */
function createServiceManager(appConfig: AppConfig) {
  const publicConfig = appConfig.public;

  const serviceManager = new ServiceManager();

  // Create all the services we will be using.
  serviceManager.namespace = new NamespaceService(publicConfig.namespace);
  serviceManager.userSessionStorageService = new UserSessionStorageService(
    serviceManager
  );
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

      store.dispatch(
        actions.announceMessage({
          messageID: languageKey,
          messageValues: { sender: speakerName },
        })
      );
    },
  });
  serviceManager.slotEventService = new SlotEventService(serviceManager);
  serviceManager.hydrationService = new HydrationService(serviceManager);
  serviceManager.viewService = new ViewService(serviceManager);
  serviceManager.eventBus = new EventBus();
  serviceManager.store = doCreateStore(publicConfig, serviceManager);
  serviceManager.publicStateService = new PublicStateService(serviceManager);
  serviceManager.messageCoordinator = new MessageCoordinator(
    serviceManager,
    new MessagePresentationAdapter({
      openHomeScreen: () =>
        serviceManager.store.dispatch(actions.setHomeScreenIsOpen(true)),
      openHistoryResponsePanel: (local) => {
        serviceManager.store.dispatch(
          actions.setResponsePanelContent(local, true)
        );
        serviceManager.store.dispatch(actions.setResponsePanelIsOpen(true));
      },
      getMessagesScrollBottom: () =>
        serviceManager.mainWindow?.getMessagesScrollBottom(),
      restoreMessagesScroll: (scrollBottom) =>
        serviceManager.mainWindow?.doAutoScroll({
          scrollToBottom: scrollBottom,
        }),
      announceSendFailure: () =>
        serviceManager.store.dispatch(
          actions.announceMessage({ messageID: 'errors_ariaMessageFailed' })
        ),
      announceStreamStarts: (messageID, content) =>
        serviceManager.streamAnnouncerService.announceStreamStarts(
          messageID,
          content
        ),
      getUserDefinedResponseSlot: (id) =>
        serviceManager.slotEventService.getOrCreateUserDefinedElement(id)
          .slotName,
      hasCustomPromptLine: () => hasCustomPromptLine(serviceManager),
      requestComposerFocus: () => requestComposerFocus(serviceManager),
      announceSending: () => {
        if (serviceManager.ariaAnnouncer) {
          const languagePack = serviceManager.store.getState().languagePack;
          serviceManager.ariaAnnouncer(languagePack.input_sendingMessage);
        }
      },
      isHomeScreenOpen: () =>
        serviceManager.store.getState().persistedToBrowserStorage
          .homeScreenState.isHomeScreenOpen,
      closeHomeScreen: () =>
        serviceManager.store.dispatch(actions.setHomeScreenIsOpen(false)),
      isResponsePanelOpen: () =>
        serviceManager.store.getState().responsePanelState.isOpen,
      closeResponsePanel: () =>
        serviceManager.store.dispatch(actions.setResponsePanelIsOpen(false)),
    })
  );
  serviceManager.historyService = new HistoryService(serviceManager);
  serviceManager.messageCoordinator.configureMessageTimeout(publicConfig);
  serviceManager.store.subscribe(copyToSessionStorage(serviceManager));
  // Single post-boot owner of `serviceManager.intl`: rebuild it whenever the
  // strings or locale change. Boot's `setIntl` below seeds the formatter before
  // first paint (no dispatch fires during boot, so this subscription can't).
  serviceManager.store.subscribe(refreshLocalizationOnChange(serviceManager));

  // Subscribe to theme changes to start/stop the theme watcher as needed
  let currentOriginalTheme =
    serviceManager.store.getState().config.derived.themeWithDefaults
      .originalCarbonTheme;

  serviceManager.store.subscribe(() => {
    const newOriginalTheme =
      serviceManager.store.getState().config.derived.themeWithDefaults
        .originalCarbonTheme;
    if (newOriginalTheme !== currentOriginalTheme) {
      serviceManager.themeWatcherService.onThemeChange(newOriginalTheme);
      currentOriginalTheme = newOriginalTheme;
    }
  });
  serviceManager.customPanelManager = createCustomPanelManager(serviceManager);
  serviceManager.themeWatcherService = new ThemeWatcherService(
    serviceManager.store,
    serviceManager.container
  );

  // Start theme watching if initially inheriting tokens
  // If later we make the theme mutable, we will have to consider that here.
  serviceManager.themeWatcherService.onThemeChange(currentOriginalTheme);

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
