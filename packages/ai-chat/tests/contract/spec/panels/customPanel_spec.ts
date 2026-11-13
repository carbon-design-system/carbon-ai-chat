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
  ChatInstance,
  CustomPanelOpenOptions,
  PageObjectId,
  PanelType,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  EventRecorder,
  allByRole,
  byRole,
  changeView,
  click,
  contractChat,
  contractSetup,
  getByTestId,
  isHidden,
  isShownWithin,
  pause,
  recordEvents,
} from '../../helpers';

// Copy the tests set through `strings`, so they find controls by an accessible
// name they own rather than by the chat's default text.
const STRINGS = {
  aria_customPanel: 'Contract panel',
  general_returnToAssistant: 'Contract back',
};

const PANEL_EVENTS = [
  BusEventType.CUSTOM_PANEL_PRE_OPEN,
  BusEventType.CUSTOM_PANEL_OPEN,
  BusEventType.CUSTOM_PANEL_PRE_CLOSE,
  BusEventType.CUSTOM_PANEL_CLOSE,
];

const OPEN_EVENTS = [
  BusEventType.CUSTOM_PANEL_PRE_OPEN,
  BusEventType.CUSTOM_PANEL_OPEN,
];

const CLOSE_EVENTS = [
  BusEventType.CUSTOM_PANEL_PRE_CLOSE,
  BusEventType.CUSTOM_PANEL_CLOSE,
];

/** Mounts an open chat with the test strings. */
async function mountOpen() {
  return contractChat({ openChatByDefault: true, strings: STRINGS });
}

/** Opens a panel the way a host would, and waits for the call. */
async function openPanel(
  instance: ChatInstance,
  options?: CustomPanelOpenOptions,
  type?: PanelType
): Promise<void> {
  await act(async () => {
    await instance.customPanels.getPanel(type).open(options);
  });
}

/** Closes a panel the way a host would, and waits for the call. */
async function closePanel(
  instance: ChatInstance,
  type?: PanelType
): Promise<void> {
  await act(async () => {
    await instance.customPanels.getPanel(type).close();
  });
}

/**
 * Waits until the recorder has seen this event. The default panel fires its
 * events as it draws, after `open` and `close` have resolved.
 */
async function waitForEvent(
  events: EventRecorder,
  type: BusEventType
): Promise<void> {
  await waitFor(() => expect(events.types()).toContain(type));
}

/** Writes a span into the custom panel's writeable element. */
function writePanelContent(instance: ChatInstance): HTMLElement {
  const span = document.createElement('span');
  span.textContent = 'Contract panel content';
  instance.writeableElements.customPanelElement.append(span);
  return span;
}

// @covers instance.customPanels instance.customPanels.getPanel
// @covers instance.customPanels.getPanel().open state.customPanels.default
// @covers state.customPanels.default.isOpen state.customPanels.workspace.isOpen
describe('customPanels.getPanel', () => {
  contractSetup();

  it('controls the default panel with no argument', async () => {
    const { instance } = await mountOpen();
    await openPanel(instance);
    expect(instance.state.get().customPanels.default.isOpen).toBe(true);
    expect(instance.state.get().customPanels.workspace.isOpen).toBe(false);
  });

  it('controls the default panel for PanelType.DEFAULT', async () => {
    const { instance } = await mountOpen();
    await openPanel(instance, undefined, PanelType.DEFAULT);
    expect(instance.state.get().customPanels.default.isOpen).toBe(true);
    expect(instance.state.get().customPanels.workspace.isOpen).toBe(false);
  });

  it('falls back to the default panel for a type it does not know', async () => {
    const { instance } = await mountOpen();
    await openPanel(instance, undefined, 'contract-unknown' as PanelType);
    expect(instance.state.get().customPanels.default.isOpen).toBe(true);
    expect(instance.state.get().customPanels.workspace.isOpen).toBe(false);
    expect(instance.state.get().customPanels.history.isOpen).toBe(false);
  });
});

// @covers instance.customPanels.getPanel().hostElement
describe('custom panel hostElement', () => {
  contractSetup();

  it.each([PanelType.DEFAULT, PanelType.WORKSPACE, PanelType.HISTORY])(
    'is undefined for the %s panel, closed or open',
    async (type) => {
      const { instance } = await mountOpen();
      expect(instance.customPanels.getPanel(type).hostElement).toBeUndefined();
      await openPanel(instance, undefined, type);
      expect(instance.customPanels.getPanel(type).hostElement).toBeUndefined();
    }
  );
});

