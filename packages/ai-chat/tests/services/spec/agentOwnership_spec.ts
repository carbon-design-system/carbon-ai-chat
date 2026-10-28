/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { PublicStateSnapshotCache } from '../../../src/chat/utils/publicState';
import { makeConfigStore } from '../../test_helpers';
import createHumanAgentService from '../../../src/chat/services/haa/HumanAgentServiceImpl';
import {
  addMessages,
  createHumanAgentLocalMessage,
  toPair,
} from '../../../src/chat/services/haa/humanAgentUtils';
import { ServiceManager } from '../../../src/chat/services/ServiceManager';
import { BusEventType } from '../../../src/types/events/eventBusTypes';
import {
  HumanAgentMessageType,
  MessageResponse,
  MessageResponseTypes,
  type ResponseUserProfile,
} from '../../../src/types/messaging/Messages';
import { createMessageResponseForItem } from '../../../src/chat/utils/messageUtils';
import { outputItemToLocalItem } from '../../../src/chat/schema/outputItemToLocalItem';

async function createAgentFixture(fire: (event: any) => Promise<void>) {
  const store = makeConfigStore({ messaging: {} });
  const manager = {
    store,
    fire,
    intl: { formatMessage: () => 'agent status' },
    actions: {
      handleUserDefinedResponseItems: jest.fn().mockResolvedValue(undefined),
    },
  } as unknown as ServiceManager;
  const service = createHumanAgentService(manager);
  await service.initialize();
  (service as any).chatStarted = true;
  return { store, manager, callback: (service as any).serviceDeskCallback };
}

