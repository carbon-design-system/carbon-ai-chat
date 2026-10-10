/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import isEqual from 'lodash-es/isEqual.js';

import { VERSION } from '../utils/environmentVariables';
import {
  AnnounceMessage,
  AppState,
  AppStateMessages,
  ChatMessagesState,
  CustomPanelState,
  WorkspacePanelState,
  HistoryPanelState,
  HumanAgentState,
  IFramePanelState,
  InputState,
  MessagePanelState,
  ThemeState,
  ViewSourcePanelState,
  ViewState,
  PersistedState,
} from '../../types/state/AppState';
import {
  DefaultCustomPanelConfigOptions,
  WorkspaceCustomPanelConfigOptions,
  PanelType,
  PanelConfigOptionsByType,
} from '../../types/instance/apiTypes';
import {
  LauncherConfig,
  TIME_TO_ENTRANCE_ANIMATION_START,
} from '../../types/config/LauncherConfig';
import {
  CornersType,
  DEFAULT_CUSTOM_PANEL_ID,
  WORKSPACE_CUSTOM_PANEL_ID,
} from '../utils/constants';
import { deepFreeze } from '../utils/lang/objectUtils';
import {
  HeaderConfig,
  MinimizeButtonIconType,
} from '../../types/config/HeaderConfig';
import { LayoutConfig } from '../../types/config/LayoutConfig';
import { ChatShortcutConfig } from '../../types/config/ShortcutConfig';
import {
  LocalMessageItem,
  LocalMessageUIState,
} from '../../types/messaging/LocalMessageItem';
import {
  GenericItem,
  Message,
  MessageResponse,
  MessageResponseTypes,
} from '../../types/messaging/Messages';
import ObjectMap from '../../types/utilities/ObjectMap';
import { DeepPartial } from '../../types/utilities/DeepPartial';
import type { MessageWriteOptions } from './messageWriteTypes';
import {
  createLocalMessageItemsForNestedMessageItems,
  findDrawIssues,
  keepNestedLocalIDs,
  outputItemToLocalItem,
} from '../schema/outputItemToLocalItem';
import {
  isCarouselResponseType,
  isGridResponseType,
  isHiddenOutputItem,
  isPause,
  isResponseWithNestedItems,
  streamItemID,
} from '../utils/messageUtils';
import { uuid } from '@carbon/ai-chat-components/es/globals/utils/uuid.js';

/**
 * Miscellaneous utilities to help in reducers.
 */

const DEFAULT_HEADER: HeaderConfig = {
  isOn: true,
  minimizeButtonIconType: MinimizeButtonIconType.MINIMIZE,
  showAiLabel: true,
  hasContentMaxWidth: false,
};

deepFreeze(DEFAULT_HEADER);

const DEFAULT_LAUNCHER: LauncherConfig = {
  isOn: true,
  mobile: {
    isOn: false,
    title: '',
    timeToExpand: TIME_TO_ENTRANCE_ANIMATION_START,
  },
  desktop: {
    isOn: false,
    title: '',
    timeToExpand: TIME_TO_ENTRANCE_ANIMATION_START,
  },
};
deepFreeze(DEFAULT_LAUNCHER);

/**
 * Defaults for the message focus toggle shortcut, merged field by field with whatever the
 * host passes on {@link KeyboardShortcuts.messageFocusToggle}, so a host that sets only
 * `key` still gets the default `modifiers` and `isOn`.
 *
 * F6 is a standard accessibility shortcut used in Windows and many applications for cycling
 * between major regions and panels. It doesn't produce special characters and is widely
 * recognized for navigation purposes.
 *
 * The shortcut is off by default; a host opts in with `isOn: true`.
 */
const DEFAULT_MESSAGE_FOCUS_TOGGLE_SHORTCUT: ChatShortcutConfig = {
  key: 'F6',
  modifiers: {},
  isOn: false,
};
deepFreeze(DEFAULT_MESSAGE_FOCUS_TOGGLE_SHORTCUT);

const DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS: DefaultCustomPanelConfigOptions = {
  hideBackButton: false,
  disableAnimation: false,
  fullWidth: false,
  backButtonType: 'minimize',
  showChatHeader: false,
  openFromSide: false,
};
deepFreeze(DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS);

const WORKSPACE_CUSTOM_PANEL_CONFIG_OPTIONS: WorkspaceCustomPanelConfigOptions =
  {
    preferredLocation: 'end',
  };
deepFreeze(WORKSPACE_CUSTOM_PANEL_CONFIG_OPTIONS);

