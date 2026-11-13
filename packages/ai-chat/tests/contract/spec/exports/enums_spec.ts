/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Hosts compare against enum values (event types, reasons, test IDs), so each
 * enum and enum-like constant is pinned whole, in both entries: an added,
 * removed, renamed, or re-valued member fails here as one edited line.
 *
 * This file mounts no chat, so it doesn't call `contractSetup()`.
 */

import * as aiChatEntry from '../../../../src/aiChatEntry';
import * as serverEntry from '../../../../src/serverEntry';

const ENTRIES: [string, Record<string, unknown>][] = [
  ['aiChatEntry', aiChatEntry],
  ['serverEntry', serverEntry],
];

/**
 * An enum's own members. TypeScript adds a reverse entry (`1: 'CONNECTING'`)
 * for each numeric member; a host reads the forward ones, so only those are
 * pinned.
 */
function membersOf(value: unknown): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value as object).filter(([key]) => !/^\d+$/.test(key))
  );
}

/** One test per entry: `name` holds exactly these members and values. */
function pinMembers(name: string, expected: Record<string, unknown>): void {
  it.each(ENTRIES)(`%s.${name} has exactly these members`, (_, entry) => {
    expect(entry[name]).toBeInstanceOf(Object);
    expect(membersOf(entry[name])).toEqual(expected);
  });
}

// @covers export.aiChatEntry.PageObjectId export.serverEntry.PageObjectId
pinMembers('PageObjectId', {
  CHAT_HEADER: 'chat_header',
  HEADER_TITLE: 'header_title',
  HEADER_NAME: 'header_name',
  CHAT_WIDGET: 'chat_widget',
  CLOSE_CHAT: 'close_chat',
  LAUNCHER: 'launcher_open_chat',
  INPUT: 'input_field',
  INPUT_SEND: 'input_send',
  MAIN_PANEL: 'main_panel',
  DISCLAIMER_PANEL: 'disclaimer_panel',
  DISCLAIMER_ACCEPT_BUTTON: 'disclaimer_accept_button',
  HOME_SCREEN_PANEL: 'home_screen_panel',
  HYDRATING_PANEL: 'hydrating_panel',
  CATASTROPHIC_PANEL: 'catastrophic_panel',
  IFRAME_PANEL: 'iframe_panel',
  CONVERSATIONAL_SEARCH_CITATION_PANEL: 'conversational_search_citation_panel',
  CUSTOM_PANEL: 'custom_panel',
  BUTTON_RESPONSE_PANEL: 'button_response_panel',
});

// @covers export.aiChatEntry.ViewType export.serverEntry.ViewType
pinMembers('ViewType', {
  LAUNCHER: 'launcher',
  MAIN_WINDOW: 'mainWindow',
});

// @covers export.aiChatEntry.PanelType export.serverEntry.PanelType
pinMembers('PanelType', {
  DEFAULT: 'default',
  WORKSPACE: 'workspace',
  HISTORY: 'history',
});

// @covers export.aiChatEntry.WriteableElementName export.serverEntry.WriteableElementName
pinMembers('WriteableElementName', {
  AI_TOOLTIP_AFTER_DESCRIPTION_ELEMENT: 'aiTooltipAfterDescriptionElement',
  EXPLAINABILITY_POPOVER_CONTENT: 'explainabilityPopoverContent',
  EXPLAINABILITY_POPOVER_ACTIONS: 'explainabilityPopoverActions',
  WELCOME_NODE_BEFORE_ELEMENT: 'welcomeNodeBeforeElement',
  HEADER_BOTTOM_ELEMENT: 'headerBottomElement',
  HEADER_FIXED_ACTIONS_ELEMENT: 'headerFixedActionsElement',
  BEFORE_INPUT_ELEMENT: 'beforeInputElement',
  AFTER_INPUT_ELEMENT: 'afterInputElement',
  CUSTOM_PROMPT_LINE: 'customPromptLine',
  PROMPT_LINE_ACTIONS_END: 'promptLineActionsEnd',
  PROMPT_LINE_SEND_BUTTON_START: 'promptLineSendButtonStart',
  FOOTER_ELEMENT: 'footerElement',
  HOME_SCREEN_BEFORE_INPUT_ELEMENT: 'homeScreenBeforeInputElement',
  HOME_SCREEN_AFTER_STARTERS_ELEMENT: 'homeScreenAfterStartersElement',
  HOME_SCREEN_HEADER_BOTTOM_ELEMENT: 'homeScreenHeaderBottomElement',
  CUSTOM_PANEL_ELEMENT: 'customPanelElement',
  WORKSPACE_PANEL_ELEMENT: 'workspacePanelElement',
  HISTORY_PANEL_ELEMENT: 'historyPanelElement',
  CUSTOM_HEADER: 'customHeader',
});

