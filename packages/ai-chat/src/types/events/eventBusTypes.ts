/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This file contains the type definitions for the event bus.
 */

import { DeepPartial } from "ts-essentials";

import {
  AgentProfile,
  ButtonItem,
  GenericItem,
  Message,
  MessageRequest,
  MessageResponse,
  PartialOrCompleteItemChunk,
  TourStepGenericItem,
} from "../messaging/Messages";
import { FileUpload, ViewState } from "../instance/apiTypes";
import { AgentsOnlineStatus } from "../config/ServiceDeskConfig";

/** @category Events */
export enum BusEventType {
  /**
   * When a panel has been closed.
   */
  CLOSE_PANEL_BUTTON_TOGGLED = "closePanelButton:toggled",

  /**
   * Fired before a message is received. Can take mutations to the message.
   */
  PRE_RECEIVE = "pre:receive",

  /**
   * Fired after a message is received.
   */
  RECEIVE = "receive",

  /**
   * Fired before a message is sent to customSendMessage. Can take mutations to the message.
   */
  PRE_SEND = "pre:send",

  /**
   * Fired after the message is sent to customSendMessage.
   */
  SEND = "send",

  /**
   * Fired before the view changes (e.g. when the chat window closes).
   */
  VIEW_PRE_CHANGE = "view:pre:change",

  /**
   * Fired after the view changes (e.g. when the chat window closes).
   */
  VIEW_CHANGE = "view:change",

  MESSAGE_ITEM_CUSTOM = "messageItemCustom",

  /**
   * Fired when a userDefined message is received.
   */
  USER_DEFINED_RESPONSE = "userDefinedResponse",

  /**
   * Fired when history begins to load.
   */
  HISTORY_BEGIN = "history:begin",

  /**
   * Fired after history is loaded.
   */
  HISTORY_END = "history:end",

  /**
   * Fired before a conversation restarts.
   */
  PRE_RESTART_CONVERSATION = "pre:restartConversation",

  /**
   * Fired after a conversation restarts.
   */
  RESTART_CONVERSATION = "restartConversation",

  /**
   * When the chat has finished hydrating from history or welcome node request.
   */
  CHAT_READY = "chat:ready",

  /**
   * Fired before a custom panel opens.
   */
  CUSTOM_PANEL_PRE_OPEN = "customPanel:pre:open",

  /**
   * Fired after a custom panel opens.
   */
  CUSTOM_PANEL_OPEN = "customPanel:open",

  /**
   * Fired before a custom panel closes.
   */
  CUSTOM_PANEL_PRE_CLOSE = "customPanel:pre:close",

  /**
   * Fired after a custom panel closes.
   */
  CUSTOM_PANEL_CLOSE = "customPanel:close",

  /**
   * Fired when a tour starts.
   */
  TOUR_START = "tour:start",

  /**
   * Fired when a tour ends.
   */
  TOUR_END = "tour:end",

  /**
   * Fired when a tour moves to the next step.
   */
  TOUR_STEP = "tour:step",

  /**
   * This event is fired before Carbon AI chat processes a message received from a human agent from a service desk.
   * You can use this to filter messages before they are displayed to the end user.
   */
  AGENT_PRE_RECEIVE = "agent:pre:receive",

  /**
   * This event is fired after Carbon AI chat processes a message received from a human agent from a service desk.
   * You can use this to update your history store.
   */
  AGENT_RECEIVE = "agent:receive",

  /**
   * This event is fired before Carbon AI chat sends a message to a human agent from a service desk.
   * You can use this to filter messages before they are sent to the agent.
   */
  AGENT_PRE_SEND = "agent:pre:send",

  /**
   * This event is fired after Carbon AI chat sends a message to a human agent from a service desk.
   * You can use this to update your history store.
   */
  AGENT_SEND = "agent:send",

  /**
   * This event is fired before a chat with a service desk has started. This occurs as soon as the user clicks the
   * "Request agent" button and before any attempt is made to communicate with the service desk.
   */
  AGENT_PRE_START_CHAT = "agent:pre:startChat",

