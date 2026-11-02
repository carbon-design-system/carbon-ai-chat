/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
import { PublicStateSnapshotCache } from '../../../src/chat/utils/publicState';
import {
  makeConfigStore,
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from '../../test_helpers';
import { createCustomPanelInstance } from '../../../src/chat/services/CustomPanelInstance';
import { ServiceManager } from '../../../src/chat/services/ServiceManager';
import { PanelType } from '../../../src/types/instance/apiTypes';
import { BusEventType } from '../../../src/types/events/eventBusTypes';
import actions from '../../../src/chat/store/actions';
import {
  MessageResponse,
  MessageResponseTypes,
  PreviewCardItem,
} from '../../../src/types/messaging/Messages';

function fixture(fire: (event: any) => Promise<void>) {
  const store = makeConfigStore({});
  const manager = {
    restartCount: 0,
    store,
    eventBus: { fire },
    instance: {},
  } as unknown as ServiceManager;
  return {
    store,
    manager,
    panel: createCustomPanelInstance(PanelType.WORKSPACE, manager),
  };
}

describe('workspace event ownership', () => {
  it.each(
    [
      BusEventType.WORKSPACE_PRE_OPEN,
      BusEventType.WORKSPACE_OPEN,
      BusEventType.WORKSPACE_PRE_CLOSE,
      BusEventType.WORKSPACE_CLOSE,
    ].flatMap((type) => [false, true].map((readEarly) => ({ type, readEarly })))
  )(
    'isolates retained preview messages for $type (read early: $readEarly)',
    async ({ type, readEarly }) => {
      const cache = new PublicStateSnapshotCache();
      let snapshot: ReturnType<PublicStateSnapshotCache['createSnapshot']>;
      let workingMessage: MessageResponse;
      const { store, panel } = fixture(async (event) => {
        expect(event.data.message).toBe(
          event.data.fullMessage.output.generic[0]
        );
        if (workingMessage) {
          expect(event.data.fullMessage).toBe(workingMessage);
        }
        workingMessage = event.data.fullMessage;
        if (event.type === type) {
          snapshot = cache.createSnapshot(store.getState());
          if (readEarly) {
            expect(snapshot.messages[0]).toMatchObject({
              output: { generic: [{ title: 'before' }] },
            });
          }
          event.data.message.title = 'after';
          event.data.fullMessage.output.generic[0].description = 'accepted';
        }
      });
      const item: PreviewCardItem = {
        response_type: MessageResponseTypes.PREVIEW_CARD,
        workspace_id: '',
        title: 'before',
      };
      store.dispatch(
        actions.upsertMessage({ id: 'preview', output: { generic: [item] } })
      );
      const message = store.getState().allMessagesByID.preview;
      const localItem = Object.values(store.getState().allMessageItemsByID)[0];
      // Match PreviewCardComponent's dispatch and public open options, including an empty workspace ID.
      store.dispatch(
        actions.setWorkspacePanelData({
          workspaceID: item.workspace_id,
          fullMessage: message,
          localMessageItem: localItem,
        })
      );
      await panel.open({
        ...item.workspace_options,
        workspaceId: item.workspace_id,
        additionalData: item.additional_data,
      });
      if (
        type === BusEventType.WORKSPACE_PRE_CLOSE ||
        type === BusEventType.WORKSPACE_CLOSE
      ) {
        await panel.close();
      }
      expect(snapshot.messages[0]).toMatchObject({
        output: { generic: [{ title: 'before' }] },
      });
      expect(
        (snapshot.messages[0] as MessageResponse).output.generic[0]
      ).not.toHaveProperty('description');
      expect(cache.createSnapshot(store.getState()).messages[0]).toMatchObject({
        output: { generic: [{ title: 'after', description: 'accepted' }] },
      });
      expect(
        store.getState().allMessageItemsByID[localItem.ui_state.id].item
      ).toMatchObject({ title: 'after', description: 'accepted' });
    }
  );

  it.each(['remove', 'replace'])(
    'does not write retained preview edits after a handler %ss the message',
    async (change) => {
      const { store, panel } = fixture(async (event) => {
        if (event.type === BusEventType.WORKSPACE_PRE_CLOSE) {
          if (change === 'remove') {
            store.dispatch(actions.removeMessages(['preview']));
          } else {
            store.dispatch(
              actions.upsertMessage({
                id: 'preview',
                output: {
                  generic: [
                    {
                      response_type: MessageResponseTypes.PREVIEW_CARD,
                      workspace_id: '',
                      title: 'replacement',
                    },
                  ],
                },
              })
            );
          }
          event.data.message.title = 'obsolete';
        }
      });
      const item: PreviewCardItem = {
        response_type: MessageResponseTypes.PREVIEW_CARD,
        workspace_id: '',
        title: 'before',
      };
      store.dispatch(
        actions.upsertMessage({ id: 'preview', output: { generic: [item] } })
      );
      store.dispatch(
        actions.setWorkspacePanelData({
          workspaceID: '',
          fullMessage: store.getState().allMessagesByID.preview,
          localMessageItem: Object.values(
            store.getState().allMessageItemsByID
          )[0],
        })
      );
      await panel.open({ workspaceId: '' });
      await panel.close();
      if (change === 'remove') {
        expect(store.getState().allMessagesByID.preview).toBeUndefined();
      } else {
        expect(store.getState().allMessagesByID.preview).toMatchObject({
          output: { generic: [{ title: 'replacement' }] },
        });
      }
    }
  );

  it('applies retained preview fullMessage edits to sibling local items', async () => {
    const { store, panel } = fixture(async (event) => {
      if (event.type === BusEventType.WORKSPACE_PRE_OPEN) {
        event.data.fullMessage.output.generic[1].text = 'sibling-after';
      }
    });
    const item: PreviewCardItem = {
      response_type: MessageResponseTypes.PREVIEW_CARD,
      workspace_id: '',
      title: 'preview',
    };
    store.dispatch(
      actions.upsertMessage({
        id: 'preview',
        output: {
          generic: [
            item,
            {
              response_type: MessageResponseTypes.TEXT,
              text: 'sibling-before',
            },
          ],
        },
      })
    );
    const localItems = Object.values(store.getState().allMessageItemsByID);
    const previewItem = localItems.find(
      (local) => local.item.response_type === MessageResponseTypes.PREVIEW_CARD
    );
    const sibling = localItems.find(
      (local) => local.item.response_type === MessageResponseTypes.TEXT
    );
    store.dispatch(
      actions.setWorkspacePanelData({
        workspaceID: '',
        fullMessage: store.getState().allMessagesByID.preview,
        localMessageItem: previewItem,
      })
    );
    await panel.open({ workspaceId: '' });
    expect(
      (store.getState().allMessagesByID.preview as MessageResponse).output
        .generic[1]
    ).toMatchObject({ text: 'sibling-after' });
    expect(
      store.getState().allMessageItemsByID[sibling.ui_state.id].item
    ).toMatchObject({ text: 'sibling-after' });
  });

  it.each(['host options', 'preview options'])(
    'keeps additionalData identity and handler edits for %s',
    async (path) => {
      const additionalData = { value: 'before' };
      let eventData: any;
      const { store, panel } = fixture(async (event) => {
        if (
          [
            BusEventType.WORKSPACE_PRE_OPEN,
            BusEventType.WORKSPACE_OPEN,
            BusEventType.WORKSPACE_PRE_CLOSE,
            BusEventType.WORKSPACE_CLOSE,
          ].includes(event.type)
        ) {
          expect(event.data.additionalData).toBe(additionalData);
          eventData = event.data.additionalData;
          event.data.additionalData.value = 'edited';
        }
      });
      if (path === 'preview options') {
        store.dispatch(
          actions.setWorkspacePanelData({
            workspaceID: 'workspace',
            additionalData,
          })
        );
      }
      await panel.open({ workspaceId: 'workspace', additionalData });
      expect(store.getState().workspacePanelState.additionalData).toEqual(
        additionalData
      );
      await panel.close();
      expect(eventData).toBe(additionalData);
      expect(additionalData.value).toBe('edited');
      expect(
        store.getState().workspacePanelState.additionalData
      ).toBeUndefined();
    }
  );
  it.each(
    [
      BusEventType.WORKSPACE_PRE_OPEN,
      BusEventType.WORKSPACE_OPEN,
      BusEventType.WORKSPACE_PRE_CLOSE,
      BusEventType.WORKSPACE_CLOSE,
    ].flatMap((type) => [false, true].map((readEarly) => ({ type, readEarly })))
  )(
    'keeps old snapshots stable and future edits visible for $type (read early: $readEarly)',
    async ({ type, readEarly }) => {
      const cache = new PublicStateSnapshotCache();
      let snapshot: ReturnType<PublicStateSnapshotCache['createSnapshot']>;
      const { store, panel } = fixture(async (event) => {
        if (event.type === type) {
          snapshot = cache.createSnapshot(store.getState());
          if (readEarly) {
            expect(snapshot.workspace.additionalData).toEqual(
              type === BusEventType.WORKSPACE_CLOSE
                ? undefined
                : { value: 'before' }
            );
          }
          event.data.additionalData.value = 'after';
        }
      });
      await panel.open({
        workspaceId: 'workspace',
        additionalData: { value: 'before' },
      });
      if (
        type === BusEventType.WORKSPACE_PRE_CLOSE ||
        type === BusEventType.WORKSPACE_CLOSE
      ) {
        await panel.close();
      }
      const before =
        type === BusEventType.WORKSPACE_CLOSE ? undefined : { value: 'before' };
      expect(snapshot.workspace.additionalData).toEqual(before);
      expect(snapshot.customPanels.workspace.additionalData).toEqual(before);
      const expected =
        type === BusEventType.WORKSPACE_PRE_CLOSE ||
        type === BusEventType.WORKSPACE_CLOSE
          ? undefined
          : { value: 'after' };
      expect(
        cache.createSnapshot(store.getState()).workspace.additionalData
      ).toEqual(expected);
      expect(
        cache.createSnapshot(store.getState()).customPanels.workspace
          .additionalData
      ).toEqual(expected);
    }
  );
  it.each(['restart', 'replacement'])(
    'does not commit obsolete event edits after %s',
    async (change) => {
      const { store, manager, panel } = fixture(async (event) => {
        if (event.type === BusEventType.WORKSPACE_PRE_OPEN) {
          if (change === 'restart') {
            manager.restartCount += 1;
          }
          store.dispatch(
            actions.setWorkspacePanelData({
              workspaceID: 'new',
              additionalData: { value: 'new' },
            })
          );
          event.data.additionalData.value = 'obsolete';
        }
      });
      await panel.open({
        workspaceId: 'old',
        additionalData: { value: 'old' },
      });
      expect(store.getState().workspacePanelState.additionalData).toEqual({
        value: 'new',
      });
    }
  );
  it('preserves replacement caller identity when a store subscriber opens another workspace', async () => {
    const replacement = { value: 'replacement' };
    const seen: unknown[] = [];
    const { store, panel } = fixture(async (event) => {
      if (event.type === BusEventType.WORKSPACE_PRE_OPEN) {
        seen.push(event.data.additionalData);
      }
    });
    let replaced = false;
    let replacementOpen: Promise<void>;
    store.subscribe(() => {
      if (
        !replaced &&
        store.getState().workspacePanelState.workspaceID === 'old'
      ) {
        replaced = true;
        replacementOpen = panel.open({
          workspaceId: 'new',
          additionalData: replacement,
        });
      }
    });
    await panel.open({ workspaceId: 'old', additionalData: { value: 'old' } });
    await replacementOpen;
    expect(seen.length).toBeGreaterThan(0);
    seen.forEach((value) => expect(value).toBe(replacement));
  });
});

describe('received preview workspace freeze contract', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);
  it('preserves the frozen message fields for an addMessage preview', async () => {
    const { instance, store, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const item: PreviewCardItem = {
      response_type: MessageResponseTypes.PREVIEW_CARD,
      workspace_id: '',
      title: 'preview',
    };
    await instance.messaging.addMessage({
      id: 'received-preview',
      output: { generic: [item] },
    });
    let observed = false;
    instance.on({
      type: BusEventType.WORKSPACE_PRE_OPEN,
      handler: (event: any) => {
        observed = true;
        expect(Object.isFrozen(event.data.fullMessage)).toBe(true);
        expect(Object.isFrozen(event.data.message)).toBe(true);
      },
    });
    const fullMessage = store.getState().allMessagesByID['received-preview'];
    const localMessageItem = Object.values(
      store.getState().allMessageItemsByID
    ).find((local) => local.fullMessageID === 'received-preview');
    store.dispatch(
      actions.setWorkspacePanelData({
        workspaceID: item.workspace_id,
        fullMessage,
        localMessageItem,
      })
    );
    await createCustomPanelInstance(PanelType.WORKSPACE, serviceManager).open({
      ...item.workspace_options,
      workspaceId: item.workspace_id,
      additionalData: item.additional_data,
    });
    expect(observed).toBe(true);
  });
});
