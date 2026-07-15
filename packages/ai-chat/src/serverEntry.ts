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

export { PersistedHumanAgentState } from "./types/state/PersistedHumanAgentState";

export {
  PersistableState,
  PersistedStateConfig,
} from "./types/config/PersistedStateConfig";

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
  MessageState,
  UpsertMessageUpdater,
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

// Carbon Tiptap extension factories and JSONContent helpers. Local
// re-declarations live in `./types/utilities/inputUtils`; see
// [src/types/AGENTS.md](./types/AGENTS.md) for the cross-package re-export
// rule. Raw `@tiptap/core` types are not re-exported — import those from
// `@tiptap/core` directly. The Carbon suggestion-config types are exported
// from `./types/config/InputConfig` alongside `InputConfig`.
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
  textToDoc,
} from "./types/utilities/inputUtils";

export { DeepPartial } from "./types/utilities/DeepPartial";
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
  CHAT_BUTTON_KIND,
  CHAT_BUTTON_SIZE,
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

export {
  ChatContainerPropsMarkdown,
  CustomMarkdownRenderers,
  MarkdownCustomRenderers,
  MarkdownRendererCodeBlockArgs,
  MarkdownRendererCodeBlockData,
  MarkdownRendererTableArgs,
  MarkdownRendererTableData,
  RenderCustomMessageFooter,
  RenderCustomMessageFooterState,
  RenderUserDefinedResponse,
  RenderUserDefinedState,
  RenderWriteableElementResponse,
  TokenTree,
  WCCustomMarkdownRenderers,
  WCMarkdown,
  WCRenderCustomMessageFooter,
  WCRenderUserDefinedResponse,
} from "./types/component/ChatContainer";

export type {
  MarkdownItPlugin,
  PublicConfigMarkdown,
} from "./types/config/PublicConfig";

// Export type-only interfaces for web component attributes without importing the implementations
export type { CdsAiChatContainerAttributes } from "./web-components/cds-aichat-container/index";
export type { CdsAiChatCustomElementAttributes } from "./web-components/cds-aichat-custom-element/index";
