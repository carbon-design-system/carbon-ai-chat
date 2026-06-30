/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import isEqual from "lodash-es/isEqual.js";

import { VERSION } from "../utils/environmentVariables";
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
} from "../../types/state/AppState";
import {
  DefaultCustomPanelConfigOptions,
  WorkspaceCustomPanelConfigOptions,
  PanelType,
  PanelConfigOptionsByType,
} from "../../types/instance/apiTypes";
import {
  LauncherConfig,
  TIME_TO_ENTRANCE_ANIMATION_START,
} from "../../types/config/LauncherConfig";
import {
  CornersType,
  DEFAULT_CUSTOM_PANEL_ID,
  WORKSPACE_CUSTOM_PANEL_ID,
} from "../utils/constants";
import { deepFreeze } from "../utils/lang/objectUtils";
import {
  HeaderConfig,
  MinimizeButtonIconType,
} from "../../types/config/HeaderConfig";
import { LayoutConfig } from "../../types/config/LayoutConfig";
import {
  LocalMessageItem,
  LocalMessageUIState,
} from "../../types/messaging/LocalMessageItem";
import {
  GenericItem,
  Message,
  MessageResponse,
} from "../../types/messaging/Messages";
import ObjectMap from "../../types/utilities/ObjectMap";
import {
  createLocalMessageItemsForNestedMessageItems,
  outputItemToLocalItem,
} from "../schema/outputItemToLocalItem";
import { isResponseWithNestedItems, streamItemID } from "../utils/messageUtils";
import { uuid } from "@carbon/ai-chat-components/es/globals/utils/uuid.js";

/**
 * Miscellaneous utilities to help in reducers.
 */

const DEFAULT_HEADER: HeaderConfig = {
  isOn: true,
  minimizeButtonIconType: MinimizeButtonIconType.MINIMIZE,
  showAiLabel: true,
  hideDefaultAiLabelContent: false,
  hasContentMaxWidth: false,
};

deepFreeze(DEFAULT_HEADER);

const DEFAULT_LAUNCHER: LauncherConfig = {
  isOn: true,
  mobile: {
    isOn: false,
    title: "",
    timeToExpand: TIME_TO_ENTRANCE_ANIMATION_START,
  },
  desktop: {
    isOn: false,
    title: "",
    timeToExpand: TIME_TO_ENTRANCE_ANIMATION_START,
  },
};
deepFreeze(DEFAULT_LAUNCHER);

const DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS: DefaultCustomPanelConfigOptions = {
  hideBackButton: false,
  disableAnimation: false,
  fullWidth: false,
  backButtonType: "minimize",
  showChatHeader: false,
  openFromSide: false,
};
deepFreeze(DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS);

const WORKSPACE_CUSTOM_PANEL_CONFIG_OPTIONS: WorkspaceCustomPanelConfigOptions =
  {
    preferredLocation: "end",
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
  rawValue: "",
  content: [],
  focused: false,
  fieldVisible: true,
  isDisabled: false,
  isReadonly: false,
  files: [],
  allowFileUploads: false,
  allowMultipleFileUploads: false,
  allowedFileUploadTypes: null,
  stopStreamingButtonState: {
    currentStreamID: null,
    isVisible: false,
    isDisabled: false,
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
  newViewState: ViewState,
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
      ? "window_ariaWindowOpened"
      : "window_ariaWindowClosed",
  };
}

/**
 * Returns a new state that has the {@link ChatMessagesState} modified for the given chat type with the new properties.
 * If the chat state is for a thread, then the thread that is currently being viewed will be modified.
 */
