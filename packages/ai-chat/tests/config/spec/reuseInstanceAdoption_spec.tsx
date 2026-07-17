/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";
import { render, cleanup, waitFor } from "@testing-library/react";

import { ChatContainer } from "../../../src/react/ChatContainer";
import { PublicConfig } from "../../../src/types/config/PublicConfig";
import { ChatInstance } from "../../../src/types/instance/ChatInstance";
import * as loadServicesModule from "../../../src/chat/services/loadServices";
import {
  peekReuseEntry,
  __resetReuseInstanceRegistry,
} from "../../../src/chat/services/reuseInstanceRegistry";
import { createBaseConfig, setupBeforeEach } from "../../test_helpers";
import { BusEventType } from "../../../src/types/events/eventBusTypes";

/** A long grace so the timer never fires mid-test; reuse is exercised, not eviction. */
function reuseConfig(namespace: string, reuseInstance: boolean): PublicConfig {
  return {
    ...createBaseConfig(),
    namespace,
    featureFlags: { reuseInstance, reuseInstanceGraceMs: 100000 },
  };
}

let capturedInstance: ChatInstance | null;

function renderChat(config: PublicConfig) {
  const onBeforeRender = jest.fn((i: ChatInstance) => {
    capturedInstance = i;
  });
  return render(
    React.createElement(ChatContainer, { ...config, onBeforeRender }),
  );
}

/** Waits for a cold boot to fire onBeforeRender (which does NOT re-fire on reuse). */
async function waitForColdBoot() {
  await waitFor(() => expect(capturedInstance).not.toBeNull(), {
    timeout: 5000,
  });
}

/** Waits for a namespace to have a live (ref-counted) registry entry. */
async function waitForAcquire(namespace: string) {
  await waitFor(() => expect(peekReuseEntry(namespace)?.refCount).toBe(1), {
    timeout: 5000,
  });
}

