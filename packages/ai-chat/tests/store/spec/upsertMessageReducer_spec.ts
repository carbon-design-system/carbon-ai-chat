/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createAppStore } from "../../../src/chat/store/appStore";
import {
  buildLanguagePack,
  createAppConfig,
} from "../../../src/chat/store/doCreateStore";
import actions from "../../../src/chat/store/actions";
import { reducers } from "../../../src/chat/store/reducers";
import { AppState } from "../../../src/types/state/AppState";
import {
  DEFAULT_CITATION_PANEL_STATE,
  DEFAULT_CUSTOM_PANEL_STATE,
  DEFAULT_WORKSPACE_PANEL_STATE,
  DEFAULT_HISTORY_PANEL_STATE,
  DEFAULT_IFRAME_PANEL_STATE,
  DEFAULT_INPUT_STATE,
  DEFAULT_MESSAGE_PANEL_STATE,
  DEFAULT_CHAT_MESSAGES_STATE,
  DEFAULT_PERSISTED_TO_BROWSER,
  DEFAULT_HUMAN_AGENT_STATE,
  VIEW_STATE_ALL_CLOSED,
} from "../../../src/chat/store/reducerUtils";
import {
  CardItem,
  MessageResponse,
  MessageResponseTypes,
} from "../../../src/types/messaging/Messages";

function rootReducer(
  state: AppState,
  action: { type: string; [key: string]: unknown } | undefined,
): AppState {
  return action && reducers[action.type]
    ? reducers[action.type](state, action)
    : state;
}

function createInitialAppState(): AppState {
  const config = createAppConfig({});
  return {
    config,
    languagePack: buildLanguagePack(config.public.strings),
    allMessageItemsByID: {},
    allMessagesByID: {},
    targetViewState: VIEW_STATE_ALL_CLOSED,
    viewChanging: false,
    assistantMessageState: DEFAULT_CHAT_MESSAGES_STATE,
    isHydrated: false,
    suspendScrollDetection: false,
    showNonHeaderBackgroundCover: false,
    isRestarting: false,
    isBrowserPageVisible: true,
    chatWidthBreakpoint: null,
    chatWidth: null,
    chatHeight: null,
    assistantInputState: DEFAULT_INPUT_STATE,
    humanAgentState: DEFAULT_HUMAN_AGENT_STATE,
    persistedToBrowserStorage: {
      ...DEFAULT_PERSISTED_TO_BROWSER,
      homeScreenState: { isHomeScreenOpen: false, showBackToAssistant: false },
    },
    viewSourcePanelState: DEFAULT_CITATION_PANEL_STATE,
    iFramePanelState: DEFAULT_IFRAME_PANEL_STATE,
    customPanelState: DEFAULT_CUSTOM_PANEL_STATE,
    workspacePanelState: DEFAULT_WORKSPACE_PANEL_STATE,
    historyPanelState: DEFAULT_HISTORY_PANEL_STATE,
    responsePanelState: DEFAULT_MESSAGE_PANEL_STATE,
    announceMessage: undefined,
    initialViewChangeComplete: false,
  };
}

function makeTextResponse(
  id: string,
  texts: string[],
  streamingIds?: string[],
): MessageResponse {
  return {
    id,
    output: {
      generic: texts.map((text, i) => ({
        response_type: MessageResponseTypes.TEXT,
        text,
        ...(streamingIds?.[i]
          ? { streaming_metadata: { id: streamingIds[i] } }
          : {}),
      })),
    },
  };
}

function localItemsForMessage(state: AppState, messageID: string) {
  return state.assistantMessageState.localMessageIDs
    .map((id) => state.allMessageItemsByID[id])
    .filter((item) => item && item.fullMessageID === messageID);
}