// @covers export.aiChatEntry.LayoutCustomProperties export.serverEntry.LayoutCustomProperties
pinMembers('LayoutCustomProperties', {
  height: 'height',
  max_height: 'max-height',
  width: 'width',
  min_height: 'min-height',
  max_width: 'max-width',
  z_index: 'z-index',
  bottom_position: 'bottom-position',
  right_position: 'right-position',
  top_position: 'top-position',
  left_position: 'left-position',
  launcher_default_size: 'launcher-default-size',
  launcher_position_bottom: 'launcher-position-bottom',
  launcher_position_right: 'launcher-position-right',
  launcher_extended_width: 'launcher-extended-width',
  messages_max_width: 'messages-max-width',
  messages_min_width: 'messages-min-width',
  workspace_min_width: 'workspace-min-width',
  card_max_width: 'card-max-width',
  launcher_color_background: 'launcher-color-background',
  launcher_color_avatar: 'launcher-color-avatar',
  launcher_color_background_hover: 'launcher-color-background-hover',
  launcher_color_background_active: 'launcher-color-background-active',
  launcher_color_focus_border: 'launcher-color-focus-border',
  launcher_mobile_color_text: 'launcher-mobile-color-text',
  launcher_expanded_message_color_text: 'launcher-expanded-message-color-text',
  launcher_expanded_message_color_background:
    'launcher-expanded-message-color-background',
  launcher_expanded_message_color_background_hover:
    'launcher-expanded-message-color-background-hover',
  launcher_expanded_message_color_background_active:
    'launcher-expanded-message-color-background-active',
  launcher_expanded_message_color_focus_border:
    'launcher-expanded-message-color-focus-border',
  unread_indicator_color_background: 'unread-indicator-color-background',
  unread_indicator_color_text: 'unread-indicator-color-text',
  prompt_border: 'prompt-border',
});

// @covers export.aiChatEntry.CornersType export.serverEntry.CornersType
pinMembers('CornersType', {
  ROUND: 'round',
  SQUARE: 'square',
});

