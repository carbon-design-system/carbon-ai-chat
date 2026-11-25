/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';

import {
  BusEventType,
  PanelType,
  type BusEvent,
  type PublicChatState,
} from '../../../aiChatEntry';
import { contractChat, contractSetup } from '../helpers/contract';

const WORKSPACE_EVENTS = [
  BusEventType.WORKSPACE_PRE_OPEN,
  BusEventType.WORKSPACE_OPEN,
  BusEventType.WORKSPACE_PRE_CLOSE,
  BusEventType.WORKSPACE_CLOSE,
] as const;

type WorkspaceEvent = BusEvent & {
  data: { additionalData?: { value: string } };
};

/** Whether the workspace is closing during this event, so close clears it. */
function closes(type: BusEventType) {
  return (
    type === BusEventType.WORKSPACE_PRE_CLOSE ||
    type === BusEventType.WORKSPACE_CLOSE
  );
}

async function mountOpen() {
  return contractChat({
    openChatByDefault: true,
    messaging: { skipWelcome: true },
  });
}

// @covers instance.state.get state.workspace.additionalData
// @covers state.customPanels.workspace.additionalData
// @covers instance.customPanels.getPanel().open instance.customPanels.getPanel().close
// @covers event.workspace:pre:open event.workspace:open
// @covers event.workspace:pre:close event.workspace:close

describe('public workspace state snapshots', () => {
  contractSetup();

  it.each(
    WORKSPACE_EVENTS.flatMap((type) =>
      [false, true].map((readEarly) => ({ type, readEarly }))
    )
  )(
    'keeps a state read during $type fixed while its handler edits the workspace data (read early: $readEarly)',
    async ({ type, readEarly }) => {
      const { instance } = await mountOpen();
      const panel = instance.customPanels.getPanel(PanelType.WORKSPACE);
      let snapshot: PublicChatState | undefined;
      let earlyRead: unknown = 'not read';
      const handler = (event: BusEvent) => {
        snapshot = instance.state.get();
        if (readEarly) {
          earlyRead = snapshot.workspace.additionalData;
        }
        (event as WorkspaceEvent).data.additionalData.value = 'after';
      };
      instance.on({ type, handler });
      try {
        await act(() =>
          panel.open({
            workspaceId: 'snapshot-workspace',
            additionalData: { value: 'before' },
          })
        );
        if (closes(type)) {
          await act(() => panel.close());
        }
      } finally {
        instance.off({ type, handler });
      }

      // The close event runs after close has cleared the workspace.
      const seen =
        type === BusEventType.WORKSPACE_CLOSE ? undefined : { value: 'before' };
      expect(snapshot).toBeDefined();
      if (readEarly) {
        expect(earlyRead).toEqual(seen);
      }
      expect(snapshot.workspace.additionalData).toEqual(seen);
      expect(snapshot.customPanels.workspace.additionalData).toEqual(seen);

      // Positive control: in the open-phase cells, the current state shows the
      // handler's edit. In the close-phase cells, close clears the workspace,
      // so these checks show only that it was cleared.
      const current = closes(type) ? undefined : { value: 'after' };
      expect(instance.state.get().workspace.additionalData).toEqual(current);
      expect(
        instance.state.get().customPanels.workspace.additionalData
      ).toEqual(current);
    }
  );

  it('hands out frozen copies of workspace data and leaves the host object writable', async () => {
    const { instance } = await mountOpen();
    const source = { nested: { value: 'source' } };
    await act(() =>
      instance.customPanels.getPanel(PanelType.WORKSPACE).open({
        workspaceId: 'frozen-copy',
        additionalData: source,
      })
    );
    const state = instance.state.get();
    const projections = [
      state.workspace.additionalData,
      state.customPanels.workspace.additionalData,
    ] as (typeof source)[];
    for (const projected of projections) {
      expect(projected).toEqual({ nested: { value: 'source' } });
      expect(projected).not.toBe(source);
      expect(Object.isFrozen(projected)).toBe(true);
      expect(Object.isFrozen(projected.nested)).toBe(true);
    }
    expect(Object.isFrozen(source)).toBe(false);
    expect(Object.isFrozen(source.nested)).toBe(false);
  });

  it('keeps an unread state snapshot unchanged when the host edits the data it opened with', async () => {
    const { instance } = await mountOpen();
    const source = { nested: { value: 'original' } };
    await act(() =>
      instance.customPanels.getPanel(PanelType.WORKSPACE).open({
        workspaceId: 'host-owned-data',
        additionalData: source,
      })
    );
    // Take the snapshot without reading its workspace, then edit the source.
    const snapshot = instance.state.get();
    source.nested.value = 'mutated';

    expect(snapshot.workspace.additionalData).toEqual({
      nested: { value: 'original' },
    });
    expect(snapshot.customPanels.workspace.additionalData).toEqual({
      nested: { value: 'original' },
    });
    expect(instance.state.get().workspace.additionalData).toEqual({
      nested: { value: 'original' },
    });
  });
});