describe("[UPSERT_MESSAGE] reducer", () => {
  let store: ReturnType<typeof createAppStore>;

  beforeEach(() => {
    store = createAppStore(rootReducer, createInitialAppState());
  });

  it("inserts a brand-new message and its local items", () => {
    const message = makeTextResponse("m1", ["hello"]);

    store.dispatch(actions.upsertMessage(message));
    const state = store.getState() as AppState;

    expect(state.allMessagesByID["m1"]).toBe(message);
    expect(state.assistantMessageState.messageIDs).toEqual(["m1"]);
    expect(state.assistantMessageState.activeResponseId).toBe("m1");
    const locals = localItemsForMessage(state, "m1");
    expect(locals).toHaveLength(1);
    expect((locals[0].item as any).text).toBe("hello");
  });

  it("preserves position in messageIDs[] across re-upserts", () => {
    store.dispatch(actions.upsertMessage(makeTextResponse("m1", ["one"])));
    store.dispatch(actions.upsertMessage(makeTextResponse("m2", ["two"])));
    store.dispatch(actions.upsertMessage(makeTextResponse("m3", ["three"])));

    // Re-upsert m2 with new text.
    store.dispatch(actions.upsertMessage(makeTextResponse("m2", ["TWO"])));

    const state = store.getState() as AppState;
    expect(state.assistantMessageState.messageIDs).toEqual(["m1", "m2", "m3"]);
    const locals = localItemsForMessage(state, "m2");
    expect(locals).toHaveLength(1);
    expect((locals[0].item as any).text).toBe("TWO");
  });

  it("reuses the LocalMessageItem reference verbatim when an item is deep-equal", () => {
    const first = makeTextResponse("m1", ["alpha", "beta"], ["a", "b"]);
    store.dispatch(actions.upsertMessage(first));

    const stateBefore = store.getState() as AppState;
    const localsBefore = localItemsForMessage(stateBefore, "m1");
    expect(localsBefore).toHaveLength(2);
    const refAlphaBefore = localsBefore[0];
    const refBetaBefore = localsBefore[1];

    // Re-upsert with the second item changed. The first item is deep-equal to the
    // previous, so its LocalMessageItem reference must be reused verbatim.
    const second = makeTextResponse("m1", ["alpha", "BETA-2"], ["a", "b"]);
    store.dispatch(actions.upsertMessage(second));

    const stateAfter = store.getState() as AppState;
    const localsAfter = localItemsForMessage(stateAfter, "m1");
    expect(localsAfter).toHaveLength(2);

    // Reference stability — sibling did not change, reference must be identical.
    expect(Object.is(localsAfter[0], refAlphaBefore)).toBe(true);

    // Changed item gets a new object reference.
    expect(Object.is(localsAfter[1], refBetaBefore)).toBe(false);
    expect((localsAfter[1].item as any).text).toBe("BETA-2");

    // IDs are stable (streaming-id match).
    expect(localsAfter[0].ui_state.id).toBe(refAlphaBefore.ui_state.id);
    expect(localsAfter[1].ui_state.id).toBe(refBetaBefore.ui_state.id);
  });

  it("reuses local item ids positionally when no streaming_metadata.id is present", () => {
    const first = makeTextResponse("m1", ["alpha", "beta"]);
    store.dispatch(actions.upsertMessage(first));

    const stateBefore = store.getState() as AppState;
    const localsBefore = localItemsForMessage(stateBefore, "m1");
    const firstIDBefore = localsBefore[0].ui_state.id;
    const secondIDBefore = localsBefore[1].ui_state.id;

    const second = makeTextResponse("m1", ["alpha", "BETA-2"]);
    store.dispatch(actions.upsertMessage(second));

    const stateAfter = store.getState() as AppState;
    const localsAfter = localItemsForMessage(stateAfter, "m1");
    expect(localsAfter[0].ui_state.id).toBe(firstIDBefore);
    expect(localsAfter[1].ui_state.id).toBe(secondIDBefore);
    // Reference stable for unchanged item.
    expect(Object.is(localsAfter[0], localsBefore[0])).toBe(true);
  });

  it("keeps the same allMessagesByID reference when nothing changed", () => {
    const message = makeTextResponse("m1", ["alpha"], ["a"]);
    store.dispatch(actions.upsertMessage(message));
    const stateBefore = store.getState() as AppState;
    const messageRefBefore = stateBefore.allMessagesByID["m1"];

    // Re-upsert with deep-equal content — should reuse the existing reference.
    store.dispatch(
      actions.upsertMessage(makeTextResponse("m1", ["alpha"], ["a"])),
    );
    const stateAfter = store.getState() as AppState;
    expect(stateAfter.allMessagesByID["m1"]).toBe(messageRefBefore);
  });

  it("prunes dropped items from allMessageItemsByID", () => {
    store.dispatch(
      actions.upsertMessage(
        makeTextResponse("m1", ["alpha", "beta"], ["a", "b"]),
      ),
    );
    expect(
      localItemsForMessage(store.getState() as AppState, "m1"),
    ).toHaveLength(2);

    // Re-upsert with only one item; the second should be pruned.
    store.dispatch(
      actions.upsertMessage(makeTextResponse("m1", ["alpha"], ["a"])),
    );
    const stateAfter = store.getState() as AppState;
    expect(localItemsForMessage(stateAfter, "m1")).toHaveLength(1);
    // Make sure the dropped item is not in allMessageItemsByID at all.
    const allItems = Object.values(stateAfter.allMessageItemsByID);
    const dropped = allItems.filter(
      (item) =>
        item.fullMessageID === "m1" && (item.item as any).text === "beta",
    );
    expect(dropped).toHaveLength(0);
  });

  it("rebuilds nested local items inside a CARD container", () => {
    const card: CardItem = {
      response_type: MessageResponseTypes.CARD,
      body: [
        { response_type: MessageResponseTypes.TEXT, text: "card-text-1" },
        { response_type: MessageResponseTypes.TEXT, text: "card-text-2" },
      ],
    };
    const message: MessageResponse = {
      id: "m1",
      output: { generic: [card] },
    };

    store.dispatch(actions.upsertMessage(message));
    const state = store.getState() as AppState;

    const tops = localItemsForMessage(state, "m1");
    expect(tops).toHaveLength(1);
    const nestedIDs = tops[0].ui_state.bodyLocalMessageItemIDs ?? [];
    expect(nestedIDs).toHaveLength(2);
    expect((state.allMessageItemsByID[nestedIDs[0]].item as any).text).toBe(
      "card-text-1",
    );
    expect((state.allMessageItemsByID[nestedIDs[1]].item as any).text).toBe(
      "card-text-2",
    );
  });

  it("activates the upserted message as the active response", () => {
    store.dispatch(actions.upsertMessage(makeTextResponse("m1", ["one"])));
    store.dispatch(actions.upsertMessage(makeTextResponse("m2", ["two"])));

    const state = store.getState() as AppState;
    expect(state.assistantMessageState.activeResponseId).toBe("m2");
  });

  it("preserves references for items belonging to other messages when one is upserted", () => {
    store.dispatch(
      actions.upsertMessage(
        makeTextResponse("m1", ["m1-a", "m1-b"], ["1a", "1b"]),
      ),
    );
    store.dispatch(
      actions.upsertMessage(
        makeTextResponse("m2", ["m2-a", "m2-b"], ["2a", "2b"]),
      ),
    );
    store.dispatch(
      actions.upsertMessage(
        makeTextResponse("m3", ["m3-a", "m3-b"], ["3a", "3b"]),
      ),
    );

    const before = store.getState() as AppState;
    const m1RefsBefore = localItemsForMessage(before, "m1");
    const m3RefsBefore = localItemsForMessage(before, "m3");
    const m1MessageRefBefore = before.allMessagesByID["m1"];
    const m3MessageRefBefore = before.allMessagesByID["m3"];

    // Mutate only m2.
    store.dispatch(
      actions.upsertMessage(
        makeTextResponse("m2", ["m2-a", "m2-B!"], ["2a", "2b"]),
      ),
    );

    const after = store.getState() as AppState;
    const m1RefsAfter = localItemsForMessage(after, "m1");
    const m3RefsAfter = localItemsForMessage(after, "m3");

    // Sibling-message LocalMessageItems must keep their references.
    expect(Object.is(m1RefsAfter[0], m1RefsBefore[0])).toBe(true);
    expect(Object.is(m1RefsAfter[1], m1RefsBefore[1])).toBe(true);
    expect(Object.is(m3RefsAfter[0], m3RefsBefore[0])).toBe(true);
    expect(Object.is(m3RefsAfter[1], m3RefsBefore[1])).toBe(true);

    // The whole-message references for unrelated messages must also be stable.
    expect(after.allMessagesByID["m1"]).toBe(m1MessageRefBefore);
    expect(after.allMessagesByID["m3"]).toBe(m3MessageRefBefore);
  });
});