  /**
   * This event is fired before a chat with an agent is ended. This occurs after the user has selected "Yes" from the
   * confirmation modal but it can also be fired if the chat is ended by the agent. Note that this is not fired if a
   * request for an agent is cancelled. The agent:endChat event however is fired in that case.
   */
  AGENT_PRE_END_CHAT = "agent:pre:endChat",

  /**
   * This event is fired after a chat with an agent has ended. This is fired after {@link BusEventType.AGENT_PRE_END_CHAT} but
   * can be fired both from the user leaving the chat or the agent ending the chat.
   */
  AGENT_END_CHAT = "agent:endChat",

  /**
   * This event is fired after Carbon AI chat calls "areAnyAgentsOnline" for a service desk. It will report the value returned
   * from that call. This is particularly useful if some custom code wants to take action if no agents are online.
   */
  AGENT_ARE_ANY_AGENTS_ONLINE = "agent:areAnyAgentsOnline",

  /**
   * Fired when a new chunk in a user_defined response comes through.
   */
  CHUNK_USER_DEFINED_RESPONSE = "chunk:userDefinedResponse",

  /**
   * This event is fired when the user interacts with the feedback controls on a message. This includes both the feedback
   * buttons (thumbs up/down) as well as the details popup where the user can submit additional information.
   */
  FEEDBACK = "feedback",

  /**
   * This event is fired when the "stop streaming" button in the input field is clicked.
   */
  STOP_STREAMING = "stopStreaming",
}

/**
 * The possible reasons why the view may be changed.
 *
 * @category Events
 */
export enum ViewChangeReason {
  /**
   * Indicates the Carbon AI chat has loaded for the first time and a view is trying to open. If openChatByDefault is
   * true then the main window will be trying to open, otherwise the launcher will be trying to open.
   */
  WEB_CHAT_LOADED = "webChatLoaded",

  /**
   * Indicates the user clicked on our built-in launcher button that opened either a tour or the main window.
   */
  LAUNCHER_CLICKED = "launcherClicked",

  /**
   * Indicates the main window was opened from a tour.
   */
  TOUR_OPENED_OTHER_VIEW = "tourOpenedOtherView",

  /**
   * Indicates the {@link ChatInstance.restartConversation} method was used while a tour was visible.
   */
  CALLED_RESTART_CONVERSATION = "calledRestartConversation",

  /**
   * Indicates the user clicked on our built-in minimize button that closed to either the launcher or a tour.
   */
  MAIN_WINDOW_MINIMIZED = "mainWindowMinimized",

  /**
   * Indicates a tour was started by the start tour button in the main window.
   */
  TOUR_CARD_STARTED_TOUR = "tourCardStartedTour",

  /**
   * Indicates a tour was resumed by the resume button in the main window.
   */
  TOUR_CARD_RESUMED_TOUR = "tourCardResumedTour",

  /**
   * Indicates a tour was restarted by the restart button in the main window.
   */
  TOUR_CARD_RESTARTED_TOUR = "tourCardRestartedTour",

  /**
   * Indicates a tour was started by the startTour instance method.
   */
  CALLED_START_TOUR = "calledStartTour",

  /**
   * Indicates a tour was started by a tour response type that included the 'skip_card' flag.
   */
  TOUR_SKIP_CARD = "tourSkipCard",

  /**
   * Indicates the user clicked the close and restart button that minimized to the launcher.
   */
  MAIN_WINDOW_CLOSED_AND_RESTARTED = "mainWindowClosedAndRestarted",

  /**
   * Indicates the user clicked on the minimize button within the tour to close to the launcher.
   */
  TOUR_MINIMIZED = "tourMinimized",

  /**
   * Indicates the close button was used to close a tour.
   */
  TOUR_CLOSED = "tourClosed",

  /**
   * Indicates the done button was used to close a tour.
   */
  TOUR_DONE = "tourDone",

