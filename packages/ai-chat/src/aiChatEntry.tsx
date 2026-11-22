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
export { PageObjectId, type TestId } from './testing/PageObjectId';

export { type ViewState, ViewType } from './types/instance/apiTypes';

export {
  type CustomPanelConfigOptions,
  type DefaultCustomPanelConfigOptions,
  type WorkspaceCustomPanelConfigOptions,
  type CustomPanelInstance,
  PanelType,
  type CustomPanels,
  type CustomPanelOpenOptions,
} from './types/instance/apiTypes';

export type {
  ChangeFunction,
  ChatInstance,
  IncreaseOrDecrease,
  SendOptions,
} from './types/instance/ChatInstance';
export type {
  ChatSDKEventType,
  ChatSDKHandlers,
  ChatSDKInstance,
} from './types/instance/ChatSDKInstance';
export type {
  ChatSDKMessageItem,
  ChatSDKPendingUpload,
  ChatSDKState,
  ChatSDKStateAccess,
} from './types/instance/ChatSDKState';
export type { ChatInstanceInput } from './types/instance/ChatInstanceInput';
export type { ChatInstanceServiceDeskActions } from './types/instance/ChatInstanceServiceDeskActions';
export type {
  EventBusHandler,
  EventHandlers,
  TypeAndHandler,
} from './types/instance/EventHandlers';
export type { FileUploadCapabilities } from './types/instance/FileUploadCapabilities';
export type {
  PublicInputState,
  PublicCustomPanelsState,
  PublicHistoryPanelState,
  PublicDefaultCustomPanelState,
  PublicChatHumanAgentState,
  PublicChatState,
  ConversationStatus,
  PublicWorkspaceCustomPanelState,
} from './types/instance/PublicChatState';
export {
  WriteableElementName,
  type WriteableElements,
} from './types/instance/WriteableElements';
export type { AutoScrollOptions } from './types/utilities/HasDoAutoScroll';
export { LayoutCustomProperties } from './types/config/LayoutCustomProperties';

export { CornersType } from './types/config/CornersType';
export type {
  PerCornerConfig,
  ResolvedCornerConfig,
} from './types/config/CornersType';
export type { loadAllLazyDeps } from './testing/helpers';

export {
  type BusEvent,
  type BusEventHumanAgentAreAnyAgentsOnline,
  type BusEventHumanAgentEndChat,
  type BusEventHumanAgentPreEndChat,
  type BusEventHumanAgentPreReceive,
  type BusEventHumanAgentPreSend,
  type BusEventHumanAgentPreStartChat,
  type BusEventHumanAgentReceive,
  type BusEventHumanAgentSend,
  type BusEventChatReady,
  type BusEventChunkUserDefinedResponse,
  type BusEventClosePanelButtonClicked,
  type BusEventCustomFooterSlot,
  type BusEventCustomRequestFooterSlot,
  type BusEventCustomPanelClose,
  type BusEventCustomPanelOpen,
  type BusEventCustomPanelPreClose,
  type BusEventCustomPanelPreOpen,
  type BusEventWorkspaceClose,
  type BusEventWorkspaceOpen,
  type BusEventWorkspacePreClose,
  type BusEventWorkspacePreOpen,
  type BusEventFeedback,
  type BusEventHeaderMenuClick,
  type BusEventHistoryBegin,
  type BusEventHistoryEnd,
  type BusEventHistoryPanelNewChat,
  type BusEventHistoryPanelPreOpen,
  type BusEventMessageItemCustom,
  type BusEventPreReceive,
  type BusEventPreReset,
  type BusEventPreSend,
  type BusEventReceive,
  type BusEventReset,
  type BusEventSend,
  type BusEventStateChange,
  BusEventType,
  type BusEventUserDefinedResponse,
  type BusEventViewChange,
  type BusEventViewPreChange,
  FeedbackInteractionType,
  HeaderMenuClickType,
  MessageSendSource,
  ViewChangeReason,
} from './types/events/eventBusTypes';

export type {
  CatastrophicErrorPanelState,
  PersistedState,
} from './types/state/AppState';

export { readCarbonChatSession } from './globals/utils/readCarbonChatSession';

export type { PersistedHumanAgentState } from './types/state/PersistedHumanAgentState';

export type {
  PersistableState,
  PersistedStateConfig,
} from './types/config/PersistedStateConfig';

export type {
  HomeScreenConfig,
  HomeScreenStarterButton,
  HomeScreenStarterButtons,
  HomeScreenState,
} from './types/config/HomeScreenConfig';

