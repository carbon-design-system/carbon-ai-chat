/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  createBaseConfig,
  renderChatAndGetInstance,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from "../../test_helpers";
import { BusEventType } from "../../../src/types/events/eventBusTypes";
import {
  PanelType,
  WorkspaceCustomPanelConfigOptions,
} from "../../../src/types/instance/apiTypes";
import { waitFor } from "@testing-library/react";

describe("ChatInstance.customPanels - Workspace Panels", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  describe("getPanel(PanelType.WORKSPACE)", () => {
    it("should return a workspace panel instance", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      const panel = instance.customPanels.getPanel(PanelType.WORKSPACE);

      expect(panel).toBeDefined();
      expect(typeof panel).toBe("object");
      expect(typeof panel.open).toBe("function");
      expect(typeof panel.close).toBe("function");
    });

    it("should return the same workspace panel instance on multiple calls", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      const panel1 = instance.customPanels.getPanel(PanelType.WORKSPACE);
      const panel2 = instance.customPanels.getPanel(PanelType.WORKSPACE);

      expect(panel1).toBe(panel2);
    });

    it("should return different instances for default and workspace panels", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      const defaultPanel = instance.customPanels.getPanel(PanelType.DEFAULT);
      const workspacePanel = instance.customPanels.getPanel(
        PanelType.WORKSPACE,
      );

      expect(defaultPanel).not.toBe(workspacePanel);
    });
  });

  describe("open with workspace options", () => {
    it("should open workspace panel with default options and update Redux state", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);
      const panel = instance.customPanels.getPanel(PanelType.WORKSPACE);

      // Verify initial state
      let state = store.getState();
      expect(state.workspacePanelState.isOpen).toBe(false);

      // Open panel
      await panel.open();

      // Verify Redux state updated
      state = store.getState();
      expect(state.workspacePanelState.isOpen).toBe(true);
      // Default workspace panel has preferredLocation: "end"
      expect(state.workspacePanelState.options.preferredLocation).toBe("end");
    });

    it("should open workspace panel with WorkspaceCustomPanelConfigOptions", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);
      const panel = instance.customPanels.getPanel(PanelType.WORKSPACE);

      const workspaceOptions: WorkspaceCustomPanelConfigOptions = {
        preferredLocation: "start",
      };

      await panel.open(workspaceOptions);

      const state = store.getState();
      expect(state.workspacePanelState.isOpen).toBe(true);
      expect(state.workspacePanelState.options.preferredLocation).toBe("start");
    });

    it("should store workspaceId when provided in options", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);
      const panel = instance.customPanels.getPanel(PanelType.WORKSPACE);

      const workspaceOptions: WorkspaceCustomPanelConfigOptions = {
        preferredLocation: "end",
        workspaceId: "workspace-123",
      };

      await panel.open(workspaceOptions);

      const state = store.getState();
      expect(state.workspacePanelState.isOpen).toBe(true);
      expect(state.workspacePanelState.workspaceID).toBe("workspace-123");
      expect(state.workspacePanelState.options.preferredLocation).toBe("end");
    });

    it("should store additionalData when provided in options", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);
      const panel = instance.customPanels.getPanel(PanelType.WORKSPACE);

      const workspaceOptions: WorkspaceCustomPanelConfigOptions = {
        preferredLocation: "start",
        workspaceId: "workspace-456",
        additionalData: { userId: "user-789", context: "test" },
      };

      await panel.open(workspaceOptions);

      const state = store.getState();
      expect(state.workspacePanelState.isOpen).toBe(true);
      expect(state.workspacePanelState.workspaceID).toBe("workspace-456");
      expect(state.workspacePanelState.additionalData).toEqual({
        userId: "user-789",
        context: "test",
      });
    });

    it("should handle opening with only workspaceId and additionalData", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);
      const panel = instance.customPanels.getPanel(PanelType.WORKSPACE);

      const workspaceOptions: WorkspaceCustomPanelConfigOptions = {
        workspaceId: "ws-only-id",
        additionalData: { test: "data" },
      };

      await panel.open(workspaceOptions);

      const state = store.getState();
      expect(state.workspacePanelState.isOpen).toBe(true);
      expect(state.workspacePanelState.workspaceID).toBe("ws-only-id");
      expect(state.workspacePanelState.additionalData).toEqual({
        test: "data",
      });
    });
  });

  describe("close with data cleanup", () => {
    it("should close workspace panel and reset state to default", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);
      const panel = instance.customPanels.getPanel(PanelType.WORKSPACE);

      // Open with data
      await panel.open({
        preferredLocation: "start",
        workspaceId: "workspace-123",
        additionalData: { test: "data" },
      });

      let state = store.getState();
      expect(state.workspacePanelState.isOpen).toBe(true);
      expect(state.workspacePanelState.workspaceID).toBe("workspace-123");

      // Close the panel
      await panel.close();

      // Verify Redux state reset
      state = store.getState();
      expect(state.workspacePanelState.isOpen).toBe(false);
      expect(state.workspacePanelState.workspaceID).toBeUndefined();
      expect(state.workspacePanelState.additionalData).toBeUndefined();
      expect(state.workspacePanelState.localMessageItem).toBeUndefined();
      expect(state.workspacePanelState.fullMessage).toBeUndefined();
    });

    it("should handle multiple open/close cycles with data cleanup", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);
      const panel = instance.customPanels.getPanel(PanelType.WORKSPACE);

      // First cycle
      await panel.open({
        workspaceId: "workspace-1",
        additionalData: { cycle: 1 },
      });
      let state = store.getState();
      expect(state.workspacePanelState.workspaceID).toBe("workspace-1");

      await panel.close();
      state = store.getState();
      expect(state.workspacePanelState.workspaceID).toBeUndefined();

      // Second cycle with different data
      await panel.open({
        workspaceId: "workspace-2",
        additionalData: { cycle: 2 },
      });
      state = store.getState();
      expect(state.workspacePanelState.workspaceID).toBe("workspace-2");
      expect(state.workspacePanelState.additionalData).toEqual({ cycle: 2 });

      await panel.close();
      state = store.getState();
      expect(state.workspacePanelState.workspaceID).toBeUndefined();
      expect(state.workspacePanelState.additionalData).toBeUndefined();
    });
  });

  describe("Workspace Events", () => {
    it("should fire WORKSPACE_PRE_OPEN and WORKSPACE_OPEN events when opening panel", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);
      const panel = instance.customPanels.getPanel(PanelType.WORKSPACE);

      let preOpenResolve: (value: any) => void;
      const preOpenEventPromise = new Promise((resolve) => {
        preOpenResolve = resolve;
      });

      let openResolve: (value: any) => void;
      const openEventPromise = new Promise((resolve) => {
        openResolve = resolve;
      });

      instance.on({
        type: BusEventType.WORKSPACE_PRE_OPEN,
        handler: (event) => {
          expect(event.type).toBe(BusEventType.WORKSPACE_PRE_OPEN);
          preOpenResolve(event);
        },
      });

      instance.on({
        type: BusEventType.WORKSPACE_OPEN,
        handler: (event) => {
          expect(event.type).toBe(BusEventType.WORKSPACE_OPEN);
          openResolve(event);
        },
      });

      // Open the panel
      await panel.open({ preferredLocation: "start" });

      // Wait for both events to fire
      await Promise.all([preOpenEventPromise, openEventPromise]);
    });

    it("should fire WORKSPACE_PRE_CLOSE and WORKSPACE_CLOSE events when closing panel", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);
      const panel = instance.customPanels.getPanel(PanelType.WORKSPACE);

      // Set up event listeners first
      const preCloseEventPromise = new Promise((resolve) => {
        instance.on({
          type: BusEventType.WORKSPACE_PRE_CLOSE,
          handler: (event) => {
            expect(event.type).toBe(BusEventType.WORKSPACE_PRE_CLOSE);
            resolve(event);
          },
        });
      });

      const closeEventPromise = new Promise((resolve) => {
        instance.on({
          type: BusEventType.WORKSPACE_CLOSE,
          handler: (event) => {
            expect(event.type).toBe(BusEventType.WORKSPACE_CLOSE);
            resolve(event);
          },
        });
      });

      // First open the panel
      await panel.open({ preferredLocation: "start" });

      // Close the panel
      await panel.close();

      // Wait for both events to fire
      await Promise.all([preCloseEventPromise, closeEventPromise]);
    });

    it("should include workspaceId in close events when provided", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);
      const panel = instance.customPanels.getPanel(PanelType.WORKSPACE);

      const closeEventPromise = new Promise((resolve) => {
        instance.on({
          type: BusEventType.WORKSPACE_CLOSE,
          handler: (event: any) => {
            expect(event.data.workspaceId).toBe("workspace-with-id");
            resolve(event);
          },
        });
      });

      // Open with workspaceId
      await panel.open({
        preferredLocation: "start",
        workspaceId: "workspace-with-id",
      });

      // Close and verify event data
      await panel.close();

      await closeEventPromise;
    });

    it("should include additionalData in close events when provided", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);
      const panel = instance.customPanels.getPanel(PanelType.WORKSPACE);

      const testData = { userId: "user-123", context: "test-context" };

      const closeEventPromise = new Promise((resolve) => {
        instance.on({
          type: BusEventType.WORKSPACE_CLOSE,
          handler: (event: any) => {
            expect(event.data.additionalData).toEqual(testData);
            resolve(event);
          },
        });
      });

      // Open with additionalData
      await panel.open({
        preferredLocation: "end",
        workspaceId: "workspace-123",
        additionalData: testData,
      });

      // Close and verify event data
      await panel.close();

      await closeEventPromise;
    });

    it("should fire events in correct sequence during workspace open/close cycle", async () => {
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);
      const panel = instance.customPanels.getPanel(PanelType.WORKSPACE);

      const eventSequence: string[] = [];

      // Set up event listeners for all workspace events
      instance.on([
        {
          type: BusEventType.WORKSPACE_PRE_OPEN,
          handler: () => eventSequence.push("PRE_OPEN"),
        },
        {
          type: BusEventType.WORKSPACE_OPEN,
          handler: () => eventSequence.push("OPEN"),
        },
        {
          type: BusEventType.WORKSPACE_PRE_CLOSE,
          handler: () => eventSequence.push("PRE_CLOSE"),
        },
        {
          type: BusEventType.WORKSPACE_CLOSE,
          handler: () => eventSequence.push("CLOSE"),
        },
      ]);

      // Open the panel
      await panel.open({
        preferredLocation: "start",
        workspaceId: "test-workspace",
      });

      // Wait for open events
      await waitFor(() => {
        expect(eventSequence).toContain("PRE_OPEN");
      });

      await waitFor(
        () => {
          expect(eventSequence).toContain("OPEN");
        },
        { timeout: 1000 },
      );

      // Close the panel
      await panel.close();

      // Wait for close events
      await waitFor(() => {
        expect(eventSequence).toContain("PRE_CLOSE");
      });

      await waitFor(
        () => {
          expect(eventSequence).toContain("CLOSE");
        },
        { timeout: 1000 },
      );

      // Verify complete event sequence
      expect(eventSequence).toEqual(["PRE_OPEN", "OPEN", "PRE_CLOSE", "CLOSE"]);
    });

    it("should provide correct event context and instance in workspace event handlers", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);
      const panel = instance.customPanels.getPanel(PanelType.WORKSPACE);

      const eventPromise = new Promise((resolve) => {
        instance.on({
          type: BusEventType.WORKSPACE_OPEN,
          handler: (event: any, eventInstance) => {
            // Verify event structure
            expect(event).toBeDefined();
            expect(event.type).toBe(BusEventType.WORKSPACE_OPEN);
            expect(event.data).toBeDefined();

            // Verify instance is provided
            expect(eventInstance).toBe(instance);
            expect(eventInstance.customPanels).toBeDefined();

            resolve(true);
          },
        });
      });

      // Open the panel to trigger the event
      await panel.open({ preferredLocation: "start" });

      await eventPromise;
    });
  });

  describe("Public State Access", () => {
    it("should expose workspace state via instance.getState().workspace", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);
      const panel = instance.customPanels.getPanel(PanelType.WORKSPACE);

      // Open with data
      await panel.open({
        preferredLocation: "start",
        workspaceId: "public-state-test",
        additionalData: { test: "public" },
      });

      const state = instance.getState();
      expect(state.workspace).toBeDefined();
      expect(state.workspace.isOpen).toBe(true);
      expect(state.workspace.workspaceID).toBe("public-state-test");
      expect(state.workspace.additionalData).toEqual({ test: "public" });
      expect(state.workspace.options.preferredLocation).toBe("start");
    });

    it("should also expose workspace state via customPanels.workspace", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);
      const panel = instance.customPanels.getPanel(PanelType.WORKSPACE);

      await panel.open({
        preferredLocation: "end",
        workspaceId: "custom-panels-test",
      });

      const state = instance.getState();
      expect(state.customPanels.workspace).toBeDefined();
      expect(state.customPanels.workspace.isOpen).toBe(true);
      expect(state.customPanels.workspace.workspaceID).toBe(
        "custom-panels-test",
      );
      expect(state.customPanels.workspace.options.preferredLocation).toBe(
        "end",
      );
    });

    it("should reflect state changes in both workspace and customPanels.workspace", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);
      const panel = instance.customPanels.getPanel(PanelType.WORKSPACE);

      await panel.open({
        workspaceId: "sync-test",
        additionalData: { synced: true },
      });

      const state = instance.getState();

      // Both should reflect the same data
      expect(state.workspace.workspaceID).toBe(
        state.customPanels.workspace.workspaceID,
      );
      expect(state.workspace.additionalData).toEqual(
        state.customPanels.workspace.additionalData,
      );
      expect(state.workspace.isOpen).toBe(state.customPanels.workspace.isOpen);
    });

    it("should clear workspace state from public API after close", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);
      const panel = instance.customPanels.getPanel(PanelType.WORKSPACE);

      // Open with data
      await panel.open({
        workspaceId: "clear-test",
        additionalData: { clear: "me" },
      });

      let state = instance.getState();
      expect(state.workspace.workspaceID).toBe("clear-test");

      // Close
      await panel.close();

      state = instance.getState();
      expect(state.workspace.isOpen).toBe(false);
      expect(state.workspace.workspaceID).toBeUndefined();
      expect(state.workspace.additionalData).toBeUndefined();
    });
  });

  describe("Integration with Default Panels", () => {
    it("should not affect default panel state when workspace panel opens/closes", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);
      const workspacePanel = instance.customPanels.getPanel(
        PanelType.WORKSPACE,
      );
      const defaultPanel = instance.customPanels.getPanel(PanelType.DEFAULT);

      // Open default panel
      await defaultPanel.open({ title: "Default Panel" });
      let state = store.getState();
      expect(state.customPanelState.isOpen).toBe(true);
      expect(state.customPanelState.options.title).toBe("Default Panel");

      // Open workspace panel
      await workspacePanel.open({ workspaceId: "workspace-123" });
      state = store.getState();
      expect(state.workspacePanelState.isOpen).toBe(true);
      expect(state.workspacePanelState.workspaceID).toBe("workspace-123");

      // Default panel should still be open
      expect(state.customPanelState.isOpen).toBe(true);
      expect(state.customPanelState.options.title).toBe("Default Panel");

      // Close workspace panel
      await workspacePanel.close();
      state = store.getState();
      expect(state.workspacePanelState.isOpen).toBe(false);

      // Default panel should still be open
      expect(state.customPanelState.isOpen).toBe(true);
    });
  });
});

// Made with Bob
