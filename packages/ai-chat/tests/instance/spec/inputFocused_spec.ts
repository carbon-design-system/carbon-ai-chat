/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { waitFor } from "@testing-library/react";
import { deepQuerySelector } from "@carbon/ai-chat-components/es/globals/utils/dom-utils.js";
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from "../../test_helpers";
import { BusEventType } from "../../../src/types/events/eventBusTypes";

/**
 * Walks the nested shadow roots looking for the rendered prompt-line,
 * waiting for it to mount if necessary. The chat host uses Lit shadow
 * boundaries so a top-level `document.querySelector` cannot reach inside.
 */
async function findPromptLine(): Promise<Element> {
  return waitFor(
    () => {
      const promptLine = deepQuerySelector(document, "cds-aichat-prompt-line");
      if (!promptLine) {
        throw new Error("prompt-line not mounted");
      }
      return promptLine;
    },
    { timeout: 5000 },
  );
}

/**
 * Dispatches a `cds-aichat-prompt-focus` / `cds-aichat-prompt-blur` event on
 * the slotted prompt-line. Input.tsx's React `onFocus`/`onBlur` listeners are
 * attached to the prompt-line element, so dispatching at this layer drives
 * the same focus-tracking pipeline as a real focus event.
 */
async function dispatchPromptFocusEvent(
  type: "cds-aichat-prompt-focus" | "cds-aichat-prompt-blur",
): Promise<void> {
  const promptLine = await findPromptLine();
  promptLine.dispatchEvent(
    new CustomEvent(type, { bubbles: true, composed: true }),
  );
}

describe("ChatInstance.input.focused (PublicInputState)", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("starts as false before any focus/blur event", async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    expect(instance.getState().input.focused).toBe(false);
    expect(store.getState().assistantInputState.focused).toBe(false);
  });

  it("flips to true on cds-aichat-input-focus and back to false on blur", async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    await dispatchPromptFocusEvent("cds-aichat-prompt-focus");

    await waitFor(() => {
      expect(store.getState().assistantInputState.focused).toBe(true);
    });
    expect(instance.getState().input.focused).toBe(true);

    await dispatchPromptFocusEvent("cds-aichat-prompt-blur");

    await waitFor(() => {
      expect(store.getState().assistantInputState.focused).toBe(false);
    });
    expect(instance.getState().input.focused).toBe(false);
  });

  it("fires STATE_CHANGE with focused transitions in previousState/newState", async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const transitions: Array<{ prev: boolean; next: boolean }> = [];
    instance.on({
      type: BusEventType.STATE_CHANGE,
      handler: (event: any) => {
        if (
          event.previousState.input.focused !== event.newState.input.focused
        ) {
          transitions.push({
            prev: event.previousState.input.focused,
            next: event.newState.input.focused,
          });
        }
      },
    });

    await dispatchPromptFocusEvent("cds-aichat-prompt-focus");
    await waitFor(() => {
      expect(transitions).toContainEqual({ prev: false, next: true });
    });

    await dispatchPromptFocusEvent("cds-aichat-prompt-blur");
    await waitFor(() => {
      expect(transitions).toContainEqual({ prev: true, next: false });
    });
  });

  it("does NOT fire STATE_CHANGE when the same focus state dispatches twice", async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const focusFlips: boolean[] = [];
    instance.on({
      type: BusEventType.STATE_CHANGE,
      handler: (event: any) => {
        if (
          event.previousState.input.focused !== event.newState.input.focused
        ) {
          focusFlips.push(event.newState.input.focused);
        }
      },
    });

    await dispatchPromptFocusEvent("cds-aichat-prompt-focus");
    await dispatchPromptFocusEvent("cds-aichat-prompt-focus");

    await waitFor(() => {
      expect(focusFlips).toEqual([true]);
    });
  });

  it("public input.focused is included in the frozen public snapshot", async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const snapshot = instance.getState().input;
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(snapshot).toHaveProperty("focused");
    expect(typeof snapshot.focused).toBe("boolean");
  });
});
