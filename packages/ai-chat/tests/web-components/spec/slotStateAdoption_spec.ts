/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Proves that `cds-aichat-container`'s callback-rendering paths (user-defined responses, custom
 * message footers) are driven by the core-owned `slotStates` value stores
 * (`src/chat/sdk/slotStates.ts`) rather than the element's own bus-event accumulation — a Lit host
 * consuming the framework-agnostic mechanism with zero React involved.
 *
 * Events are fired against the real `ServiceManager` obtained from the reuse registry (as
 * `reuseInstanceAdoption_spec.tsx` does) rather than `instance.serviceManager` — the latter is a
 * plain-object spread exposed only for read access when `exposeServiceManagerForTesting` is set,
 * and doesn't carry the class's `fire` prototype method. Every test therefore opts into
 * `featureFlags.reuseInstance` with a unique namespace, purely as the event-firing mechanism.
 */

import { waitFor } from "@testing-library/react";

import "../../../src/web-components/cds-aichat-container";
import { createBaseConfig } from "../../test_helpers";
import { BusEventType } from "../../../src/types/events/eventBusTypes";
import {
  peekReuseEntry,
  __resetReuseInstanceRegistry,
} from "../../../src/chat/services/reuseInstanceRegistry";

function mount(overrides: {
  namespace: string;
  renderUserDefinedResponse?: (...args: any[]) => any;
  renderCustomMessageFooter?: (...args: any[]) => any;
}) {
  let capturedInstance: any = null;
  const element = document.createElement("cds-aichat-container") as any;
  element.config = {
    ...createBaseConfig(),
    namespace: overrides.namespace,
    featureFlags: { reuseInstance: true, reuseInstanceGraceMs: 100000 },
  };
  if (overrides.renderUserDefinedResponse) {
    element.renderUserDefinedResponse = overrides.renderUserDefinedResponse;
  }
  if (overrides.renderCustomMessageFooter) {
    element.renderCustomMessageFooter = overrides.renderCustomMessageFooter;
  }
  element.onBeforeRender = (instance: any) => {
    capturedInstance = instance;
  };
  document.body.appendChild(element);
  return { element, getInstance: () => capturedInstance };
}

function fire(namespace: string, event: any) {
  const serviceManager = peekReuseEntry(namespace)?.serviceManager as any;
  return serviceManager.fire(event);
}