function applyAssistantMessageState(
  state: AppState,
  newState: Partial<ChatMessagesState>,
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
  viewState: ViewState,
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
  showBackToAssistant?: boolean,
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
  propertyValue: LocalMessageUIState[TPropertyName],
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
  out: Set<string>,
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
    row.forEach((cell) => cell.forEach(walk)),
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
 *    skip re-rendering. This matches the pattern in `[STREAMING_ADD_CHUNK]` and is
 *    critical when only one item in `output.generic[]` actually changes between calls.
 *
 * Nested CARD/CAROUSEL/GRID/BUTTON local items are rebuilt when their parent changes;
 * orphaned nested items are pruned.
 */
function rebuildLocalItemsForUpsert(
  state: AppState,
  message: MessageResponse,
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
    (id) => state.allMessageItemsByID[id],
  );

  const generic: GenericItem[] = message.output?.generic ?? [];
  const newLocalIDsForMessage: string[] = [];

  generic.forEach((item, index) => {
    if (!item) {
      return;
    }

    // Resolve the previous local item to match against:
    // 1. Streaming-id match (preferred).
    // 2. Positional fallback when the previous item at this index had no streaming id.
    const streamId = streamItemID(messageID, item);
    let matchedPrev: LocalMessageItem | undefined;
    if (streamId && state.allMessageItemsByID[streamId]) {
      const candidate = state.allMessageItemsByID[streamId];
      if (candidate.fullMessageID === messageID) {
        matchedPrev = candidate;
      }
    }
    if (!matchedPrev) {
      const positional = prevTopLevelItems[index];
      if (
        positional &&
        !streamItemID(messageID, positional.item) &&
        !streamId
      ) {
        matchedPrev = positional;
      }
    }

    let localID: string;
    let localItem: LocalMessageItem;

    if (matchedPrev && isEqual(matchedPrev.item, item)) {
      // Reference-stable path: deep-equal to the prior item, keep the exact object so
      // selectors comparing by `===` see no change.
      //
      // Cross-file invariant: `MessageUpsertCoordinator.snapshotLocalItemRefs` /
      // `fanOutChangedSlots` rely on this `===`-preservation to dedupe
      // `USER_DEFINED_RESPONSE` fan-out after dispatch. Don't rebuild a fresh
      // `LocalMessageItem` here when the item is unchanged.
      localID = matchedPrev.ui_state.id;
      localItem = matchedPrev;
    } else {
      // Build a fresh local item but preserve the resolved ID so React keys and slot
      // names remain stable.
      localID = matchedPrev?.ui_state.id ?? streamId ?? uuid();
      localItem = outputItemToLocalItem(item, message, false);
      localItem.ui_state.id = localID;
      localItem.fullMessageID = messageID;

      if (isResponseWithNestedItems(localItem.item)) {
        const nestedLocalItems: LocalMessageItem[] = [];
        createLocalMessageItemsForNestedMessageItems(
          localItem,
          message,
          false,
          nestedLocalItems,
          true,
        );
        for (const nested of nestedLocalItems) {
          newLocalItemsByID[nested.ui_state.id] = nested;
        }
      }
    }

    newLocalIDsForMessage.push(localID);
    newLocalItemsByID[localID] = localItem;
  });

  // Compute the set of all local-item IDs still reachable from the rebuilt top-level
  // items (including nested via body/footer/items/grid). Anything else previously
  // attached to this message is orphaned and gets pruned.
  const stillReferenced = new Set<string>();
  for (const localID of newLocalIDsForMessage) {
    collectNestedLocalIDs(
      newLocalItemsByID[localID],
      newLocalItemsByID,
      stillReferenced,
    );
  }
  for (const [localID, candidate] of Object.entries(
    state.allMessageItemsByID,
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
 * Computes where the new top-level local IDs for `messageID` should be spliced back
 * into `localMessageIDs`. Splits the previous ID list into "other" IDs and the
 * index inside that filtered list at which the message's block previously started.
 * When the message is brand new, `insertPoint` is `otherLocalIDs.length` (append).
 */
function computeLocalIDInsertionPoint(
  prevLocalMessageIDs: string[],
  allMessageItemsByID: ObjectMap<LocalMessageItem>,
  messageID: string,
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
  WORKSPACE_CUSTOM_PANEL_CONFIG_OPTIONS,
  PANEL_CONFIG_OPTIONS_BY_TYPE,
  DEFAULT_LAUNCHER,
  DEFAULT_MESSAGE_PANEL_STATE,
  DEFAULT_THEME_STATE,
  DEFAULT_LAYOUT_STATE,
  DEFAULT_INPUT_STATE,
  setHomeScreenOpenState,
  applyAssistantMessageState,
  handleViewStateChange,
  applyFullMessage,
  applyLocalMessageUIState,
  computeLocalIDInsertionPoint,
  rebuildLocalItemsForUpsert,
};
