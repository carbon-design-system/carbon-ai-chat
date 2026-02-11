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
export { PageObjectId, TestId } from "./testing/PageObjectId";
export { loadAllLazyDeps } from "./testing/helpers";

// Export all types without the web component implementations
export { ViewState, ViewType } from "./types/instance/apiTypes";

export { ChatHeaderConfig } from "./types/config/ChatHeaderConfig";

export {
  CustomPanelConfigOptions,
  DefaultCustomPanelConfigOptions,
  WorkspaceCustomPanelConfigOptions,
  CustomPanelInstance,
  PanelType,
  CustomPanels,
  CustomPanelOpenOptions,
} from "./types/instance/apiTypes";

export {
  ChangeFunction,
  ChatInstance,
  ChatInstanceInput,
  ChatInstanceServiceDeskActions,
  EventBusHandler,
  EventHandlers,
  FileUploadCapabilities,
  IncreaseOrDecrease,
  PublicInputState,
  PublicCustomPanelsState,
  PublicDefaultCustomPanelState,
  PublicChatHumanAgentState,
  PublicChatState,
  PublicWorkspaceCustomPanelState,
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
  BusEventWorkspaceClose,
  BusEventWorkspaceOpen,
  BusEventWorkspacePreClose,
  BusEventWorkspacePreOpen,
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
  BusEventStateChange,
  BusEventType,
  BusEventUserDefinedResponse,
  BusEventViewChange,
  BusEventViewPreChange,
  FeedbackInteractionType,
  MessageSendSource,
  ViewChangeReason,
} from "./types/events/eventBusTypes";

export { PersistedState } from "./types/state/AppState";

export { PersistedHumanAgentState } from "./types/state/PersistedHumanAgentState";

export {
  HomeScreenConfig,
  HomeScreenStarterButton,
  HomeScreenStarterButtons,
  HomeScreenState,
} from "./types/config/HomeScreenConfig";

export {
  CancellationReason,
  ChatInstanceMessaging,
  CustomSendMessageOptions,
} from "./types/config/MessagingConfig";

export {
  CarbonTheme,
  CustomMenuOption,
  DisclaimerPublicConfig,
  enLanguagePack,
  HeaderConfig,
  InputConfig,
  LanguagePack,
  LayoutConfig,
  MinimizeButtonIconType,
  OnErrorData,
  OnErrorType,
  PublicConfig,
  PublicConfigMessaging,
} from "./types/config/PublicConfig";

export { DeepPartial } from "../src/types/utilities/DeepPartial";
export type { default as ObjectMap } from "./types/utilities/ObjectMap";

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
  MediaSubtitleTrack,
  MediaTranscript,
  MediaFileAccessibility,
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
  PartialItemChunkWithId,
  PauseItem,
  PreviewCardItem,
  StreamChunk,
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
  ReasoningSteps,
  ReasoningStep,
  ReasoningStepOpenState,
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