describe("reuseInstance adoption (remount survival)", () => {
  beforeEach(() => {
    setupBeforeEach();
    capturedInstance = null;
    __resetReuseInstanceRegistry();
  });

  afterEach(() => {
    cleanup();
    __resetReuseInstanceRegistry();
    document.body.innerHTML = "";
    jest.restoreAllMocks();
  });

  it("reuses the same ServiceManager across a remount (no second cold boot)", async () => {
    const createSM = jest.spyOn(loadServicesModule, "createServiceManager");
    const config = reuseConfig("reuse-survive", true);

    const first = renderChat(config);
    await waitForColdBoot();
    const sm1 = peekReuseEntry("reuse-survive")?.serviceManager;
    expect(sm1).toBeDefined();
    expect(createSM).toHaveBeenCalledTimes(1);

    // Unmount releases to the registry (grace timer running); remount reuses it.
    first.unmount();
    renderChat(config);
    await waitForAcquire("reuse-survive");

    expect(peekReuseEntry("reuse-survive")?.serviceManager).toBe(sm1);
    expect(createSM).toHaveBeenCalledTimes(1); // never cold-booted a second time
  });

  it("cold-boots a fresh ServiceManager each mount when reuseInstance is off", async () => {
    const createSM = jest.spyOn(loadServicesModule, "createServiceManager");
    const config = reuseConfig("no-reuse", false);

    const first = renderChat(config);
    await waitForColdBoot();
    const instance1 = capturedInstance;

    first.unmount();
    capturedInstance = null;
    renderChat(config);
    await waitForColdBoot();

    expect(capturedInstance).not.toBe(instance1);
    expect(createSM).toHaveBeenCalledTimes(2);
    expect(peekReuseEntry("no-reuse")).toBeUndefined(); // nothing registered
  });

  it("fires onAttach on every mount with the remount flag and a stable instance", async () => {
    const attaches: Array<{ instance: ChatInstance; remount: boolean }> = [];
    const onAttach = jest.fn((instance: ChatInstance, details) =>
      attaches.push({ instance, remount: details.remount }),
    );
    const config = reuseConfig("attach-signal", true);

    const first = render(
      React.createElement(ChatContainer, { ...config, onAttach }),
    );
    await waitFor(() => expect(attaches).toHaveLength(1));
    expect(attaches[0].remount).toBe(false); // first boot

    first.unmount();
    render(React.createElement(ChatContainer, { ...config, onAttach }));
    await waitFor(() => expect(attaches).toHaveLength(2));
    expect(attaches[1].remount).toBe(true); // reuse re-attach
    expect(attaches[1].instance).toBe(attaches[0].instance); // same instance object
  });

  it("preserves accumulated slot state across a reuse remount without new events", async () => {
    const config = reuseConfig("slot-survive", true);

    const first = renderChat(config);
    await waitForColdBoot();
    const sm1 = peekReuseEntry("slot-survive")?.serviceManager as any;
    expect(sm1?.slotStates).toBeDefined();

    // Drive a user-defined response and a custom footer slot through the event bus.
    await sm1.fire({
      type: BusEventType.USER_DEFINED_RESPONSE,
      data: { slot: "s1", fullMessage: { id: "m1" }, message: { id: "i1" } },
    });
    await sm1.fire({
      type: BusEventType.CUSTOM_FOOTER_SLOT,
      data: {
        slotName: "footer1",
        message: { id: "msg1" },
        messageItem: { id: "item1" },
      },
    });
    expect(sm1.slotStates.userDefinedBySlot.get().s1).toBeDefined();
    expect(sm1.slotStates.customFooterBySlot.get().footer1).toBeDefined();

    // Unmount + remount within the grace window; the reused manager keeps its stores, so the
    // accumulated slot state is immediately present on the new mount without any new events.
    first.unmount();
    renderChat(config);
    await waitForAcquire("slot-survive");

    const sm2 = peekReuseEntry("slot-survive")?.serviceManager as any;
    expect(sm2).toBe(sm1);
    expect(sm2.slotStates.userDefinedBySlot.get().s1.messageItem).toEqual({
      id: "i1",
    });
    expect(sm2.slotStates.customFooterBySlot.get().footer1.slotName).toBe(
      "footer1",
    );
  });

  it("applies a config changed across a reuse remount to the adopted store", async () => {
    const config = reuseConfig("config-across-remount", true);

    const first = renderChat({ ...config, assistantName: "First" });
    await waitForColdBoot();
    const sm = peekReuseEntry("config-across-remount")?.serviceManager;
    expect(sm.store.getState().config.public.assistantName).toBe("First");

    // Remount within the grace window with a DIFFERENT config: the adopted store still holds the
    // old config, so the delta must be applied rather than silently dropped.
    first.unmount();
    renderChat({ ...config, assistantName: "Second" });
    await waitForAcquire("config-across-remount");

    await waitFor(() =>
      expect(sm.store.getState().config.public.assistantName).toBe("Second"),
    );
  });

  it("fires onAttach before onBeforeRender, with remount false on every non-reuse mount", async () => {
    const order: string[] = [];
    const config = reuseConfig("attach-ordering", false);
    const instances: ChatInstance[] = [];

    const props = {
      ...config,
      onAttach: (instance: ChatInstance, details: { remount: boolean }) => {
        order.push(`attach:${details.remount}`);
        instances.push(instance);
      },
      onBeforeRender: () => {
        order.push("beforeRender");
      },
    };

    const first = render(React.createElement(ChatContainer, props));
    await waitFor(() =>
      expect(order).toEqual(["attach:false", "beforeRender"]),
    );

    // With reuse off, a remount is a fresh cold boot: onAttach reports remount false again and
    // hands out a different instance.
    first.unmount();
    render(React.createElement(ChatContainer, props));
    await waitFor(() =>
      expect(order).toEqual([
        "attach:false",
        "beforeRender",
        "attach:false",
        "beforeRender",
      ]),
    );
    expect(instances[1]).not.toBe(instances[0]);
  });

  it("releases the manager when the host unmounts before boot resolves (reuse on)", async () => {
    const config = reuseConfig("unmount-mid-boot", true);

    // Unmount synchronously, before the async acquire can resolve.
    const first = renderChat(config);
    first.unmount();

    // The cancelled boot must still register + immediately release: the entry ends ref-count 0
    // (grace timer armed) rather than being stranded at 1 forever.
    await waitFor(() =>
      expect(peekReuseEntry("unmount-mid-boot")?.refCount).toBe(0),
    );
  });

  it("disposes the manager when the host unmounts before boot resolves (reuse off)", async () => {
    const createSM = jest.spyOn(loadServicesModule, "createServiceManager");
    const config = reuseConfig("unmount-mid-boot-off", false);

    const first = renderChat(config);
    first.unmount();

    await waitFor(() => expect(createSM).toHaveBeenCalledTimes(1));
    const manager = createSM.mock.results[0].value;
    await waitFor(() => expect(manager.disposed).toBe(true));
  });

  it("delivers view-change events to the remounted host's handlers after a reuse re-attach", async () => {
    const config = reuseConfig("view-handler-rewire", true);
    const firstMountEvents: string[] = [];
    const secondMountEvents: string[] = [];

    let attached: ChatInstance | null = null;
    const first = render(
      React.createElement(ChatContainer, {
        ...config,
        onAttach: (instance: ChatInstance) => {
          attached = instance;
        },
        onViewChange: () => {
          firstMountEvents.push("viewChange");
        },
      }),
    );
    await waitFor(() => expect(attached).not.toBeNull());

    first.unmount();
    render(
      React.createElement(ChatContainer, {
        ...config,
        onViewChange: () => {
          secondMountEvents.push("viewChange");
        },
      }),
    );
    await waitForAcquire("view-handler-rewire");

    // Drive a view change on the persistent instance: only the LIVE mount's handler may fire —
    // the first mount's was unsubscribed on unmount. (The first mount legitimately saw the
    // boot-time initial view change, so only growth after this point counts.)
    firstMountEvents.length = 0;
    await attached.changeView({ launcher: false, mainWindow: true });
    await waitFor(() => expect(secondMountEvents.length).toBeGreaterThan(0));
    expect(firstMountEvents).toHaveLength(0);
  });

  it("instance.destroy() evicts the cached manager so the next mount cold-boots", async () => {
    const config = reuseConfig("destroy-evicts", true);

    const first = renderChat(config);
    await waitForColdBoot();
    const instance1 = capturedInstance as ChatInstance;

    // Release to the registry, then destroy: the grace-held manager is evicted.
    first.unmount();
    expect(peekReuseEntry("destroy-evicts")).toBeDefined();

    instance1.destroy();
    expect(peekReuseEntry("destroy-evicts")).toBeUndefined();

    const createSM = jest.spyOn(loadServicesModule, "createServiceManager");
    capturedInstance = null;
    renderChat(config);
    await waitForColdBoot();

    expect(capturedInstance).not.toBe(instance1);
    expect(createSM).toHaveBeenCalledTimes(1); // fresh cold boot after eviction
  });
});
