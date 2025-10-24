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
import { waitFor } from "@testing-library/react";

describe("ChatInstance.customPanels", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should have customPanels property available", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(instance.customPanels).toBeDefined();
    expect(typeof instance.customPanels).toBe("object");
  });

  it("should provide custom panel management interface", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    // The customPanels should be the CustomPanelManager instance
    // We can't test specific methods without knowing the exact interface
    // but we can verify it exists and is an object
    expect(instance.customPanels).toBeTruthy();
  });

  it("should be accessible without throwing errors", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    // Should be able to access the property without errors
    expect(() => {
      const panels = instance.customPanels;
      // Basic property access should work
      expect(panels).toBeDefined();
    }).not.toThrow();
  });

  it("should maintain consistent reference", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const panels1 = instance.customPanels;
    const panels2 = instance.customPanels;

    // Should return the same reference each time
    expect(panels1).toBe(panels2);
  });

  describe("getPanel", () => {
    it("should return a custom panel instance", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      const panel = instance.customPanels.getPanel();

      expect(panel).toBeDefined();
      expect(typeof panel).toBe("object");
      expect(typeof panel.open).toBe("function");
      expect(typeof panel.close).toBe("function");
    });

    it("should return the same panel instance on multiple calls", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      const panel1 = instance.customPanels.getPanel();
      const panel2 = instance.customPanels.getPanel();

      expect(panel1).toBe(panel2);
    });
  });

  describe("open", () => {
    it("should open panel with default options and update Redux state", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);
      const panel = instance.customPanels.getPanel();

      // Verify initial state
      let state = store.getState();
      expect(state.customPanelState.isOpen).toBe(false);

      // Open panel
      panel.open();

      // Verify Redux state updated
      state = store.getState();
      expect(state.customPanelState.isOpen).toBe(true);
    });

    it("should open panel with custom options and update Redux state", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);
      const panel = instance.customPanels.getPanel();

      const customOptions = {
        title: "Test Panel",
        hideCloseButton: true,
        disableAnimation: true,
      };

      // Verify initial state
      let state = store.getState();
      expect(state.customPanelState.isOpen).toBe(false);

      // Open panel with custom options
      panel.open(customOptions);

      // Verify Redux state updated
      state = store.getState();
      expect(state.customPanelState.isOpen).toBe(true);
      expect(state.customPanelState.options.title).toBe("Test Panel");
      expect(state.customPanelState.options.hideCloseButton).toBe(true);
      expect(state.customPanelState.options.disableAnimation).toBe(true);
    });
  });

  describe("close", () => {
    it("should close panel and update Redux state", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);
      const panel = instance.customPanels.getPanel();

      // First open the panel
      panel.open();
      let state = store.getState();
      expect(state.customPanelState.isOpen).toBe(true);

      // Close the panel
      panel.close();

      // Verify Redux state updated
      state = store.getState();
      expect(state.customPanelState.isOpen).toBe(false);
    });

    it("should be able to open and close panel multiple times with correct Redux state", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);
      const panel = instance.customPanels.getPanel();

      // Verify initial state
      let state = store.getState();
      expect(state.customPanelState.isOpen).toBe(false);

      // First open/close cycle
      panel.open();
      state = store.getState();
      expect(state.customPanelState.isOpen).toBe(true);

      panel.close();
      state = store.getState();
      expect(state.customPanelState.isOpen).toBe(false);

      // Second open/close cycle with custom options
      panel.open({ title: "Second Open" });
      state = store.getState();
      expect(state.customPanelState.isOpen).toBe(true);
      expect(state.customPanelState.options.title).toBe("Second Open");

      panel.close();
      state = store.getState();
      expect(state.customPanelState.isOpen).toBe(false);
    });

    it("should close panel even if it wasn't opened first", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);
      const panel = instance.customPanels.getPanel();

      // Verify initial state
      let state = store.getState();
      expect(state.customPanelState.isOpen).toBe(false);

      // Close panel (should not throw even if already closed)
      panel.close();

      // Verify state remains false
      state = store.getState();
      expect(state.customPanelState.isOpen).toBe(false);
    });
  });

  describe("Events", () => {
    it("should fire CUSTOM_PANEL_PRE_OPEN and CUSTOM_PANEL_OPEN events when opening panel", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);
      const panel = instance.customPanels.getPanel();

      const preOpenEventPromise = new Promise((resolve) => {
        instance.on({
          type: BusEventType.CUSTOM_PANEL_PRE_OPEN,
          handler: (event) => {
            expect(event.type).toBe(BusEventType.CUSTOM_PANEL_PRE_OPEN);
            resolve(event);
          },
        });
      });

      const openEventPromise = new Promise((resolve) => {
        instance.on({
          type: BusEventType.CUSTOM_PANEL_OPEN,
          handler: (event) => {
            expect(event.type).toBe(BusEventType.CUSTOM_PANEL_OPEN);
            resolve(event);
          },
        });
      });

      // Open the panel with animations disabled for testing
      panel.open({ disableAnimation: true });

      // Wait for both events to fire
      await Promise.all([preOpenEventPromise, openEventPromise]);
    });

    it("should fire CUSTOM_PANEL_PRE_CLOSE and CUSTOM_PANEL_CLOSE events when closing panel", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);
      const panel = instance.customPanels.getPanel();

      // Set up event listeners first
      const preCloseEventPromise = new Promise((resolve) => {
        instance.on({
          type: BusEventType.CUSTOM_PANEL_PRE_CLOSE,
          handler: (event) => {
            expect(event.type).toBe(BusEventType.CUSTOM_PANEL_PRE_CLOSE);
            resolve(event);
          },
        });
      });

      const closeEventPromise = new Promise((resolve) => {
        instance.on({
          type: BusEventType.CUSTOM_PANEL_CLOSE,
          handler: (event) => {
            expect(event.type).toBe(BusEventType.CUSTOM_PANEL_CLOSE);
            resolve(event);
          },
        });
      });

      // First open the panel with animations disabled for testing
      panel.open({ disableAnimation: true });

      // Wait for the panel to be fully open, then close it
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Close the panel
      panel.close();

      // Wait for both events to fire
      await Promise.all([preCloseEventPromise, closeEventPromise]);
    });

    it("should fire events in correct sequence during open/close cycle", async () => {
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);
      const panel = instance.customPanels.getPanel();

      const eventSequence: string[] = [];

      // Set up event listeners
      instance.on([
        {
          type: BusEventType.CUSTOM_PANEL_PRE_OPEN,
          handler: () => eventSequence.push("PRE_OPEN"),
        },
        {
          type: BusEventType.CUSTOM_PANEL_OPEN,
          handler: () => eventSequence.push("OPEN"),
        },
        {
          type: BusEventType.CUSTOM_PANEL_PRE_CLOSE,
          handler: () => eventSequence.push("PRE_CLOSE"),
        },
        {
          type: BusEventType.CUSTOM_PANEL_CLOSE,
          handler: () => eventSequence.push("CLOSE"),
        },
      ]);

      // Open the panel with animations disabled for testing
      panel.open({
        disableAnimation: true,
      });

      // Wait for React to re-render and animations to complete
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
      panel.close();

      // Wait for close animations to complete
      await waitFor(() => {
        expect(eventSequence).toContain("PRE_CLOSE");
      });

      await waitFor(
        () => {
          expect(eventSequence).toContain("CLOSE");
        },
        { timeout: 1000 },
      );

      // Verify event sequence
      expect(eventSequence).toEqual(["PRE_OPEN", "OPEN", "PRE_CLOSE", "CLOSE"]);
    });

    it("should provide correct event context and instance in event handlers", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);
      const panel = instance.customPanels.getPanel();

      const eventPromise = new Promise((resolve) => {
        instance.on({
          type: BusEventType.CUSTOM_PANEL_OPEN,
          handler: (event, eventInstance) => {
            // Verify event structure
            expect(event).toBeDefined();
            expect(event.type).toBe(BusEventType.CUSTOM_PANEL_OPEN);

            // Verify instance is provided
            expect(eventInstance).toBe(instance);
            expect(eventInstance.customPanels).toBeDefined();

            resolve(true);
          },
        });
      });

      panel.open({ disableAnimation: true });
      await eventPromise;
    });

    it("should allow event handlers to be removed", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);
      const panel = instance.customPanels.getPanel();

      let eventFired = false;
      const handler = {
        type: BusEventType.CUSTOM_PANEL_OPEN,
        handler: () => {
          eventFired = true;
        },
      };

      // Add event listener
      instance.on(handler);

      // Open panel - should fire event
      panel.open({ disableAnimation: true });
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(eventFired).toBe(true);

      // Remove event listener
      instance.off(handler);
      eventFired = false;

      // Close and reopen panel - should not fire event
      panel.close();
      await new Promise((resolve) => setTimeout(resolve, 300));
      panel.open({ disableAnimation: true });
      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(eventFired).toBe(false);
    });

    it("should fire events only once when using 'once' method", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);
      const panel = instance.customPanels.getPanel();

      let eventCount = 0;
      instance.once({
        type: BusEventType.CUSTOM_PANEL_OPEN,
        handler: () => {
          eventCount++;
        },
      });

      // Open panel multiple times
      panel.open({ disableAnimation: true });
      await new Promise((resolve) => setTimeout(resolve, 300));

      panel.close();
      await new Promise((resolve) => setTimeout(resolve, 300));

      panel.open({ disableAnimation: true });
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Event should have fired only once
      expect(eventCount).toBe(1);
    });

    it("should handle multiple event listeners for the same event type", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);
      const panel = instance.customPanels.getPanel();

      const handlers = [
        { fired: false, value: "handler1" },
        { fired: false, value: "handler2" },
        { fired: false, value: "handler3" },
      ];

      // Add multiple listeners for the same event
      handlers.forEach((handlerData) => {
        instance.on({
          type: BusEventType.CUSTOM_PANEL_OPEN,
          handler: () => {
            handlerData.fired = true;
          },
        });
      });

      panel.open({ disableAnimation: true });
      await new Promise((resolve) => setTimeout(resolve, 300));

      // All handlers should have been called
      handlers.forEach((handlerData) => {
        expect(handlerData.fired).toBe(true);
      });
    });

    it("should not fire events when closing an already closed panel", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);
      const panel = instance.customPanels.getPanel();

      let closeEventCount = 0;
      instance.on({
        type: BusEventType.CUSTOM_PANEL_CLOSE,
        handler: () => {
          closeEventCount++;
        },
      });

      // Panel starts closed, so closing it should not fire events
      panel.close();
      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(closeEventCount).toBe(0);

      // Now open and close properly
      panel.open({ disableAnimation: true });
      await new Promise((resolve) => setTimeout(resolve, 300));

      panel.close();
      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(closeEventCount).toBe(1);
    });

    it("should not fire open events when opening an already open panel", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);
      const panel = instance.customPanels.getPanel();

      let openEventCount = 0;
      instance.on({
        type: BusEventType.CUSTOM_PANEL_OPEN,
        handler: () => {
          openEventCount++;
        },
      });

      // Open the panel once
      panel.open({ disableAnimation: true });
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(openEventCount).toBe(1);

      // Try to open again - should not fire another event
      panel.open({ disableAnimation: true });
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(openEventCount).toBe(1);
    });
  });
});
