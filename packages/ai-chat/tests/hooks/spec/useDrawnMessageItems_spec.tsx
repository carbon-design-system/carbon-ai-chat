/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The message list draws the entries of `instance.state.messageItems`, each
 * with the chat's own local item and message, and finds nested items by their
 * parent's ID and list.
 */

import React, { type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
  TestChatContext,
  type ChatInstanceWithStore,
} from '../../test_helpers';
import {
  useDrawnMessageItems,
  useMessageItem,
  useNestedMessageItems,
} from '../../../src/chat/hooks/useDrawnMessageItems';
import { usePublicChatState } from '../../../src/chat/hooks/usePublicChatState';
import { topLevelMessageItems } from '../../../src/chat/utils/drawnMessageItems';
import actions from '../../../src/sdk/store/actions';
import type { ServiceManager } from '../../../src/sdk/services/ServiceManager';
import {
  type MessageResponse,
  MessageResponseTypes,
} from '../../../src/types/messaging/Messages';

let rendered: ChatInstanceWithStore;

const response = (id: string, generic: unknown[]): MessageResponse =>
  ({ id, output: { generic } }) as unknown as MessageResponse;

const text = (value: string) => ({
  response_type: MessageResponseTypes.TEXT,
  text: value,
});

const button = (label: string) => ({
  response_type: MessageResponseTypes.BUTTON,
  button_type: 'post_back',
  label,
  value: { input: { text: label } },
});

/** The chat's own service manager; `instance.serviceManager` is a plain copy. */
function chatManager(): ServiceManager {
  return (
    rendered.serviceManager.messageCoordinator as unknown as {
      serviceManager: ServiceManager;
    }
  ).serviceManager;
}

function wrapper({ children }: { children?: ReactNode }) {
  return (
    <TestChatContext serviceManager={chatManager()}>{children}</TestChatContext>
  );
}

function useTopLevel() {
  const items = usePublicChatState((state) =>
    topLevelMessageItems(state.messageItems)
  );
  return useDrawnMessageItems(items);
}

/** The local ID of the store's top-level item at `index`. */
function localIDAt(index: number) {
  return rendered.store.getState().assistantMessageState.localMessageIDs[index];
}

beforeEach(async () => {
  setupBeforeEach();
  const base = createBaseConfig();
  rendered = await renderChatAndGetInstanceWithStore({
    ...base,
    openChatByDefault: true,
    messaging: { ...base.messaging, skipWelcome: true },
  } as any);
  await waitFor(() => expect(rendered.store.getState().isHydrated).toBe(true));
});

afterEach(() => {
  setupAfterEach();
});

describe('useDrawnMessageItems', () => {
  it('pairs each entry with the chat local item and message, and keeps the array', () => {
    const { store, instance } = rendered;
    act(() => {
      store.dispatch(
        actions.upsertMessage(response('r1', [text('One'), text('Two')]))
      );
    });
    const { result } = renderHook(useTopLevel, { wrapper });
    const state = store.getState();

    expect(result.current.map((drawn) => drawn.messageItem)).toEqual(
      instance.state.get().messageItems
    );
    expect(result.current.map((drawn) => drawn.localMessageItem)).toEqual([
      state.allMessageItemsByID[localIDAt(0)],
      state.allMessageItemsByID[localIDAt(1)],
    ]);
    result.current.forEach((drawn) =>
      expect(drawn.message).toBe(state.allMessagesByID.r1)
    );

    const before = result.current;
    act(() => {
      store.dispatch(actions.setIsRestarting(false));
    });
    expect(result.current).toBe(before);
  });

  it('draws a local item change that leaves the public entry as it was', () => {
    const { store, instance } = rendered;
    act(() => {
      store.dispatch(actions.upsertMessage(response('r1', [text('One')])));
    });
    const { result } = renderHook(useTopLevel, { wrapper });
    const entries = instance.state.get().messageItems;
    const local = store.getState().allMessageItemsByID[localIDAt(0)];

    act(() => {
      store.dispatch(
        actions.updateLocalMessageItem({
          ...local,
          ui_state: { ...local.ui_state, connectToAgentHandled: true },
        })
      );
    });

    expect(instance.state.get().messageItems).toBe(entries);
    expect(result.current[0].messageItem).toBe(entries[0]);
    expect(result.current[0].localMessageItem).not.toBe(local);
    expect(result.current[0].localMessageItem).toBe(
      store.getState().allMessageItemsByID[localIDAt(0)]
    );
  });

  it('finds an item and its nested lists by public ID', () => {
    const { store } = rendered;
    act(() => {
      store.dispatch(
        actions.upsertMessage(
          response('r1', [
            {
              response_type: MessageResponseTypes.CARD,
              body: [text('Body one'), text('Body two')],
              footer: [button('Go')],
            },
            {
              response_type: MessageResponseTypes.GRID,
              columns: [{ width: '1' }, { width: '1' }],
              rows: [
                {
                  cells: [
                    { items: [text('A')] },
                    { items: [text('B'), text('C')] },
                  ],
                },
              ],
            },
          ])
        )
      );
    });
    const card = localIDAt(0);
    const grid = localIDAt(1);
    const ids = (drawn: readonly { messageItem: { id: string } }[]) =>
      drawn.map(({ messageItem }) => messageItem.id);

    const { result } = renderHook(
      () => ({
        card: useMessageItem(card),
        body: useNestedMessageItems(card, 'body'),
        footer: useNestedMessageItems(card, 'footer'),
        firstCell: useNestedMessageItems(grid, { row: 0, column: 0 }),
        secondCell: useNestedMessageItems(grid, { row: 0, column: 1 }),
        noCell: useNestedMessageItems(grid, { row: 1, column: 0 }),
      }),
      { wrapper }
    );

    expect(result.current.card.id).toBe('r1:i:0');
    expect(ids(result.current.body)).toEqual(['r1:i:0:i:0', 'r1:i:0:i:1']);
    expect(
      result.current.body.map(({ localMessageItem }) => localMessageItem.item)
    ).toEqual([text('Body one'), text('Body two')]);
    expect(ids(result.current.footer)).toEqual(['r1:i:0:f:0']);
    expect(ids(result.current.firstCell)).toEqual(['r1:i:1:i:0.0.0']);
    expect(ids(result.current.secondCell)).toEqual([
      'r1:i:1:i:0.1.0',
      'r1:i:1:i:0.1.1',
    ]);
    expect(result.current.noCell).toEqual([]);
    const { gridLocalMessageItemIDs } =
      store.getState().allMessageItemsByID[grid].ui_state;
    expect(
      result.current.secondCell.map(
        ({ localMessageItem }) => localMessageItem.ui_state.id
      )
    ).toEqual(gridLocalMessageItemIDs[0][1]);
  });
});