// @covers export.aiChatEntry.BusEventType export.serverEntry.BusEventType
// CLOSE_PANEL_BUTTON_TOGGLED is never fired (MAIN-NOTES M24); only the
// export is pinned.
pinMembers('BusEventType', {
  CLOSE_PANEL_BUTTON_TOGGLED: 'closePanelButton:toggled',
  PRE_RECEIVE: 'pre:receive',
  RECEIVE: 'receive',
  PRE_SEND: 'pre:send',
  SEND: 'send',
  VIEW_PRE_CHANGE: 'view:pre:change',
  VIEW_CHANGE: 'view:change',
  MESSAGE_ITEM_CUSTOM: 'messageItemCustom',
  USER_DEFINED_RESPONSE: 'userDefinedResponse',
  CUSTOM_FOOTER_SLOT: 'customFooterSlot',
  CUSTOM_REQUEST_FOOTER_SLOT: 'customRequestFooterSlot',
  HISTORY_BEGIN: 'history:begin',
  HISTORY_END: 'history:end',
  HISTORY_PANEL_NEW_CHAT: 'history:newChat',
  HISTORY_PANEL_PRE_OPEN: 'historyPanel:pre:open',
  PRE_RESTART_CONVERSATION: 'pre:restartConversation',
  RESTART_CONVERSATION: 'restartConversation',
  CHAT_READY: 'chat:ready',
  CUSTOM_PANEL_PRE_OPEN: 'customPanel:pre:open',
  CUSTOM_PANEL_OPEN: 'customPanel:open',
  CUSTOM_PANEL_PRE_CLOSE: 'customPanel:pre:close',
  CUSTOM_PANEL_CLOSE: 'customPanel:close',
  WORKSPACE_PRE_OPEN: 'workspace:pre:open',
  WORKSPACE_OPEN: 'workspace:open',
  WORKSPACE_PRE_CLOSE: 'workspace:pre:close',
  WORKSPACE_CLOSE: 'workspace:close',
  HUMAN_AGENT_PRE_RECEIVE: 'human_agent:pre:receive',
  HUMAN_AGENT_RECEIVE: 'human_agent:receive',
  HUMAN_AGENT_PRE_SEND: 'human_agent:pre:send',
  HUMAN_AGENT_SEND: 'human_agent:send',
  HUMAN_AGENT_PRE_START_CHAT: 'human_agent:pre:startChat',
  HUMAN_AGENT_PRE_END_CHAT: 'human_agent:pre:endChat',
  HUMAN_AGENT_END_CHAT: 'human_agent:endChat',
  HUMAN_AGENT_ARE_ANY_AGENTS_ONLINE: 'human_agent:areAnyAgentsOnline',
  CHUNK_USER_DEFINED_RESPONSE: 'chunk:userDefinedResponse',
  FEEDBACK: 'feedback',
  STOP_STREAMING: 'stopStreaming',
  STATE_CHANGE: 'state:change',
  DISCLAIMER_ACCEPTED: 'disclaimerAccepted',
  HEADER_MENU_CLICK: 'header:menuClick',
});

// @covers export.aiChatEntry.FeedbackInteractionType export.serverEntry.FeedbackInteractionType
pinMembers('FeedbackInteractionType', {
  DETAILS_OPENED: 'detailsOpened',
  DETAILS_CLOSED: 'detailsClosed',
  SUBMITTED: 'submitted',
});

// @covers export.aiChatEntry.HeaderMenuClickType export.serverEntry.HeaderMenuClickType
pinMembers('HeaderMenuClickType', {
  HOMESCREEN_BUTTON: 'homescreenButton',
  OVERFLOW_MENU_OPENED: 'overflowMenuOpened',
  OVERFLOW_MENU_ITEM: 'overflowMenuItem',
});

// @covers export.aiChatEntry.MessageSendSource export.serverEntry.MessageSendSource
pinMembers('MessageSendSource', {
  MESSAGE_INPUT: 'messageInput',
  HOME_SCREEN_INPUT: 'homeScreenInput',
  OPTION_BUTTON: 'optionButton',
  OPTION_DROP_DOWN: 'optionDropDown',
  HISTORY_UPDATE: 'historyUpdate',
  INSTANCE_SEND: 'instanceSend',
  DATE_PICKER: 'datePicker',
  POST_BACK_BUTTON: 'postBackButton',
  HOME_SCREEN_STARTER: 'homeScreenStarter',
  WELCOME_REQUEST: 'welcomeRequest',
  EVENT: 'event',
  OTHER: 'other',
});

// @covers export.aiChatEntry.ViewChangeReason export.serverEntry.ViewChangeReason
// MAIN_WINDOW_MINIMIZED is snake_case while the rest are camelCase: MAIN-NOTES M26
// (ruled: keep this value in 1.x, camelCase in 2.0.0).
pinMembers('ViewChangeReason', {
  WEB_CHAT_LOADED: 'webChatLoaded',
  LAUNCHER_CLICKED: 'launcherClicked',
  MAIN_WINDOW_MINIMIZED: 'main_window_minimized',
  CALLED_CHANGE_VIEW: 'calledChangeView',
});

