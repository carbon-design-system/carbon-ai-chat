/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';

import {
  BusEventType,
  BusEventViewChange,
  BusEventViewPreChange,
  ChatInstance,
  MessageSendSource,
  PageObjectId,
  ViewChangeReason,
  ViewState,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  EventRecorder,
  allByRole,
  byRole,
  changeView,
  contractChat,
  contractSetup,
  deferred,
  fakeBackend,
  getByTestId,
  isShownWithin,
  pause,
  recordEvents,
} from '../../helpers';

const VIEW_EVENTS = [BusEventType.VIEW_PRE_CHANGE, BusEventType.VIEW_CHANGE];

const LAUNCHER_ONLY: ViewState = { launcher: true, mainWindow: false };
const MAIN_WINDOW_ONLY: ViewState = { launcher: false, mainWindow: true };
const ALL_CLOSED: ViewState = { launcher: false, mainWindow: false };
const BOTH_OPEN: ViewState = { launcher: true, mainWindow: true };

/** Mounts a chat with the launcher showing and no welcome request. */
async function mount(): Promise<ChatInstance> {
  const { instance } = await contractChat({
    messaging: { skipWelcome: true, customSendMessage: () => undefined },
  });
  return instance;
}

// @covers instance.changeView state.viewState state.viewState.launcher
// @covers state.viewState.mainWindow export.aiChatEntry.ViewType
describe('changeView', () => {
  contractSetup();

  it('starts with only the launcher showing', async () => {
    const instance = await mount();
    expect(instance.getState().viewState).toEqual(LAUNCHER_ONLY);
  });

  it('shows only the main window for ViewType.MAIN_WINDOW', async () => {
    const instance = await mount();
    await changeView(instance, ViewType.MAIN_WINDOW);
    expect(instance.getState().viewState).toEqual(MAIN_WINDOW_ONLY);
  });

  it('shows only the launcher for ViewType.LAUNCHER', async () => {
    const instance = await mount();
    await changeView(instance, BOTH_OPEN);
    await changeView(instance, ViewType.LAUNCHER);
    expect(instance.getState().viewState).toEqual(LAUNCHER_ONLY);
  });

  it('sets both views from a full ViewState', async () => {
    const instance = await mount();
    await changeView(instance, BOTH_OPEN);
    expect(instance.getState().viewState).toEqual(BOTH_OPEN);
    await changeView(instance, ALL_CLOSED);
    expect(instance.getState().viewState).toEqual(ALL_CLOSED);
  });

  it('changes only the views a partial ViewState names', async () => {
    const instance = await mount();
    await changeView(instance, { mainWindow: true });
    expect(instance.getState().viewState).toEqual(BOTH_OPEN);
  });

  it('ignores an unknown view name or key: no change, no events, and resolves', async () => {
    const instance = await mount();
    const events = recordEvents(instance, VIEW_EVENTS);
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    try {
      await expect(
        instance.changeView('sidebar' as ViewType)
      ).resolves.toBeUndefined();
      await expect(
        instance.changeView({
          mainWindow: true,
          sidebar: true,
        } as unknown as ViewState)
      ).resolves.toBeUndefined();
    } finally {
      consoleError.mockRestore();
    }
    expect(events.types()).toEqual([]);
    expect(instance.getState().viewState).toEqual(LAUNCHER_ONLY);
  });
});