  /**
   * Indicates the view was changed by a call to {@link ChatInstance.changeView}.
   */
  CALLED_CHANGE_VIEW = "calledChangeView",

  /**
   * Indicates the ChatInstance.tours.endTour method was used to close a tour.
   */
  CALLED_END_TOUR = "calledEndTour",
}

/**
 * The different sources that can cause a send event to occur.
 *
 * @category Events
 */
export enum MessageSendSource {
  /**
   * The user has entered a value from the main input on the message list.
   */
  MESSAGE_INPUT = "messageInput",

  /**
   * The user has entered a value from the input on the home screen.
   */
  HOME_SCREEN_INPUT = "homeScreenInput",

  /**
   * The user clicked a button from an option response.
   */
  OPTION_BUTTON = "optionButton",

  /**
   * The user selected a value from a dropdown for an option response.
   */
  OPTION_DROP_DOWN = "optionDropDown",

  /**
   * The message was sent as an automatic re-send when Carbon AI chat is loaded. This occurs when Carbon AI chat sees that the
   * last message request did not receive a response.
   */
  HYDRATE_RESEND = "hydrateResend",

  /**
   * The message was sent as an event history update.
   */
  HISTORY_UPDATE = "historyUpdate",

  /**
   * An external call to the public "instance.send" method was made.
   */
  INSTANCE_SEND = "instanceSend",

  /**
   * The user chose a value from the date picker.
   */
  DATE_PICKER = "datePicker",

  /**
   * The user clicked a post back button from a button response.
   */
  POST_BACK_BUTTON = "postBackButton",

  /**
   * The user clicked a starter from the home screen.
   */
  HOME_SCREEN_STARTER = "homeScreenStarter",

  /**
   * The startTour method has called.
   */
  START_TOUR_METHOD = "startTourMethod",

  /**
   * A default request for the welcome message was made.
   */
  WELCOME_REQUEST = "welcomeRequest",

  /**
   * This is used for message events.
   */
  EVENT = "event",

  /**
   * Some other source.
   */
  OTHER = "other",
}

/**
 * The possible reasons why a tour could be started. Purposefully not firing this event when the restart button is
 * clicked.
 *
 * @category Events
 */
export enum TourStartReason {
  /**
   * If the startTour instance method was used to start the tour.
   */
  START_TOUR_METHOD = "start_tour_method",

  /**
   * If the skip_card property was true within the tour json.
   */
  SKIP_CARD = "skip_card",

  /**
   * If the user clicked the tour card's start button.
   */
  START_TOUR_CLICKED = "start_tour_clicked",
}

/**
 * The possible reasons why a tour could have ended. Purposefully not firing this event when the close button is clicked
 * or the endTour instance method is used.
 *
 * @category Events
 */
export enum TourEndReason {
  /**
   * If the user clicked the done button.
   */
  DONE_CLICKED = "done_clicked",
}

/**
 * The discriminating union of all the possible bus event types.
 * @category Events
 */
export interface BusEvent {
  /**
   * The type of this event.
   */
  type: BusEventType;
}

/**
 *
 *
 * @category Events
 */
export interface BusEventClosePanelButtonClicked extends BusEvent {
  type: BusEventType.CLOSE_PANEL_BUTTON_TOGGLED;
}

/**
 * @category Events
 */
export interface BusEventPreReceive extends BusEvent {
  type: BusEventType.PRE_RECEIVE;
  data: MessageResponse;
}

/**
 * @category Events
 */
export interface BusEventReceive extends BusEvent {
  type: BusEventType.RECEIVE;
  data: MessageResponse;
}

/**
 * @category Events
 */
export interface BusEventPreSend extends BusEvent {
  type: BusEventType.PRE_SEND;
  data: MessageRequest;

  /**
   * The source of the message being sent.
   */
  source: MessageSendSource;
}

/**
 * @category Events
 */
export interface BusEventSend extends BusEvent {
  type: BusEventType.SEND;
  data: MessageRequest;

  /**
   * The source of the message being sent.
   */
  source: MessageSendSource;
}

