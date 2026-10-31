/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { AppState } from '../../types/state/AppState';
import type { HeaderConfig } from '../../types/config/HeaderConfig';
import type {
  CustomPanelConfigOptions,
  DefaultCustomPanelConfigOptions,
} from '../../types/instance/apiTypes';
import type { ButtonItem } from '../../types/messaging/Messages';
import { BusEventType } from '../../types/events/eventBusTypes';
import { ScreenShareState } from '../../types/config/ServiceDeskConfig';
import { focusOnFirstFocusableElement } from './domUtils';

type PanelName =
  | 'error'
  | 'hydration'
  | 'disclaimer'
  | 'screenShare'
  | 'endChat'
  | 'custom'
  | 'response'
  | 'iframe'
  | 'citation'
  | 'history';

interface EndChatConfirmation {
  title?: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

interface PanelViewInputs {
  endChatConfirmation: EndChatConfirmation | null;
  showEndChatConfirmation: boolean;
  showScreenShareRequest: boolean;
  isHydratingComplete: boolean;
  shouldShowHydrationPanel: boolean;
  isHomeScreenActive: boolean;
  customPanelState: AppState['customPanelState'];
  historyPanelState: AppState['historyPanelState'];
  showDisclaimer: boolean;
  responsePanelState: AppState['responsePanelState'];
  responseHasMessage: boolean;
  iFramePanelState: AppState['iFramePanelState'];
  viewSourcePanelState: AppState['viewSourcePanelState'];
  isInputReadonly: boolean;
  catastrophicErrorPanelState: AppState['catastrophicErrorPanelState'];
  contentRevision: object;
}

type CustomPanelEventType =
  | BusEventType.CUSTOM_PANEL_PRE_OPEN
  | BusEventType.CUSTOM_PANEL_OPEN
  | BusEventType.CUSTOM_PANEL_PRE_CLOSE
  | BusEventType.CUSTOM_PANEL_CLOSE;

interface PanelCompositionCallbacks {
  onPanelOpenStart(isPanel: boolean): void;
  onPanelOpenEnd(event: CustomEvent): void;
  onPanelCloseStart(event: CustomEvent): void;
  onPanelCloseEnd(isPanel: boolean): void;
  onClose(): void;
  onRestart(): void;
  onToggleHomeScreen(): void;
  onAcceptDisclaimer(): void;
  confirmHumanAgentEndChat(): void;
  hideConfirmEndChat(): void;
  fireCustomPanelEvent(type: CustomPanelEventType): void;
  resetCustomPanelOptions(): void;
  closeCustomPanel(): void;
  closeResponsePanel(): void;
  clearResponsePanelContent(): void;
  closeIFramePanel(): void;
  closeViewSourcePanel(): void;
  closeHistoryPanel(): void;
  updateScreenShareRequest(state: ScreenShareState): void;
  announce(text: string): void;
}

function isCustomPanelConfigOptions(
  options: CustomPanelConfigOptions | DefaultCustomPanelConfigOptions
): options is CustomPanelConfigOptions {
  const legacy = options as Partial<CustomPanelConfigOptions>;
  return (
    typeof legacy.disableDefaultCloseAction === 'boolean' ||
    typeof legacy.hideCloseButton === 'boolean' ||
    typeof legacy.onClickBack === 'function' ||
    typeof legacy.onClickRestart === 'function' ||
    typeof legacy.onClickClose === 'function'
  );
}

function deriveCustomPanelComposition(
  options: CustomPanelConfigOptions | DefaultCustomPanelConfigOptions
) {
  const isLegacy = isCustomPanelConfigOptions(options);
  const legacy = isLegacy ? options : undefined;
  const openFromSide = Boolean(
    'openFromSide' in options && options.openFromSide
  );
  const headerConfigOverride: Partial<HeaderConfig> | undefined = isLegacy
    ? {
        hideMinimizeButton:
          typeof legacy.hideCloseButton === 'boolean'
            ? legacy.hideCloseButton
            : undefined,
        title: legacy.hideBackButton && legacy.title ? legacy.title : undefined,
      }
    : undefined;
  return {
    isLegacy,
    title: options.title,
    showPanelHeader: !('hidePanelHeader' in options && options.hidePanelHeader),
    showBackButton: !('hideBackButton' in options && options.hideBackButton),
    headerConfigOverride,
    fullWidth: Boolean('fullWidth' in options && options.fullWidth),
    showFrame: Boolean('showFrame' in options && options.showFrame),
    aiEnabled: Boolean('aiEnabled' in options && options.aiEnabled),
    showChatHeader: Boolean(
      !isLegacy && 'showChatHeader' in options && options.showChatHeader
    ),
    openFromSide,
    animationOnOpen: options.disableAnimation
      ? 'none'
      : openFromSide
        ? 'slide-in-from-start'
        : 'slide-in-from-bottom',
    animationOnClose: options.disableAnimation
      ? 'none'
      : openFromSide
        ? 'slide-out-to-start'
        : 'slide-out-to-bottom',
    backButtonType:
      'backButtonType' in options ? options.backButtonType : undefined,
    backButtonPosition:
      'backButtonPosition' in options ? options.backButtonPosition : undefined,
  };
}

function deriveResponsePanelComposition(
  state: PanelViewInputs['responsePanelState'],
  aiEnabled: boolean
) {
  const item = state.localMessageItem?.item as ButtonItem | undefined;
  const showFrame = item?.panel.show_frame;
  const useAiEnabled = item?.panel.ai_enabled;
  const showChatHeader = item?.panel.show_header;
  return {
    title: item?.panel.title,
    fullWidth: Boolean(item?.panel.full_width),
    showFrame: showFrame === undefined ? true : showFrame,
    aiEnabled: useAiEnabled === undefined ? aiEnabled : useAiEnabled,
    showChatHeader: showChatHeader === undefined ? true : showChatHeader,
    showPanelHeader: showChatHeader !== false,
  };
}

type EndChatPromptLabels = Pick<
  AppState['languagePack'],
  | 'agent_endChat'
  | 'agent_confirmCancelRequestTitle'
  | 'agent_confirmEndChat'
  | 'agent_confirmCancelRequestMessage'
  | 'agent_confirmEndChatNo'
  | 'agent_confirmEndSuspendedYes'
  | 'agent_confirmEndChatYes'
  | 'agent_confirmCancelRequestYes'
>;

function deriveEndChatPrompt(
  confirmation: Pick<EndChatConfirmation, 'title' | 'message'> | null,
  isConnected: boolean,
  isSuspended: boolean,
  labels: EndChatPromptLabels
) {
  const title =
    confirmation?.title ||
    (isConnected
      ? labels.agent_endChat
      : labels.agent_confirmCancelRequestTitle);
  const message =
    confirmation?.message ||
    (isConnected
      ? labels.agent_confirmEndChat
      : labels.agent_confirmCancelRequestMessage);
  return {
    title,
    message,
    cancelButtonLabel: labels.agent_confirmEndChatNo,
    confirmButtonLabel: isSuspended
      ? labels.agent_confirmEndSuspendedYes
      : isConnected
        ? labels.agent_confirmEndChatYes
        : labels.agent_confirmCancelRequestYes,
    announceMessage: message,
  };
}

function deriveScreenSharePrompt(
  labels: Pick<
    AppState['languagePack'],
    | 'agent_sharingRequestTitle'
    | 'agent_sharingRequestMessage'
    | 'agent_sharingDeclineButton'
    | 'agent_sharingAcceptButton'
  >
) {
  return {
    title: labels.agent_sharingRequestTitle,
    message: labels.agent_sharingRequestMessage,
    cancelButtonLabel: labels.agent_sharingDeclineButton,
    confirmButtonLabel: labels.agent_sharingAcceptButton,
    announceMessage: labels.agent_sharingRequestMessage,
  };
}

function createPanelTransitionCallbacks(
  name: Exclude<PanelName, 'error' | 'screenShare' | 'endChat'>,
  callbacks: PanelCompositionCallbacks
) {
  const isPanel = name !== 'hydration' && name !== 'disclaimer';
  return {
    onOpenStart: () => {
      if (name === 'custom') {
        callbacks.fireCustomPanelEvent(BusEventType.CUSTOM_PANEL_PRE_OPEN);
      }
      callbacks.onPanelOpenStart(isPanel);
    },
    onOpenEnd: (event: CustomEvent) => {
      if (name === 'custom') {
        callbacks.fireCustomPanelEvent(BusEventType.CUSTOM_PANEL_OPEN);
      }
      callbacks.onPanelOpenEnd(event);
    },
    onCloseStart: (event: CustomEvent) => {
      if (name === 'custom') {
        callbacks.fireCustomPanelEvent(BusEventType.CUSTOM_PANEL_PRE_CLOSE);
      }
      callbacks.onPanelCloseStart(event);
    },
    onCloseEnd: () => {
      if (name === 'custom') {
        callbacks.fireCustomPanelEvent(BusEventType.CUSTOM_PANEL_CLOSE);
        callbacks.resetCustomPanelOptions();
      }
      callbacks.onPanelCloseEnd(isPanel);
      if (name === 'response') {
        callbacks.clearResponsePanelContent();
      }
      if (name === 'history') {
        callbacks.closeHistoryPanel();
      }
    },
  };
}

function createCustomPanelActions(
  options: CustomPanelConfigOptions | DefaultCustomPanelConfigOptions,
  callbacks: PanelCompositionCallbacks
) {
  const legacy = isCustomPanelConfigOptions(options) ? options : undefined;
  return {
    onClose: () => {
      if (!legacy?.disableDefaultCloseAction) {
        callbacks.onClose();
      }
      legacy?.onClickClose?.();
    },
    onRestart: () => {
      callbacks.onRestart();
      legacy?.onClickRestart?.();
    },
    onClickBack: () => {
      callbacks.closeCustomPanel();
      if ('onClickBack' in options) {
        options.onClickBack?.();
      }
    },
  };
}

function createEndChatActions(
  confirmation: EndChatConfirmation | null,
  callbacks: PanelCompositionCallbacks
) {
  return {
    onConfirm: confirmation?.onConfirm ?? callbacks.confirmHumanAgentEndChat,
    onCancel: confirmation?.onCancel ?? callbacks.hideConfirmEndChat,
  };
}

function createScreenShareActions(callbacks: PanelCompositionCallbacks) {
  return {
    onConfirm: () =>
      callbacks.updateScreenShareRequest(ScreenShareState.ACCEPTED),
    onCancel: () =>
      callbacks.updateScreenShareRequest(ScreenShareState.DECLINED),
  };
}

function focusPanelBodyBeforeHeader(
  body?: HTMLElement,
  header?: HTMLElement
): boolean {
  if (body && focusOnFirstFocusableElement(body)) {
    return true;
  }
  return Boolean(header && focusOnFirstFocusableElement(header));
}

function handleConfirmationOpen(
  event: CustomEvent<{ isReactivation?: boolean }>,
  footer: HTMLElement | null,
  announceMessage: string,
  announce: (text: string) => void
): void {
  if (!event.detail?.isReactivation) {
    focusOnFirstFocusableElement(footer);
    announce(announceMessage);
  }
}

function handleConfirmationKey(
  event: KeyboardEvent,
  onCancel: () => void
): void {
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    onCancel();
  }
}

export type { PanelName, PanelViewInputs, PanelCompositionCallbacks };
export {
  isCustomPanelConfigOptions,
  deriveCustomPanelComposition,
  deriveResponsePanelComposition,
  deriveEndChatPrompt,
  deriveScreenSharePrompt,
  createPanelTransitionCallbacks,
  createCustomPanelActions,
  createEndChatActions,
  createScreenShareActions,
  focusPanelBodyBeforeHeader,
  handleConfirmationOpen,
  handleConfirmationKey,
};