const PANEL_CONFIG_OPTIONS_BY_TYPE: PanelConfigOptionsByType = {
  [PanelType.DEFAULT]: DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS,
  [PanelType.WORKSPACE]: WORKSPACE_CUSTOM_PANEL_CONFIG_OPTIONS,
};
deepFreeze(PANEL_CONFIG_OPTIONS_BY_TYPE);

const DEFAULT_CUSTOM_PANEL_STATE: CustomPanelState = {
  isOpen: false,
  panelID: DEFAULT_CUSTOM_PANEL_ID,
  options: DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS,
};
deepFreeze(DEFAULT_CUSTOM_PANEL_STATE);

const DEFAULT_WORKSPACE_PANEL_STATE: WorkspacePanelState = {
  isOpen: false,
  workspaceID: undefined,
  panelID: WORKSPACE_CUSTOM_PANEL_ID,
  options: WORKSPACE_CUSTOM_PANEL_CONFIG_OPTIONS,
  localMessageItem: undefined,
  fullMessage: undefined,
  additionalData: undefined,
};
deepFreeze(DEFAULT_WORKSPACE_PANEL_STATE);

const DEFAULT_HISTORY_PANEL_STATE: HistoryPanelState = {
  isOpen: false,
  isMobile: false,
};
deepFreeze(DEFAULT_HISTORY_PANEL_STATE);

const DEFAULT_IFRAME_PANEL_STATE: IFramePanelState = {
  isOpen: false,
  messageItem: null,
};
deepFreeze(DEFAULT_IFRAME_PANEL_STATE);

const DEFAULT_CITATION_PANEL_STATE: ViewSourcePanelState = {
  isOpen: false,
  citationItem: null,
};
deepFreeze(DEFAULT_CITATION_PANEL_STATE);

const DEFAULT_MESSAGE_PANEL_STATE: MessagePanelState<any> = {
  isOpen: false,
  localMessageItem: null,
  isMessageForInput: false,
};

deepFreeze(DEFAULT_MESSAGE_PANEL_STATE);

const VIEW_STATE_ALL_CLOSED: ViewState = {
  launcher: false,
  mainWindow: false,
};
deepFreeze(VIEW_STATE_ALL_CLOSED);

const VIEW_STATE_LAUNCHER_OPEN: ViewState = {
  launcher: true,
  mainWindow: false,
};
deepFreeze(VIEW_STATE_LAUNCHER_OPEN);

const VIEW_STATE_MAIN_WINDOW_OPEN: ViewState = {
  mainWindow: true,
  launcher: false,
};
deepFreeze(VIEW_STATE_MAIN_WINDOW_OPEN);

const DEFAULT_INPUT_STATE: InputState = {
  rawValue: '',
  content: [],
  focused: false,
  fieldVisible: null,
  isReadonly: null,
  files: [],
  allowFileUploads: false,
  allowMultipleFileUploads: false,
  allowedFileUploadTypes: null,
  maxFileSizeBytes: undefined,
  maxFiles: undefined,
  stopStreamingButtonState: {
    currentStreamID: null,
    isVisible: false,
    isDisabled: false,
    isMetadataDisabled: false,
  },
  pendingUploads: [],
};

deepFreeze(DEFAULT_INPUT_STATE);

const DEFAULT_PERSISTED_TO_BROWSER: PersistedState = {
  disclaimersAccepted: {},
  homeScreenState: {
    isHomeScreenOpen: false,
    showBackToAssistant: false,
  },
  humanAgentState: {
    isConnected: false,
    isSuspended: false,
    responseUserProfiles: {},
    responseUserProfile: null,
  },
  hasSentNonWelcomeMessage: false,
  wasLoadedFromBrowser: false,
  version: VERSION,
  viewState: VIEW_STATE_ALL_CLOSED,
  showUnreadIndicator: false,
  launcherIsExpanded: false,
  launcherShouldStartCallToActionCounterIfEnabled: true,
};
deepFreeze(DEFAULT_PERSISTED_TO_BROWSER);

const DEFAULT_HUMAN_AGENT_STATE: HumanAgentState = {
  // Volatile state (not persisted)
  isConnecting: false,
  isReconnecting: false,
  availability: null,
  numUnreadMessages: 0,
  fileUploadInProgress: false,
  activeLocalMessageID: null,
  showScreenShareRequest: false,
  isScreenSharing: false,
  isHumanAgentTyping: false,
  inputState: DEFAULT_INPUT_STATE,
};
deepFreeze(DEFAULT_HUMAN_AGENT_STATE);