describe('human-agent ownership compatibility', () => {
  it('assigns defaults and preserves the incoming caller through writable pre and post events', async () => {
    const message: MessageResponse = {
      output: {
        generic: [
          { response_type: MessageResponseTypes.TEXT, text: 'original' },
        ],
      },
    };
    let before: any;
    let after: any;
    const { store, callback } = await createAgentFixture(async (event) => {
      if (event.type === BusEventType.HUMAN_AGENT_PRE_RECEIVE) {
        before = event.data;
        expect(event.data.id).toBeTruthy();
        expect(event.data.output.generic[0].agent_message_type).toBe(
          HumanAgentMessageType.FROM_HUMAN_AGENT
        );
        event.data.output.generic[0].text = 'pre edit';
      }
      if (event.type === BusEventType.HUMAN_AGENT_RECEIVE) {
        after = event.data;
        expect(Object.isFrozen(event.data)).toBe(false);
        expect(store.getState().allMessagesByID[event.data.id]).toBeDefined();
        event.data.output.generic[0].text = 'post edit';
      }
    });
    await callback.sendMessageToUser(message);
    expect(before).toBe(message);
    expect(after).toBe(message);
    expect(message.id).toBeTruthy();
    expect(message.history.timestamp).toEqual(expect.any(Number));
    expect(message.output.generic[0]).toMatchObject({ text: 'post edit' });
    expect(store.getState().allMessagesByID[message.id]).toMatchObject({
      output: { generic: [{ text: 'post edit' }] },
    });
    expect(
      Object.values(store.getState().allMessageItemsByID)[0].item
    ).toMatchObject({ text: 'post edit' });
  });

  it.each([
    ['agentJoined', false],
    ['agentJoined', true],
    ['beginTransferToAnotherAgent', false],
    ['beginTransferToAnotherAgent', true],
  ])(
    'owns the %s profile before status callbacks (read early: %s)',
    async (method: string, readEarly: boolean) => {
      const cache = new PublicStateSnapshotCache();
      let captured: ReturnType<PublicStateSnapshotCache['createSnapshot']>;
      let statusMessage: MessageResponse;
      const profile = { id: 'dana', nickname: 'Dana' };
      const { store, callback } = await createAgentFixture(async (event) => {
        if (event.type === BusEventType.HUMAN_AGENT_PRE_RECEIVE) {
          captured = cache.createSnapshot(store.getState());
          if (readEarly) {
            expect(captured.humanAgent.responseUserProfile.nickname).toBe(
              'Dana'
            );
          }
          statusMessage = event.data;
          event.data.message_options.response_user_profile.nickname =
            'Message name';
        }
      });
      await callback[method](profile);
      expect(captured.humanAgent.responseUserProfile.nickname).toBe('Dana');
      expect(
        store.getState().persistedToBrowserStorage.humanAgentState
          .responseUserProfile.nickname
      ).toBe('Dana');
      profile.nickname = 'Later caller edit';
      expect(cache.createSnapshot(store.getState()).humanAgent).toMatchObject({
        responseUserProfile: { id: 'dana', nickname: 'Dana' },
        responseUserProfiles: { dana: { id: 'dana', nickname: 'Dana' } },
      });
      expect(store.getState().allMessagesByID[statusMessage.id]).toMatchObject({
        message_options: {
          response_user_profile: { id: 'dana', nickname: 'Message name' },
        },
      });
    }
  );

  it.each([false, true])(
    'keeps the stored profile separate from fallback status messages (read early: %s)',
    async (readEarly) => {
      const cache = new PublicStateSnapshotCache();
      let captured: ReturnType<PublicStateSnapshotCache['createSnapshot']>;
      let departing = false;
      let messageID: string;
      const { store, callback } = await createAgentFixture(async (event) => {
        if (departing && event.type === BusEventType.HUMAN_AGENT_PRE_RECEIVE) {
          messageID = event.data.id;
          captured = cache.createSnapshot(store.getState());
          if (readEarly) {
            expect(captured.humanAgent.responseUserProfile.nickname).toBe(
              'Dana'
            );
          }
          event.data.message_options.response_user_profile.nickname =
            'Left name';
        }
      });
      await callback.agentJoined({ id: 'dana', nickname: 'Dana' });
      departing = true;
      await callback.agentLeftChat();
      expect(captured.humanAgent.responseUserProfile.nickname).toBe('Dana');
      expect(
        cache.createSnapshot(store.getState()).humanAgent.responseUserProfiles
          .dana.nickname
      ).toBe('Dana');
      expect(
        cache
          .createSnapshot(store.getState())
          .messages.find((message) => message.id === messageID)
      ).toMatchObject({
        message_options: {
          response_user_profile: { id: 'dana', nickname: 'Left name' },
        },
      });
    }
  );

  it.each([
    [undefined, false],
    [undefined, true],
    ['dana', false],
    ['dana', true],
  ])(
    'keeps writable incoming profiles separate from state (agent ID: %s, read early: %s)',
    async (agentID: string | undefined, readEarly: boolean) => {
      const cache = new PublicStateSnapshotCache();
      let captured: ReturnType<PublicStateSnapshotCache['createSnapshot']>;
      let beforePost: ReturnType<PublicStateSnapshotCache['createSnapshot']>;
      let eventProfile: ResponseUserProfile;
      let receiving = false;
      let messageID: string;
      const { store, callback } = await createAgentFixture(async (event) => {
        if (!receiving) {
          return;
        }
        if (event.type === BusEventType.HUMAN_AGENT_PRE_RECEIVE) {
          messageID = event.data.id;
          captured = cache.createSnapshot(store.getState());
          if (readEarly) {
            expect(captured.humanAgent.responseUserProfile.nickname).toBe(
              'Dana'
            );
          }
          eventProfile = event.responseUserProfile;
          eventProfile.nickname = 'Pre name';
        } else if (event.type === BusEventType.HUMAN_AGENT_RECEIVE) {
          beforePost = cache.createSnapshot(store.getState());
          if (readEarly) {
            expect(
              beforePost.messages.find((message) => message.id === messageID)
            ).toMatchObject({
              message_options: {
                response_user_profile: { nickname: 'Pre name' },
              },
            });
          }
          expect(event.responseUserProfile).toBe(eventProfile);
          expect(event.data.message_options.response_user_profile).toBe(
            eventProfile
          );
          eventProfile.nickname = 'Post name';
        }
      });
      await callback.agentJoined({ id: 'dana', nickname: 'Dana' });
      receiving = true;
      await callback.sendMessageToUser('hello', agentID);
      expect(captured.humanAgent.responseUserProfile.nickname).toBe('Dana');
      expect(cache.createSnapshot(store.getState()).humanAgent).toMatchObject({
        responseUserProfile: { id: 'dana', nickname: 'Dana' },
        responseUserProfiles: { dana: { id: 'dana', nickname: 'Dana' } },
      });
      expect(
        beforePost.messages.find((message) => message.id === messageID)
      ).toMatchObject({
        message_options: { response_user_profile: { nickname: 'Pre name' } },
      });
      expect(
        cache
          .createSnapshot(store.getState())
          .messages.find((message) => message.id === messageID)
      ).toMatchObject({
        message_options: { response_user_profile: { nickname: 'Post name' } },
      });
      eventProfile.nickname = 'Retained edit';
      expect(
        cache
          .createSnapshot(store.getState())
          .messages.find((message) => message.id === messageID)
      ).toMatchObject({
        message_options: { response_user_profile: { nickname: 'Post name' } },
      });
    }
  );

  it('freezes the same status message after pre-receive edits and before post-receive', async () => {
    let before: any;
    let after: any;
    const manager = {
      intl: { formatMessage: () => 'joined' },
      fire: jest.fn(async (event) => {
        if (event.type === BusEventType.HUMAN_AGENT_PRE_RECEIVE) {
          before = event.data;
          expect(Object.isFrozen(event.data)).toBe(false);
          event.data.output.generic[0].title = 'edited';
        } else {
          after = event.data;
          expect(Object.isFrozen(before)).toBe(true);
        }
      }),
    } as unknown as ServiceManager;
    const result = await createHumanAgentLocalMessage(
      HumanAgentMessageType.HUMAN_AGENT_JOINED,
      manager
    );
    expect(after).toBe(before);
    expect(result.originalMessage).toBe(after);
    expect(result.localMessage.item).toBe(
      result.originalMessage.output.generic[0]
    );
    expect(result.localMessage.item).toMatchObject({ title: 'edited' });
  });

  it('commits edits made by mutable user-defined handlers', async () => {
    const store = makeConfigStore({ messaging: {} });
    const item = {
      response_type: MessageResponseTypes.USER_DEFINED,
      user_defined: { value: 'before' },
    };
    const original = createMessageResponseForItem(item);
    const local = outputItemToLocalItem(item, original);
    const manager = {
      store,
      actions: {
        handleUserDefinedResponseItems: jest.fn(
          async (message, fullMessage) => {
            expect(message).toBe(local);
            expect(fullMessage).toBe(original);
            message.item.user_defined.value = 'handler edit';
          }
        ),
      },
    } as unknown as ServiceManager;
    await addMessages([toPair([local], original)], true, manager);
    expect(item.user_defined.value).toBe('handler edit');
    expect(
      store.getState().allMessageItemsByID[local.ui_state.id].item.user_defined
    ).toEqual({ value: 'handler edit' });
  });
  it('keeps edits to an earlier item made by a later user-defined handler', async () => {
    const store = makeConfigStore({ messaging: {} });
    const first = {
      response_type: MessageResponseTypes.USER_DEFINED,
      user_defined: { value: 'first' },
    };
    const second = {
      response_type: MessageResponseTypes.USER_DEFINED,
      user_defined: { value: 'second' },
    };
    const original = createMessageResponseForItem(first);
    original.output.generic.push(second);
    const locals = original.output.generic.map((item) =>
      outputItemToLocalItem(item, original)
    );
    const manager = {
      store,
      actions: {
        handleUserDefinedResponseItems: jest.fn(async (local) => {
          if (local === locals[1]) {
            expect(
              store.getState().allMessageItemsByID[locals[0].ui_state.id]
            ).toBeDefined();
            first.user_defined.value = 'edited later';
          }
        }),
      },
    } as unknown as ServiceManager;
    await addMessages([toPair(locals, original)], true, manager);
    expect(
      store.getState().allMessageItemsByID[locals[0].ui_state.id].item
        .user_defined
    ).toEqual({ value: 'edited later' });
    expect(store.getState().allMessagesByID[original.id]).toMatchObject({
      output: { generic: [{ user_defined: { value: 'edited later' } }, {}] },
    });
  });

  it.each([false, true])(
    'keeps captured agent snapshots stable across post-receive edits (read early: %s)',
    async (readEarly) => {
      const cache = new PublicStateSnapshotCache();
      let captured: ReturnType<PublicStateSnapshotCache['createSnapshot']>;
      const { store, callback } = await createAgentFixture(async (event) => {
        if (event.type === BusEventType.HUMAN_AGENT_RECEIVE) {
          captured = cache.createSnapshot(store.getState());
          if (readEarly) {
            expect(captured.messages[0]).toMatchObject({
              output: { generic: [{ text: 'before' }] },
            });
          }
          event.data.output.generic[0].text = 'after';
        }
      });
      const message: MessageResponse = {
        output: {
          generic: [
            { response_type: MessageResponseTypes.TEXT, text: 'before' },
          ],
        },
      };
      await callback.sendMessageToUser(message);
      expect(captured.messages[0]).toMatchObject({
        output: { generic: [{ text: 'before' }] },
      });
      expect(cache.createSnapshot(store.getState()).messages[0]).toMatchObject({
        output: { generic: [{ text: 'after' }] },
      });
      message.output.generic[0] = {
        response_type: MessageResponseTypes.TEXT,
        text: 'late caller mutation',
      };
      expect(cache.createSnapshot(store.getState()).messages[0]).toMatchObject({
        output: { generic: [{ text: 'after' }] },
      });
    }
  );

  it('keeps an unread snapshot stable when a later handler edits an earlier item', async () => {
    const store = makeConfigStore({ messaging: {} });
    const cache = new PublicStateSnapshotCache();
    let captured: ReturnType<PublicStateSnapshotCache['createSnapshot']>;
    const first = {
      response_type: MessageResponseTypes.USER_DEFINED,
      user_defined: { value: 'first' },
    };
    const second = {
      response_type: MessageResponseTypes.USER_DEFINED,
      user_defined: { value: 'second' },
    };
    const original = createMessageResponseForItem(first);
    original.output.generic.push(second);
    const locals = original.output.generic.map((item) =>
      outputItemToLocalItem(item, original)
    );
    const manager = {
      store,
      actions: {
        handleUserDefinedResponseItems: jest.fn(async (local) => {
          if (local === locals[1]) {
            captured = cache.createSnapshot(store.getState());
            first.user_defined.value = 'edited later';
          }
        }),
      },
    } as unknown as ServiceManager;
    await addMessages([toPair(locals, original)], true, manager);
    expect(captured.messages[0]).toMatchObject({
      output: { generic: [{ user_defined: { value: 'first' } }, {}] },
    });
    expect(cache.createSnapshot(store.getState()).messages[0]).toMatchObject({
      output: { generic: [{ user_defined: { value: 'edited later' } }, {}] },
    });
  });
});
