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
  BusEvent,
  BusEventType,
  BusEventWorkspaceClose,
  BusEventWorkspaceOpen,
  BusEventWorkspacePreClose,
  BusEventWorkspacePreOpen,
  ChatInstance,
  MessageResponseTypes,
  PanelType,
  PreviewCardItem,
  WorkspaceCustomPanelConfigOptions,
} from '../../../../src/aiChatEntry';
import {
  byRole,
  click,
  contractChat,
  contractSetup,
  deferred,
  isHidden,
  isInFlatTree,
  pause,
  recordEvents,
  responseOf,
} from '../../helpers';

const WORKSPACE_EVENTS = [
  BusEventType.WORKSPACE_PRE_OPEN,
  BusEventType.WORKSPACE_OPEN,
  BusEventType.WORKSPACE_PRE_CLOSE,
  BusEventType.WORKSPACE_CLOSE,
];

type WorkspaceEvent =
  | BusEventWorkspacePreOpen
  | BusEventWorkspaceOpen
  | BusEventWorkspacePreClose
  | BusEventWorkspaceClose;

/** The options a host opens the workspace with in most tests. */
const OPTIONS: WorkspaceCustomPanelConfigOptions = {
  title: 'Contract workspace',
  preferredLocation: 'start',
  workspaceId: 'contract-workspace',
  additionalData: { source: 'contract' },
};

/** The workspace state before anything opens it, and after it closes. */
const CLOSED = {
  isOpen: false,
  options: { preferredLocation: 'end' },
  workspaceID: undefined as string | undefined,
  additionalData: undefined as unknown,
};

/** Mounts an open chat. */
async function mountOpen() {
  return contractChat({ openChatByDefault: true });
}

function workspacePanel(instance: ChatInstance) {
  return instance.customPanels.getPanel(PanelType.WORKSPACE);
}

/** Opens the workspace the way a host would, and waits for the call. */
async function openWorkspace(
  instance: ChatInstance,
  options?: WorkspaceCustomPanelConfigOptions
): Promise<void> {
  await act(() => workspacePanel(instance).open(options));
}

/** Closes the workspace the way a host would, and waits for the call. */
async function closeWorkspace(instance: ChatInstance): Promise<void> {
  await act(() => workspacePanel(instance).close());
}

/** An event's type, workspace ID, and additional data. */
function summary(event: BusEvent) {
  const { data } = event as WorkspaceEvent;
  return {
    type: event.type,
    workspaceId: data.workspaceId,
    additionalData: data.additionalData,
  };
}

/** Writes a span into the workspace's writeable element. */
function writeWorkspaceContent(instance: ChatInstance): HTMLElement {
  const span = document.createElement('span');
  span.textContent = 'Contract workspace content';
  instance.writeableElements.workspacePanelElement.append(span);
  return span;
}

