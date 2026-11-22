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
  PageObjectId,
  PanelType,
  type ChatInstance,
  type CustomPanelOpenOptions,
} from '../../../aiChatEntry';
import {
  allByRole,
  byRole,
  click,
  contractChat,
  contractSetup,
  getByTestId,
  recordEvents,
  responseOf,
  textItem,
} from '../helpers/contract';

const STRINGS = {
  aria_customPanel: 'Host panel',
  general_returnToAssistant: 'Return from host panel',
  launcher_isOpen: 'Minimize host chat',
  buttons_restart: 'Restart host conversation',
};
const PANEL_EVENTS = [
  BusEventType.CUSTOM_PANEL_PRE_OPEN,
  BusEventType.CUSTOM_PANEL_OPEN,
  BusEventType.CUSTOM_PANEL_PRE_CLOSE,
  BusEventType.CUSTOM_PANEL_CLOSE,
];

function panelRoot() {
  return getByTestId(PageObjectId.CUSTOM_PANEL);
}

async function mountOpen() {
  return contractChat({
    openChatByDefault: true,
    messaging: { skipWelcome: true },
    strings: STRINGS,
    header: { showRestartButton: true },
  });
}

// The API resolves before the default panel finishes drawing. Wait for its
// public completion event, and always remove this temporary subscription.
async function openDefault(
  instance: ChatInstance,
  options?: CustomPanelOpenOptions
) {
  const events = recordEvents(instance, [BusEventType.CUSTOM_PANEL_OPEN]);
  try {
    await act(() => instance.customPanels.getPanel().open(options));
    await waitFor(() =>
      expect(events.types()).toEqual([BusEventType.CUSTOM_PANEL_OPEN])
    );
  } finally {
    events.stop();
  }
}

async function closeDefault(instance: ChatInstance) {
  const events = recordEvents(instance, [BusEventType.CUSTOM_PANEL_CLOSE]);
  try {
    await act(() => instance.customPanels.getPanel().close());
    await waitFor(() =>
      expect(events.types()).toEqual([BusEventType.CUSTOM_PANEL_CLOSE])
    );
  } finally {
    events.stop();
  }
}

// @covers instance.customPanels.getPanel().open instance.customPanels.getPanel().close
// @covers state.customPanels.default.isOpen event.customPanel:pre:open
// @covers event.customPanel:open event.customPanel:pre:close event.customPanel:close
// @covers config.strings

