/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { cleanup } from '@testing-library/react';
import {
  ViewBindings,
  ViewConnection,
} from '../../../src/shared/services/viewBindings';
import { MessageCoordinator } from '../../../src/shared/services/messaging/MessageCoordinator';
import { ChatInstanceService } from '../../../src/shared/services/ChatInstanceService';
import type { ServiceManager } from '../../../src/shared/services/ServiceManager';
import { ViewChangeReason } from '../../../src/types/events/eventBusTypes';
import { ViewType } from '../../../src/types/state/AppState';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

function bindings(): ViewBindings & {
  announced: string[];
  focused: number;
  changed: unknown[];
} {
  const result = {
    announced: [] as string[],
    focused: 0,
    changed: [] as unknown[],
  } as ViewBindings & {
    announced: string[];
    focused: number;
    changed: unknown[];
  };
  result.messaging = {
    hasCustomPromptLine: () => false,
    announceSending: () => undefined,
    requestComposerFocus: () => undefined,
    closeHomeScreenIfOpen: () => undefined,
    closeResponsePanelIfOpen: () => undefined,
    closeHomeScreen: () => undefined,
    announceStreamStarts: (messageID) => {
      result.announced.push(messageID);
    },
  };
  result.humanAgent = {
    requestFocus: () => {
      result.focused += 1;
    },
  };
  result.instance = {
    changeView: async (view) => {
      result.changed.push(view);
      return undefined;
    },
  };
  return result;
}

describe('ViewConnection', () => {
  it('holds bindings from attach until their detach', () => {
    const connection = new ViewConnection();
    const view = bindings();
    expect(connection.current).toBeUndefined();
    const detach = connection.attach(view);
    expect(connection.current).toBe(view);
    detach();
    expect(connection.current).toBeUndefined();
    detach();
    expect(connection.current).toBeUndefined();
  });

  it('lets a later view replace an earlier one, whose detach then does nothing', () => {
    const connection = new ViewConnection();
    const first = bindings();
    const second = bindings();
    const detachFirst = connection.attach(first);
    const detachSecond = connection.attach(second);
    detachFirst();
    expect(connection.current).toBe(second);
    detachSecond();
    expect(connection.current).toBeUndefined();
  });

  it('tells listeners about each attach and detach until they are removed', () => {
    const connection = new ViewConnection();
    const seen: Array<ViewBindings | undefined> = [];
    const remove = connection.subscribe(() => seen.push(connection.current));
    const view = bindings();
    const detach = connection.attach(view);
    detach();
    remove();
    connection.attach(bindings());
    expect(seen).toEqual([view, undefined]);
  });
});

describe('late lookup through the attached view', () => {
  function manager() {
    return {
      view: new ViewConnection(),
      store: {
        getState: () => ({
          assistantMessageState: { localMessageIDs: [] as string[] },
          allMessageItemsByID: {},
          allMessagesByID: {},
          persistedToBrowserStorage: { viewState: { mainWindow: false } },
        }),
        subscribe: (): (() => void) => () => undefined,
      },
      restartCount: 0,
    } as unknown as ServiceManager;
  }

  it('reaches only the view attached at the time of each call', () => {
    const services = manager();
    const coordinator = new MessageCoordinator(services);
    const content = { hasReasoning: false, hasDisplayableContent: true };
    coordinator.announceStreamStarts('none', content);
    const first = bindings();
    const detachFirst = services.view.attach(first);
    coordinator.announceStreamStarts('first', content);
    detachFirst();
    coordinator.announceStreamStarts('detached', content);
    const second = bindings();
    services.view.attach(second);
    coordinator.announceStreamStarts('second', content);
    expect(first.announced).toEqual(['first']);
    expect(second.announced).toEqual(['second']);
    coordinator.disposeReasoningObserver();
  });

  it('changes the view through the attached view, and does nothing without one', async () => {
    const services = manager();
    const actions = new ChatInstanceService(services);
    const reason = { viewChangeReason: ViewChangeReason.CALLED_CHANGE_VIEW };
    await expect(
      actions.changeView(ViewType.MAIN_WINDOW, reason)
    ).resolves.toEqual({
      mainWindow: false,
    });
    const view = bindings();
    services.view.attach(view);
    await actions.changeView(ViewType.MAIN_WINDOW, reason);
    expect(view.changed).toEqual([ViewType.MAIN_WINDOW]);
  });
});

describe('a mounted chat', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('attaches its view at boot and detaches it on removal', async () => {
    const { serviceManager, instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const manager = (serviceManager.messageCoordinator as any)
      .serviceManager as ServiceManager;
    expect(manager.view.current).toBeDefined();
    await instance.changeView(ViewType.MAIN_WINDOW);
    expect(instance.getState().viewState.mainWindow).toBe(true);
    cleanup();
    await Promise.resolve();
    expect(manager.view.current).toBeUndefined();
    await expect(
      instance.changeView(ViewType.LAUNCHER)
    ).resolves.toBeUndefined();
    expect(instance.getState().viewState.mainWindow).toBe(true);
  });
});