/**
 * @category Service desk
 */
export interface BusEventAgentPreReceive extends BusEvent {
  type: BusEventType.AGENT_PRE_RECEIVE;
  data: MessageResponse;
  agentProfile?: AgentProfile;
}

/**
 * @category Service desk
 */
export interface BusEventAgentReceive extends BusEvent {
  type: BusEventType.AGENT_RECEIVE;
  data: MessageResponse;
  agentProfile?: AgentProfile;
}

/**
 * @category Service desk
 */
export interface BusEventAgentPreSend extends BusEvent {
  type: BusEventType.AGENT_PRE_SEND;
  data: MessageRequest;
  files: FileUpload[];
}

/**
 * @category Service desk
 */
export interface BusEventAgentSend extends BusEvent {
  type: BusEventType.AGENT_SEND;
  data: MessageRequest;
  files: FileUpload[];
}

/**
 * @category Events
 */
export interface BusEventViewPreChange extends BusEvent {
  type: BusEventType.VIEW_PRE_CHANGE;

  /**
   * The reason the view is changing.
   */
  reason: ViewChangeReason;

  /**
   * The previous view state before this event.
   */
  oldViewState: ViewState;

  /**
   * The new view state that Carbon AI chat is going to switch to. This new state can be changed by the event handler.
   */
  newViewState: ViewState;

  /**
   * This is used by the event handler to indicate that the view change should be cancelled and Carbon AI chat's view should
   * not be changed.
   */
  cancelViewChange: boolean;
}

/**
 * @category Events
 */
export interface BusEventViewChange extends BusEvent {
  type: BusEventType.VIEW_CHANGE;

  /**
   * The reason the view is changing.
   */
  reason: ViewChangeReason;

  /**
   * The previous view state from before the view:pre:change event.
   */
  oldViewState: ViewState;

  /**
   * The new view state that Carbon AI chat has switched to. This new state can be changed by the event handler.
   */
  newViewState: ViewState;

  /**
   * This is used by the event handler to indicate that the view change should be cancelled and Carbon AI chat's view should
   * not be changed. Since the view has already changed when this event is fired, this property will cause the view to
   * change back. Note that the view change events are *not* fired when the view changes back.
   */
  cancelViewChange: boolean;
}

/**
 * @category Events
 */
export interface BusEventReset extends BusEvent {
  type: BusEventType.RESTART_CONVERSATION;
}

/**
 * @category Events
 */
export interface BusEventChatReady extends BusEvent {
  type: BusEventType.CHAT_READY;
}

/**
 * @category Events
 */
export interface BusEventPreReset extends BusEvent {
  type: BusEventType.PRE_RESTART_CONVERSATION;
}

/**
 * This describes a custom event that can be authored with the button response type of type "option". When clicked,
 * this event will fire and provide information authored in the custom event.
 *
 * @category Events
 */
export interface BusEventMessageItemCustom extends BusEvent {
  type: BusEventType.MESSAGE_ITEM_CUSTOM;

  /**
   * The button item that triggered this custom event.
   */
  messageItem: ButtonItem;

  /**
   * The full message response that contained the button item that triggered this custom event.
   */
  fullMessage: MessageResponse;
}

/**
 * Used to populate user_defined responses. Please see the React or web component documentation as usage of this
 * differs based on implementation.
 *
 * @category Events
 */
export interface BusEventUserDefinedResponse extends BusEvent {
  type: BusEventType.USER_DEFINED_RESPONSE;
  data: {
    /**
     * The individual message item that is being displayed in this custom response.
     */
    message: GenericItem;

    /**
     * The full message (response or request) that contains the message item.
     */
    fullMessage: Message;

    /**
     * The element to which customers can add the custom code to render for the custom response.
     */
    element?: HTMLElement;

    /**
     * The slot name for users of the web components cds-aichat-container or cds-aichat-custom-element.
     */
    slot?: string;
  };
}

/**
 * @category Events
 */