const DEFAULT_CHAT_MESSAGES_STATE: ChatMessagesState = {
  localMessageIDs: [],
  messageIDs: [],
  activeResponseId: null,
  isMessageLoadingCounter: 0,
  isMessageLoadingText: undefined,
  isHydratingCounter: 0,
};
deepFreeze(DEFAULT_CHAT_MESSAGES_STATE);

const DEFAULT_MESSAGE_STATE: AppStateMessages = {
  allMessageItemsByID: {},
  allMessagesByID: {},
  assistantMessageState: {
    ...DEFAULT_CHAT_MESSAGES_STATE,
  },
};
deepFreeze(DEFAULT_MESSAGE_STATE);

const DEFAULT_THEME_STATE: ThemeState = {
  derivedCarbonTheme: null,
  originalCarbonTheme: null,
  aiEnabled: true,
  corners: {
    startStart: CornersType.ROUND,
    startEnd: CornersType.ROUND,
    endStart: CornersType.ROUND,
    endEnd: CornersType.ROUND,
  },
};
deepFreeze(DEFAULT_THEME_STATE);

const DEFAULT_LAYOUT_STATE: LayoutConfig = {
  showFrame: true,
  hasContentMaxWidth: true,
};
deepFreeze(DEFAULT_LAYOUT_STATE);

/**
 * Determines the {@link AnnounceMessage} to show based on a potential change in the visibility of the widget. If the
 * widget is either opened or closed, an announcement should be made and this will set that announcement. If the state
 * of the widget hasn't changed, this will return the current announcement unchanged.
 *
 * @param previousState The previous state of the application.
 * @param newViewState Indicates the widgets new view state.
 */
function calcAnnouncementForWidgetOpen(
  previousState: AppState,
  newViewState: ViewState
): AnnounceMessage {
  if (
    isEqual(previousState.persistedToBrowserStorage.viewState, newViewState)
  ) {
    // No change in the view state so return the current announcement.
    return previousState.announceMessage;
  }

  // The view has changed so show the appropriate message.
  return {
    messageID: newViewState.mainWindow
      ? 'window_ariaWindowOpened'
      : 'window_ariaWindowClosed',
  };
}

/**
 * Returns a new state that has the {@link ChatMessagesState} modified for the given chat type with the new properties.
 * If the chat state is for a thread, then the thread that is currently being viewed will be modified.
 */
function applyAssistantMessageState(
  state: AppState,
  newState: Partial<ChatMessagesState>
): AppState {
  return {
    ...state,
    assistantMessageState: {
      ...state.assistantMessageState,
      ...newState,
    },
  };
}

function handleViewStateChange(
  state: AppState,
  viewState: ViewState
): AppState {
  // If the main window is opened and the page is visible, mark any unread messages as read.
  let { showUnreadIndicator } = state.persistedToBrowserStorage;
  let topHuman = state.humanAgentState;
  if (viewState.mainWindow && state.isBrowserPageVisible) {
    if (topHuman.numUnreadMessages !== 0) {
      topHuman = {
        ...topHuman,
        numUnreadMessages: 0,
      };
    }
    showUnreadIndicator = false;
  }

  return {
    ...state,
    humanAgentState: topHuman,
    announceMessage: calcAnnouncementForWidgetOpen(state, viewState),
    persistedToBrowserStorage: {
      ...state.persistedToBrowserStorage,
      viewState,
      showUnreadIndicator,
    },
  };
}

function setHomeScreenOpenState(
  state: AppState,
  isOpen: boolean,
  showBackToAssistant?: boolean
): AppState {
  if (showBackToAssistant === undefined) {
    showBackToAssistant =
      state.persistedToBrowserStorage.homeScreenState.showBackToAssistant;
  }
  return {
    ...state,
    persistedToBrowserStorage: {
      ...state.persistedToBrowserStorage,
      homeScreenState: {
        ...state.persistedToBrowserStorage.homeScreenState,
        isHomeScreenOpen: isOpen,
        showBackToAssistant,
      },
    },
  };
}

/**
 * Sets the give property of the {@link LocalMessageUIState} associated with the message of the given ID to the
 * given value.
 *
 * @param state The current state to change.
 * @param localMessageID The ID of the message to update.
 * @param propertyName The name of the property to update.
 * @param propertyValue The value to set on the property.
 */
function applyLocalMessageUIState<
  TPropertyName extends keyof LocalMessageUIState,
>(
  state: AppState,
  localMessageID: string,
  propertyName: TPropertyName,
  propertyValue: LocalMessageUIState[TPropertyName]
) {
  const oldMessage = state.allMessageItemsByID[localMessageID];
  if (oldMessage) {
    return {
      ...state,
      allMessageItemsByID: {
        ...state.allMessageItemsByID,
        [localMessageID]: {
          ...oldMessage,
          ui_state: {
            ...oldMessage.ui_state,
            [propertyName]: propertyValue,
          },
        },
      },
    };
  }
  return state;
}