// @covers export.aiChatEntry.CancellationReason export.serverEntry.CancellationReason
pinMembers('CancellationReason', {
  STOP_STREAMING: 'Stop streaming',
  CONVERSATION_RESTARTED: 'Conversation restarted',
  TIMEOUT: 'Request timeout',
});

// @covers export.aiChatEntry.MessageState export.serverEntry.MessageState
pinMembers('MessageState', {
  STREAMING: 'streaming',
  COMPLETE: 'complete',
  ERROR: 'error',
});

// @covers export.aiChatEntry.CarbonTheme export.serverEntry.CarbonTheme
pinMembers('CarbonTheme', {
  WHITE: 'white',
  G10: 'g10',
  G90: 'g90',
  G100: 'g100',
});

// @covers export.aiChatEntry.MinimizeButtonIconType export.serverEntry.MinimizeButtonIconType
pinMembers('MinimizeButtonIconType', {
  CLOSE: 'close',
  MINIMIZE: 'minimize',
  SIDE_PANEL_LEFT: 'side-panel-left',
  SIDE_PANEL_RIGHT: 'side-panel-right',
  SIDE_PANEL_DOWN: 'side-panel-down',
});

// @covers export.aiChatEntry.OnErrorType export.serverEntry.OnErrorType
pinMembers('OnErrorType', {
  MESSAGE_COMMUNICATION: 'MESSAGE_COMMUNICATION',
  RENDER: 'RENDER',
  INTEGRATION_ERROR: 'INTEGRATION_ERROR',
  HYDRATION: 'HYDRATION',
});

// @covers export.aiChatEntry.HumanAgentsOnlineStatus export.serverEntry.HumanAgentsOnlineStatus
pinMembers('HumanAgentsOnlineStatus', {
  ONLINE: 'online',
  OFFLINE: 'offline',
  UNKNOWN: 'unknown',
});

// @covers export.aiChatEntry.ErrorType export.serverEntry.ErrorType
pinMembers('ErrorType', {
  CONNECTING: 1,
  DISCONNECTED: 2,
  USER_MESSAGE: 3,
});

// @covers export.aiChatEntry.FileStatusValue export.serverEntry.FileStatusValue
pinMembers('FileStatusValue', {
  COMPLETE: 'complete',
  EDIT: 'edit',
  UPLOADING: 'uploading',
  SUCCESS: 'success',
});

// @covers export.aiChatEntry.ScreenShareState export.serverEntry.ScreenShareState
pinMembers('ScreenShareState', {
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  CANCELLED: 'cancelled',
  ENDED: 'ended',
});

// @covers export.aiChatEntry.ButtonItemKind export.serverEntry.ButtonItemKind
pinMembers('ButtonItemKind', {
  DEFAULT: 'default',
  SECONDARY: 'secondary',
  TERTIARY: 'tertiary',
  DANGER: 'danger',
  GHOST: 'ghost',
  LINK: 'link',
});

// @covers export.aiChatEntry.ButtonItemType export.serverEntry.ButtonItemType
pinMembers('ButtonItemType', {
  POST_BACK: 'post_back',
  CUSTOM_EVENT: 'custom_event',
  SHOW_PANEL: 'show_panel',
  URL: 'url',
});

// @covers export.aiChatEntry.IFrameItemDisplayOption export.serverEntry.IFrameItemDisplayOption
pinMembers('IFrameItemDisplayOption', {
  INLINE: 'inline',
  PANEL: 'panel',
});

// @covers export.aiChatEntry.MessageInputType export.serverEntry.MessageInputType
pinMembers('MessageInputType', {
  TEXT: 'text',
  EVENT: 'event',
});

// @covers export.aiChatEntry.MessageResponseTypes export.serverEntry.MessageResponseTypes
pinMembers('MessageResponseTypes', {
  TEXT: 'text',
  OPTION: 'option',
  CONNECT_TO_HUMAN_AGENT: 'connect_to_agent',
  IMAGE: 'image',
  PAUSE: 'pause',
  USER_DEFINED: 'user_defined',
  IFRAME: 'iframe',
  VIDEO: 'video',
  AUDIO: 'audio',
  DATE: 'date',
  INLINE_ERROR: 'inline_error',
  CARD: 'card',
  CAROUSEL: 'carousel',
  BUTTON: 'button',
  GRID: 'grid',
  CONVERSATIONAL_SEARCH: 'conversational_search',
  PREVIEW_CARD: 'preview_card',
  SYSTEM: 'system',
});

