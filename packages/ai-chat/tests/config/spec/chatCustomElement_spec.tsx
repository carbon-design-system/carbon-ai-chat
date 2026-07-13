/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Coverage for `ChatCustomElement`'s prop split. It forwards flattened
 * `PublicConfig` fields to the inner `ChatContainer` (which reconstructs the
 * config) while leaving arbitrary DOM attributes on the wrapper element. Both
 * sides are driven by the shared `FLATTENED_PUBLIC_CONFIG_FIELDS` table, so a
 * newly-added config field cannot be silently dropped or leaked onto the host.
 */

import React from "react";
import { render, waitFor } from "@testing-library/react";

import { ChatCustomElement } from "../../../src/react/ChatCustomElement";
import { createBaseTestProps } from "../../test_helpers";
import { AppState } from "../../../src/types/state/AppState";
import { enLanguagePack } from "../../../src/types/config/PublicConfig";

describe("ChatCustomElement prop forwarding", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    jest.clearAllMocks();
  });

  it("forwards flattened config to the chat and DOM attributes to the wrapper element", async () => {
    let capturedInstance: any = null;

    render(
      React.createElement(ChatCustomElement, {
        ...createBaseTestProps(),
        className: "my-custom-chat",
        id: "custom-chat-id",
        // Flattened PublicConfig fields — must reach the chat through the inner
        // ChatContainer's shared reconstruction.
        namespace: "custom-ns",
        strings: { input_placeholder: "Custom element placeholder" },
        // An arbitrary DOM attribute — must stay on the wrapper element.
        "aria-label": "custom chat region",
        onBeforeRender: (instance: any) => {
          capturedInstance = instance;
        },
      }),
    );

    await waitFor(() => expect(capturedInstance).not.toBeNull(), {
      timeout: 5000,
    });

    const state: AppState = capturedInstance.serviceManager.store.getState();
    // Flattened config fields reached the chat.
    expect(state.config.public.namespace).toBe("custom-ns");
    expect(state.languagePack.input_placeholder).toBe(
      "Custom element placeholder",
    );
    // An unspecified string keeps its default (config folded, not replaced).
    expect(state.languagePack.launcher_isOpen).toBe(
      enLanguagePack.launcher_isOpen,
    );

    // className, id, and the arbitrary DOM attribute landed on the wrapper
    // element — not swallowed into config, not pushed onto the inner host.
    const wrapper = document.querySelector('[aria-label="custom chat region"]');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.tagName).toBe("DIV");
    expect(wrapper?.classList.contains("my-custom-chat")).toBe(true);
    expect(wrapper?.id).toBe("custom-chat-id");
  });
});