export {
  CancellationReason,
  type ChatInstanceMessaging,
  type CustomSendMessageOptions,
  MessageState,
  type UpsertMessageUpdater,
} from './types/config/MessagingConfig';
export type {
  ChatSDKInstanceMessaging,
  FailTurnOptions,
} from './types/config/ChatSDKInstanceMessaging';

export type { PublicConfig } from './types/config/PublicConfig';
export type { ChatSDKConfig } from './types/config/ChatSDKConfig';
export type { ChatSDKConfigMessaging } from './types/config/ChatSDKConfigMessaging';
export type { ChatSDKErrorData } from './types/config/ChatSDKErrorData';
export type { ChatSDKPersistedStateConfig } from './types/config/ChatSDKPersistedStateConfig';
export type { ChatSDKServiceDeskConfig } from './types/config/ChatSDKServiceDeskConfig';
export type { ChatSDKUploadConfig } from './types/config/ChatSDKUploadConfig';
export type { ChatSDKLifecycleConfig } from './types/config/ChatSDKLifecycleConfig';
export { CarbonTheme } from './types/config/CarbonTheme';
export type { DisclaimerPublicConfig } from './types/config/DisclaimerConfig';
export {
  type CustomMenuOption,
  type HeaderConfig,
  MinimizeButtonIconType,
  type ToolbarAction,
} from './types/config/HeaderConfig';
export type { HistoryConfig } from './types/config/HistoryConfig';
export type {
  InputConfig,
  BaseSuggestionConfig,
  TriggerSuggestionConfig,
  AutocompleteConfig,
  StartersConfig,
  SuggestionItem,
  CustomListProps,
} from './types/config/InputConfig';
export { enLanguagePack, type LanguagePack } from './types/config/LanguagePack';
export type { LayoutConfig } from './types/config/LayoutConfig';
export { type OnErrorData, OnErrorType } from './types/config/ErrorConfig';
export type { PublicConfigMessaging } from './types/config/PublicConfigMessaging';
export type { UploadConfig } from './types/config/UploadConfig';
export type { LifecycleConfig } from './types/config/LifecycleConfig';

export type {
  ChatShortcutConfig,
  KeyboardShortcuts,
} from './types/config/ShortcutConfig';

// Carbon Tiptap extension factories and JSONContent / light-DOM helpers.
// Local re-declarations live in `./types/utilities/inputUtils` so we own the
// JSDoc + `@category` placement; see [src/types/AGENTS.md](./types/AGENTS.md)
// for the cross-package re-export rule. Raw `@tiptap/core` types (`Editor`,
// `Extension`, `JSONContent`, `Node`, ...) are not re-exported — import those
// from `@tiptap/core` directly. The Carbon suggestion-config types are
// exported from `./types/config/InputConfig` alongside `InputConfig`.
export type {
  BuildCarbonExtensionsConfig,
  ExcludedTrigger,
  RenderInLightDomArgs,
  RenderInLightDomResult,
  RenderTokenChipArgs,
  TokenChipAttrs,
} from './types/utilities/inputUtils';

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
  renderTokenChip,
  renderInLightDom,
} from './types/utilities/inputUtils';

export type { DeepPartial } from './types/utilities/DeepPartial';
export type { default as ObjectMap } from './types/utilities/ObjectMap';

export {
  type AdditionalDataToAgent,
  type AgentAvailability,
  HumanAgentsOnlineStatus,
  type ConnectingErrorInfo,
  type DisconnectedErrorInfo,
  type EndChatInfo,
  ErrorType,
  FileStatusValue,
  type FileUpload,
  ScreenShareState,
  type ServiceDesk,
  type ServiceDeskCallback,
  type ServiceDeskCapabilities,
  type ServiceDeskErrorInfo,
  type ServiceDeskFactoryParameters,
  type ServiceDeskPublicConfig,
  type StartChatOptions,
  type UserMessageErrorInfo,
} from './types/config/ServiceDeskConfig';

