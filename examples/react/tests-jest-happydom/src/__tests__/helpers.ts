/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Shadow-DOM-aware test helpers for the happy-dom Jest harness. Consumers
 * use renderChatContainer / waitForChatElement / openChat / closeChat /
 * sendUserMessage to drive the chat host element through its launcher and
 * input, with each helper bridging React's act(), Lit's updateComplete,
 * and PageObjectId-based queries inside the host's shadowRoot. Centralised
 * so individual tests stay focused on the runner-level assertion.
 */

import type { ReactElement } from "react";
import { act, render, waitFor } from "@testing-library/react";
import { PageObjectId } from "@carbon/ai-chat";
import { deepQuerySelector } from "@carbon/ai-chat-components/es/globals/utils/dom-utils.js";
import { WAIT_FOR_TIMEOUT } from "./constants";

export async function renderChatContainer(
  ui: ReactElement,
): Promise<ReturnType<typeof render>> {
  const result = render(ui);
  await waitForChatElement(result.container);
  return result;
}

export async function waitForChatElement(
  container: HTMLElement,
): Promise<Element> {
  return waitFor(
    () => {
      // the chat host is a custom element whose shadowRoot we don't know
      // by tag name, so we have to walk every descendant looking for the one
      // whose shadow tree contains the CHAT_WIDGET marker.
      for (const el of Array.from(container.querySelectorAll("*"))) {
        const shadowRoot = (el as HTMLElement).shadowRoot;
        if (
          shadowRoot?.querySelector(
            `[data-testid="${PageObjectId.CHAT_WIDGET}"]`,
          )
        ) {
          return el;
        }
      }
      throw new Error("Chat element not rendered yet");
    },
    {
      timeout: WAIT_FOR_TIMEOUT,
    },
  );
}

export async function openChat(customElement: Element): Promise<ShadowRoot> {
  // Lit's `updateComplete` resolves once the element finishes its current
  // render cycle; without awaiting it the shadowRoot can be present but its
  // children (launcher, main panel) may not yet be in place.
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

      // configurations that disable the launcher start in the open
      // state, so MAIN_PANEL being present means there's no click to make.
      if (isMainPanelVisible) {
        return { launcher: null, alreadyOpen: true } as const;
      }

      throw new Error("Launcher not ready");
    },
    { timeout: WAIT_FOR_TIMEOUT },
  );

  if (!alreadyOpen && launcher) {
    // wrap the click in act() so React state updates triggered by the
    // launcher (and the follow-up Lit re-render) are flushed before tests
    // assert on the resulting DOM.
    await act(async () => {
      launcher.click();
      if (typeof (customElement as any).updateComplete !== "undefined") {
        await (customElement as any).updateComplete;
      }
    });
  }
  await waitFor(
    () =>
      shadowRoot.querySelector(`[data-testid="${PageObjectId.CHAT_WIDGET}"]`),
    { timeout: WAIT_FOR_TIMEOUT },
  );
  return shadowRoot;
}

export async function closeChat(customElement: Element) {
  const shadowRoot = (customElement as HTMLElement).shadowRoot;
  if (!shadowRoot) {
    throw new Error("Custom element shadow root not ready");
  }

  const closeButton = await waitFor(
    () => {
      // deepQuerySelector pierces nested shadow roots; the close button
      // lives inside the header sub-component's own shadow tree, so a plain
      // shadowRoot.querySelector at the host level wouldn't find it.
      const button = deepQuerySelector(
        shadowRoot,
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
  // The INPUT PageObjectId is the ProseMirror contenteditable inside
  // cds-aichat-input-shell. Driving the editor with synthetic key/composition
  // events is unreliable in happy-dom (PM relies on selection APIs the shim
  // doesn't fully implement), so we instead fire the same custom events the
  // editor would emit. The shell listens on its container for both events:
  //   - `cds-aichat-input-change` updates the shell's rawValue
  //   - `cds-aichat-input-send` triggers the shell to re-emit its own send
  //     event up to React's `onSend`, which calls customSendMessage.
  const input = await waitFor(
    () => {
      const field = shadowRoot.querySelector(
        `[data-testid="${PageObjectId.INPUT}"]`,
      ) as HTMLElement | null;
      if (!field) {
        throw new Error("Input not ready");
      }
      return field;
    },
    { timeout: WAIT_FOR_TIMEOUT },
  );

  await act(async () => {
    input.dispatchEvent(
      new CustomEvent("cds-aichat-input-change", {
        detail: { rawValue: text },
        bubbles: true,
        composed: true,
      }),
    );
    input.dispatchEvent(
      new CustomEvent("cds-aichat-input-send", {
        detail: { text },
        bubbles: true,
        composed: true,
      }),
    );
  });

  if (typeof (shadowRoot.host as any).updateComplete !== "undefined") {
    await (shadowRoot.host as any).updateComplete;
  }
}
