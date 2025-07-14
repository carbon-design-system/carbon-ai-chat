/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * @packageDocumentation
 * @module Carbon AI chat types
 * @showCategories
 *
 * All external exports. This file exports types as well as the React components.
 * To use the web components, directly import them.
 */

export {
  CustomMenuOption,
  CustomPanelConfigOptions,
  CustomPanelInstance,
  CustomPanels,
  FileStatusValue,
  FileUpload,
  LauncherType,
  NotificationMessage,
  ViewState,
  ViewType,
} from "./types/instance/apiTypes";

export {
  ChatHeaderObjectType,
  ChatHeaderButton,
  ChatHeaderConfig,
  ChatHeaderGroupMenu,
  ChatHeaderGroupMenuItem,
  ChatHeaderLink,
  ChatHeaderMenu,
  ChatHeaderMenuItemTypes,
  ChatHeaderObjectTypes,
} from "./types/config/ChatHeaderConfig";

export {
  ChangeFunction,
  ChatHeaderAvatarConfig,
  ChatInstance,
  ChatInstanceNotifications,
  ChatInstanceServiceDeskActions,
  ChatInstanceTours,
  EventBusHandler,
  EventHandlers,
  HasAddRemoveClassName,
  IncreaseOrDecrease,
  InstanceElements,
  InstanceInputElement,
  PublicWebChatServiceDeskState,
  PublicWebChatState,
  SendOptions,
  TypeAndHandler,
  WriteableElementName,
  WriteableElements,
} from "./types/instance/ChatInstance";

export { CornersType } from "./types/config/CornersType";

export {
  BusEvent,
  BusEventAgentAreAnyAgentsOnline,
  BusEventAgentEndChat,
  BusEventAgentPreEndChat,
  BusEventAgentPreReceive,
  BusEventAgentPreSend,
  BusEventAgentPreStartChat,
  BusEventAgentReceive,
  BusEventAgentSend,
  BusEventChatReady,
  BusEventChunkUserDefinedResponse,
  BusEventClosePanelButtonClicked,
  BusEventCustomPanelClose,
  BusEventCustomPanelOpen,
  BusEventCustomPanelPreClose,
  BusEventCustomPanelPreOpen,
  BusEventFeedback,
  BusEventHistoryBegin,
  BusEventHistoryEnd,
  BusEventMessageItemCustom,
  BusEventPreReceive,
  BusEventPreReset,
  BusEventPreSend,
  BusEventReceive,
  BusEventReset,
  BusEventSend,
  BusEventTourEnd,
  BusEventTourStart,
  BusEventTourStep,
  BusEventType,
  BusEventUserDefinedResponse,
  BusEventViewChange,
  BusEventViewPreChange,
  FeedbackInteractionType,
  MessageSendSource,
  TourEndReason,
  TourStartReason,
  ViewChangeReason,
} from "./types/events/eventBusTypes";

export {
  HomeScreenBackgroundType,
  HomeScreenConfig,
  HomeScreenStarterButton,
  HomeScreenStarterButtons,
} from "./types/config/HomeScreenConfig";

export {
  ChatInstanceMessaging,
  CustomSendMessageOptions,
} from "./types/config/MessagingConfig";

export {
  CarbonTheme,
  DisclaimerPublicConfig,
  HeaderConfig,
  LayoutConfig,
  MinimizeButtonIconType,
  OnErrorData,
  OnErrorType,
  PublicConfig,
  PublicConfigMessaging,
  ThemeConfig,
  // WhiteLabelTheme,
} from "./types/config/PublicConfig";

export {
  AdditionalDataToAgent,
  AgentAvailability,
  AgentsOnlineStatus,
  ConnectingErrorInfo,
  DisconnectedErrorInfo,
  EndChatInfo,
  ErrorType,
  ScreenShareState,
  ServiceDesk,
  ServiceDeskCallback,
  ServiceDeskCapabilities,
  ServiceDeskErrorInfo,
  ServiceDeskFactoryParameters,
  ServiceDeskPublicConfig,
  StartChatOptions,
  UserMessageErrorInfo,
} from "./types/config/ServiceDeskConfig";

export {
  MessageHistory,
  AgentProfile,
  AudioItem,
  BaseMessageInput,
  ButtonItem,
  ButtonItemKind,
  ButtonItemType,
  CardItem,
  CarouselItem,
  Chunk,
  CompleteItemChunk,
  ConnectToAgentItem,
  ConnectToAgentItemTransferInfo,
  ConversationalSearchItem,
  ConversationalSearchItemCitation,
  DateItem,
  EventInput,
  EventInputData,
  FinalResponseChunk,
  GenericItem,
  GridItem,
  HorizontalCellAlignment,
  IFrameItem,
  IFrameItemDisplayOption,
  ImageItem,
  InlineErrorItem,
  ItemStreamingMetadata,
  MediaItem,
  MediaItemDimensions,
  MessageInput,
  MessageInputType,
  MessageItemPanelInfo,
  MessageOutput,
  MessageRequest,
  MessageResponse,
  MessageResponseTypes,
  OptionItem,
  OptionItemPreference,
  PartialItemChunk,
  PauseItem,
  StreamChunk,
  TableItem,
  TableItemCell,
  TableItemRow,
  TableItemRowExpandableSectionItem,
  TextItem,
  UserDefinedItem,
  VerticalCellAlignment,
  VideoItem,
  WidthOptions,
  WithBodyAndFooter,
  WithWidthOptions,
  SingleOption,
  AgentMessageType,
  ChainOfThoughtStep,
  ChainOfThoughtStepStatus,
  GenericItemMessageFeedbackOptions,
  GenericItemMessageOptions,
  Message,
  PartialOrCompleteItemChunk,
  TourStepGenericItem,
  PartialResponse,
  MessageHistoryFeedback,
} from "./types/messaging/Messages";

export { HistoryItem } from "./types/messaging/History";

export { MessageErrorState } from "./types/messaging/LocalMessageItem";

export {
  LauncherCallToActionConfig,
  LauncherConfig,
} from "./types/config/LauncherConfig";

export { CdsAiChatContainerAttributes } from "./web-components/cds-aichat-container";

export { CdsAiChatCustomElementAttributes } from "./web-components/cds-aichat-custom-element";

export {
  RenderUserDefinedResponse,
  RenderUserDefinedState,
  RenderWriteableElementResponse,
} from "./types/component/ChatContainer";
export { ChatContainer, ChatContainerProps } from "./react/ChatContainer";

export {
  ChatCustomElement,
  ChatCustomElementProps,
} from "./react/ChatCustomElement";