describe('public host panel lifecycle', () => {
  contractSetup();

  it('reopens with a new title and delivers one event cycle per disabled-animation transition', async () => {
    const { instance } = await mountOpen();
    const events = recordEvents(instance, PANEL_EVENTS);
    await act(() => instance.customPanels.getPanel().close());
    expect(instance.state.get().customPanels.default.isOpen).toBe(false);

    await openDefault(instance, {
      title: 'First host panel',
      disableAnimation: true,
    });
    expect(allByRole('dialog', 'First host panel')).toHaveLength(1);
    await act(() =>
      instance.customPanels.getPanel().open({
        title: 'First host panel',
        disableAnimation: true,
      })
    );
    await closeDefault(instance);
    // Completed later transitions bound the no-op checks without sleeping.
    expect(events.types()).toEqual(PANEL_EVENTS);

    await openDefault(instance, {
      title: 'Second host panel',
      disableAnimation: true,
    });
    expect(allByRole('dialog', 'Second host panel')).toHaveLength(1);
    expect(allByRole('dialog', 'First host panel')).toHaveLength(0);
    await closeDefault(instance);
    expect(events.types()).toEqual([...PANEL_EVENTS, ...PANEL_EVENTS]);
    expect(instance.state.get().customPanels.default.isOpen).toBe(false);
  });

  it('applies the legacy close-button override to the panel that requested it', async () => {
    const { instance } = await mountOpen();
    await openDefault(instance, {
      title: 'Legacy controls',
      hideCloseButton: false,
      hideBackButton: true,
      disableAnimation: true,
    });
    expect(
      allByRole('button', STRINGS.launcher_isOpen, panelRoot())
    ).toHaveLength(1);
    await closeDefault(instance);

    await openDefault(instance, {
      title: 'Legacy hidden close',
      hideCloseButton: true,
      hideBackButton: true,
      disableAnimation: true,
    });
    expect(allByRole('dialog', 'Legacy hidden close')).toHaveLength(1);
    expect(
      allByRole('button', STRINGS.launcher_isOpen, panelRoot())
    ).toHaveLength(0);
    expect(instance.state.get().customPanels.default.isOpen).toBe(true);
  });

  it('delivers the legacy close callback while its disabled default action keeps the chat open', async () => {
    const { instance } = await mountOpen();
    let closeCalls = 0;
    await openDefault(instance, {
      title: 'Intercepted close',
      hideBackButton: true,
      disableDefaultCloseAction: true,
      onClickClose: () => {
        closeCalls += 1;
      },
    });
    await click(byRole('button', STRINGS.launcher_isOpen, panelRoot()));
    await waitFor(() => expect(closeCalls).toBe(1));
    expect(instance.state.get().viewState.mainWindow).toBe(true);
    expect(instance.state.get().customPanels.default.isOpen).toBe(true);
    expect(allByRole('dialog', 'Intercepted close')).toHaveLength(1);
    await closeDefault(instance);
    expect(instance.state.get().viewState.mainWindow).toBe(true);
  });

  it('delivers legacy back and restart callbacks alongside their real default effects', async () => {
    const { instance } = await mountOpen();
    const panelEvents = recordEvents(instance, PANEL_EVENTS);
    const backStates: boolean[] = [];
    await openDefault(instance, {
      title: 'Legacy back',
      onClickBack: () => {
        backStates.push(instance.state.get().customPanels.default.isOpen);
      },
    });
    await click(
      byRole('button', STRINGS.general_returnToAssistant, panelRoot())
    );
    await waitFor(() =>
      expect(panelEvents.of(BusEventType.CUSTOM_PANEL_CLOSE)).toHaveLength(1)
    );
    expect(backStates).toEqual([false]);

    await act(() =>
      instance.messaging.addMessage(
        responseOf('before-legacy-restart', [
          textItem('A reply before restart'),
        ])
      )
    );
    expect(instance.state.get().messages.map(({ id }) => id)).toContain(
      'before-legacy-restart'
    );
    let restartCalls = 0;
    await openDefault(instance, {
      title: 'Legacy restart',
      onClickRestart: () => {
        restartCalls += 1;
      },
    });
    const restarts = recordEvents(instance, [
      BusEventType.PRE_RESTART_CONVERSATION,
      BusEventType.RESTART_CONVERSATION,
    ]);
    await click(byRole('button', STRINGS.buttons_restart, panelRoot()));
    await waitFor(() =>
      expect(restarts.types()).toEqual([
        BusEventType.PRE_RESTART_CONVERSATION,
        BusEventType.RESTART_CONVERSATION,
      ])
    );
    await waitFor(() =>
      expect(panelEvents.of(BusEventType.CUSTOM_PANEL_CLOSE)).toHaveLength(2)
    );
    expect(restartCalls).toBe(1);
    expect(instance.state.get().messages).toEqual([]);
    expect(instance.state.get().customPanels.default.isOpen).toBe(false);
  });

  it('keeps the open default panel title and back control when history receives conflicting options', async () => {
    const { instance } = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      strings: STRINGS,
      history: { isOn: true, startClosed: true },
    });
    await openDefault(instance, {
      title: 'Order details',
      hideBackButton: true,
      fullWidth: true,
      disableAnimation: true,
    });
    const history = instance.customPanels.getPanel(PanelType.HISTORY);
    await act(() =>
      history.open({
        title: 'Chats',
        hideBackButton: false,
        fullWidth: false,
      })
    );
    expect(instance.state.get().customPanels.history.isOpen).toBe(true);
    expect(instance.state.get().customPanels.default.isOpen).toBe(true);
    await act(() => history.close());
    await waitFor(() =>
      expect(allByRole('dialog', 'Order details')).toHaveLength(1)
    );
    expect(instance.state.get().customPanels.history.isOpen).toBe(false);
    expect(
      allByRole('button', STRINGS.general_returnToAssistant, panelRoot())
    ).toHaveLength(0);
  });

  it('reopens workspace with new data and passes the original instance to each open handler', async () => {
    const { instance } = await mountOpen();
    const panel = instance.customPanels.getPanel(PanelType.WORKSPACE);
    const contexts: ChatInstance[] = [];
    instance.on({
      type: BusEventType.WORKSPACE_OPEN,
      handler: (_event, handed) => {
        contexts.push(handed);
      },
    });
    for (const cycle of [1, 2]) {
      await act(() =>
        panel.open({
          workspaceId: `cycle-${cycle}`,
          additionalData: { cycle },
        })
      );
      expect(instance.state.get().workspace).toMatchObject({
        isOpen: true,
        workspaceID: `cycle-${cycle}`,
        additionalData: { cycle },
      });
      expect(instance.state.get().customPanels.workspace).toEqual(
        instance.state.get().workspace
      );
      await act(() => panel.close());
      expect(instance.state.get().workspace).toMatchObject({
        isOpen: false,
        workspaceID: undefined,
        additionalData: undefined,
      });
    }
    expect(contexts).toHaveLength(2);
    for (const context of contexts) {
      expect(context).toBe(instance);
    }
  });

  it('keeps an already-open default panel when workspace opens and closes', async () => {
    const { instance } = await mountOpen();
    await openDefault(instance, {
      title: 'Default beside workspace',
      disableAnimation: true,
    });
    const workspace = instance.customPanels.getPanel(PanelType.WORKSPACE);
    await act(() => workspace.open({ workspaceId: 'beside-default' }));
    expect(instance.state.get().workspace.isOpen).toBe(true);
    expect(instance.state.get().customPanels.default.isOpen).toBe(true);
    await act(() => workspace.close());
    expect(instance.state.get().workspace.isOpen).toBe(false);
    expect(instance.state.get().customPanels.default.isOpen).toBe(true);
    await waitFor(() =>
      expect(allByRole('dialog', 'Default beside workspace')).toHaveLength(1)
    );
  });
});