// @covers event.view:pre:change event.view:change instance.changeView
// @covers state.viewState export.aiChatEntry.ViewChangeReason
describe('view change events', () => {
  contractSetup();

  it('fires view:pre:change, then view:change, with CALLED_CHANGE_VIEW and both states', async () => {
    const instance = await mount();
    const events = recordEvents(instance, VIEW_EVENTS);
    await changeView(instance, ViewType.MAIN_WINDOW);
    expect(events.types()).toEqual([
      BusEventType.VIEW_PRE_CHANGE,
      BusEventType.VIEW_CHANGE,
    ]);
    const [pre] = events.of<BusEventViewPreChange>(
      BusEventType.VIEW_PRE_CHANGE
    );
    const [change] = events.of<BusEventViewChange>(BusEventType.VIEW_CHANGE);
    for (const event of [pre, change]) {
      expect(event.reason).toBe(ViewChangeReason.CALLED_CHANGE_VIEW);
      expect(event.oldViewState).toEqual(LAUNCHER_ONLY);
      expect(event.newViewState).toEqual(MAIN_WINDOW_ONLY);
      expect(event.cancelViewChange).toBe(false);
    }
  });

  it('fires nothing when the view is already as asked', async () => {
    const instance = await mount();
    const events = recordEvents(instance, VIEW_EVENTS);
    await changeView(instance, ViewType.LAUNCHER);
    await changeView(instance, LAUNCHER_ONLY);
    expect(events.types()).toEqual([]);
  });

  it('shows the old view in getState during view:pre:change and the new one during view:change', async () => {
    const instance = await mount();
    const seen: string[] = [];
    instance.on([
      {
        type: BusEventType.VIEW_PRE_CHANGE,
        handler: () =>
          seen.push(`pre: ${JSON.stringify(instance.getState().viewState)}`),
      },
      {
        type: BusEventType.VIEW_CHANGE,
        handler: () =>
          seen.push(`change: ${JSON.stringify(instance.getState().viewState)}`),
      },
    ]);
    await changeView(instance, ViewType.MAIN_WINDOW);
    expect(seen).toEqual([
      `pre: ${JSON.stringify(LAUNCHER_ONLY)}`,
      `change: ${JSON.stringify(MAIN_WINDOW_ONLY)}`,
    ]);
  });

  it('keeps the view when a view:pre:change handler cancels, and fires no view:change', async () => {
    const backend = fakeBackend({ autoResolve: true });
    const { instance } = await contractChat({
      messaging: { customSendMessage: backend.customSendMessage },
    });
    instance.on({
      type: BusEventType.VIEW_PRE_CHANGE,
      handler: (event: BusEventViewPreChange) => {
        event.cancelViewChange = true;
      },
    });
    const events = recordEvents(instance, VIEW_EVENTS);
    await changeView(instance, ViewType.MAIN_WINDOW);
    expect(events.types()).toEqual([BusEventType.VIEW_PRE_CHANGE]);
    expect(instance.getState().viewState).toEqual(LAUNCHER_ONLY);
    // The main window never opened, so no welcome request went out.
    expect(backend.requests).toHaveLength(0);
  });

  it('puts the old view back when a view:change handler cancels, without firing again', async () => {
    const instance = await mount();
    instance.once({
      type: BusEventType.VIEW_CHANGE,
      handler: (event: BusEventViewChange) => {
        event.cancelViewChange = true;
      },
    });
    const events = recordEvents(instance, VIEW_EVENTS);
    await changeView(instance, ViewType.MAIN_WINDOW);
    expect(events.types()).toEqual([
      BusEventType.VIEW_PRE_CHANGE,
      BusEventType.VIEW_CHANGE,
    ]);
    expect(instance.getState().viewState).toEqual(LAUNCHER_ONLY);
  });

  it('uses the view a view:pre:change handler writes into newViewState', async () => {
    const instance = await mount();
    instance.once({
      type: BusEventType.VIEW_PRE_CHANGE,
      handler: (event: BusEventViewPreChange) => {
        event.newViewState.launcher = true;
      },
    });
    const events = recordEvents(instance, [BusEventType.VIEW_CHANGE]);
    await changeView(instance, ViewType.MAIN_WINDOW);
    expect(instance.getState().viewState).toEqual(BOTH_OPEN);
    const [change] = events.of<BusEventViewChange>(BusEventType.VIEW_CHANGE);
    expect(change.newViewState).toEqual(BOTH_OPEN);
  });

  it('uses the ViewState a view:pre:change handler replaces newViewState with', async () => {
    const instance = await mount();
    instance.once({
      type: BusEventType.VIEW_PRE_CHANGE,
      handler: (event: BusEventViewPreChange) => {
        event.newViewState = { ...ALL_CLOSED };
      },
    });
    await changeView(instance, ViewType.MAIN_WINDOW);
    expect(instance.getState().viewState).toEqual(ALL_CLOSED);
  });

  it('uses the ViewState a view:change handler replaces newViewState with', async () => {
    const instance = await mount();
    instance.once({
      type: BusEventType.VIEW_CHANGE,
      handler: (event: BusEventViewChange) => {
        event.newViewState = { ...BOTH_OPEN };
      },
    });
    await changeView(instance, ViewType.MAIN_WINDOW);
    expect(instance.getState().viewState).toEqual(BOTH_OPEN);
  });

  it('gives view:change handlers a newViewState they cannot write into', async () => {
    const instance = await mount();
    let writeFailed = false;
    instance.once({
      type: BusEventType.VIEW_CHANGE,
      handler: (event: BusEventViewChange) => {
        try {
          event.newViewState.launcher = true;
        } catch {
          writeFailed = true;
        }
      },
    });
    await changeView(instance, ViewType.MAIN_WINDOW);
    expect(writeFailed).toBe(true);
    expect(instance.getState().viewState).toEqual(MAIN_WINDOW_ONLY);
  });

  it('waits for an async view:pre:change handler before changing the view', async () => {
    const instance = await mount();
    const events = recordEvents(instance, VIEW_EVENTS);
    const gate = deferred();
    instance.once({
      type: BusEventType.VIEW_PRE_CHANGE,
      handler: () => gate.promise,
    });
    let resolved = false;
    let call: Promise<void>;
    await act(async () => {
      call = instance.changeView(ViewType.MAIN_WINDOW).then(() => {
        resolved = true;
      });
    });
    // Gives the pending call time to move on, without settling the gate.
    await pause(20);
    expect(resolved).toBe(false);
    expect(instance.getState().viewState).toEqual(LAUNCHER_ONLY);
    expect(events.types()).toEqual([BusEventType.VIEW_PRE_CHANGE]);
    gate.resolve();
    await act(async () => {
      await call;
    });
    expect(resolved).toBe(true);
    expect(instance.getState().viewState).toEqual(MAIN_WINDOW_ONLY);
  });

  it('resolves only after an async view:change handler settles, with the view already changed', async () => {
    const instance = await mount();
    const gate = deferred();
    instance.once({
      type: BusEventType.VIEW_CHANGE,
      handler: () => gate.promise,
    });
    let resolved = false;
    let call: Promise<void>;
    await act(async () => {
      call = instance.changeView(ViewType.MAIN_WINDOW).then(() => {
        resolved = true;
      });
    });
    // Gives the pending call time to move on, without settling the gate.
    await pause(20);
    expect(resolved).toBe(false);
    expect(instance.getState().viewState).toEqual(MAIN_WINDOW_ONLY);
    gate.resolve();
    await act(async () => {
      await call;
    });
    expect(resolved).toBe(true);
  });

  it('rejects a changeView made while another view change is running', async () => {
    const instance = await mount();
    const gate = deferred();
    let inner: Promise<void>;
    instance.once({
      type: BusEventType.VIEW_PRE_CHANGE,
      handler: () => {
        inner = instance.changeView(ALL_CLOSED);
        return gate.promise;
      },
    });
    let outer: Promise<void>;
    await act(async () => {
      outer = instance.changeView(ViewType.MAIN_WINDOW);
    });
    await expect(inner).rejects.toThrow();
    gate.resolve();
    await act(async () => {
      await outer;
    });
    expect(instance.getState().viewState).toEqual(MAIN_WINDOW_ONLY);
  });

  it('rejects with the error a view:pre:change handler throws, leaves the view, and accepts the next call', async () => {
    const instance = await mount();
    instance.once({
      type: BusEventType.VIEW_PRE_CHANGE,
      handler: () => {
        throw new Error('handler failed');
      },
    });
    await act(async () => {
      await expect(instance.changeView(ViewType.MAIN_WINDOW)).rejects.toThrow(
        'handler failed'
      );
    });
    expect(instance.getState().viewState).toEqual(LAUNCHER_ONLY);
    await changeView(instance, ViewType.MAIN_WINDOW);
    expect(instance.getState().viewState).toEqual(MAIN_WINDOW_ONLY);
  });
});