describe("Web component: slot-state adoption", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    jest.clearAllMocks();
    __resetReuseInstanceRegistry();
  });

  it("renders a user-defined response from the slot-state store, including streaming chunks", async () => {
    const namespace = "slot-state-user-defined";
    const renderUserDefinedResponse = jest.fn((state: any) => {
      const el = document.createElement("div");
      el.textContent = state.messageItem?.id ?? "";
      return el;
    });

    const { element, getInstance } = mount({
      namespace,
      renderUserDefinedResponse,
    });
    await waitFor(() => expect(getInstance()).not.toBeNull());

    // A streaming chunk...
    await fire(namespace, {
      type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
      data: { slot: "s1", chunk: { partial_item: { id: "partial" } } },
    });
    await waitFor(() => {
      expect(element.querySelector('[slot="s1"]')).not.toBeNull();
    });

    // ...then the full message.
    await fire(namespace, {
      type: BusEventType.USER_DEFINED_RESPONSE,
      data: {
        slot: "s1",
        fullMessage: { id: "m1" },
        message: { id: "i1" },
      },
    });

    await waitFor(() => {
      expect(element.querySelector('[slot="s1"]')?.textContent).toBe("i1");
    });
    expect(renderUserDefinedResponse).toHaveBeenCalled();
  });

  it("renders a custom message footer from the slot-state store", async () => {
    const namespace = "slot-state-custom-footer";
    const renderCustomMessageFooter = jest.fn((state: any) => {
      const el = document.createElement("div");
      el.textContent = state.messageItem?.id ?? "";
      return el;
    });

    const { element, getInstance } = mount({
      namespace,
      renderCustomMessageFooter,
    });
    await waitFor(() => expect(getInstance()).not.toBeNull());

    await fire(namespace, {
      type: BusEventType.CUSTOM_FOOTER_SLOT,
      data: {
        slotName: "footer1",
        message: { id: "msg1" },
        messageItem: { id: "item1" },
      },
    });

    await waitFor(() => {
      expect(element.querySelector('[slot="footer1"]')?.textContent).toBe(
        "item1",
      );
    });
  });

  it("clears rendered slot content on RESTART_CONVERSATION", async () => {
    const namespace = "slot-state-restart";
    const renderUserDefinedResponse = jest.fn((state: any) => {
      const el = document.createElement("div");
      el.textContent = state.messageItem?.id ?? "";
      return el;
    });
    const renderCustomMessageFooter = jest.fn((state: any) => {
      const el = document.createElement("div");
      el.textContent = state.messageItem?.id ?? "";
      return el;
    });

    const { element, getInstance } = mount({
      namespace,
      renderUserDefinedResponse,
      renderCustomMessageFooter,
    });
    await waitFor(() => expect(getInstance()).not.toBeNull());

    await fire(namespace, {
      type: BusEventType.USER_DEFINED_RESPONSE,
      data: { slot: "s1", fullMessage: { id: "m1" }, message: { id: "i1" } },
    });
    await fire(namespace, {
      type: BusEventType.CUSTOM_FOOTER_SLOT,
      data: {
        slotName: "footer1",
        message: { id: "msg1" },
        messageItem: { id: "item1" },
      },
    });
    await waitFor(() => {
      expect(element.querySelector('[slot="s1"]')).not.toBeNull();
      expect(element.querySelector('[slot="footer1"]')).not.toBeNull();
    });

    await fire(namespace, { type: BusEventType.RESTART_CONVERSATION });

    await waitFor(() => {
      expect(element.querySelector('[slot="s1"]')).toBeNull();
      expect(element.querySelector('[slot="footer1"]')).toBeNull();
    });
  });

  it("shows already-accumulated slot content immediately on a reuse remount, without a new event", async () => {
    const namespace = "slot-state-reuse-remount";
    const renderUserDefinedResponse = jest.fn((state: any) => {
      const el = document.createElement("div");
      el.textContent = state.messageItem?.id ?? "";
      return el;
    });

    const first = mount({ namespace, renderUserDefinedResponse });
    await waitFor(() => expect(first.getInstance()).not.toBeNull());

    await fire(namespace, {
      type: BusEventType.USER_DEFINED_RESPONSE,
      data: { slot: "s1", fullMessage: { id: "m1" }, message: { id: "i1" } },
    });
    await waitFor(() => {
      expect(first.element.querySelector('[slot="s1"]')?.textContent).toBe(
        "i1",
      );
    });

    // Disconnect (releases to the registry with a long grace) and mount a fresh element for the
    // same namespace — a reuse re-attach.
    first.element.remove();
    await waitFor(() => expect(peekReuseEntry(namespace)?.refCount).toBe(0));

    const second = mount({ namespace, renderUserDefinedResponse });
    await waitFor(() => expect(peekReuseEntry(namespace)?.refCount).toBe(1));

    // No new bus event fired — the content must already be present from the retained store.
    await waitFor(() => {
      expect(second.element.querySelector('[slot="s1"]')?.textContent).toBe(
        "i1",
      );
    });
  });

  it("re-initializes a fresh element on a reuse remount: onAttach, instance arg, writeable elements, legacy handlers", async () => {
    const namespace = "wc-reattach-wiring";
    const attaches: Array<{ instance: any; remount: boolean }> = [];
    const instanceArgs: any[] = [];
    const renderUserDefinedResponse = jest.fn((state: any, instance: any) => {
      instanceArgs.push(instance);
      const el = document.createElement("div");
      el.textContent = state.messageItem?.id ?? "";
      return el;
    });

    const first = mount({ namespace, renderUserDefinedResponse });
    (first.element as any).onAttach = (instance: any, details: any) =>
      attaches.push({ instance, remount: details.remount });
    await waitFor(() => expect(first.getInstance()).not.toBeNull());
    const instance = first.getInstance();

    await fire(namespace, {
      type: BusEventType.USER_DEFINED_RESPONSE,
      data: { slot: "s1", fullMessage: { id: "m1" }, message: { id: "i1" } },
    });
    await waitFor(() => {
      expect(first.element.querySelector('[slot="s1"]')).not.toBeNull();
    });

    // The writeable elements live in the first element's light DOM.
    const writeableKey = Object.keys(instance.writeableElements)[0];
    expect(instance.writeableElements[writeableKey].parentElement).toBe(
      first.element,
    );

    first.element.remove();
    await waitFor(() => expect(peekReuseEntry(namespace)?.refCount).toBe(0));

    const second = mount({ namespace, renderUserDefinedResponse });
    (second.element as any).onAttach = (inst: any, details: any) =>
      attaches.push({ instance: inst, remount: details.remount });
    await waitFor(() => expect(peekReuseEntry(namespace)?.refCount).toBe(1));

    // The consumer's onAttach fired on both elements: the first boot (remount false) and the
    // fresh element's re-attach (remount true), handing out the same instance.
    await waitFor(() => expect(attaches).toHaveLength(2));
    expect(attaches[0].remount).toBe(false);
    expect(attaches[1].remount).toBe(true);
    expect(attaches[1].instance).toBe(instance);

    // The seeded slot content renders on the new element, and the render callback receives a
    // DEFINED instance (the adopted one), not undefined.
    await waitFor(() => {
      expect(second.element.querySelector('[slot="s1"]')?.textContent).toBe(
        "i1",
      );
    });
    expect(instanceArgs[instanceArgs.length - 1]).toBe(instance);

    // The writeable elements were re-projected into the fresh element.
    await waitFor(() => {
      expect(instance.writeableElements[writeableKey].parentElement).toBe(
        second.element,
      );
    });
  });

  it("renders legacy (no render callback) user-defined slots for events fired after a reuse remount", async () => {
    const namespace = "wc-reattach-legacy";

    const first = mount({ namespace });
    await waitFor(() => expect(first.getInstance()).not.toBeNull());

    first.element.remove();
    await waitFor(() => expect(peekReuseEntry(namespace)?.refCount).toBe(0));

    const second = mount({ namespace });
    await waitFor(() => expect(peekReuseEntry(namespace)?.refCount).toBe(1));

    // The legacy path tracks slot names from bus events; the fresh adopted element must have
    // (re)registered its handlers to render the slot forwarder for a post-remount event.
    await fire(namespace, {
      type: BusEventType.USER_DEFINED_RESPONSE,
      data: { slot: "s2", fullMessage: { id: "m2" }, message: { id: "i2" } },
    });
    await waitFor(() => {
      expect(
        second.element.shadowRoot?.querySelector('slot[name="s2"]'),
      ).not.toBeNull();
    });
  });

  it("unsubscribes from the slot-state stores on disconnect", async () => {
    const namespace = "slot-state-teardown";
    const renderUserDefinedResponse = jest.fn((state: any) => {
      const el = document.createElement("div");
      el.textContent = state.messageItem?.id ?? "";
      return el;
    });

    const { element, getInstance } = mount({
      namespace,
      renderUserDefinedResponse,
    });
    await waitFor(() => expect(getInstance()).not.toBeNull());

    await fire(namespace, {
      type: BusEventType.USER_DEFINED_RESPONSE,
      data: { slot: "s1", fullMessage: { id: "m1" }, message: { id: "i1" } },
    });
    await waitFor(() => {
      expect(element.querySelector('[slot="s1"]')).not.toBeNull();
    });

    element.remove();
    await waitFor(() => expect(peekReuseEntry(namespace)?.refCount).toBe(0));

    const callsBeforeFurtherEvent = renderUserDefinedResponse.mock.calls.length;

    // The ServiceManager (and its event bus) survives the disconnect under `reuseInstance`; fire a
    // new slot's event directly against it. The now-disconnected element must not react.
    await fire(namespace, {
      type: BusEventType.USER_DEFINED_RESPONSE,
      data: { slot: "s2", fullMessage: { id: "m2" }, message: { id: "i2" } },
    });

    expect(element.querySelector('[slot="s2"]')).toBeNull();
    expect(renderUserDefinedResponse.mock.calls.length).toBe(
      callsBeforeFurtherEvent,
    );
  });
});