// @covers instance.customPanels.getPanel().open instance.customPanels.getPanel().close
// @covers state.customPanels state.customPanels.default state.customPanels.default.isOpen
describe('default custom panel state', () => {
  contractSetup();

  it('starts closed', async () => {
    const { instance } = await mountOpen();
    expect(instance.state.get().customPanels.default).toEqual({
      isOpen: false,
    });
  });

  it('turns isOpen true on open and false on close', async () => {
    const { instance } = await mountOpen();
    await openPanel(instance);
    expect(instance.state.get().customPanels.default).toEqual({
      isOpen: true,
    });
    await closePanel(instance);
    expect(instance.state.get().customPanels.default).toEqual({
      isOpen: false,
    });
  });

  it('opens while the chat window is closed', async () => {
    const { instance } = await contractChat({ strings: STRINGS });
    await openPanel(instance);
    expect(instance.state.get().viewState.mainWindow).toBe(false);
    expect(instance.state.get().customPanels.default.isOpen).toBe(true);
  });

  it('stays open when the chat window closes and opens again', async () => {
    const { instance } = await mountOpen();
    await openPanel(instance);
    await changeView(instance, ViewType.LAUNCHER);
    expect(instance.state.get().customPanels.default.isOpen).toBe(true);
    await changeView(instance, ViewType.MAIN_WINDOW);
    expect(instance.state.get().customPanels.default.isOpen).toBe(true);
  });
});

// @covers event.customPanel:pre:open event.customPanel:open
// @covers event.customPanel:pre:close event.customPanel:close
// @covers instance.customPanels.getPanel().open instance.customPanels.getPanel().close
describe('default custom panel events', () => {
  contractSetup();

  it('fires pre:open then open on open, and pre:close then close on close', async () => {
    const { instance } = await mountOpen();
    const events = recordEvents(instance, PANEL_EVENTS);
    await openPanel(instance);
    await waitForEvent(events, BusEventType.CUSTOM_PANEL_OPEN);
    expect(events.types()).toEqual(OPEN_EVENTS);

    await closePanel(instance);
    await waitForEvent(events, BusEventType.CUSTOM_PANEL_CLOSE);
    expect(events.types()).toEqual([...OPEN_EVENTS, ...CLOSE_EVENTS]);
  });

  it('fires each event with its type and no data', async () => {
    const { instance } = await mountOpen();
    const events = recordEvents(instance, PANEL_EVENTS);
    await openPanel(instance);
    await waitForEvent(events, BusEventType.CUSTOM_PANEL_OPEN);
    await closePanel(instance);
    await waitForEvent(events, BusEventType.CUSTOM_PANEL_CLOSE);
    expect(events.events).toEqual(
      [...OPEN_EVENTS, ...CLOSE_EVENTS].map((type) => ({ type }))
    );
  });

  it('reports the panel open in state by the time pre:open fires, and closed by pre:close', async () => {
    const { instance } = await mountOpen();
    const seen: string[] = [];
    instance.on(
      PANEL_EVENTS.map((type) => ({
        type,
        handler: () => {
          seen.push(
            `${type} ${instance.state.get().customPanels.default.isOpen}`
          );
        },
      }))
    );
    const events = recordEvents(instance, PANEL_EVENTS);
    await openPanel(instance);
    await waitForEvent(events, BusEventType.CUSTOM_PANEL_OPEN);
    await closePanel(instance);
    await waitForEvent(events, BusEventType.CUSTOM_PANEL_CLOSE);
    expect(seen).toEqual([
      'customPanel:pre:open true',
      'customPanel:open true',
      'customPanel:pre:close false',
      'customPanel:close false',
    ]);
  });

  it('fires no events when a closed panel is closed', async () => {
    const { instance } = await mountOpen();
    const events = recordEvents(instance, PANEL_EVENTS);
    await closePanel(instance);
    // A short wait to show nothing fires.
    await pause(300);
    expect(events.types()).toEqual([]);
  });

  it('fires no second pair of open events when an open panel is opened', async () => {
    const { instance } = await mountOpen();
    const events = recordEvents(instance, PANEL_EVENTS);
    await openPanel(instance);
    await waitForEvent(events, BusEventType.CUSTOM_PANEL_OPEN);
    await openPanel(instance);
    // A short wait to show nothing more fires.
    await pause(300);
    expect(events.types()).toEqual(OPEN_EVENTS);
  });

  it('fires the open events when the panel opens while the chat window is closed', async () => {
    const { instance } = await contractChat({ strings: STRINGS });
    const events = recordEvents(instance, PANEL_EVENTS);
    await openPanel(instance);
    await waitForEvent(events, BusEventType.CUSTOM_PANEL_OPEN);
    expect(events.types()).toEqual(OPEN_EVENTS);
  });

  it('fires no events for the workspace or history panels', async () => {
    const { instance } = await contractChat({
      openChatByDefault: true,
      strings: STRINGS,
      history: { isOn: true, startClosed: true },
    });
    const events = recordEvents(instance, PANEL_EVENTS);
    await openPanel(instance, undefined, PanelType.WORKSPACE);
    expect(instance.state.get().customPanels.workspace.isOpen).toBe(true);
    await closePanel(instance, PanelType.WORKSPACE);
    expect(instance.state.get().customPanels.workspace.isOpen).toBe(false);
    await openPanel(instance, undefined, PanelType.HISTORY);
    expect(instance.state.get().customPanels.history.isOpen).toBe(true);
    await closePanel(instance, PanelType.HISTORY);
    expect(instance.state.get().customPanels.history.isOpen).toBe(false);
    // A short wait to show nothing fires.
    await pause(300);
    expect(events.types()).toEqual([]);
  });

  it('closes on restartConversation, firing pre:close and close', async () => {
    const { instance } = await mountOpen();
    const events = recordEvents(instance, PANEL_EVENTS);
    await openPanel(instance);
    await waitForEvent(events, BusEventType.CUSTOM_PANEL_OPEN);
    await act(() => instance.messaging.restartConversation());
    await waitForEvent(events, BusEventType.CUSTOM_PANEL_CLOSE);
    expect(events.types()).toEqual([...OPEN_EVENTS, ...CLOSE_EVENTS]);
    expect(instance.state.get().customPanels.default.isOpen).toBe(false);
  });
});