/**
 * Walks the nested local-item IDs referenced by `localItem` (body, footer, items,
 * gridLocalMessageItemIDs) and adds every reachable local-item ID to `out`.
 */
function collectNestedLocalIDs(
  localItem: LocalMessageItem | undefined,
  byID: ObjectMap<LocalMessageItem>,
  out: Set<string>
) {
  if (!localItem) {
    return;
  }
  const id = localItem.ui_state.id;
  if (out.has(id)) {
    return;
  }
  out.add(id);
  const ui = localItem.ui_state;
  const walk = (childID: string) =>
    collectNestedLocalIDs(byID[childID], byID, out);
  ui.bodyLocalMessageItemIDs?.forEach(walk);
  ui.footerLocalMessageItemIDs?.forEach(walk);
  ui.itemsLocalMessageItemIDs?.forEach(walk);
  ui.gridLocalMessageItemIDs?.forEach((row) =>
    row.forEach((cell) => cell.forEach(walk))
  );
}

/**
 * Returns the store key of a chunk-streamed item. An item without
 * `streaming_metadata.id` gets one key per message, so id-less items of two responses
 * never share one local item.
 */
function chunkItemLocalID(messageID: string, item: DeepPartial<GenericItem>) {
  return streamItemID(messageID, item) ?? `${messageID}-__no_stream_id__`;
}

/**
 * Resolves the previous local item an upserted item should be matched against: the item
 * with the same streaming id, or else the item at the same position when neither of them
 * has a streaming id.
 */
function resolvePreviousLocalItem(
  state: AppState,
  messageID: string,
  streamId: string | undefined,
  positional: LocalMessageItem | undefined
): LocalMessageItem | undefined {
  const byStreamId = streamId && state.allMessageItemsByID[streamId];
  if (byStreamId && byStreamId.fullMessageID === messageID) {
    return byStreamId;
  }
  if (positional && !streamItemID(messageID, positional.item) && !streamId) {
    return positional;
  }
  return undefined;
}

/**
 * Whether an upserted item can keep its previous {@link LocalMessageItem} as is: it is
 * deep-equal to the prior item and still streaming, or still settled, the same way.
 * Streaming UI reads `ui_state.streamingState.isDone`, so comparing it alongside the item
 * keeps a STREAMING → COMPLETE transition whose payload happened not to change from
 * leaving the item rendering as mid-stream forever.
 *
 * Cross-file invariant: `MessageUpsertCoordinator.snapshotLocalItemRefs` and its fan-out
 * rely on this `===`-preservation to dedupe `USER_DEFINED_RESPONSE` fan-out after
 * dispatch. Don't rebuild a fresh `LocalMessageItem` when the item is unchanged.
 */
function canReuseLocalItem(
  matchedPrev: LocalMessageItem | undefined,
  item: GenericItem,
  isStreaming: boolean,
  message: MessageResponse
): boolean {
  if (!matchedPrev) {
    return false;
  }
  const { streamingState } = matchedPrev.ui_state;
  const prevIsStreaming = Boolean(streamingState && !streamingState.isDone);
  if (prevIsStreaming !== isStreaming || !isEqual(matchedPrev.item, item)) {
    return false;
  }
  return (
    (item.response_type as string) !== MessageResponseTypes.SYSTEM ||
    isEqual(
      matchedPrev.ui_state.cannotDraw?.missing ?? [],
      findDrawIssues(item, message)
    )
  );
}

/**
 * Sets the upsert-owned parts of a freshly built local item's UI state: its streaming
 * state, the marks the chat recorded on the item it replaces, and whether to announce it.
 */
function applyUpsertUIState(
  localItem: LocalMessageItem,
  matchedPrev: LocalMessageItem | undefined,
  isStreaming: boolean
) {
  const { ui_state: uiState } = localItem;
  // `isIntermediateStreaming` stays unset: it hides most response types while true,
  // which is a chunk-flow rule, and upserted cards and tables have always rendered
  // mid-stream (D2).
  uiState.streamingState = { chunks: [], isDone: !isStreaming };
  if (matchedPrev?.ui_state.wasAnnounced) {
    uiState.wasAnnounced = true;
  }
  if (matchedPrev?.ui_state.connectToAgentHandled) {
    uiState.connectToAgentHandled = true;
  }
  // Announce an item once, when it first shows settled. Announcing mid-stream would
  // read partial content, and again on every later rebuild.
  uiState.needsAnnouncement =
    uiState.needsAnnouncement && !isStreaming && !uiState.wasAnnounced;
}

