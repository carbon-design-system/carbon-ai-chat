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
import { ChatInstance } from "../../../src/types/instance/ChatInstance";
import { PublicConfig } from "../../../src/types/config/PublicConfig";
import { __resetReuseInstanceRegistry } from "../../../src/chat/services/reuseInstanceRegistry";
import { createBaseConfig, setupBeforeEach } from "../../test_helpers";

let capturedInstance: ChatInstance | null;

function renderChat(config: PublicConfig) {
  const onBeforeRender = jest.fn((i: ChatInstance) => {
    capturedInstance = i;
  });
  return render(
    React.createElement(ChatContainer, { ...config, onBeforeRender }),
  );
}

async function waitForBoot() {
  await waitFor(() => expect(capturedInstance).not.toBeNull(), {
    timeout: 5000,
  });
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("accidental-reboot warning", () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    setupBeforeEach();
    capturedInstance = null;
    __resetReuseInstanceRegistry();
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    __resetReuseInstanceRegistry();
    document.body.innerHTML = "";
    warnSpy.mockRestore();
  });

  const rebootWarnings = () =>
    warnSpy.mock.calls.filter((args) =>
      args.some((a: unknown) =>
        String(a).includes("re-initialized from scratch"),
      ),
    );

  it("warns once (debug) when a namespace cold-boots again after a remount", async () => {
    const config = {
      ...createBaseConfig(),
      namespace: "reboot-warn",
      debug: true,
    };

    const first = renderChat(config);
    await waitForBoot();
    expect(rebootWarnings()).toHaveLength(0); // first boot is silent

    first.unmount();
    capturedInstance = null;
    await delay(70); // beyond the StrictMode double-boot window
    renderChat(config);
    await waitForBoot();

    expect(rebootWarnings()).toHaveLength(1);
  });

  it("stays silent when debug is off", async () => {
    const config = {
      ...createBaseConfig(),
      namespace: "reboot-nodebug",
      debug: false,
    };

    const first = renderChat(config);
    await waitForBoot();
    first.unmount();
    capturedInstance = null;
    await delay(70);
    renderChat(config);
    await waitForBoot();

    expect(rebootWarnings()).toHaveLength(0);
  });

  it("stays silent when reuseInstance is enabled (the remount reuses the instance)", async () => {
    const config = {
      ...createBaseConfig(),
      namespace: "reboot-reuse",
      debug: true,
      featureFlags: { reuseInstance: true, reuseInstanceGraceMs: 100000 },
    };

    const first = renderChat(config);
    await waitForBoot();
    first.unmount();
    capturedInstance = null;
    await delay(70);
    renderChat(config); // reuse re-attach: no cold boot, no warning
    await delay(50);

    expect(rebootWarnings()).toHaveLength(0);
  });
});