export interface BusEventChunkUserDefinedResponse extends BusEvent {
  type: BusEventType.CHUNK_USER_DEFINED_RESPONSE;
  data: {
    /**
     * The individual message item that is being displayed in this custom response.
     */
    messageItem: DeepPartial<GenericItem>;

    /**
     * The full chunk that contained the user defined response.
     */
    chunk: PartialOrCompleteItemChunk;

    /**
     * The element to which customers can add the custom code to render for the custom response.
     */
    element?: HTMLElement;

    /**
     * The slot name for users of the web components cds-aichat-container or cds-aichat-custom-element.
     */
    slot?: string;
  };
}

/**
 * The event is fired whenever the widget begins processing a list of messages that have been loaded from history.
 * This event may be fired not only when the history is first loaded but it may be fired later during the life of
 * the widget if additional messages are loaded from history.
 *
 * This event is fired when this process begins. This is fired before all the "pre:receive" and "receive" events are
 * fired which means that the messages here are the original messages before any possible modifications by the event
 * handlers.
 *
 * @category Events
 */
export interface BusEventHistoryBegin extends BusEvent {
  /**
   * The discriminating type of this event.
   */
  type: BusEventType.HISTORY_BEGIN;

  /**
   * The list of all the messages that are being loaded by this history event.
   */
  messages: Message[];

  /**
   * Indicates that modifications were made to the given messages and that updates to those messages should be saved in
   * the history store. This is similar to the update behavior of the "pre:receive" event that is handled
   * automatically.
   */
  updateMessageIDs?: string[];
}

/**
 * The event is fired whenever the widget begins processing a list of messages that have been loaded from history.
 * This event may be fired not only when the history is first loaded but it may be fired later during the life of
 * the widget if additional messages are loaded from history.
 *
 * This event is fired when this process ends. This is fired after all the "pre:receive" and "receive" events are
 * fired which means that the messages here are the potentially modified messages after any possible modifications
 * by the event handlers.
 *
 * @category Events
 */
export interface BusEventHistoryEnd extends BusEvent {
  /**
   * The discriminating type of this event.
   */
  type: BusEventType.HISTORY_END;

  /**
   * The list of all the messages that were loaded by this history event.
   */
  messages: Message[];
}

/**
 * @category Events
 */
export interface BusEventCustomPanelPreOpen extends BusEvent {
  type: BusEventType.CUSTOM_PANEL_PRE_OPEN;
}

/**
 * @category Events
 */
export interface BusEventCustomPanelOpen extends BusEvent {
  type: BusEventType.CUSTOM_PANEL_OPEN;
}

/**
 * @category Events
 */
export interface BusEventCustomPanelPreClose extends BusEvent {
  type: BusEventType.CUSTOM_PANEL_PRE_CLOSE;
}

/**
 * @category Events
 */
export interface BusEventCustomPanelClose extends BusEvent {
  type: BusEventType.CUSTOM_PANEL_CLOSE;
}

/**
 * Fired when a tour is started. The tour could be started upon receipt of a tour message with skip_card true, when a
 * developer used the startTour instance method, or when the start tour card is clicked by the user.
 * Purposefully not firing this event when the restart button is clicked.
 *
 * @category Events
 */
export interface BusEventTourStart extends BusEvent {
  type: BusEventType.TOUR_START;

  /**
   * The reason for the tour starting.
   */
  reason: TourStartReason;
}

/**
 * Fired when the tour is ended by clicking the done button at the end of the tour. Purposefully not firing this event
 * when the close button is clicked or the endTour instance method is used.
 *
 * @category Events
 */
export interface BusEventTourEnd extends BusEvent {
  type: BusEventType.TOUR_END;

  /**
   * The reason for the tour ending.
   */
  reason: TourEndReason;
}

/**
 * Fired when a new step is shown to the user. This could be caused by a tour starting/restarting, the user clicking the
 * next or previous buttons within the tour, or by a developer calling the goToNextStep or goToStep
 * instance methods. Purposefully not firing this event when a tour is resumed.
 *
 * @category Events
 */
