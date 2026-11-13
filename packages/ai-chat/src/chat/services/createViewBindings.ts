/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ChatViewState } from './chatViewState';

import type { ViewBindings } from '../../sdk/services/viewBindings';

import { MessagePresentationAdapter } from './MessagePresentationAdapter';

import { ViewService } from './ViewService';

import { createLoadingCounters } from './loadingCounters';

import type { PortAnnouncement } from '../../sdk/services/messaging/presentationPort';

import type { AnnounceMessage } from '../../types/state/AnnounceMessage';

import {
  hasCustomPromptLine,
  requestComposerFocus,
} from '../utils/customPromptLine';

import { viewActions } from '../state';

import { chatStore } from './attachChatView';

/**
 * Builds the prebuilt interface's implementation of every view port. The
 * container attaches the result when it boots a mount. Members backed by the
 * shell's handles (focus, scroll, announcements, the input) read them from
 * this mount's view state on each call, so they do nothing before the shell
 * connects or after it releases. Store-backed members, such as changeView,
 * work as soon as the bindings attach.
 */
function createViewBindings(viewState: ChatViewState): ViewBindings {
  const { serviceManager } = viewState;
  const store = chatStore(serviceManager);
  const viewService = new ViewService(serviceManager);
  const counters = createLoadingCounters(store);
  const announce = (message: PortAnnouncement) =>
    // The port carries plain strings; these IDs come from the language pack.
    store.dispatch(viewActions.announceMessage(message as AnnounceMessage));
  return {
    messaging: new MessagePresentationAdapter({
      openHomeScreen: () =>
        store.dispatch(viewActions.setHomeScreenIsOpen(true)),
      openHistoryResponsePanel: (local) => {
        store.dispatch(viewActions.setResponsePanelContent(local, true));
        store.dispatch(viewActions.setResponsePanelIsOpen(true));
      },
      getMessagesScrollBottom: () =>
        viewState.mainWindow?.getMessagesScrollBottom(),
      restoreMessagesScroll: (scrollBottom) =>
        viewState.mainWindow?.doAutoScroll({
          scrollToBottom: scrollBottom,
        }),
      announceSendFailure: () =>
        store.dispatch(
          viewActions.announceMessage({ messageID: 'errors_ariaMessageFailed' })
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
        if (viewState.ariaAnnouncer) {
          const { languagePack } = store.getState();
          viewState.ariaAnnouncer(languagePack.input_sendingMessage);
        }
      },
      isHomeScreenOpen: () =>
        store.getState().view.persistedToBrowserStorage.homeScreenState
          .isHomeScreenOpen,
      closeHomeScreen: () =>
        store.dispatch(viewActions.setHomeScreenIsOpen(false)),
      isResponsePanelOpen: () =>
        store.getState().view.responsePanelState.isOpen,
      closeResponsePanel: () =>
        store.dispatch(viewActions.setResponsePanelIsOpen(false)),
      announce: (message) => announce(message),
      changeMessageLoadingCounter: (amount) =>
        counters.changeMessageLoadingCounter(amount),
      updateMessageLoadingCounter: (direction, message) =>
        counters.updateMessageLoadingCounter(direction, message),
      changeChatLoadingCounter: (amount) =>
        counters.changeChatLoadingCounter(amount),
      updateChatLoadingCounter: (direction) =>
        counters.updateChatLoadingCounter(direction),
    }),
    humanAgent: {
      requestFocus: () => {
        viewState.appWindow?.requestFocus();
      },
      announce,
      changeMessageLoadingCounter: counters.changeMessageLoadingCounter,
    },
    instance: {
      requestFocus: () => viewState.appWindow?.requestFocus() === true,
      doAutoScroll: (options) => viewState.mainWindow?.doAutoScroll?.(options),
      scrollToMessage: (messageID, animate) =>
        viewState.mainWindow?.doScrollToMessage(messageID, animate),
      input: () => viewState.inputComponent ?? null,
      hasCustomPromptLine: () => hasCustomPromptLine(serviceManager),
      isMainWindowOpen: () =>
        store.getState().view.persistedToBrowserStorage.viewState.mainWindow,
      showCatastrophicError: () =>
        store.dispatch(viewActions.setViewValue('catastrophicErrorType', true)),
      changeView: (newView, reason, tryHydrating, forceViewChange) =>
        viewService.changeView(newView, reason, tryHydrating, forceViewChange),
    },
  };
}

export { createViewBindings };
