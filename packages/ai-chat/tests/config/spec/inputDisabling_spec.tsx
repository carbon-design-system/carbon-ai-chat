/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * End-to-end behavior of disabling the assistant input, exercised through the
 * real <ChatContainer> boot:
 *  - toggling `input.isDisabled` in place is side-effect-free (no request
 *    cancel, no session clear), and
 *  - `input.isDisabled` is input-scoped (does NOT block programmatic
 *    instance.send), while whole-chat `isReadonly` does block it.
 */

import React from "react";
import { render, waitFor } from "@testing-library/react";
import { ChatContainer } from "../../../src/react/ChatContainer";
import { ChatContainerProps } from "../../../src/types/component/ChatContainer";
import {
  createBaseConfig,
  mockCustomSendMessage,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from "../../test_helpers";
import {
  selectInputIsDisabled,
  selectInputIsReadonly,
} from "../../../src/chat/store/selectors";

describe("Disabling the assistant input", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("toggling input.isDisabled in place does not cancel requests or clear the session", async () => {
    // A fresh customSendMessage reference on each render models a non-memoized
    // consumer config.
    const baseProps = (isDisabled: boolean): Partial<ChatContainerProps> => ({
      messaging: { customSendMessage: mockCustomSendMessage },
      exposeServiceManagerForTesting: true,
      input: { isDisabled },
    });

    let capturedInstance: any = null;
    const onBeforeRender = jest.fn((instance) => {
      capturedInstance = instance;
    });

    const { rerender } = render(
      React.createElement(ChatContainer, {
        ...baseProps(false),
        onBeforeRender,
      }),
    );

    await waitFor(() => expect(capturedInstance).not.toBeNull(), {
      timeout: 5000,
    });

    const { serviceManager } = capturedInstance;
    const { store } = serviceManager;
    expect(selectInputIsDisabled(store.getState())).toBe(false);

    const cancelSpy = jest.spyOn(
      serviceManager.messageService,
      "cancelAllMessageRequests",
    );
    const clearSpy = jest.spyOn(
      serviceManager.userSessionStorageService,
      "clearSession",
    );

    rerender(
      React.createElement(ChatContainer, {
        ...baseProps(true),
        onBeforeRender,
      }),
    );

    await waitFor(
      () => expect(selectInputIsDisabled(store.getState())).toBe(true),
      { timeout: 5000 },
    );

    // Config is the source of truth; selectInputIsDisabled reads it directly.
    expect(selectInputIsReadonly(store.getState())).toBe(false);
    expect(cancelSpy).not.toHaveBeenCalled();
    expect(clearSpy).not.toHaveBeenCalled();
  });

  it("input.isDisabled disables the editor but does NOT block programmatic send", async () => {
    const config = createBaseConfig();
    config.input = { isDisabled: true };

    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    expect(selectInputIsDisabled(store.getState())).toBe(true);
    expect(selectInputIsReadonly(store.getState())).toBe(false);

    // Input-scoped disable must not gate programmatic sends.
    await expect(instance.send("hello")).resolves.not.toThrow();
  });

  it("whole-chat isReadonly DOES block programmatic send", async () => {
    const config = createBaseConfig();
    config.isReadonly = true;

    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    expect(selectInputIsReadonly(store.getState())).toBe(true);

    await expect(instance.send("hello")).rejects.toThrow(/read only/i);
  });
});