/**
 * Builds the local items nested in `localItem`, with the given streaming state, and adds
 * them to `localItemsByID`. They keep the ids of the items nested in `previous`, the local
 * item `localItem` replaces, which `localItemsByID` still holds.
 */
function addNestedLocalItems(
  localItem: LocalMessageItem,
  message: MessageResponse,
  previous: LocalMessageItem | undefined,
  isDone: boolean,
  localItemsByID: ObjectMap<LocalMessageItem>
) {
  if (!isResponseWithNestedItems(localItem.item)) {
    return;
  }
  const nestedLocalItems: LocalMessageItem[] = [];
  createLocalMessageItemsForNestedMessageItems(
    localItem,
    message,
    false,
    nestedLocalItems,
    true
  );
  for (const nested of nestedLocalItems) {
    // Nested items render markdown too, so a table inside a card or grid needs the
    // same streaming state as a top-level one.
    nested.ui_state.streamingState = { chunks: [], isDone };
  }
  keepNestedLocalIDs(
    localItem,
    nestedLocalItems,
    previous,
    localItemsByID
  ).forEach((nested) => {
    localItemsByID[nested.ui_state.id] = nested;
  });
}

/**
 * Builds a fresh {@link LocalMessageItem} for an upserted item under `localID`, and adds
 * local items for anything nested in it to `newLocalItemsByID`. An item the chat can't
 * draw is marked `cannotDraw` and gets no nested local items, since building them would
 * throw.
 */
function buildUpsertedLocalItem(
  item: GenericItem,
  message: MessageResponse,
  localID: string,
  matchedPrev: LocalMessageItem | undefined,
  isStreaming: boolean,
  newLocalItemsByID: ObjectMap<LocalMessageItem>
): LocalMessageItem {
  const localItem = outputItemToLocalItem(item, message, false);
  localItem.ui_state.id = localID;
  localItem.fullMessageID = message.id;
  applyUpsertUIState(localItem, matchedPrev, isStreaming);
  const missing = findDrawIssues(item, message);
  if (missing.length) {
    localItem.ui_state.cannotDraw = { missing };
    return localItem;
  }
  addNestedLocalItems(
    localItem,
    message,
    matchedPrev,
    !isStreaming,
    newLocalItemsByID
  );
  return localItem;
}

/**
 * Whether a streamed snapshot the chat can't draw yet should keep showing the version
 * of the same item before it. A host that streams partial JSON often sends a grid whose
 * newest cell has no `items` yet; hiding the grid on each such snapshot would make it
 * flicker. A previous version of another type isn't the same item, so it isn't kept.
 */
function keepsLastDrawn(
  localItem: LocalMessageItem,
  matchedPrev: LocalMessageItem | undefined
): boolean {
  return Boolean(
    localItem.ui_state.cannotDraw &&
    matchedPrev &&
    !matchedPrev.ui_state.cannotDraw &&
    matchedPrev.item.response_type === localItem.item.response_type
  );
}

/**
 * Rebuilds the {@link LocalMessageItem} entries for a single upserted message while
 * preserving:
 *
 * 1. **ID stability** — a new item that matches a previous item by `streaming_metadata.id`
 *    (preferred) or by index (fallback) reuses the previous `ui_state.id`. This keeps
 *    React keys and user-defined slot names stable across upserts.
 * 2. **Reference stability** — if the new item is deep-equal to the previously stored
 *    `LocalMessageItem.item`, the existing `LocalMessageItem` reference is reused
 *    verbatim. Components subscribed to that item via `useSelector` see no diff and
 *    skip re-rendering. This matches {@link applyChunkWrite} and is critical when only
 *    one item in `output.generic[]` actually changes between calls.
 *
 * Nested CARD/CAROUSEL/GRID/BUTTON local items are rebuilt when their parent changes,
 * keeping the id of the nested item in the same place before, so they stay mounted.
 * Orphaned nested items are pruned.
 *
 * When `hidesSilent` is set, items {@link isHiddenOutputItem} picks out get no local
 * item, the way `addMessage` stores them without showing them. Positional matching
 * counts only the items that are shown, so hiding one doesn't shift the rest.
 *
 * A `pause` item is an instruction, not content, and never gets a local item. Items at
 * or after `holdFromIndex` in `output.generic` are held back while a pause before them
 * runs, except as many as the message already showed, so nothing visible disappears.
 */