// @covers export.aiChatEntry.OptionItemPreference export.serverEntry.OptionItemPreference
pinMembers('OptionItemPreference', {
  DROPDOWN: 'dropdown',
  BUTTON: 'button',
});

// @covers export.aiChatEntry.SelectionDisplay export.serverEntry.SelectionDisplay
pinMembers('SelectionDisplay', {
  LABEL: 'label',
  INPUT_TEXT: 'input_text',
});

// @covers export.aiChatEntry.WidthOptions export.serverEntry.WidthOptions
pinMembers('WidthOptions', {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
});

// @covers export.aiChatEntry.HumanAgentMessageType export.serverEntry.HumanAgentMessageType
pinMembers('HumanAgentMessageType', {
  INLINE_ERROR: 'inline_error',
  FROM_HUMAN_AGENT: 'from_agent',
  FROM_USER: 'from_user',
  HUMAN_AGENT_LEFT_CHAT: 'agent_left_chat',
  HUMAN_AGENT_ENDED_CHAT: 'agent_ended_chat',
  HUMAN_AGENT_JOINED: 'agent_joined',
  RELOAD_WARNING: 'user_connected_warning',
  TRANSFER_TO_HUMAN_AGENT: 'transfer_to_agent',
  USER_ENDED_CHAT: 'user_ended_chat',
  CHAT_WAS_ENDED: 'chat_was_ended',
  DISCONNECTED: 'disconnected',
  RECONNECTED: 'reconnected',
  SHARING_REQUESTED: 'sharing_requested',
  SHARING_ACCEPTED: 'sharing_accepted',
  SHARING_DECLINED: 'sharing_declined',
  SHARING_CANCELLED: 'sharing_cancelled',
  SHARING_ENDED: 'sharing_ended',
  SYSTEM: 'system',
});

// @covers export.aiChatEntry.ChainOfThoughtStepStatus export.serverEntry.ChainOfThoughtStepStatus
pinMembers('ChainOfThoughtStepStatus', {
  PROCESSING: 'processing',
  FAILURE: 'failure',
  SUCCESS: 'success',
});

// @covers export.aiChatEntry.CHAT_BUTTON_KIND export.serverEntry.CHAT_BUTTON_KIND
pinMembers('CHAT_BUTTON_KIND', {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  TERTIARY: 'tertiary',
  GHOST: 'ghost',
  DANGER: 'danger',
  DANGER_PRIMARY: 'danger-primary',
  DANGER_TERTIARY: 'danger-tertiary',
  DANGER_GHOST: 'danger-ghost',
});

// @covers export.aiChatEntry.CHAT_BUTTON_SIZE export.serverEntry.CHAT_BUTTON_SIZE
pinMembers('CHAT_BUTTON_SIZE', {
  SMALL: 'sm',
  MEDIUM: 'md',
  LARGE: 'lg',
});

// @covers export.aiChatEntry.ReasoningStepOpenState export.serverEntry.ReasoningStepOpenState
pinMembers('ReasoningStepOpenState', {
  OPEN: 'open',
  CLOSE: 'close',
  DEFAULT: 'default',
});

// @covers export.aiChatEntry.UserType export.serverEntry.UserType
pinMembers('UserType', {
  HUMAN: 'human',
  BOT: 'bot',
  WATSONX: 'watsonx',
});

// @covers export.aiChatEntry.MessageErrorState export.serverEntry.MessageErrorState
pinMembers('MessageErrorState', {
  NONE: 1,
  FAILED: 2,
  FAILED_WHILE_STREAMING: 3,
  RETRYING: 4,
  WAITING: 5,
});