/** Mounts with view events recorded from the first moment a host can. */
async function mountRecording(
  props: Parameters<typeof contractChat>[0] = {}
): Promise<{ instance: ChatInstance; events: EventRecorder }> {
  let events: EventRecorder;
  const { instance } = await contractChat({
    ...props,
    onBeforeRender: (handed) => {
      events = recordEvents(handed, VIEW_EVENTS);
    },
  });
  return { instance, events };
}

// @covers event.view:pre:change event.view:change state.viewState
// @covers config.openChatByDefault export.aiChatEntry.ViewChangeReason
describe('the view at load', () => {
  contractSetup();

  it('fires WEB_CHAT_LOADED once each, from all closed to the launcher', async () => {
    const { events } = await mountRecording({
      messaging: { skipWelcome: true },
    });
    expect(events.types()).toEqual([
      BusEventType.VIEW_PRE_CHANGE,
      BusEventType.VIEW_CHANGE,
    ]);
    for (const event of events.events as BusEventViewChange[]) {
      expect(event.reason).toBe(ViewChangeReason.WEB_CHAT_LOADED);
      expect(event.oldViewState).toEqual(ALL_CLOSED);
      expect(event.newViewState).toEqual(LAUNCHER_ONLY);
    }
  });

  it('opens the main window instead when openChatByDefault is set', async () => {
    const backend = fakeBackend({ autoResolve: true });
    const { instance, events } = await mountRecording({
      openChatByDefault: true,
      messaging: { customSendMessage: backend.customSendMessage },
    });
    const [change] = events.of<BusEventViewChange>(BusEventType.VIEW_CHANGE);
    expect(change.reason).toBe(ViewChangeReason.WEB_CHAT_LOADED);
    expect(change.newViewState).toEqual(MAIN_WINDOW_ONLY);
    expect(instance.getState().viewState).toEqual(MAIN_WINDOW_ONLY);
  });

  it('restores the open main window on a remount in the same session', async () => {
    const backend = fakeBackend({ autoResolve: true });
    const first = await contractChat({
      messaging: { customSendMessage: backend.customSendMessage },
    });
    await changeView(first.instance, ViewType.MAIN_WINDOW);
    first.unmount();
    const { instance, events } = await mountRecording({
      messaging: { customSendMessage: backend.customSendMessage },
    });
    const [change] = events.of<BusEventViewChange>(BusEventType.VIEW_CHANGE);
    expect(change.reason).toBe(ViewChangeReason.WEB_CHAT_LOADED);
    expect(change.oldViewState).toEqual(ALL_CLOSED);
    expect(change.newViewState).toEqual(MAIN_WINDOW_ONLY);
    expect(instance.getState().viewState).toEqual(MAIN_WINDOW_ONLY);
  });

  it('stays all closed when a view:pre:change handler cancels the change at load', async () => {
    const { instance } = await contractChat({
      messaging: { skipWelcome: true },
      onBeforeRender: (handed) => {
        handed.once({
          type: BusEventType.VIEW_PRE_CHANGE,
          handler: (event: BusEventViewPreChange) => {
            event.cancelViewChange = true;
          },
        });
      },
    });
    expect(instance.getState().viewState).toEqual(ALL_CLOSED);
  });

  it('starts the chat when a view:pre:change handler opens the main window at load', async () => {
    const backend = fakeBackend({ autoResolve: true });
    const { instance } = await contractChat({
      messaging: { customSendMessage: backend.customSendMessage },
      onBeforeRender: (handed) => {
        handed.once({
          type: BusEventType.VIEW_PRE_CHANGE,
          handler: (event: BusEventViewPreChange) => {
            event.newViewState.mainWindow = true;
          },
        });
      },
    });
    expect(instance.getState().viewState).toEqual(BOTH_OPEN);
    const sent = await backend.next();
    expect(sent.options.busEventSend.source).toBe(
      MessageSendSource.WELCOME_REQUEST
    );
  });
});

// @covers export.aiChatEntry.PageObjectId config.strings state.status
describe('the loading panel', () => {
  contractSetup();

  const LOADING_PANEL_NAME = 'Contract loading panel';

  it('shows a dialog inside the hydrating panel test ID while the chat loads, and hides it after', async () => {
    const backend = fakeBackend();
    const { instance } = await contractChat({
      strings: { aria_hydrationPanel: LOADING_PANEL_NAME },
      messaging: { customSendMessage: backend.customSendMessage },
    });
    await changeView(instance, ViewType.MAIN_WINDOW);
    const sent = await backend.next();
    expect(instance.getState().status).toBe('loading');
    await waitFor(() =>
      expect(
        isShownWithin(
          byRole('dialog', LOADING_PANEL_NAME),
          getByTestId(PageObjectId.HYDRATING_PANEL)
        )
      ).toBe(true)
    );

    await act(async () => {
      sent.resolve();
    });
    await waitFor(() => expect(instance.getState().status).toBe('ready'));
    await waitFor(() =>
      expect(allByRole('dialog', LOADING_PANEL_NAME)).toEqual([])
    );
  });
});