function rebuildLocalItemsForUpsert(
  state: AppState,
  message: MessageResponse,
  isStreaming = false,
  hidesSilent = true,
  holdFromIndex = Infinity
): {
  newLocalItemsByID: ObjectMap<LocalMessageItem>;
  newLocalIDsForMessage: string[];
} {
  const messageID = message.id;
  const newLocalItemsByID: ObjectMap<LocalMessageItem> = {
    ...state.allMessageItemsByID,
  };

  // Capture the previous top-level local items for this message in order.
  const prevTopLevelLocalIDs: string[] = [];
  for (const localID of state.assistantMessageState.localMessageIDs) {
    const localItem = state.allMessageItemsByID[localID];
    if (localItem && localItem.fullMessageID === messageID) {
      prevTopLevelLocalIDs.push(localID);
    }
  }
  const prevTopLevelItems = prevTopLevelLocalIDs.map(
    (id) => state.allMessageItemsByID[id]
  );

  const shownItems: GenericItem[] = (message.output?.generic ?? [])
    .map((item, index) => ({ item, index }))
    .filter(
      ({ item }) =>
        item &&
        !isPause(item) &&
        !(hidesSilent && isHiddenOutputItem(message, item))
    )
    .filter(
      ({ index }, position) =>
        index < holdFromIndex || position < prevTopLevelItems.length
    )
    .map(({ item }) => item);
  const newLocalIDsForMessage: string[] = [];

  shownItems.forEach((item, index) => {
    const streamId = streamItemID(messageID, item);
    const matchedPrev = resolvePreviousLocalItem(
      state,
      messageID,
      streamId,
      prevTopLevelItems[index]
    );
    let localItem = canReuseLocalItem(matchedPrev, item, isStreaming, message)
      ? matchedPrev
      : buildUpsertedLocalItem(
          item,
          message,
          // Keep the resolved ID so React keys and slot names stay stable.
          matchedPrev?.ui_state.id ?? streamId ?? uuid(),
          matchedPrev,
          isStreaming,
          newLocalItemsByID
        );
    if (isStreaming && keepsLastDrawn(localItem, matchedPrev)) {
      localItem = matchedPrev;
    }

    newLocalIDsForMessage.push(localItem.ui_state.id);
    newLocalItemsByID[localItem.ui_state.id] = localItem;
  });

  // Compute the set of all local-item IDs still reachable from the rebuilt top-level
  // items (including nested via body/footer/items/grid). Anything else previously
  // attached to this message is orphaned and gets pruned.
  const stillReferenced = new Set<string>();
  for (const localID of newLocalIDsForMessage) {
    collectNestedLocalIDs(
      newLocalItemsByID[localID],
      newLocalItemsByID,
      stillReferenced
    );
  }
  for (const [localID, candidate] of Object.entries(
    state.allMessageItemsByID
  )) {
    if (
      candidate &&
      candidate.fullMessageID === messageID &&
      !stillReferenced.has(localID)
    ) {
      delete newLocalItemsByID[localID];
    }
  }

  return { newLocalItemsByID, newLocalIDsForMessage };
}

/**
 * Before a message from `addMessage` or `final_response` is stored, drops the items it
 * showed that the new message has no streaming id for, and puts the rest in the new
 * message's order, where the first of them was. The new message then shows each of its
 * items the way `ADD_LOCAL_MESSAGE_ITEM` does, so an item without a streaming id comes back
 * at the end of the list, or after the item before it.
 *
 * Example: response 1 shows [1.1, 1.2], response 2 shows [2.1, 2.2, 2.3], and response 3
 * shows [3.1]. Response 2 comes again with [2.2, 2.1, 2.4]. This leaves
 * [1.1, 1.2, 2.2, 2.1, 3.1], and 2.4 shows later, as its own item.
 */
function keepStreamedItemsOnly(
  state: AppState,
  message: MessageResponse
): AppState {
  const messageID = message.id;
  const itemIDsInNewMessage = message.output.generic
    .map((item) => streamItemID(messageID, item))
    .filter(Boolean);

  const newAllMessageItemsByID = { ...state.allMessageItemsByID };
  const existingItemIDs: string[] = [];
  let firstFoundIndex: number;

  const newLocalMessageIDs = state.assistantMessageState.localMessageIDs.filter(
    (itemID, index) => {
      const isItemInMessage =
        state.allMessageItemsByID[itemID].fullMessageID === messageID;
      if (isItemInMessage) {
        if (firstFoundIndex === undefined) {
          firstFoundIndex = index;
        }
        if (itemIDsInNewMessage.includes(itemID)) {
          existingItemIDs.push(itemID);
        } else {
          delete newAllMessageItemsByID[itemID];
        }
      }
      return !isItemInMessage;
    }
  );

  const itemIDsToInsert = itemIDsInNewMessage.filter((itemID) =>
    existingItemIDs.includes(itemID)
  );
  newLocalMessageIDs.splice(firstFoundIndex ?? 0, 0, ...itemIDsToInsert);

  return {
    ...state,
    allMessageItemsByID: newAllMessageItemsByID,
    assistantMessageState: {
      ...state.assistantMessageState,
      localMessageIDs: newLocalMessageIDs,
    },
  };
}