// @covers state.workspace state.workspace.isOpen state.workspace.options
// @covers state.workspace.options.preferredLocation state.workspace.workspaceID
// @covers state.workspace.additionalData state.customPanels.workspace
// @covers state.customPanels.workspace.isOpen state.customPanels.workspace.options
// @covers state.customPanels.workspace.workspaceID
// @covers state.customPanels.workspace.additionalData
// @covers state.workspace.options.title state.workspace.options.workspaceId
// @covers state.workspace.options.additionalData
// @covers instance.customPanels.getPanel().open instance.customPanels.getPanel().close
describe('workspace state', () => {
  contractSetup();

  it('starts closed, at the end, with no ID or data', async () => {
    const { instance } = await mountOpen();
    expect(instance.state.get().workspace).toEqual(CLOSED);
    expect(instance.state.get().customPanels.workspace).toEqual(CLOSED);
  });

  // `options` is typed `WorkspaceCustomPanelConfigOptions`, but on `main` it
  // holds only `preferredLocation`: `title`, `workspaceId`, and
  // `additionalData` never reach it (src/chat/utils/publicState.ts:200,218).
  it('holds the opened workspace: isOpen, preferredLocation, ID, and data', async () => {
    const { instance } = await mountOpen();
    await openWorkspace(instance, OPTIONS);
    const expected = {
      isOpen: true,
      options: { preferredLocation: 'start' },
      workspaceID: 'contract-workspace',
      additionalData: { source: 'contract' },
    };
    expect(instance.state.get().workspace).toEqual(expected);
    expect(instance.state.get().customPanels.workspace).toEqual(expected);
    expect(instance.state.get().workspace.options).not.toHaveProperty('title');
    expect(instance.state.get().workspace.options).not.toHaveProperty(
      'workspaceId'
    );
    expect(instance.state.get().workspace.options).not.toHaveProperty(
      'additionalData'
    );
  });

  it('opens at the end with no ID or data when open gets no options', async () => {
    const { instance } = await mountOpen();
    await openWorkspace(instance);
    expect(instance.state.get().workspace).toEqual({ ...CLOSED, isOpen: true });
  });

  it('returns to the closed default on close, dropping the ID, data, and location', async () => {
    const { instance } = await mountOpen();
    await openWorkspace(instance, OPTIONS);
    await closeWorkspace(instance);
    expect(instance.state.get().workspace).toEqual(CLOSED);
    expect(instance.state.get().customPanels.workspace).toEqual(CLOSED);
  });

  it('leaves the default and history panels closed', async () => {
    const { instance } = await mountOpen();
    await openWorkspace(instance, OPTIONS);
    expect(instance.state.get().customPanels.default.isOpen).toBe(false);
    expect(instance.state.get().customPanels.history.isOpen).toBe(false);
  });

  // Unlike the default panel, which fires its close events on restart (see
  // customPanel_spec.ts), the workspace closes with no workspace event.
  it('closes on restartConversation, firing no workspace event', async () => {
    const { instance } = await mountOpen();
    await openWorkspace(instance, OPTIONS);
    const events = recordEvents(instance, WORKSPACE_EVENTS);
    await act(() => instance.messaging.restartConversation());
    // A short wait to show no close event fires.
    await pause(300);
    expect(instance.state.get().workspace).toEqual(CLOSED);
    expect(events.types()).toEqual([]);
  });
});

