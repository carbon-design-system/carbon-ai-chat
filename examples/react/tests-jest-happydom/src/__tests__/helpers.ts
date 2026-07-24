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
      // The launcher button (and main panel) live behind nested shadow
      // boundaries — Carbon `cds-button`, `cds-layer`, and the chat's own
      // sub-components each open their own shadow root. `deepQuerySelector`
      // walks every one; a plain `shadowRoot.querySelector` would only see
      // the outermost shadow tree.
      const button = deepQuerySelector(
        shadowRoot,
        `[data-testid="${PageObjectId.LAUNCHER}"]`,
      ) as HTMLElement | null;
      const isMainPanelVisible = Boolean(
        deepQuerySelector(
          shadowRoot,
          `[data-testid="${PageObjectId.MAIN_PANEL}"]`,
        ),
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
      deepQuerySelector(
        shadowRoot,
        `[data-testid="${PageObjectId.CHAT_WIDGET}"]`,
      ),
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
  // cds-aichat-prompt-line-shell. Driving the editor with synthetic key/composition
  // events is unreliable in happy-dom (PM relies on selection APIs the shim
  // doesn't fully implement), so we instead fire the same custom events the
  // editor would emit. The shell listens on its container for both events:
  //   - `cds-aichat-input-change` updates the shell's rawValue
  //   - `cds-aichat-input-send` triggers the shell to re-emit its own send
  //     event up to React's `onSend`, which calls customSendMessage.
  const input = await waitFor(
    () => {
      // INPUT (the editor div) and INPUT_SEND (a `cds-button` inside the
      // send-control's shadow root) both live behind shadow-root boundaries
      // — `deepQuerySelector` walks every one. See `openChat` for the same
      // pattern.
      const field = deepQuerySelector(
        shadowRoot,
        `[data-testid="${PageObjectId.INPUT}"]`,
      ) as HTMLElement | null;
      if (!field) {
        throw new Error("Input not ready");
      }
      return field;
    },
    { timeout: WAIT_FOR_TIMEOUT },
  );

  // The input is a ProseMirror-backed web component (cds-aichat-prompt-line-shell).
  // The editor div above lives a couple of light-DOM levels under the shell
  // host (PM wraps `view.dom` inside its own container element). Walk up
  // with `closest` to reach the shell — they share the same shadow scope
  // because `view.dom` is a light-DOM descendant — and call its public
  // `setContent` to drive the doc.
  //
  // Driving the rest of the send flow from the UI under happy-dom is
  // unreliable: `setContent` correctly dispatches `cds-aichat-input-change`
  // synchronously, but `@lit/react`'s `onChange` listener never fires under
  // happy-dom in this harness, so React's `rawInputValue` state never
  // updates and the send button stays disabled. Tests that need to send a
  // message should capture the chat instance via `onBeforeRender` and call
  // `instance.send(...)` (or `instance.messaging.addMessage(...)`) directly
  // — `sendUserMessage` is left in place for future tests that only need
  // to populate the input doc.
  const promptLineShell = input.closest("cds-aichat-prompt-line-shell") as
    | (HTMLElement & {
        setContent?: (segments: Array<{ type: "text"; text: string }>) => void;
      })
    | null;
  if (typeof promptLineShell?.setContent !== "function") {
    throw new Error("Prompt-line shell `setContent` not available");
  }
  await act(async () => {
    promptLineShell.setContent!([{ type: "text", text }]);
    if (typeof (shadowRoot.host as any).updateComplete !== "undefined") {
      await (shadowRoot.host as any).updateComplete;
    }
  });
}