/**
 * Returns the upserted message with the stored message's `ui_state_internal` merged under
 * its own. The chat writes that state itself (agent availability, for one), and a host
 * updater that builds a fresh message would otherwise drop it. The host's object is
 * returned as is when there is nothing to keep.
 */
function keepPriorUIStateInternal(
  message: MessageResponse,
  prevMessage: Message | undefined
): MessageResponse {
  const prior = prevMessage?.ui_state_internal;
  const current = message.ui_state_internal ?? {};
  const hasSomethingToKeep =
    prior &&
    Object.keys(prior).some(
      (key) =>
        prior[key as keyof typeof prior] !== undefined &&
        current[key as keyof typeof current] === undefined
    );
  if (!hasSomethingToKeep) {
    return message;
  }
  return { ...message, ui_state_internal: { ...prior, ...current } };
}

/**
 * Returns the stored message in place of the upserted one when nothing changed: the two
 * are deep-equal and every local item of the message kept its reference. React selectors
 * that subscribe to the whole `Message` compare by `===` and would otherwise re-render on
 * every upsert.
 */
function keepMessageRefIfUnchanged(
  state: AppState,
  message: MessageResponse,
  newLocalIDsForMessage: string[],
  newLocalItemsByID: ObjectMap<LocalMessageItem>
): Message {
  const prevMessage = state.allMessagesByID[message.id];
  const everyLocalItemReused = newLocalIDsForMessage.every((localID) => {
    const prev = state.allMessageItemsByID[localID];
    return prev !== undefined && newLocalItemsByID[localID] === prev;
  });
  return prevMessage && everyLocalItemReused && isEqual(prevMessage, message)
    ? prevMessage
    : message;
}

/**
 * Computes where the new top-level local IDs for `messageID` should be spliced back
 * into `localMessageIDs`. Splits the previous ID list into "other" IDs and the
 * index inside that filtered list at which the message's block previously started.
 * When the message is brand new, `insertPoint` is `otherLocalIDs.length` (append).
 */
function computeLocalIDInsertionPoint(
  prevLocalMessageIDs: string[],
  allMessageItemsByID: ObjectMap<LocalMessageItem>,
  messageID: string
): { otherLocalIDs: string[]; insertPoint: number } {
  const otherLocalIDs: string[] = [];
  let insertPoint = -1;
  for (const localID of prevLocalMessageIDs) {
    const item = allMessageItemsByID[localID];
    const belongsToMessage = !!(item && item.fullMessageID === messageID);
    if (belongsToMessage) {
      if (insertPoint === -1) {
        insertPoint = otherLocalIDs.length;
      }
    } else {
      otherLocalIDs.push(localID);
    }
  }
  if (insertPoint === -1) {
    insertPoint = otherLocalIDs.length;
  }
  return { otherLocalIDs, insertPoint };
}

/**
 * Adds the given full message to the redux store. This will add it global to the global map as well as add the
 * id to the specific chat type.
 */
function applyFullMessage(state: AppState, message: Message): AppState {
  // Add the original message to the global map.
  const newState = {
    ...state,
    allMessagesByID: {
      ...state.allMessagesByID,
      [message.id]: message,
    },
  };

  // Now add the full message ID to the specific ChatMessagesState but only if it's a new message.
  if (!state.allMessagesByID[message.id]) {
    const currentMessageIDs = state.assistantMessageState.messageIDs;
    const newMessageIDs = [...currentMessageIDs, message.id];
    return applyAssistantMessageState(newState, { messageIDs: newMessageIDs });
  }

  return newState;
}

/**
 * Builds the local item for the first chunk of a streamed item. The item is the chunk
 * itself, and it stays hidden (`isIntermediateStreaming`) until `final_response`, even
 * when that first chunk is already a `complete_item`. A later `complete_item` shows it,
 * unless it is a grid or a carousel (see {@link nextChunkLocalItem}).
 */