export interface BusEventTourStep extends BusEvent {
  type: BusEventType.TOUR_STEP;

  /**
   * The details of the new step item.
   */
  step: TourStepGenericItem;
}

/**
 * This event is fired before the user is connected to a service desk. This occurs as soon as the user clicks the
 * "Request agent" button and before any attempt is made to communicate with the service desk.
 *
 * @category Service desk
 */
export interface BusEventAgentPreStartChat<TPayloadType = unknown>
  extends BusEvent {
  /**
   * The type of the event.
   */
  type: BusEventType.AGENT_PRE_START_CHAT;

  /**
   * The message that was used to trigger the connection to the agent.
   */
  message: MessageResponse;

  /**
   * This flag can be set by a listener to indicate that the connection process should be cancelled.
   */
  cancelStartChat?: boolean;

  /**
   * Some arbitrary payload of data that will be passed to the service desk when a chat is started.
   */
  preStartChatPayload?: TPayloadType;
}

/**
 * This event is fired before a chat with an agent is ended. This occurs after the user has selected "Yes" from the
 * confirmation modal but it can also be fired if the chat is ended by the agent.
 *
 * @category Service desk
 */
export interface BusEventAgentPreEndChat<TPayloadType = unknown>
  extends BusEvent {
  /**
   * The type of the event.
   */
  type: BusEventType.AGENT_PRE_END_CHAT;

  /**
   * Indicates if the chat was ended by the agent.
   */
  endedByAgent: boolean;

  /**
   * An arbitrary payload object that a listener may set. This payload will be passed to the service desk
   * ServiceDesk endChat function.
   */
  preEndChatPayload: TPayloadType;

  /**
   * This value may be set by a listener to indicate that the process of ending the chat should be cancelled.
   */
  cancelEndChat: boolean;
}

/**
 * This event is fired after a chat with an agent has ended. This is fired after {@link BusEventType.AGENT_PRE_END_CHAT} but
 * can be fired both from the user leaving the chat or the agent ending the chat.
 *
 * @category Service desk
 */
export interface BusEventAgentEndChat extends BusEvent {
  /**
   * The type of the event.
   */
  type: BusEventType.AGENT_END_CHAT;

  /**
   * Indicates if the chat was ended by the agent.
   */
  endedByAgent: boolean;

  /**
   * Indicates if the chat was ended because the request for an agent was cancelled or an error occurred while
   * starting the chat. This means the start never fully started.
   */
  requestCancelled: boolean;
}

/**
 * This event is fired after Carbon AI chat calls "areAnyAgentsOnline" for a service desk. It will report the value returned
 * from that call. This is particularly useful if some custom code wants to take action if no agents are online.
 *
 * @category Service desk
 */
export interface BusEventAgentAreAnyAgentsOnline extends BusEvent {
  /**
   * The type of the event.
   */
  type: BusEventType.AGENT_ARE_ANY_AGENTS_ONLINE;

  /**
   * The result that was returned from "areAnyAgentsOnline". If an error occurred, this will be
   * {@link AgentsOnlineStatus.OFFLINE}.
   */
  areAnyAgentsOnline: AgentsOnlineStatus;
}

/**
 * The ways the user may interact with the feedback controls.
 *
 * @category Events
 */
export enum FeedbackInteractionType {
  /**
   * Indicates the details popup was opened after the user clicked one of the feedback buttons.
   */
  DETAILS_OPENED = "detailsOpened",

  /**
   * Indicates the details popup was closed after the user clicked the "X" button to close it or if the user clicked the
   * feedback button that opened it.
   */
  DETAILS_CLOSED = "detailsClosed",

  /**
   * Indicates feedback was submitted. This includes both when the details panel is open and submitted as well as when
   * the user clicks a feedback button and the details are not shown.
   */
  SUBMITTED = "submitted",
}

/**
 * This event is fired when the user interacts with the feedback controls on a message. This includes both the feedback
 * buttons (thumbs up/down) as well as the details popup where the user can submit additional information.
 *
 * @category Events
 */
