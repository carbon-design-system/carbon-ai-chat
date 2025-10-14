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
 * @module Carbon AI Chat types
 * @showCategories
 *
 * All external exports. This file exports types as well as the React components.
 * To use the web components, directly import them.
 */

export {
  NotificationMessage,
  ViewState,
  ViewType,
} from "./types/instance/apiTypes";

export { PersistedState } from "./types/state/AppState";

export { ChatHeaderConfig } from "./types/config/ChatHeaderConfig";

export {
  CustomPanelConfigOptions,
  CustomPanelInstance,
  CustomPanels,
} from "./types/instance/apiTypes";

export {
  ChangeFunction,
  ChatInstance,
  ChatInstanceNotifications,
  ChatInstanceServiceDeskActions,
  EventBusHandler,
  EventHandlers,
  FileUploadCapabilities,
  IncreaseOrDecrease,
  PublicChatHumanAgentState,
  PublicChatState,
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
  HomeScreenState,
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
  InputConfig,
  LanguagePack,
  LayoutConfig,
  MinimizeButtonIconType,
  OnErrorData,
  OnErrorType,
  PublicConfig,
  PublicConfigMessaging,
} from "./types/config/PublicConfig";

export { PersistedHumanAgentState } from "./types/state/PersistedHumanAgentState";

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

export { CdsAiChatContainerAttributes } from "./web-components/cds-aichat-container/index";

export { CdsAiChatCustomElementAttributes } from "./web-components/cds-aichat-custom-element/index";

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

export { PageObjectId, TestId } from "./chat/utils/PageObjectId";