// @covers writeable-element.customPanelElement instance.customPanels.getPanel().open
// @covers instance.customPanels.getPanel().close
describe('customPanelElement', () => {
  contractSetup();

  it('is hidden while the default panel is closed', async () => {
    const { instance } = await mountOpen();
    const content = writePanelContent(instance);
    expect(isHidden(content)).toBe(true);
  });

  it('shows while the default panel is open, and hides again once it closes', async () => {
    const { instance } = await mountOpen();
    const content = writePanelContent(instance);
    const events = recordEvents(instance, PANEL_EVENTS);
    await openPanel(instance);
    await waitForEvent(events, BusEventType.CUSTOM_PANEL_OPEN);
    expect(isHidden(content)).toBe(false);

    await closePanel(instance);
    await waitForEvent(events, BusEventType.CUSTOM_PANEL_CLOSE);
    expect(isHidden(content)).toBe(true);
  });

  it('stays hidden while only the workspace panel is open', async () => {
    const { instance } = await mountOpen();
    const content = writePanelContent(instance);
    await openPanel(instance, undefined, PanelType.WORKSPACE);
    // A short wait to show the custom panel doesn't open.
    await pause(300);
    expect(isHidden(content)).toBe(true);
  });

  // @covers export.aiChatEntry.PageObjectId
  it('shows inside the element with the custom panel test ID while open', async () => {
    const { instance } = await mountOpen();
    const content = writePanelContent(instance);
    const events = recordEvents(instance, PANEL_EVENTS);
    await openPanel(instance);
    await waitForEvent(events, BusEventType.CUSTOM_PANEL_OPEN);
    const panel = getByTestId(PageObjectId.CUSTOM_PANEL);
    expect(isHidden(panel)).toBe(false);
    expect(isShownWithin(content, panel)).toBe(true);
  });
});

// @covers instance.customPanels.getPanel().open instance.customPanels.getPanel().close
// @covers event.customPanel:pre:close event.customPanel:close config.strings
describe('default custom panel options', () => {
  contractSetup();

  it('names the open panel with options.title', async () => {
    const { instance } = await mountOpen();
    const events = recordEvents(instance, PANEL_EVENTS);
    await openPanel(instance, { title: 'Contract title' });
    await waitForEvent(events, BusEventType.CUSTOM_PANEL_OPEN);
    expect(allByRole('dialog', 'Contract title')).toHaveLength(1);
    expect(allByRole('dialog', STRINGS.aria_customPanel)).toHaveLength(0);
  });

  it('names the open panel with aria_customPanel when no title is given', async () => {
    const { instance } = await mountOpen();
    const events = recordEvents(instance, PANEL_EVENTS);
    expect(allByRole('dialog', STRINGS.aria_customPanel)).toHaveLength(0);
    await openPanel(instance);
    await waitForEvent(events, BusEventType.CUSTOM_PANEL_OPEN);
    expect(allByRole('dialog', STRINGS.aria_customPanel)).toHaveLength(1);
  });

  it('closes from its back button, firing pre:close and close', async () => {
    const { instance } = await mountOpen();
    const events = recordEvents(instance, PANEL_EVENTS);
    await openPanel(instance);
    await waitForEvent(events, BusEventType.CUSTOM_PANEL_OPEN);
    await click(byRole('button', STRINGS.general_returnToAssistant));
    await waitForEvent(events, BusEventType.CUSTOM_PANEL_CLOSE);
    expect(events.types()).toEqual([...OPEN_EVENTS, ...CLOSE_EVENTS]);
    expect(instance.state.get().customPanels.default.isOpen).toBe(false);
  });

  it('shows no back button with hideBackButton', async () => {
    const { instance } = await mountOpen();
    const events = recordEvents(instance, PANEL_EVENTS);
    await openPanel(instance, { hideBackButton: true });
    await waitForEvent(events, BusEventType.CUSTOM_PANEL_OPEN);
    expect(allByRole('dialog', STRINGS.aria_customPanel)).toHaveLength(1);
    expect(allByRole('button', STRINGS.general_returnToAssistant)).toHaveLength(
      0
    );
  });
});