export interface BusEventFeedback extends BusEvent {
  /**
   * The message item for which feedback was provided.
   */
  messageItem: GenericItem;

  /**
   * The message for which feedback was provided.
   */
  message: MessageResponse;

  /**
   * Indicates if the user is providing positive or negative feedback.
   */
  isPositive: boolean;

  /**
   * The type of interaction the user had with the feedback.
   */
  interactionType: FeedbackInteractionType;

  /**
   * When submitting feedback details, this is the text the user entered into the text field (if visible).
   */
  text?: string;

  /**
   * When submitting feedback details, this is the list of categories the user selected (if visible).
   */
  categories?: string[];
}

/**
 * The possible reasons why the chat window may be opened.
 *
 * @category Events
 */
export enum MainWindowOpenReason {
  /**
   * Indicates the user clicked on our built-in launcher button that opened the main window.
   */
  DEFAULT_LAUNCHER = "default_launcher",

  /**
   * Indicates the main window was opened because {@link PublicConfig.openChatByDefault} was set to true.
   */
  OPEN_BY_DEFAULT = "open_by_default",

  /**
   * Indicates the main window was opened as a result of session history.
   */
  SESSION_HISTORY = "session_history",

  /**
   * Indicates the main window was opened from a tour.
   *
   * @deprecated This reason is unclear so it's no longer being used. window:open events that used this reason will now
   * use the {@link TOUR_OPENED_OTHER_VIEW} reason instead. Since this reason was only added for beta tours we're
   * ok with removing it without a major release.
   */
  FROM_TOUR = "from_tour",

  /**
   * Indicates the main window was opened from a tour.
   */
  TOUR_OPENED_OTHER_VIEW = "tour_opened_other_view",

  /**
   * Indicates the {@link ChatInstance.restartConversation} method was used while a tour was visible.
   */
  CALLED_RESTART_CONVERSATION = "called_restart_conversation",
}

/**
 * The possible reasons why the chat window may be closed.
 *
 * @category Events
 */
export enum MainWindowCloseReason {
  /**
   * Indicates the user clicked on our built-in minimize button that closed to the launcher.
   */
  DEFAULT_MINIMIZE = "default_minimize",

  /**
   * Indicates the main window was closed to open a tour. This either happens when a tour is started from a TourCard, or
   * when the main window is closed with the minimize button, or the {@link ChatInstance.closeWindow}
   * function, and there's an active tour to be shown.
   *
   * @deprecated This reason is unclear and was being used for many different scenarios so it's been removed.
   * window:close events that used this reason now use one of the following reasons; {@link TOUR_CARD_STARTED_TOUR},
   * {@link TOUR_CARD_RESUMED_TOUR}, {@link TOUR_CARD_RESTARTED_TOUR}, {@link CALLED_START_TOUR}, and
   * {@link TOUR_SKIP_CARD}. Since this reason was only added for beta tours we're ok with removing it without a major
   * release.
   */
  OPEN_TOUR = "open_tour",

  /**
   * Indicates a tour was started by the start tour button in the main window.
   */
  TOUR_CARD_STARTED_TOUR = "tour_card_started_tour",

  /**
   * Indicates a tour was resumed by the resume button in the main window.
   */
  TOUR_CARD_RESUMED_TOUR = "tour_card_resumed_tour",

  /**
   * Indicates a tour was restarted by the restart button in the main window.
   */
  TOUR_CARD_RESTARTED_TOUR = "tour_card_restarted_tour",

  /**
   * Indicates a tour was started by the {@link startTour} instance method.
   */
  CALLED_START_TOUR = "called_start_tour",

  /**
   * Indicates a tour was started by a tour response type that included the 'skip_card' flag.
   */
  TOUR_SKIP_CARD = "tour_skip_card",

  /**
   * Indicates the user clicked the close and restart button that minimized to the launcher.
   */
  MAIN_WINDOW_CLOSED_AND_RESTARTED = "main_window_closed_and_restarted",
}