function newChunkLocalItem(
  chunkItem: DeepPartial<GenericItem>,
  message: MessageResponse,
  isComplete: boolean
): LocalMessageItem {
  const localItem = outputItemToLocalItem(chunkItem as GenericItem, message);
  localItem.ui_state.needsAnnouncement = false;
  localItem.ui_state.isIntermediateStreaming = true;
  localItem.ui_state.streamingState = isComplete
    ? { chunks: [], isDone: true }
    : { chunks: [chunkItem], isDone: false };
  if (!localItem.item.response_type) {
    throw new Error(
      `New chunk item does not have a response_type: ${JSON.stringify(
        chunkItem
      )}`
    );
  }
  return localItem;
}

/**
 * Applies a later chunk to an item already streaming. A `complete_item` merges over the
 * local item, which is still the first chunk, and settles it. It shows the item too,
 * except a grid or a carousel: chunks never build the nested items those two draw, so
 * one stays as hidden as it was until `final_response` builds it whole. A `partial_item`
 * leaves the item alone and adds the delta to `streamingState.chunks`, which renderers
 * read while the item streams.
 */
function nextChunkLocalItem(
  existing: LocalMessageItem,
  chunkItem: DeepPartial<GenericItem>,
  isComplete: boolean
): LocalMessageItem {
  if (isComplete) {
    const item = { ...existing.item, ...chunkItem } as GenericItem;
    const keepsHidden =
      isGridResponseType(item) || isCarouselResponseType(item);
    return {
      ...existing,
      item,
      ui_state: {
        ...existing.ui_state,
        isIntermediateStreaming: keepsHidden
          ? existing.ui_state.isIntermediateStreaming
          : false,
        streamingState: { chunks: [], isDone: true },
      },
    };
  }
  return {
    ...existing,
    ui_state: {
      ...existing.ui_state,
      streamingState: {
        ...existing.ui_state.streamingState,
        chunks: [
          ...(existing.ui_state.streamingState?.chunks || []),
          chunkItem,
        ],
      },
    },
  };
}

/**
 * Applies a streaming write that `addMessageChunk` makes. The message is stored as the
 * chunk path built it, and only the one local item the chunk targets changes, so the
 * message's other items keep their references. A new item goes at the end of the whole
 * list rather than with its message, and no nested items are built for it.
 */
function applyChunkWrite(
  state: AppState,
  message: MessageResponse,
  { item: chunkItem, isComplete }: MessageWriteOptions['chunk']
): AppState {
  const withMessage =
    state.allMessagesByID[message.id] === message
      ? state
      : applyFullMessage(state, message);
  // A chunk with no item only ever merged its message_options.
  if (!chunkItem) {
    return withMessage;
  }

  const localID = chunkItemLocalID(message.id, chunkItem);
  const existing = state.allMessageItemsByID[localID];
  const localItem = existing
    ? nextChunkLocalItem(existing, chunkItem, isComplete)
    : newChunkLocalItem(chunkItem, message, isComplete);

  const { localMessageIDs } = state.assistantMessageState;
  return {
    ...withMessage,
    allMessageItemsByID: { ...state.allMessageItemsByID, [localID]: localItem },
    assistantMessageState: {
      ...withMessage.assistantMessageState,
      localMessageIDs: existing
        ? localMessageIDs
        : [...localMessageIDs, localID],
    },
  };
}

export {
  DEFAULT_HEADER,
  DEFAULT_MESSAGE_STATE,
  DEFAULT_CHAT_MESSAGES_STATE,
  DEFAULT_PERSISTED_TO_BROWSER,
  DEFAULT_HUMAN_AGENT_STATE,
  VIEW_STATE_ALL_CLOSED,
  VIEW_STATE_MAIN_WINDOW_OPEN,
  VIEW_STATE_LAUNCHER_OPEN,
  DEFAULT_IFRAME_PANEL_STATE,
  DEFAULT_CITATION_PANEL_STATE,
  DEFAULT_CUSTOM_PANEL_STATE,
  DEFAULT_WORKSPACE_PANEL_STATE,
  DEFAULT_HISTORY_PANEL_STATE,
  DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS,
  PANEL_CONFIG_OPTIONS_BY_TYPE,
  DEFAULT_LAUNCHER,
  DEFAULT_MESSAGE_FOCUS_TOGGLE_SHORTCUT,
  DEFAULT_MESSAGE_PANEL_STATE,
  DEFAULT_THEME_STATE,
  DEFAULT_LAYOUT_STATE,
  DEFAULT_INPUT_STATE,
  setHomeScreenOpenState,
  applyAssistantMessageState,
  handleViewStateChange,
  applyChunkWrite,
  applyFullMessage,
  applyLocalMessageUIState,
  computeLocalIDInsertionPoint,
  rebuildLocalItemsForUpsert,
  keepStreamedItemsOnly,
  keepPriorUIStateInternal,
  keepMessageRefIfUnchanged,
};
