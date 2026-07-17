/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Guards `cds-aichat-internal` against re-booting the chat into a detached shadow root. Lit still
 * runs update cycles on a disconnected element; without an isConnected guard a property change on a
 * removed element would call renderReactApp() and create a fresh React root / cold-boot the chat in
 * a tree no disconnectedCallback tears down. renderReactApp is spied so these tests assert only the
 * render decision, never a real boot.
 */

import "../../../src/web-components/cds-aichat-container/cds-aichat-internal";
import { createBaseConfig } from "../../test_helpers";

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

function createInternal() {
  const element = document.createElement("cds-aichat-internal") as any;
  element.config = createBaseConfig();
  // Intercept the render so no real SDK boot runs; we only assert whether it was invoked.
  const renderSpy = jest
    .spyOn(element, "renderReactApp")
    .mockImplementation(() => undefined);
  return { element, renderSpy };
}

describe("cds-aichat-internal disconnected render guard", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    jest.restoreAllMocks();
  });

  it("renders on first connect", async () => {
    const { element, renderSpy } = createInternal();
    document.body.appendChild(element);
    await element.updateComplete;

    // The first update cycle runs both firstUpdated and updated (each renders), so the exact
    // count is not meaningful; what matters is that a connected element with config renders.
    expect(renderSpy).toHaveBeenCalled();
  });

  it("does not render on a property change while disconnected", async () => {
    const { element, renderSpy } = createInternal();
    document.body.appendChild(element);
    await element.updateComplete;
    renderSpy.mockClear();

    // Disconnect; the deferred teardown microtask tears the root down.
    element.remove();
    await flushMicrotasks();

    // A reactive property changes while detached — Lit still runs updated(), but the guard
    // must keep it from re-booting into the detached shadow root.
    element.element = document.createElement("div");
    await element.updateComplete;

    expect(renderSpy).not.toHaveBeenCalled();
  });

  it("re-renders on reconnect so a moved element is not left blank", async () => {
    const { element, renderSpy } = createInternal();
    document.body.appendChild(element);
    await element.updateComplete;

    element.remove();
    await flushMicrotasks();
    renderSpy.mockClear();

    document.body.appendChild(element);
    await element.updateComplete;

    expect(renderSpy).toHaveBeenCalledTimes(1);
  });
});
