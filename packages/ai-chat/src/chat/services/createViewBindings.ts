/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import actions from '../../shared/store/actions';
import type { ServiceManager } from '../../shared/services/ServiceManager';
import type { ViewBindings } from '../../shared/services/viewBindings';
import { MessagePresentationAdapter } from './MessagePresentationAdapter';
import { ViewService } from './ViewService';
import {
  hasCustomPromptLine,
  requestComposerFocus,
} from '../utils/customPromptLine';

/**
 * Builds the prebuilt interface's implementation of every view port. The
 * container attaches the result when it boots a mount.
 */
function createViewBindings(serviceManager: ServiceManager): ViewBindings {
  const { store } = serviceManager;
  const viewService = new ViewService(serviceManager);
  return {
    messaging: new MessagePresentationAdapter({
      openHomeScreen: () => store.dispatch(actions.setHomeScreenIsOpen(true)),
      openHistoryResponsePanel: (local) => {
        store.dispatch(actions.setResponsePanelContent(local, true));
        store.dispatch(actions.setResponsePanelIsOpen(true));
      },
      getMessagesScrollBottom: () =>
        serviceManager.mainWindow?.getMessagesScrollBottom(),
      restoreMessagesScroll: (scrollBottom) =>
        serviceManager.mainWindow?.doAutoScroll({
          scrollToBottom: scrollBottom,
        }),
      announceSendFailure: () =>
        store.dispatch(
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
          const { languagePack } = store.getState();
          serviceManager.ariaAnnouncer(languagePack.input_sendingMessage);
        }
      },
      isHomeScreenOpen: () =>
        store.getState().persistedToBrowserStorage.homeScreenState
          .isHomeScreenOpen,
      closeHomeScreen: () => store.dispatch(actions.setHomeScreenIsOpen(false)),
      isResponsePanelOpen: () => store.getState().responsePanelState.isOpen,
      closeResponsePanel: () =>
        store.dispatch(actions.setResponsePanelIsOpen(false)),
    }),
    humanAgent: {
      requestFocus: () => {
        serviceManager.appWindow?.requestFocus();
      },
    },
    instance: {
      changeView: (newView, reason, tryHydrating, forceViewChange) =>
        viewService.changeView(newView, reason, tryHydrating, forceViewChange),
    },
  };
}

export { createViewBindings };
