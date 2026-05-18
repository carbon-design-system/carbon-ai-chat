/*
 *  Copyright IBM Corp. 2025, 2026
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

// Export types and utilities without importing web components
export { PageObjectId, TestId } from "./testing/PageObjectId";

export { ViewState, ViewType } from "./types/instance/apiTypes";

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
  IncreaseOrDecrease,
  SendOptions,
} from "./types/instance/ChatInstance";
export { ChatInstanceInput } from "./types/instance/ChatInstanceInput";
export { ChatInstanceServiceDeskActions } from "./types/instance/ChatInstanceServiceDeskActions";
export {
  EventBusHandler,
  EventHandlers,
  TypeAndHandler,
} from "./types/instance/EventHandlers";
export { FileUploadCapabilities } from "./types/instance/FileUploadCapabilities";
export {
  PublicInputState,
  PublicCustomPanelsState,
  PublicHistoryPanelState,
  PublicDefaultCustomPanelState,
  PublicChatHumanAgentState,
  PublicChatState,
  PublicWorkspaceCustomPanelState,
} from "./types/instance/PublicChatState";
export {
  WriteableElementName,
  WriteableElements,
} from "./types/instance/WriteableElements";
export { AutoScrollOptions } from "./types/utilities/HasDoAutoScroll";
export { LayoutCustomProperties } from "./types/config/LayoutCustomProperties";

export { CornersType } from "./types/config/CornersType";
export type {
  PerCornerConfig,
  ResolvedCornerConfig,
} from "./types/config/CornersType";
export type { loadAllLazyDeps } from "./testing/helpers";

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
  BusEventCustomFooterSlot,
  BusEventCustomPanelClose,
  BusEventCustomPanelOpen,
  BusEventCustomPanelPreClose,
  BusEventCustomPanelPreOpen,
  BusEventWorkspaceClose,
  BusEventWorkspaceOpen,
  BusEventWorkspacePreClose,
  BusEventWorkspacePreOpen,
  BusEventFeedback,
  BusEventHeaderMenuClick,
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
  HeaderMenuClickType,
  MessageSendSource,
  ViewChangeReason,
} from "./types/events/eventBusTypes";

export {
  CatastrophicErrorPanelState,
  PersistedState,
} from "./types/state/AppState";

export { readCarbonChatSession } from "./globals/utils/readCarbonChatSession";

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

export { PublicConfig } from "./types/config/PublicConfig";
export { CarbonTheme } from "./types/config/CarbonTheme";
export { DisclaimerPublicConfig } from "./types/config/DisclaimerConfig";
export {
  CustomMenuOption,
  HeaderConfig,
  MinimizeButtonIconType,
  ToolbarAction,
} from "./types/config/HeaderConfig";
export { HistoryConfig } from "./types/config/HistoryConfig";
export type {
  InputConfig,
  InputMenuOption,
  BaseSuggestionConfig,
  TriggerSuggestionConfig,
  AutocompleteConfig,
  SuggestionItem,
  CustomListProps,
} from "./types/config/InputConfig";
export { enLanguagePack, LanguagePack } from "./types/config/LanguagePack";
export { LayoutConfig } from "./types/config/LayoutConfig";
export { OnErrorData, OnErrorType } from "./types/config/ErrorConfig";
export { PublicConfigMessaging } from "./types/config/PublicConfigMessaging";
export { UploadConfig } from "./types/config/UploadConfig";

export {
  ChatShortcutConfig,
  KeyboardShortcuts,
} from "./types/config/ShortcutConfig";

// Carbon Tiptap extension factories and JSONContent / light-DOM helpers.
// Local re-declarations live in `./types/utilities/inputUtils` so we own the
// JSDoc + `@category` placement; see [src/types/AGENTS.md](./types/AGENTS.md)
// for the cross-package re-export rule. Raw `@tiptap/core` types (`Editor`,
// `Extension`, `JSONContent`, `Node`, ...) are not re-exported — import those
// from `@tiptap/core` directly. The Carbon suggestion-config types are
// exported from `./types/config/InputConfig` alongside `InputConfig`.
export type {
  RenderInLightDomArgs,
  RenderInLightDomResult,
} from "./types/utilities/inputUtils";

export {
  carbonMention,
  carbonCommand,
  carbonAutocomplete,
  carbonStarterTrigger,
  buildCarbonExtensions,
  setHostOriginMeta,
  removeNodesByType,
  mapNodes,
  findNodesByType,
  getRawText,
  renderTokenChip,
  renderInLightDom,
} from "./types/utilities/inputUtils";

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
  GenericItemCustomFooterSlotOptions,
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
  StructuredData,
  StructuredField,
  StructuredFieldType,
  StructuredFieldValue,
  InlineFile,
  ExternalFileReference,
  FileFieldValue,
} from "./types/messaging/Messages";

export type {
  SystemMessageItem,
  SystemMessageVariant,
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
  RenderCustomMessageFooter,
  RenderUserDefinedResponse,
  RenderUserDefinedState,
  RenderWriteableElementResponse,
  WCRenderUserDefinedResponse,
  RenderUserDefinedInputNode,
  RenderUserDefinedInputNodeState,
  WCRenderUserDefinedInputNode,
} from "./types/component/ChatContainer";

export { ChatContainer, ChatContainerProps } from "./react/ChatContainer";

export {
  ChatCustomElement,
  ChatCustomElementProps,
} from "./react/ChatCustomElement";