export {
  type BaseGenericItem,
  type MessageResponseOptions,
  type MessageResponseHistory,
  type MessageRequestHistory,
  type ResponseUserProfile,
  type RequestUserProfile,
  type AudioItem,
  type BaseMessageInput,
  type ButtonItem,
  ButtonItemKind,
  ButtonItemType,
  type CardItem,
  type CarouselItem,
  type Chunk,
  type CompleteItemChunk,
  type ConnectToHumanAgentItem,
  type ConnectToHumanAgentItemTransferInfo,
  type ConversationalSearchItem,
  type ConversationalSearchItemCitation,
  type DateItem,
  type EventInput,
  type EventInputData,
  type FinalResponseChunk,
  type GenericItem,
  type GenericItemCustomFooterSlotOptions,
  type GenericItemMessageFeedbackCategories,
  type GridItem,
  type HorizontalCellAlignment,
  type IFrameItem,
  IFrameItemDisplayOption,
  type ImageItem,
  type InlineErrorItem,
  type ItemStreamingMetadata,
  type MediaItem,
  type MediaItemDimensions,
  type MediaSubtitleTrack,
  type MediaTranscript,
  type MediaFileAccessibility,
  type MessageInput,
  MessageInputType,
  type MessageItemPanelInfo,
  type MessageOutput,
  type MessageRequest,
  type MessageResponse,
  MessageResponseTypes,
  type OptionItem,
  OptionItemPreference,
  SelectionDisplay,
  type PartialItemChunk,
  type PartialItemChunkWithId,
  type PauseItem,
  type PreviewCardItem,
  type StreamChunk,
  type TextItem,
  type UserDefinedItem,
  type VerticalCellAlignment,
  type VideoItem,
  WidthOptions,
  type WithBodyAndFooter,
  type WithWidthOptions,
  type SingleOption,
  HumanAgentMessageType,
  type ChainOfThoughtStep,
  ChainOfThoughtStepStatus,
  CHAT_BUTTON_KIND,
  CHAT_BUTTON_SIZE,
  type ReasoningSteps,
  type ReasoningStep,
  ReasoningStepOpenState,
  type GenericItemMessageFeedbackOptions,
  type GenericItemMessageOptions,
  type Message,
  type PartialOrCompleteItemChunk,
  type PartialResponse,
  type MessageHistoryFeedback,
  type SearchResult,
  UserType,
  type StructuredData,
  type StructuredField,
  type StructuredFieldType,
  type InlineFile,
  type ExternalFileReference,
  type FileFieldValue,
} from './types/messaging/Messages';

export type {
  SystemMessageItem,
  SystemMessageVariant,
} from './types/messaging/Messages';

export type { HistoryItem } from './types/messaging/History';

export { MessageErrorState } from './types/messaging/LocalMessageItem';

export type {
  LauncherCallToActionConfig,
  LauncherConfig,
} from './types/config/LauncherConfig';

export type { CdsAiChatContainerAttributes } from './web-components/cds-aichat-container/cds-aichat-container';

export type { CdsAiChatCustomElementAttributes } from './web-components/cds-aichat-custom-element/types';

export type {
  ChatContainerPropsMarkdown,
  CustomMarkdownRenderers,
  MarkdownCustomRendererMountDetail,
  MarkdownCustomRenderers,
  MarkdownPluginFallbackMountDetail,
  MarkdownPluginHostMountDetail,
  MarkdownPluginHostMountDetailInput,
  MarkdownRendererChecklist,
  MarkdownRendererChecklistItemArgs,
  MarkdownRendererChecklistToggleArgs,
  MarkdownRendererCodeBlockArgs,
  MarkdownRendererCodeBlockData,
  MarkdownRendererImageArgs,
  MarkdownRendererImageResult,
  MarkdownRendererLinkArgs,
  MarkdownRendererLinkResult,
  MarkdownRendererTableArgs,
  MarkdownRendererTableData,
  RenderCustomMessageFooter,
  RenderCustomMessageFooterState,
  RenderCustomRequestFooter,
  RenderCustomRequestFooterState,
  RenderUserDefinedResponse,
  RenderUserDefinedState,
  RenderWriteableElementResponse,
  TableCellData,
  TokenTree,
  WCCustomMarkdownRenderers,
  WCMarkdown,
  WCRenderCustomMessageFooter,
  WCRenderCustomRequestFooter,
  WCRenderUserDefinedResponse,
  RenderUserDefinedInputNode,
  RenderUserDefinedInputNodeState,
  WCRenderUserDefinedInputNode,
} from './types/component/ChatContainer';

export type {
  MarkdownItPlugin,
  PublicConfigMarkdown,
} from './types/config/PublicConfig';

export { ChatContainer, type ChatContainerProps } from './react/ChatContainer';

export {
  ChatCustomElement,
  type ChatCustomElementProps,
} from './react/ChatCustomElement';
