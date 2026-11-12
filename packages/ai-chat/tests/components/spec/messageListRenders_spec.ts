/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The message list reads its items from `instance.state.messageItems` and the
 * chat's own objects and view state from the store. Each change draws it once,
 * with both sources current, including a dispatch nested inside a host's
 * `state.subscribe` listener (#2693 O11).
 *
 * A draw is a call to `render` whose items or view state changed. React calls
 * `render` again with the same props, on the parent build too, so that call
 * doesn't count, but every call must show both sources as they are. The list's
 * scroll work keeps drawing after `act` returns, so each change is measured
 * inside its own `act`.
 */

import { act, waitFor } from '@testing-library/react';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
  type ChatInstanceWithStore,
} from '../../test_helpers';
import { MessagesComponentClass } from '../../../src/chat/components-legacy/MessagesComponent';
import { topLevelMessageItems } from '../../../src/chat/utils/drawnMessageItems';
import { viewActions } from '../../../src/chat/state';
import actions from '../../../src/sdk/store/actions';
import {
  type MessageResponse,
  MessageResponseTypes,
} from '../../../src/types/messaging/Messages';
import type { DrawnMessageItem } from '../../../src/chat/hooks/useDrawnMessageItems';

interface ListCommit {
  /** The drawn items the list drew. */
  drawnItems: readonly DrawnMessageItem[];
  /** The view state it read. */
  disclaimersAccepted: Record<string, boolean>;
  /** Whether both sources were current when it drew. */
  current: boolean;
  /** What differed from both sources, when it wasn't. */
  mismatch?: string;
}

const commits: ListCommit[] = [];
let rendered: ChatInstanceWithStore;

const response = (id: string, text: string): MessageResponse =>
  ({
    id,
    output: {
      generic: [{ response_type: MessageResponseTypes.TEXT, text }],
    },
  }) as unknown as MessageResponse;

/** What the list should draw now: the public entries, with the store's objects. */
function expectedNow() {
  const { instance, store, serviceManager } = rendered;
  const state = store.getState();
  return topLevelMessageItems(instance.state.get().messageItems).map(
    (messageItem) => ({
      messageItem,
      localMessageItem:
        state.allMessageItemsByID[
          serviceManager.publicStateService.localItemIDOf(messageItem.id)
        ],
      message: state.allMessagesByID[messageItem.messageID],
    })
  );
}

function record(list: MessagesComponentClass) {
  const { drawnItems, disclaimersAccepted } = list.props;
  if (!rendered) {
    // The list can mount before the chat's handle is returned; nothing is
    // drawn yet to compare.
    commits.push({ drawnItems, disclaimersAccepted, current: true });
    return;
  }
  const expected = expectedNow();
  const view = rendered.store.getState().view;
  let mismatch: string;
  if (drawnItems.length !== expected.length) {
    mismatch = `${drawnItems.length} items, ${expected.length} expected`;
  } else {
    drawnItems.forEach((drawn, index) =>
      (['messageItem', 'localMessageItem', 'message'] as const).forEach(
        (key) => {
          if (!mismatch && drawn[key] !== expected[index][key]) {
            mismatch = `${key} of item ${index}`;
          }
        }
      )
    );
  }
  if (
    !mismatch &&
    disclaimersAccepted !== view.persistedToBrowserStorage.disclaimersAccepted
  ) {
    mismatch = 'disclaimersAccepted';
  }
  commits.push({
    drawnItems,
    disclaimersAccepted,
    current: !mismatch,
    mismatch,
  });
}

/** The renders from `start` that drew a change, as the IDs they drew. */
function drawsSince(start: number) {
  const draws: string[][] = [];
  for (let index = Math.max(start, 1); index < commits.length; index++) {
    const commit = commits[index];
    const previous = commits[index - 1];
    if (
      commit.drawnItems !== previous.drawnItems ||
      commit.disclaimersAccepted !== previous.disclaimersAccepted
    ) {
      draws.push(commit.drawnItems.map((drawn) => drawn.messageItem.id));
    }
  }
  return draws;
}

/** Runs a change, and returns where its renders start. */
function change(run: () => void) {
  const start = commits.length;
  act(run);
  return start;
}

async function renderList() {
  const base = createBaseConfig();
  rendered = await renderChatAndGetInstanceWithStore({
    ...base,
    openChatByDefault: true,
    messaging: { ...base.messaging, skipWelcome: true },
  } as any);
  await waitFor(() => expect(rendered.store.getState().isHydrated).toBe(true));
  act(() => {
    rendered.store.dispatch(actions.updateHasSentNonWelcomeMessage(true));
  });
  await waitFor(() => expect(commits.length).toBeGreaterThan(0));
  return rendered;
}

beforeEach(() => {
  setupBeforeEach();
  commits.length = 0;
  rendered = undefined;
  const { render } = MessagesComponentClass.prototype;
  jest
    .spyOn(MessagesComponentClass.prototype, 'render')
    .mockImplementation(function (this: MessagesComponentClass) {
      record(this);
      return render.call(this);
    });
});

afterEach(() => {
  jest.restoreAllMocks();
  setupAfterEach();
});

describe('the message list reading public and store state', () => {
  it('draws once per change, with both sources current', async () => {
    const { store } = await renderList();

    const start = change(() => {
      store.dispatch(actions.upsertMessage(response('r1', 'One')));
    });

    expect(drawsSince(start)).toEqual([['r1:i:0']]);
    expect(commits.filter((commit) => !commit.current)).toEqual([]);
  });

  it('draws once for a dispatch nested in a state.subscribe listener', async () => {
    const { instance, store } = await renderList();
    let nested = 0;
    const unsubscribe = instance.state.subscribe(() => {
      // The first notification that lists r1 dispatches a view change and a
      // second message while r1 is still being published.
      const ids = topLevelMessageItems(instance.state.get().messageItems).map(
        (item) => item.id
      );
      if (ids.includes('r1:i:0') && !nested++) {
        store.dispatch(viewActions.acceptDisclaimer());
        store.dispatch(actions.upsertMessage(response('r2', 'Two')));
      }
    });

    const start = change(() => {
      store.dispatch(actions.upsertMessage(response('r1', 'One')));
    });
    unsubscribe();

    expect(nested).toBeGreaterThan(0);
    expect(drawsSince(start)).toEqual([['r1:i:0', 'r2:i:0']]);
    expect(
      Object.keys(commits.at(-1).disclaimersAccepted).length
    ).toBeGreaterThan(0);
    expect(commits.filter((commit) => !commit.current)).toEqual([]);
  });
});
