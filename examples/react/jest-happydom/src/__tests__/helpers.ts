/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ReactElement } from "react";
import { act, render, waitFor } from "@testing-library/react";
import { PageObjectId } from "@carbon/ai-chat";
import { WAIT_FOR_TIMEOUT } from "./constants";

export async function renderChatContainer(
  ui: ReactElement,
): Promise<ReturnType<typeof render>> {
  const result = render(ui);
  const customElement = await waitForChatElement(result.container);
  await waitFor(() => {
    const shadowRoot = (customElement as HTMLElement).shadowRoot;
    if (!shadowRoot) {
      throw new Error("Chat element shadow root not ready");
    }
    const widget = shadowRoot.querySelector(".cds-aichat--widget");
    if (!widget) {
      throw new Error("Chat widget not rendered yet");
    }
    return widget;
  });
  return result;
}

export async function waitForChatElement(
  container: HTMLElement,
): Promise<Element> {
  return waitFor(
    () => {
      const element = container.querySelector("cds-aichat-react");
      if (!element) {
        throw new Error("Chat element not rendered yet");
      }
      return element;
    },
    {
      timeout: WAIT_FOR_TIMEOUT,
    },
  );
}

export async function openChat(customElement: Element): Promise<ShadowRoot> {
  if (typeof (customElement as any).updateComplete !== "undefined") {
    await (customElement as any).updateComplete;
  }
  const shadowRoot = (customElement as HTMLElement).shadowRoot;
  if (!shadowRoot) {
    throw new Error("Custom element shadow root not ready");
  }
  const { launcher, alreadyOpen } = await waitFor(
    () => {
      const button = shadowRoot.querySelector(
        `[data-testid="${PageObjectId.LAUNCHER}"]`,
      ) as HTMLElement | null;
      const isMainPanelVisible = Boolean(
        shadowRoot.querySelector(`[data-testid="${PageObjectId.MAIN_PANEL}"]`),
      );

      if (button) {
        return { launcher: button, alreadyOpen: false } as const;
      }

      if (isMainPanelVisible) {
        return { launcher: null, alreadyOpen: true } as const;
      }

      throw new Error("Launcher not ready");
    },
    { timeout: WAIT_FOR_TIMEOUT },
  );

  if (!alreadyOpen && launcher) {
    await act(async () => {
      launcher.click();
      if (typeof (customElement as any).updateComplete !== "undefined") {
        await (customElement as any).updateComplete;
      }
    });
  }
  await waitFor(() => shadowRoot.querySelector(".cds-aichat--react-app"), {
    timeout: WAIT_FOR_TIMEOUT,
  });
  await waitFor(() => shadowRoot.querySelector(".cds-aichat--widget"), {
    timeout: WAIT_FOR_TIMEOUT,
  });
  return shadowRoot;
}

export async function closeChat(customElement: Element) {
  const shadowRoot = (customElement as HTMLElement).shadowRoot;
  if (!shadowRoot) {
    throw new Error("Custom element shadow root not ready");
  }
  const closeButton = await waitFor(
    () => {
      const button = shadowRoot.querySelector(
        `[data-testid="${PageObjectId.CLOSE_CHAT}"]`,
      ) as HTMLElement | null;
      if (!button) {
        throw new Error("Close chat button not ready");
      }
      return button;
    },
    { timeout: WAIT_FOR_TIMEOUT },
  );

  await act(async () => {
    closeButton.click();
    if (typeof (customElement as any).updateComplete !== "undefined") {
      await (customElement as any).updateComplete;
    }
  });
}

export async function sendUserMessage(
  shadowRoot: ShadowRoot,
  text: string,
): Promise<void> {
  const input = await waitFor(
    () => {
      const field = shadowRoot.querySelector(
        `[data-testid="${PageObjectId.INPUT}"]`,
      ) as HTMLInputElement | null;
      if (!field) {
        throw new Error("Input not ready");
      }
      return field;
    },
    { timeout: WAIT_FOR_TIMEOUT },
  );

  const sendButton = await waitFor(
    () => {
      const button = shadowRoot.querySelector(
        `[data-testid="${PageObjectId.INPUT_SEND}"]`,
      ) as HTMLElement | null;
      if (!button) {
        throw new Error("Send button not ready");
      }
      return button;
    },
    { timeout: WAIT_FOR_TIMEOUT },
  );

  await act(async () => {
    input.value = text;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await act(async () => {
    sendButton.click();
  });

  if (typeof (shadowRoot.host as any).updateComplete !== "undefined") {
    await (shadowRoot.host as any).updateComplete;
  }
}
