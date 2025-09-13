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
 * @module Carbon AI Chat server-side exports
 *
 * Server-side entry point for types, enums, and utilities without browser side effects.
 * This file does not import web components to avoid triggering their registration,
 * making it safe to use in Node.js environments, SSR, and testing.
 */

// Export types and utilities without importing web components
export { OverlayPanelName } from "./chat/components-legacy/OverlayPanel";

export {
  PageObjectId,
  makeTestId,
  TestId,
  PrefixedId,
} from "./chat/utils/PageObjectId";

// Export all types without the web component implementations
export {
  NotificationMessage,
  ViewState,
  ViewType,
} from "./types/instance/apiTypes";

export { ChatHeaderConfig } from "./types/config/ChatHeaderConfig";

export {
  CustomPanelConfigOptions,
  CustomPanelInstance,
  CustomPanels,
} from "./types/instance/apiTypes";

export {
  ChatInstance,
  ChatInstanceNotifications,
  ChatInstanceServiceDeskActions,
  EventBusHandler,
  EventHandlers,
  FileUploadCapabilities,
  IncreaseOrDecrease,
  PublicWebChatServiceDeskState,
  PublicWebChatState,
  SendOptions,
  TypeAndHandler,
  WriteableElementName,
  WriteableElements,
} from "./types/instance/ChatInstance";
export { LayoutCustomProperties } from "./types/config/LayoutCustomProperties";

export { CornersType } from "./types/config/CornersType";

export {
  BusEvent,
  BusEventHumanAgentAreAnyAgentsOnline,
  BusEventHumanAgentEndChat,
  BusEventHumanAgentPreEndChat,
  BusEventHumanAgentPreReceive,
  BusEventHumanAgentPreSend,
  BusEventHumanAgentPreStartChat,
  BusEventHumanAgentReceive,
  BusEventHumanAgentSend,
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
  BusEventType,
  BusEventUserDefinedResponse,
  BusEventViewChange,
  BusEventViewPreChange,
  FeedbackInteractionType,
  MessageSendSource,
  ViewChangeReason,
} from "./types/events/eventBusTypes";

export {
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
  CustomMenuOption,
  DisclaimerPublicConfig,
  enLanguagePack,
  HeaderConfig,
  LanguagePack,
  LayoutConfig,
  MinimizeButtonIconType,
  OnErrorData,
  OnErrorType,
  PublicConfig,
  PublicConfigMessaging,
} from "./types/config/PublicConfig";

export { DeepPartial } from "../src/types/utilities/DeepPartial";

export {
  AdditionalDataToAgent,
  AgentAvailability,
  HumanAgentsOnlineStatus,
  ConnectingErrorInfo,
  DisconnectedErrorInfo,
  EndChatInfo,
  ErrorType,
  FileStatusValue,
  FileUpload,
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
  BaseGenericItem,
  MessageResponseOptions,
  MessageResponseHistory,
  MessageRequestHistory,
  ResponseUserProfile,
  AudioItem,
  BaseMessageInput,
  ButtonItem,
  ButtonItemKind,
  ButtonItemType,
  CardItem,
  CarouselItem,
  Chunk,
  CompleteItemChunk,
  ConnectToHumanAgentItem,
  ConnectToHumanAgentItemTransferInfo,
  ConversationalSearchItem,
  ConversationalSearchItemCitation,
  DateItem,
  EventInput,
  EventInputData,
  FinalResponseChunk,
  GenericItem,
  GenericItemMessageFeedbackCategories,
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
  TextItem,
  UserDefinedItem,
  VerticalCellAlignment,
  VideoItem,
  WidthOptions,
  WithBodyAndFooter,
  WithWidthOptions,
  SingleOption,
  HumanAgentMessageType,
  ChainOfThoughtStep,
  ChainOfThoughtStepStatus,
  GenericItemMessageFeedbackOptions,
  GenericItemMessageOptions,
  Message,
  PartialOrCompleteItemChunk,
  PartialResponse,
  MessageHistoryFeedback,
  SearchResult,
  UserType,
} from "./types/messaging/Messages";

export { HistoryItem } from "./types/messaging/History";

export { MessageErrorState } from "./types/messaging/LocalMessageItem";

export {
  LauncherCallToActionConfig,
  LauncherConfig,
} from "./types/config/LauncherConfig";

export {
  RenderUserDefinedResponse,
  RenderUserDefinedState,
  RenderWriteableElementResponse,
} from "./types/component/ChatContainer";

// Export type-only interfaces for web component attributes without importing the implementations
export type { CdsAiChatContainerAttributes } from "./web-components/cds-aichat-container/index";
export type { CdsAiChatCustomElementAttributes } from "./web-components/cds-aichat-custom-element/index";