// @covers event.workspace:pre:open event.workspace:open
// @covers event.workspace:pre:close event.workspace:close
// @covers instance.customPanels.getPanel().open instance.customPanels.getPanel().close
// @covers state.workspace.isOpen
describe('workspace events', () => {
  contractSetup();

  it('fires pre:open then open with the workspaceId and additionalData', async () => {
    const { instance } = await mountOpen();
    const events = recordEvents(instance, WORKSPACE_EVENTS);
    await openWorkspace(instance, OPTIONS);
    expect(events.events.map(summary)).toEqual([
      {
        type: BusEventType.WORKSPACE_PRE_OPEN,
        workspaceId: 'contract-workspace',
        additionalData: { source: 'contract' },
      },
      {
        type: BusEventType.WORKSPACE_OPEN,
        workspaceId: 'contract-workspace',
        additionalData: { source: 'contract' },
      },
    ]);
  });

  it('fires pre:close then close with the ID and data the workspace opened with', async () => {
    const { instance } = await mountOpen();
    await openWorkspace(instance, OPTIONS);
    const events = recordEvents(instance, WORKSPACE_EVENTS);
    await closeWorkspace(instance);
    expect(events.events.map(summary)).toEqual([
      {
        type: BusEventType.WORKSPACE_PRE_CLOSE,
        workspaceId: 'contract-workspace',
        additionalData: { source: 'contract' },
      },
      {
        type: BusEventType.WORKSPACE_CLOSE,
        workspaceId: 'contract-workspace',
        additionalData: { source: 'contract' },
      },
    ]);
  });

  it('fires pre:open while closed and open once open; pre:close while open and close once closed', async () => {
    const { instance } = await mountOpen();
    const seen: string[] = [];
    instance.on(
      WORKSPACE_EVENTS.map((type) => ({
        type,
        handler: () => {
          seen.push(`${type} ${instance.state.get().workspace.isOpen}`);
        },
      }))
    );
    await openWorkspace(instance, OPTIONS);
    await closeWorkspace(instance);
    expect(seen).toEqual([
      'workspace:pre:open false',
      'workspace:open true',
      'workspace:pre:close true',
      'workspace:close false',
    ]);
  });

  it('fires both events with no ID or data when open gets no options', async () => {
    const { instance } = await mountOpen();
    const events = recordEvents(instance, WORKSPACE_EVENTS);
    await openWorkspace(instance);
    expect(events.events.map(summary)).toEqual([
      {
        type: BusEventType.WORKSPACE_PRE_OPEN,
        workspaceId: undefined,
        additionalData: undefined,
      },
      {
        type: BusEventType.WORKSPACE_OPEN,
        workspaceId: undefined,
        additionalData: undefined,
      },
    ]);
  });

  it('waits for an async pre:open handler before opening and resolving', async () => {
    const { instance } = await mountOpen();
    const gate = deferred();
    instance.on({
      type: BusEventType.WORKSPACE_PRE_OPEN,
      handler: () => gate.promise,
    });
    let resolved = false;
    let opening: Promise<void>;
    await act(async () => {
      opening = workspacePanel(instance)
        .open(OPTIONS)
        .then(() => {
          resolved = true;
        });
    });
    // A short wait to show the workspace doesn't open while the handler runs.
    await pause();
    expect(resolved).toBe(false);
    expect(instance.state.get().workspace.isOpen).toBe(false);

    await act(async () => {
      gate.resolve();
      await opening;
    });
    expect(resolved).toBe(true);
    expect(instance.state.get().workspace.isOpen).toBe(true);
  });

  it('keeps a pre:open handler change to additionalData, in state and in the close events', async () => {
    const { instance } = await mountOpen();
    instance.on({
      type: BusEventType.WORKSPACE_PRE_OPEN,
      handler: (event: BusEventWorkspacePreOpen) => {
        (event.data.additionalData as { source: string }).source = 'handler';
      },
    });
    await openWorkspace(instance, {
      workspaceId: 'contract-workspace',
      additionalData: { source: 'host' },
    });
    expect(instance.state.get().workspace.additionalData).toEqual({
      source: 'handler',
    });
    const events = recordEvents(instance, WORKSPACE_EVENTS);
    await closeWorkspace(instance);
    expect(events.events.map((event) => summary(event).additionalData)).toEqual(
      [{ source: 'handler' }, { source: 'handler' }]
    );
  });

  // Unlike the default panel, closing a closed workspace still fires both
  // close events.
  it('fires pre:close and close, with no ID or data, when a closed workspace is closed', async () => {
    const { instance } = await mountOpen();
    const events = recordEvents(instance, WORKSPACE_EVENTS);
    await closeWorkspace(instance);
    expect(events.events.map(summary)).toEqual([
      {
        type: BusEventType.WORKSPACE_PRE_CLOSE,
        workspaceId: undefined,
        additionalData: undefined,
      },
      {
        type: BusEventType.WORKSPACE_CLOSE,
        workspaceId: undefined,
        additionalData: undefined,
      },
    ]);
  });

  // Suspected `main` bug (reported, not in INTENDED.md): `open` closes the
  // open workspace without waiting (src/chat/services/CustomPanelInstance.ts:237),
  // and that close resets the state after the new ID is stored, so the new
  // workspace opens with no ID or data and its open event carries none.
  it('closes an open workspace before opening another, and loses the new ID', async () => {
    const { instance } = await mountOpen();
    await openWorkspace(instance, OPTIONS);
    const events = recordEvents(instance, WORKSPACE_EVENTS);
    await openWorkspace(instance, {
      workspaceId: 'second-workspace',
      additionalData: { source: 'second' },
    });
    const byType = (type: BusEventType) =>
      events.events.filter((event) => event.type === type).map(summary);
    expect(events.types()).toHaveLength(4);
    expect(events.types()[0]).toBe(BusEventType.WORKSPACE_PRE_CLOSE);
    expect(events.types()[3]).toBe(BusEventType.WORKSPACE_OPEN);
    expect(byType(BusEventType.WORKSPACE_PRE_CLOSE)).toEqual([
      {
        type: BusEventType.WORKSPACE_PRE_CLOSE,
        workspaceId: 'contract-workspace',
        additionalData: { source: 'contract' },
      },
    ]);
    expect(byType(BusEventType.WORKSPACE_CLOSE)).toEqual([
      {
        type: BusEventType.WORKSPACE_CLOSE,
        workspaceId: 'contract-workspace',
        additionalData: { source: 'contract' },
      },
    ]);
    expect(byType(BusEventType.WORKSPACE_PRE_OPEN)).toEqual([
      {
        type: BusEventType.WORKSPACE_PRE_OPEN,
        workspaceId: 'second-workspace',
        additionalData: { source: 'second' },
      },
    ]);
    expect(byType(BusEventType.WORKSPACE_OPEN)).toEqual([
      {
        type: BusEventType.WORKSPACE_OPEN,
        workspaceId: undefined,
        additionalData: undefined,
      },
    ]);
    expect(instance.state.get().workspace).toEqual({ ...CLOSED, isOpen: true });
  });
});

// @covers writeable-element.workspacePanelElement
// @covers instance.customPanels.getPanel().open instance.customPanels.getPanel().close
describe('workspacePanelElement', () => {
  contractSetup();

  it('does not show while the workspace is closed', async () => {
    const { instance } = await mountOpen();
    const content = writeWorkspaceContent(instance);
    expect(isInFlatTree(content)).toBe(false);
  });

  it('shows while the workspace is open, and goes once it closes', async () => {
    const { instance } = await mountOpen();
    const content = writeWorkspaceContent(instance);
    await openWorkspace(instance, OPTIONS);
    await waitFor(() => {
      expect(isInFlatTree(content)).toBe(true);
      expect(isHidden(content)).toBe(false);
    });

    await closeWorkspace(instance);
    await waitFor(() => expect(isInFlatTree(content)).toBe(false));
  });

  it('does not show while only the default panel is open', async () => {
    const { instance } = await mountOpen();
    const content = writeWorkspaceContent(instance);
    await act(() => instance.customPanels.getPanel().open());
    // A short wait to show the workspace doesn't open.
    await pause(300);
    expect(isInFlatTree(content)).toBe(false);
  });
});

// The preview card's open button has no `strings` key; on `main` its label is
// fixed copy, so the tests find it by that text.
const VIEW_DETAILS = 'View details';

/** A preview card with these fields, in a response with ID `r-card`. */
function previewCard(extra: Partial<PreviewCardItem> = {}): PreviewCardItem {
  return {
    response_type: MessageResponseTypes.PREVIEW_CARD,
    title: 'Contract card',
    workspace_options: { preferredLocation: 'start' },
    ...extra,
  } as PreviewCardItem;
}

/** Mounts an open chat, adds a response holding `item`, and clicks it open. */
async function openFromCard(item: PreviewCardItem) {
  const { instance } = await contractChat({
    openChatByDefault: true,
    messaging: { skipWelcome: true },
  });
  const events = recordEvents(instance, WORKSPACE_EVENTS);
  await act(() => instance.messaging.addMessage(responseOf('r-card', [item])));
  await click(byRole('button', VIEW_DETAILS));
  await waitFor(() =>
    expect(events.types()).toEqual([
      BusEventType.WORKSPACE_PRE_OPEN,
      BusEventType.WORKSPACE_OPEN,
    ])
  );
  return { instance, events };
}

// @covers event.workspace:pre:open event.workspace:open state.workspace
// @covers state.workspace.isOpen state.workspace.options.preferredLocation
// @covers state.workspace.workspaceID state.workspace.additionalData
// @covers response-type.preview_card
describe('workspace opened from a preview card', () => {
  contractSetup();

  it('opens with the card workspace_options, and its events carry the card item and its response', async () => {
    const item = previewCard();
    const { instance, events } = await openFromCard(item);
    expect(instance.state.get().workspace).toEqual({
      ...CLOSED,
      isOpen: true,
      options: { preferredLocation: 'start' },
    });
    for (const event of events.events as WorkspaceEvent[]) {
      expect(event.data.message).toEqual(item);
      expect(event.data.fullMessage.id).toBe('r-card');
      expect(event.data.fullMessage.output.generic).toEqual([item]);
    }
  });

  // Records the known `main` bug "A preview card whose `workspace_id` or
  // `additional_data` is non-empty opens a workspace whose four events give
  // `undefined` for `message` and `fullMessage`" (INTENDED.md, Known `main`
  // bugs).
  it('opens under the card workspace_id and additional_data; its events then carry no message', async () => {
    const { instance, events } = await openFromCard(
      previewCard({
        workspace_id: 'card-workspace',
        additional_data: { from: 'card' },
      })
    );
    expect(instance.state.get().workspace).toEqual({
      isOpen: true,
      options: { preferredLocation: 'start' },
      workspaceID: 'card-workspace',
      additionalData: { from: 'card' },
    });
    expect(
      (events.events as WorkspaceEvent[]).map((event) => ({
        ...summary(event),
        message: event.data.message,
        fullMessage: event.data.fullMessage,
      }))
    ).toEqual(
      [BusEventType.WORKSPACE_PRE_OPEN, BusEventType.WORKSPACE_OPEN].map(
        (type) => ({
          type,
          workspaceId: 'card-workspace',
          additionalData: { from: 'card' },
          message: undefined as unknown,
          fullMessage: undefined as unknown,
        })
      )
    );
  });
});
